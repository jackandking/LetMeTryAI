#!/usr/bin/env node
/**
 * nanrenbao-exp-analyze.mjs — 男人宝「卡片人物名称」A/B 实验分析脚本。
 *
 * 实验：appreciate-name-v1（欣赏美女页）
 *   对照组 A：卡片无名称
 *   实验组 B：卡片左上角显示人物名称角标（来自 prompt_dna.subject，无名不显示）
 *
 * 指标口径：
 *   主指标  卡片 CTR = clicks / impressions（点击意图 / 卡片曝光）
 *   次指标  访客级 CTR = click_visitors / page_view_visitors（至少点过一张卡的访客占比）
 *   护栏    查看率 = views / impressions（名称不应降低成功查看）
 *
 * 统计：双比例 z 检验（pooled，双侧 α=0.05）+ 差值 95% CI + 达到 80% 功效所需每臂样本量。
 *
 * 用法：
 *   node .automation/scripts/nanrenbao-exp-analyze.mjs [--exp appreciate-name-v1] [--since 2026-10-24] [--until 2026-10-31]
 *
 * 输出：终端摘要 + markdown 报告（默认 ~/LetMeTryAI/.automation/reports/，可用 EXP_REPORT_OUT 覆盖目录）。
 * 只读：仅 GET /api/nanrenbao/exp/report，无任何写操作。
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const REPORT_API = process.env.EXP_REPORT_API || 'https://letmetry.cn/api/nanrenbao/exp/report';
const DEFAULT_EXP = 'appreciate-name-v1';

// ---- 参数 ----
const args = process.argv.slice(2);
function argOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}
const expId = argOf('--exp') || DEFAULT_EXP;
const since = argOf('--since');
const until = argOf('--until');

// ---- 统计工具 ----
// 标准正态 CDF（Abramowitz & Stegun 7.1.26 近似，|误差| < 1.5e-7）
function normalCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const y = 1 - Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI) * poly;
  return 0.5 * (1 + sign * y);
}

// 双比例 z 检验（pooled），返回 { z, p }
function twoProportionZTest(x1, n1, x2, n2) {
  if (!n1 || !n2) return { z: NaN, p: NaN };
  const p1 = x1 / n1, p2 = x2 / n2;
  const pBar = (x1 + x2) / (n1 + n2);
  const se = Math.sqrt(pBar * (1 - pBar) * (1 / n1 + 1 / n2));
  if (se === 0) return { z: NaN, p: NaN };
  const z = (p2 - p1) / se;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  return { z, p };
}

// 达到 80% 功效所需每臂曝光量（简化 pooled 公式）
function requiredNPerArm(p1, p2, alpha = 0.05, power = 0.8) {
  const zA = 1.959964; // 双侧 0.05
  const zB = 0.8416212; // power 0.8
  const pBar = (p1 + p2) / 2;
  const num = Math.pow(zA * Math.sqrt(2 * pBar * (1 - pBar)) + zB * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2);
  const den = Math.pow(p2 - p1, 2);
  if (!isFinite(den) || den <= 0) return Infinity;
  return Math.ceil(num / den);
}

function fmtPct(x, digits = 2) {
  return Number.isFinite(x) ? (x * 100).toFixed(digits) + '%' : '—';
}

// ---- 拉取报表 ----
const qs = new URLSearchParams({ exp_id: expId });
if (since) qs.set('since', since);
if (until) qs.set('until', until);

let report;
try {
  const res = await fetch(`${REPORT_API}?${qs.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  report = await res.json();
} catch (e) {
  console.error(`拉取实验报表失败: ${e.message}`);
  process.exit(1);
}

// ---- 汇总 ----
const byVariant = {};
for (const r of report.rows || []) {
  const v = byVariant[r.variant] || (byVariant[r.variant] = {});
  v[r.event] = { n: r.n, visitors: r.visitors };
}
const rangeByVariant = {};
for (const r of report.range || []) rangeByVariant[r.variant] = r;

const A = byVariant.A || {};
const B = byVariant.B || {};
const aImp = (A.impression || {}).n || 0;
const bImp = (B.impression || {}).n || 0;
const aClk = (A.click || {}).n || 0;
const bClk = (B.click || {}).n || 0;
const aView = (A.view || {}).n || 0;
const bView = (B.view || {}).n || 0;
const aVis = (A.page_view || {}).visitors || 0;
const bVis = (B.page_view || {}).visitors || 0;
const aClkVis = (A.click || {}).visitors || 0;
const bClkVis = (B.click || {}).visitors || 0;

const aCtr = aImp ? aClk / aImp : NaN;
const bCtr = bImp ? bClk / bImp : NaN;
const uplift = Number.isFinite(aCtr) && Number.isFinite(bCtr) && aCtr > 0 ? (bCtr - aCtr) / aCtr : NaN;
const { z, p } = twoProportionZTest(aClk, aImp, bClk, bImp);
const diff = bCtr - aCtr;
const diffSe = (aImp && bImp) ? Math.sqrt(aCtr * (1 - aCtr) / aImp + bCtr * (1 - bCtr) / bImp) : NaN;
const ciLo = diff - 1.959964 * diffSe;
const ciHi = diff + 1.959964 * diffSe;
const needN = Number.isFinite(aCtr) && Number.isFinite(bCtr) ? requiredNPerArm(aCtr, bCtr) : Infinity;
const progress = Number.isFinite(needN) && needN > 0 ? Math.min(1, Math.min(aImp, bImp) / needN) : 0;
const aVisCtr = aVis ? aClkVis / aVis : NaN;
const bVisCtr = bVis ? bClkVis / bVis : NaN;
const aVtr = aImp ? aView / aImp : NaN;
const bVtr = bImp ? bView / bImp : NaN;

// ---- 结论 ----
function fmtSignedPct(x) {
  return Number.isFinite(x) ? (x >= 0 ? '+' : '') + fmtPct(x) : '—';
}
let verdict;
if (!aImp || !bImp) {
  verdict = '样本不足：至少一组还没有曝光数据，实验尚未有效开始（或流量未到达）。';
} else if (!Number.isFinite(p)) {
  verdict = '无法计算（比例退化，如某组点击为 0）。继续攒样本。';
} else if (p < 0.05) {
  verdict = diff > 0
    ? `✅ 统计显著：实验组 B 卡片 CTR 显著更高（相对提升 ${fmtSignedPct(uplift)}）。建议全量保留名称角标。`
    : `✅ 统计显著：实验组 B 卡片 CTR 显著更低（${fmtSignedPct(uplift)}）。建议撤下名称角标。`;
} else if (!Number.isFinite(needN)) {
  verdict = '两组卡片 CTR 暂无可测差异（或某组点击为 0）。继续攒样本后再评估。';
} else if (progress >= 1) {
  verdict = '样本量已达标但仍不显著：名称对 CTR 无可观影响，可判定「无效」并结束实验。';
} else {
  verdict = `尚未显著：样本量完成度 ${(progress * 100).toFixed(0)}%，继续跑（预计每臂还需约 ${Math.max(0, needN - Math.min(aImp, bImp)).toLocaleString()} 次曝光）。`;
}

// ---- 终端摘要 ----
console.log(`\n══ 男人宝卡片命名 A/B 实验：${expId} ══`);
console.log(`窗口: ${since || '全部'} ~ ${until || '最新'}   数据范围: ${(rangeByVariant.A && rangeByVariant.A.first_ts) || '—'} ~ ${(rangeByVariant.B && rangeByVariant.B.last_ts) || '—'}`);
console.log('\n组别    访客   曝光     点击    卡片CTR   访客CTR   查看率');
console.log(`A(对照) ${String(aVis).padStart(5)} ${String(aImp).padStart(8)} ${String(aClk).padStart(7)} ${fmtPct(aCtr).padStart(8)} ${fmtPct(aVisCtr).padStart(8)} ${fmtPct(aVtr).padStart(7)}`);
console.log(`B(命名) ${String(bVis).padStart(5)} ${String(bImp).padStart(8)} ${String(bClk).padStart(7)} ${fmtPct(bCtr).padStart(8)} ${fmtPct(bVisCtr).padStart(8)} ${fmtPct(bVtr).padStart(7)}`);
console.log(`\n相对提升: ${fmtSignedPct(uplift)}   差值 95% CI: [${fmtPct(ciLo)}, ${fmtPct(ciHi)}]   z=${Number.isFinite(z) ? z.toFixed(2) : '—'}   p=${Number.isFinite(p) ? p.toFixed(4) : '—'}`);
console.log(`样本进度: ${Math.min(aImp, bImp).toLocaleString()} / ${needN.toLocaleString()} 每臂（${(progress * 100).toFixed(0)}%）`);
console.log(`\n结论: ${verdict}\n`);

// ---- markdown 报告 ----
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
const outDir = process.env.EXP_REPORT_OUT || join(homedir(), 'LetMeTryAI', '.automation', 'reports');
try { mkdirSync(outDir, { recursive: true }); } catch { /* 已存在 */ }
const outFile = join(outDir, `nanrenbao-exp-${expId}-${stamp}.md`);

