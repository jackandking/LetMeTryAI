#!/usr/bin/env node
/**
 * nanrenbao-scratch-baidu-analyze.mjs — 刮刮乐马赛克实验 · 百度统计导出分析。
 *
 * 实验：scratch_exp（beauty-scratch.html + scratch-lottery.html 同款）
 *   5 臂：control（自由刮）/ tile_4 / tile_9 / tile_16 / tile_25
 *   漏斗：start（开始刮）→ half（刮开 ≥50%）→ complete（全部刮开解锁）
 *   百度埋点：_trackEvent('scratch_exp', action, label=臂名, 1)
 *
 * 输入：百度统计后台「事件分析/事件跟踪」报表导出的 CSV/TSV（表头自动识别，
 *   支持中文「事件类别/事件操作/事件标签」与英文 category/action/label），
 *   计数列名兼容 次数/触发次数/count/pv 等。日期列若存在仅用于展示。
 *
 * 用法：
 *   node .automation/scripts/nanrenbao-scratch-baidu-analyze.mjs <导出文件.csv|tsv> [--loads <封面请求TSV>]
 *
 * 输出：
 *   1. 各臂漏斗（start/half/complete）+ 完成率、半途率
 *   2. 各臂 vs control 的双比例 z 检验（完成率、半途率）+ 95% CI
 *   3. 达到 80% 功效所需每臂样本量（按观测效应）
 *   4. 与 nginx 封面请求（页面加载代理）交叉验证：百度 start 是否合理
 *   5. 混淆提醒：按图分流 → 臂=图片组合，磁图分布见 nanrenbao-scratch-arm-audit.mjs
 *
 * 只读：仅读本地文件，无网络请求。
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VARIANTS = ['control', 'tile_4', 'tile_9', 'tile_16', 'tile_25'];
const EVENTS = ['start', 'half', 'complete'];

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const loadsPath = (() => {
  const i = args.indexOf('--loads');
  return i >= 0 ? args[i + 1] : join(homedir(), 'LetMeTryAI/.automation/reports/nrb_cover_counts.tsv');
})();

if (!file || !existsSync(file)) {
  console.error('用法: node nanrenbao-scratch-baidu-analyze.mjs <百度导出.csv|tsv> [--loads 封面请求TSV]');
  process.exit(1);
}

// ---- 统计工具（与 nanrenbao-exp-analyze.mjs 一致）----
function normalCdf(x) {
  const sign = x < 0 ? -1 : 1;
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const y = 1 - Math.exp((-x * x) / 2) / Math.sqrt(2 * Math.PI) * poly;
  return 0.5 * (1 + sign * y);
}
function twoProportionZTest(x1, n1, x2, n2) {
  if (!n1 || !n2) return { z: NaN, p: NaN };
  const p1 = x1 / n1, p2 = x2 / n2;
  const pBar = (x1 + x2) / (n1 + x2 === 0 ? 1 : n1 + n2);
  const se = Math.sqrt(pBar * (1 - pBar) * (1 / n1 + 1 / n2));
  if (!se) return { z: NaN, p: NaN };
  const z = (p2 - p1) / se;
  return { z, p: 2 * (1 - normalCdf(Math.abs(z))) };
}
function ci95(x, n) {
  if (!n) return [NaN, NaN];
  const p = x / n;
  const h = 1.96 * Math.sqrt((p * (1 - p)) / n);
  return [Math.max(0, p - h), Math.min(1, p + h)];
}
function requiredNPerArm(p1, p2, alpha = 0.05, power = 0.8) {
  const za = 1.96, zb = p2 > p1 ? 0.8416 : -0.8416;
  const d = Math.abs(p2 - p1);
  if (!d) return Infinity;
  const pBar = (p1 + p2) / 2;
  return Math.ceil(((za + zb) ** 2 * 2 * pBar * (1 - pBar)) / (d * d));
}

// ---- 解析导出文件 ----
const raw = readFileSync(file, 'utf8');
const delim = raw.includes('\t') ? '\t' : ',';
const lines = raw.split(/\r?\n/).filter((l) => l.trim());
if (lines.length < 2) {
  console.error('文件内容不足：至少需要表头 + 1 行数据');
  process.exit(1);
}
const header = lines[0].split(delim).map((h) => h.trim().replace(/^"|"$/g, ''));
const col = (names) => header.findIndex((h) => names.some((n) => h === n || h.includes(n)));
const iAction = col(['事件操作', '操作', 'action']);
const iLabel = col(['事件标签', '标签', 'label', '事件标签(label)']);
const iCount = col(['触发次数', '次数', '事件次数', 'count', 'pv', '浏览量']);
const iCat = col(['事件类别', '类别', 'category']);

if (iAction < 0 || iLabel < 0 || iCount < 0) {
  console.error('无法识别表头。需要：操作/action、标签/label、次数/count 三列。');
  console.error('实际表头: ' + JSON.stringify(header));
  process.exit(1);
}

// 聚合：counts[action][label] = n（同类多行求和）
const counts = {};
let catSeen = new Set();
for (const line of lines.slice(1)) {
  const c = line.split(delim).map((x) => x.trim().replace(/^"|"$/g, ''));
  const action = c[iAction], label = c[iLabel];
  const n = Number(String(c[iCount]).replace(/[,\s]/g, '')) || 0;
  if (iCat >= 0 && c[iCat]) catSeen.add(c[iCat]);
  if (!EVENTS.includes(action) || !VARIANTS.includes(label)) continue; // 忽略非本实验事件
  counts[action] = counts[action] || {};
  counts[action][label] = (counts[action][label] || 0) + n;
}

const get = (a, v) => (counts[a] && counts[a][v]) || 0;
const totalStart = VARIANTS.reduce((s, v) => s + get('start', v), 0);
if (!totalStart) {
  console.error('未解析到任何 scratch_exp 事件。请确认：① 导出范围含 10-15 起；② 事件类别含 scratch_exp；③ 表头可识别。');
  if (catSeen.size) console.error('文件中出现的事件类别: ' + [...catSeen].join(', '));
  process.exit(1);
}

// ---- nginx 封面请求（页面加载代理，按臂）----
let armLoads = null;
if (existsSync(loadsPath)) {
  try {
    const VARIANTS_HASH = VARIANTS;
    function hashStr(s) { let h = 2166136261; s = String(s); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    const armOf = (id) => VARIANTS_HASH[hashStr('nrbsalt_' + id) % 5];
    // 需要 id→cover 映射：与 arm-audit 共用 images TSV（同目录）
    const imagesPath = join(homedir(), 'LetMeTryAI/.automation/reports/nrb_images.tsv');
    if (existsSync(imagesPath)) {
      const coverToArm = new Map();
      for (const line of readFileSync(imagesPath, 'utf8').split('\n')) {
        if (!line.trim()) continue;
        const [id, , url] = line.split('\t');
        if (id && url) coverToArm.set(url.split('/').pop(), armOf(id));
      }
      armLoads = Object.fromEntries(VARIANTS.map((v) => [v, 0]));
      for (const line of readFileSync(loadsPath, 'utf8').split('\n')) {
        const m = line.trim().match(/^\s*(\d+)\s+(\S+)$/);
        if (!m) continue;
        const a = coverToArm.get(m[2]);
        if (a) armLoads[a] += Number(m[1]);
      }
    }
  } catch (e) { /* 交叉验证缺失不阻塞 */ }
}

