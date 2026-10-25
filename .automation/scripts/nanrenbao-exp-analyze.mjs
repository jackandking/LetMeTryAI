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
 * 统计（双口径，缺一不可轻信）：
 *   ① pooled 双比例 z 检验：把每次曝光当独立观测。行业常用，但曝光按访客聚类，
 *      访客少时会高估显著性——只能当参考。
 *   ② 访客级置换检验：以「访客级 CTR」为观测单位做精确/Monte-Carlo 置换检验。
 *      对聚类稳健，是结论主依据；但访客少时功效低。
 *   另识别可疑会话（span > 120 分钟或 page_view > 3：长挂标签页/本人反复查看），
 *   输出剔除可疑会话后的 pooled 口径作对照。
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

// 可疑会话阈值：会话跨度超过 120 分钟，或 page_view 超过 6 次
// （短视频落地页正常会话是分钟级、1 次 page_view；超长跨度=标签页长挂或本人反复查看。
// 注意：分钟级会话内多次刷新（pv 5-6）在 WebView 里常见，不作为可疑判据）
const SUSPECT_SPAN_MIN = 120;
const SUSPECT_PAGE_VIEWS = 6;
const MIN_VISITORS_PER_ARM = 10; // 低于此数只给方向性判断，不下统计结论

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