const md = `# 男人宝卡片命名 A/B 实验报告（${expId}）

- 生成时间：${now.toISOString()}
- 数据窗口：${since || '全部'} ~ ${until || '最新'}
- 数据范围：${(rangeByVariant.A && rangeByVariant.A.first_ts) || '—'} ~ ${(rangeByVariant.B && rangeByVariant.B.last_ts) || '—'}

## 指标

| 组别 | 访客 | 卡片曝光 | 点击 | 卡片 CTR | 访客级 CTR | 查看率(护栏) |
|---|---:|---:|---:|---:|---:|---:|
| A 对照（无名称） | ${aVis} | ${aImp} | ${aClk} | ${fmtPct(aCtr)} | ${fmtPct(aVisCtr)} | ${fmtPct(aVtr)} |
| B 实验（名称角标） | ${bVis} | ${bImp} | ${bClk} | ${fmtPct(bCtr)} | ${fmtPct(bVisCtr)} | ${fmtPct(bVtr)} |

## 统计

- 相对提升：${Number.isFinite(uplift) ? (uplift >= 0 ? '+' : '') + fmtPct(uplift) : '—'}
- 差值 95% CI：[${fmtPct(ciLo)}, ${fmtPct(ciHi)}]
- 双比例 z 检验（pooled，双侧 α=0.05）：z=${Number.isFinite(z) ? z.toFixed(2) : '—'}，p=${Number.isFinite(p) ? p.toFixed(4) : '—'}
- 80% 功效所需每臂曝光：${needN.toLocaleString()}（当前进度 ${(progress * 100).toFixed(0)}%）

## 结论

${verdict}

## 口径说明

- 卡片 CTR = 点击 / 曝光（曝光 = IntersectionObserver ≥50% 可见，每卡每遍一次；点击含积分不足的点击意图）
- 访客级 CTR = 至少点击过一张卡的访客 / 页面访客
- 查看率 = 成功查看大图 / 曝光（护栏：名称不应降低成功查看）
- 实验组 B 中，解析不出规范人物名的图（描述性 subject / 无 DNA）不显示角标
`;
writeFileSync(outFile, md);
console.log(`报告已写入: ${outFile}`);