// ---- 输出 ----
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
const pct = (x) => (Number.isFinite(x) ? (x * 100).toFixed(1) + '%' : '-');

console.log('== 刮刮乐马赛克实验 · 百度导出分析（scratch_exp）==\n');
console.log(pad('臂', 10) + padL('start', 9) + padL('half', 9) + padL('complete', 10) + padL('完成率', 10) + padL('半途率', 10) + padL('完成95%CI', 18));
const funnel = {};
for (const v of VARIANTS) {
  const s = get('start', v), h = get('half', v), c = get('complete', v);
  const cr = s ? c / s : NaN, hr = s ? h / s : NaN;
  funnel[v] = { s, h, c, cr, hr };
  const [lo, hi] = ci95(c, s);
  console.log(pad(v, 10) + padL(s, 9) + padL(h, 9) + padL(c, 10) + padL(pct(cr), 10) + padL(pct(hr), 10) + padL(s ? `[${pct(lo)}, ${pct(hi)}]` : '-', 18));
}

console.log('\n== 各臂 vs control（双比例 z 检验，α=0.05 双侧）==');
console.log(pad('臂', 10) + padL('完成率差', 12) + padL('z', 8) + padL('p', 10) + padL('半途率差', 12) + padL('z', 8) + padL('p', 10));
for (const v of VARIANTS.slice(1)) {
  const a = funnel.control, b = funnel[v];
  const t1 = twoProportionZTest(a.c, a.s, b.c, b.s);
  const t2 = twoProportionZTest(a.h, a.s, b.h, b.s);
  console.log(
    pad(v, 10) +
    padL(pct(b.cr - a.cr), 12) + padL(t1.z.toFixed(2), 8) + padL(t1.p < 0.001 ? '<0.001' : t1.p.toFixed(3), 10) +
    padL(pct(b.hr - a.hr), 12) + padL(t2.z.toFixed(2), 8) + padL(t2.p < 0.001 ? '<0.001' : t2.p.toFixed(3), 10)
  );
}