// 组合数 C(n, k)
function comb(n, k) {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

/**
 * 访客级置换检验（双侧）：以访客为观测单位，检验 B 组访客 CTR 分布是否高于 A 组。
 * 精确枚举（组合数 ≤ 200000）或 Monte-Carlo（10000 次重排）。
 * 返回 { p, exact, nA, nB }。
 */
function visitorPermutationTest(aCtrs, bCtrs) {
  const a = aCtrs.filter((x) => Number.isFinite(x));
  const b = bCtrs.filter((x) => Number.isFinite(x));
  const nA = a.length, nB = b.length;
  if (!nA || !nB) return { p: NaN, exact: false, nA, nB };
  const all = [...a.map((x) => ({ x, g: 0 })), ...b.map((x) => ({ x, g: 1 }))];
  const mean = (arr) => arr.reduce((s, v) => s + v, 0) / arr.length;
  const obsDiff = mean(b) - mean(a);
  const absObs = Math.abs(obsDiff);

  const total = comb(nA + nB, nA);
  if (total <= 200000) {
    // 精确枚举：逐个生成 nA 大小的索引组合
    let count = 0;
    const idx = Array.from({ length: nA + nB }, (_, i) => i);
    const combo = [];
    const seen = new Set();
    const enumerate = (start, k) => {
      if (k === 0) {
        const key = combo.join(',');
        if (seen.has(key)) return;
        seen.add(key);
        const inA = new Set(combo);
        const gA = [], gB = [];
        for (let i = 0; i < idx.length; i++) (inA.has(i) ? gA : gB).push(all[i].x);
        if (Math.abs(mean(gB) - mean(gA)) >= absObs - 1e-12) count++;
        return;
      }
      for (let i = start; i <= idx.length - k; i++) {
        combo.push(i);
        enumerate(i + 1, k - 1);
        combo.pop();
      }
    };
    enumerate(0, nA);
    return { p: count / total, exact: true, nA, nB };
  }
  // Monte-Carlo
  let count = 0;
  const N = 10000;
  const pool = all.map((d) => d.x);
  for (let iter = 0; iter < N; iter++) {
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const gA = arr.slice(0, nA), gB = arr.slice(nA);
    if (Math.abs(mean(gB) - mean(gA)) >= absObs - 1e-12) count++;
  }
  return { p: count / N, exact: false, nA, nB };
}

function fmtPct(x, digits = 2) {
  return Number.isFinite(x) ? (x * 100).toFixed(digits) + '%' : '—';
}
function fmtSignedPct(x) {
  return Number.isFinite(x) ? (x >= 0 ? '+' : '') + fmtPct(x) : '—';
}

// ---- 拉取报表（detail=1 拿访客级聚合） ----
const qs = new URLSearchParams({ exp_id: expId, detail: '1' });
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

// ---- 汇总（全量口径） ----
const byVariant = {};
for (const r of report.rows || []) {
  const v = byVariant[r.variant] || (byVariant[r.variant] = {});
  v[r.event] = { n: r.n, visitors: r.visitors };
}
const rangeByVariant = {};
for (const r of report.range || []) rangeByVariant[r.variant] = r;

// ---- 访客明细 + 可疑会话识别 ----
const visitors = (report.visitors || []).map((v) => ({
  ...v,
  ctr: v.impressions > 0 ? v.clicks / v.impressions : NaN,
  suspect: v.span_minutes > SUSPECT_SPAN_MIN || v.page_views > SUSPECT_PAGE_VIEWS,
}));

// ---- 汇总（剔除可疑会话口径） ----
const clean = visitors.filter((v) => !v.suspect);
function aggStats(list) {
  const s = { impression: 0, click: 0, view: 0, page_view: 0, visitors: new Set() };
  for (const v of list) {
    s.impression += v.impressions;
    s.click += v.clicks;
    s.view += v.views;
    s.page_view += v.page_views;
    s.visitors.add(v.visitor_id);
  }
  return s;
}
const cleanA = aggStats(clean.filter((v) => v.variant === 'A'));
const cleanB = aggStats(clean.filter((v) => v.variant === 'B'));

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

// 剔除可疑会话后的 pooled 口径
const cACtr = cleanA.impression ? cleanA.click / cleanA.impression : NaN;
const cBCtr = cleanB.impression ? cleanB.click / cleanB.impression : NaN;
const cUplift = Number.isFinite(cACtr) && Number.isFinite(cBCtr) && cACtr > 0 ? (cBCtr - cACtr) / cACtr : NaN;
const cleanZ = twoProportionZTest(cleanA.click, cleanA.impression, cleanB.click, cleanB.impression);

// 访客级置换检验（只用有曝光的访客）
const aVisitorCtrs = visitors.filter((v) => v.variant === 'A').map((v) => v.ctr);
const bVisitorCtrs = visitors.filter((v) => v.variant === 'B').map((v) => v.ctr);
const perm = visitorPermutationTest(aVisitorCtrs, bVisitorCtrs);

const nSuspect = visitors.filter((v) => v.suspect).length;
const lowSample = Math.min(aVis, bVis) < MIN_VISITORS_PER_ARM;

// ---- 结论（双口径） ----
let verdict;
if (!aImp || !bImp) {
  verdict = '样本不足：至少一组还没有曝光数据，实验尚未有效开始（或流量未到达）。';
} else if (!Number.isFinite(p)) {
  verdict = '无法计算（比例退化，如某组点击为 0）。继续攒样本。';
} else if (p < 0.05 && Number.isFinite(perm.p) && perm.p < 0.05) {
  verdict = diff > 0
    ? `✅ 双口径显著：pooled p=${p.toFixed(4)} 且访客级置换 p=${perm.p.toFixed(3)} 均 <0.05，实验组 B 卡片 CTR 显著更高（相对提升 ${fmtSignedPct(uplift)}）。建议全量保留名称角标。`
    : `✅ 双口径显著：pooled p=${p.toFixed(4)} 且访客级置换 p=${perm.p.toFixed(3)} 均 <0.05，实验组 B 卡片 CTR 显著更低（${fmtSignedPct(uplift)}）。建议撤下名称角标。`;
} else if (p < 0.05 && (!Number.isFinite(perm.p) || perm.p >= 0.05)) {
  verdict = `⚠️ 口径分歧：pooled p=${p.toFixed(4)} 显著，但访客级置换检验 p=${Number.isFinite(perm.p) ? perm.p.toFixed(3) : '—'} 不支持。曝光按访客聚类、当前仅 ${aVis}+${bVis} 个访客，pooled 显著性被高估。方向呈阳性（B ${fmtPct(bCtr)} vs A ${fmtPct(aCtr)}）但**不足以下结论**，继续攒访客。`;
} else if (!Number.isFinite(needN)) {
  verdict = '两组卡片 CTR 暂无可测差异（或某组点击为 0）。继续攒样本后再评估。';
} else if (progress >= 1) {
  verdict = '样本量已达标但仍不显著：名称对 CTR 无可观影响，可判定「无效」并结束实验。';
} else {
  verdict = `尚未显著：pooled p=${Number.isFinite(p) ? p.toFixed(4) : '—'}，访客级 p=${Number.isFinite(perm.p) ? perm.p.toFixed(3) : '—'}；样本量完成度 ${(progress * 100).toFixed(0)}%，继续跑（预计每臂还需约 ${Math.max(0, needN - Math.min(aImp, bImp)).toLocaleString()} 次曝光）。`;
}
if (lowSample && !aImp === false && bImp) {
  verdict += `\n注意：当前每臂访客数（A=${aVis}, B=${bVis}）低于 ${MIN_VISITORS_PER_ARM}，任何 p 值都不稳定，以上判断仅为方向性参考。`;
}

// ---- 终端摘要 ----
console.log(`\n══ 男人宝卡片命名 A/B 实验：${expId} ══`);
console.log(`窗口: ${since || '全部'} ~ ${until || '最新'}   数据范围: ${(rangeByVariant.A && rangeByVariant.A.first_ts) || '—'} ~ ${(rangeByVariant.B && rangeByVariant.B.last_ts) || '—'}`);
console.log('\n【全量口径】');
console.log('组别    访客   曝光     点击    卡片CTR   访客CTR   查看率');
console.log(`A(对照) ${String(aVis).padStart(5)} ${String(aImp).padStart(8)} ${String(aClk).padStart(7)} ${fmtPct(aCtr).padStart(8)} ${fmtPct(aVisCtr).padStart(8)} ${fmtPct(aVtr).padStart(7)}`);
console.log(`B(命名) ${String(bVis).padStart(5)} ${String(bImp).padStart(8)} ${String(bClk).padStart(7)} ${fmtPct(bCtr).padStart(8)} ${fmtPct(bVisCtr).padStart(8)} ${fmtPct(bVtr).padStart(7)}`);
console.log(`\npooled 双比例 z 检验: z=${Number.isFinite(z) ? z.toFixed(2) : '—'}  p=${Number.isFinite(p) ? p.toFixed(4) : '—'}（曝光按访客聚类，访客少时高估显著性）`);
console.log(`访客级置换检验: p=${Number.isFinite(perm.p) ? perm.p.toFixed(3) : '—'}（${perm.exact ? '精确枚举' : 'Monte-Carlo 10000'}，A/B 各有 ${perm.nA}/${perm.nB} 个有曝光访客）`);
if (nSuspect > 0) {
  console.log(`\n【剔除 ${nSuspect} 个可疑会话后】span>${SUSPECT_SPAN_MIN}min 或 page_view>${SUSPECT_PAGE_VIEWS} 的长挂/自访会话`);
  console.log(`A(对照) ${cleanA.impression} 曝光 ${cleanA.click} 点击 CTR=${fmtPct(cACtr)} | B(命名) ${cleanB.impression} 曝光 ${cleanB.click} 点击 CTR=${fmtPct(cBCtr)} | pooled p=${Number.isFinite(cleanZ.p) ? cleanZ.p.toFixed(4) : '—'}`);
}
console.log(`\n相对提升: ${fmtSignedPct(uplift)}   差值 95% CI: [${fmtPct(ciLo)}, ${fmtPct(ciHi)}]`);
console.log(`样本进度: ${Math.min(aImp, bImp).toLocaleString()} / ${needN.toLocaleString()} 每臂（${(progress * 100).toFixed(0)}%）`);

if (visitors.length) {
  console.log('\n【访客明细】');
  console.log('组别  曝光   点击   CTR      span(min)  pv  标记');
  for (const v of [...visitors].sort((x, y) => (x.variant + x.visitor_id).localeCompare(y.variant + y.visitor_id))) {
    console.log(`${v.variant.padEnd(4)} ${String(v.impressions).padStart(5)} ${String(v.clicks).padStart(6)} ${fmtPct(v.ctr).padStart(7)} ${String(v.span_minutes).padStart(9)} ${String(v.page_views).padStart(4)}  ${v.suspect ? '⚠ 可疑' : ''}`);
  }
}
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

## 指标（全量口径）

| 组别 | 访客 | 卡片曝光 | 点击 | 卡片 CTR | 访客级 CTR | 查看率(护栏) |
|---|---:|---:|---:|---:|---:|---:|
| A 对照（无名称） | ${aVis} | ${aImp} | ${aClk} | ${fmtPct(aCtr)} | ${fmtPct(aVisCtr)} | ${fmtPct(aVtr)} |
| B 实验（名称角标） | ${bVis} | ${bImp} | ${bClk} | ${fmtPct(bCtr)} | ${fmtPct(bVisCtr)} | ${fmtPct(bVtr)} |

- 相对提升：${fmtSignedPct(uplift)}
- 差值 95% CI：[${fmtPct(ciLo)}, ${fmtPct(ciHi)}]

## 统计（双口径）

| 口径 | 结果 | 说明 |
|---|---|---|
| pooled 双比例 z 检验 | z=${Number.isFinite(z) ? z.toFixed(2) : '—'}，p=${Number.isFinite(p) ? p.toFixed(4) : '—'} | 曝光按访客聚类，访客少时高估显著性，仅参考 |
| 访客级置换检验 | p=${Number.isFinite(perm.p) ? perm.p.toFixed(3) : '—'}（${perm.exact ? '精确枚举' : 'Monte-Carlo 10000'}） | 以访客级 CTR 为观测单位，对聚类稳健，**结论主依据** |
| 剔除可疑会话后 pooled | A=${fmtPct(cACtr)} vs B=${fmtPct(cBCtr)}，p=${Number.isFinite(cleanZ.p) ? cleanZ.p.toFixed(4) : '—'} | 剔除 span>${SUSPECT_SPAN_MIN}min 或 page_view>${SUSPECT_PAGE_VIEWS} 的长挂/自访会话（本次 ${nSuspect} 个） |

- 80% 功效所需每臂曝光：${needN.toLocaleString()}（当前进度 ${(progress * 100).toFixed(0)}%）

## 访客明细

| 组别 | 曝光 | 点击 | 访客 CTR | 会话跨度(min) | page_view | 标记 |
|---|---:|---:|---:|---:|---:|---|
${visitors.map((v) => `| ${v.variant} | ${v.impressions} | ${v.clicks} | ${fmtPct(v.ctr)} | ${v.span_minutes} | ${v.page_views} | ${v.suspect ? '⚠ 可疑（长挂/自访）' : ''} |`).join('\n')}

## 结论

${verdict}

## 口径说明

- 卡片 CTR = 点击 / 曝光（曝光 = IntersectionObserver ≥50% 可见，每卡每遍一次；点击含积分不足的点击意图）
- 访客级 CTR = 至少点击过一张卡的访客 / 页面访客
- 查看率 = 成功查看大图 / 曝光（护栏：名称不应降低成功查看）
- 实验组 B 中，解析不出规范人物名的图（描述性 subject / 无 DNA）不显示角标
- 可疑会话判定：会话跨度 > ${SUSPECT_SPAN_MIN} 分钟或 page_view > ${SUSPECT_PAGE_VIEWS}（短视频落地正常会话为分钟级；分钟级内多次刷新在 WebView 中常见，不判可疑）
`;
writeFileSync(outFile, md);
console.log(`报告已写入: ${outFile}`);