console.log('\n== 样本量判读（80% 功效，相对当前观测效应）==');
for (const v of VARIANTS.slice(1)) {
  const need = requiredNPerArm(funnel.control.cr, funnel[v].cr);
  const have = Math.min(funnel.control.s, funnel[v].s);
  console.log(`  ${pad(v, 10)} 需 ~${Number.isFinite(need) ? need : '∞'} /臂，现有 ~${have} /臂 ${have >= need ? '✓ 已够' : '✗ 不足'}`);
}

if (armLoads) {
  console.log('\n== 与 nginx 封面请求（页面加载代理）交叉验证 ==');
  console.log(pad('臂', 10) + padL('百度start', 12) + padL('nginx加载', 12) + padL('start/加载', 12));
  for (const v of VARIANTS) {
    const ratio = armLoads[v] ? funnel[v].s / armLoads[v] : NaN;
    console.log(pad(v, 10) + padL(funnel[v].s, 12) + padL(armLoads[v], 12) + padL(ratio.toFixed(3), 12));
  }
  const totalLoads = VARIANTS.reduce((s, v) => s + armLoads[v], 0);
  console.log(`\n  参考：百度 start 合计 ${totalStart}，nginx 封面请求合计 ${totalLoads}（缓存/拦截会令两者不等）；start/加载 整体 ${pct(totalStart / totalLoads)}。`);
  console.log('  若某臂 start/加载 显著偏离其他臂 → 该臂用户更早退出（未开始刮）或埋点丢失，需结合半途率判读。');
}

console.log('\n== 混淆警告（必读）==');
console.log('  本实验按「图片 ID 哈希」分流：臂 = 图片组合。快手挂载磁图（657/718 等）分布不均');
console.log('  （tile_9 含 718=81 次深链；tile_16/25 无磁图）→ 臂间差异混有「图片吸引力/深链意图」差异。');
console.log('  结论规则：① 若各臂完成率差异 <10pp 或方向不一致 → 视为无差异；② 若 tile_16/25 显著低，');
console.log('  方向可信（块多=累）但幅度含图片混淆，严格结论需访客粘性分流重跑（见选项 A）。');
