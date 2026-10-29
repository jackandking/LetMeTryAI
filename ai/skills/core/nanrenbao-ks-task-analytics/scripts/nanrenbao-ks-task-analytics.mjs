/**
 * nanrenbao-ks-task-analytics.mjs — 男人宝快手小程序「任务级挂载分析」
 * 数据源: GET /openapi/mp/developer/plc/photo/query (短视频挂载明细, 只读)
 *   快照复用/刷新与 nanrenbao-page-usage.mjs 同源同文件 (ks-mp-mounted-videos.json)
 *
 * 与兄弟 skill 的边界:
 *   nanrenbao-page-usage      页面级(挂载目标 H5 粒度, 如 beauty-scratch 整页)
 *   nanrenbao-ad-revenue      收入级(激励视频广告)
 *   本 skill                  任务级(beauty-scratch?id=N 的单图任务) + 农场号过滤 + 发布日脉冲
 *
 * 用法:
 *   node nanrenbao-ks-task-analytics.mjs                          # 全量: 新鲜度+每日趋势+任务Top+达人Top
 *   node nanrenbao-ks-task-analytics.mjs --since 2026-10-22       # 只统计该日期起(含)
 *   node nanrenbao-ks-task-analytics.mjs --ids 830,834,835,836    # 聚焦模式: 指定任务配对对比(实验复盘用)
 *   node nanrenbao-ks-task-analytics.mjs --days 14                # 趋势窗天数(默认14)
 *   node nanrenbao-ks-task-analytics.mjs --top 10                 # Top N(默认10)
 *   node nanrenbao-ks-task-analytics.mjs --no-fetch               # 复用本地快照不拉取(调试用)
 *   node nanrenbao-ks-task-analytics.mjs --names map.json         # 追加 id→人物 映射(老图无 prompt-log 记录时用)
 *
 * 输出(OUT_DIR=~/LetMeTryAI/.automation/reports, 可用 KS_TASK_ANALYTICS_OUT 覆盖):
 *   ks-task-analytics-<latest>.md    报告(口径+趋势+任务Top+达人Top+聚焦对比)
 *   ks-task-analytics-<latest>.csv   任务级汇总长表
 *   ks-task-analytics-<latest>.json  聚合原始数据
 *
 * 口径铁律(踩坑沉淀, 改代码前读):
 *   1. 挂载 API 延迟约 2 天(不是 T-1)! 今日发布的任务最早 T+2 可见, 复盘排期按 T+2。
 *   2. 农场号必须过滤: 单日跨≥3 个不同 beauty 任务挂载的账号(星火激励计划末端刷量),
 *      原始挂载数会被灌水, 任何汇报都不能用未过滤的数。
 *   3. 主 KPI=有机达人增量(剔除农场号后按作者去重); 进/播是辅助(历史带 0.07%~0.16%)。
 *   4. 低播放高进入(播放<1000 且进入≥5 且进/播>1%)= 激励末端刷量号, 标记不计 KPI。
 *   5. 只统计 beauty-scratch 任务; 其他挂载目标(emperor/cr7/back-view-killer 等)单列一行备查。
 */
import fs from 'fs';
import path from 'path';

const CREDS = '/Users/jak/.secrets/ks_mp_creds.json';
const TOKEN_FILE = '/tmp/ks_access_token.txt';
const OUT_DIR = process.env.KS_TASK_ANALYTICS_OUT || path.join(process.env.HOME, 'LetMeTryAI/.automation/reports');
const PROMPT_LOG = process.env.PROMPT_LOG || path.join(process.env.HOME, 'LetMeTryAI/nanrenbao/flywheel/prompt-log.jsonl');

// ─── 参数 ────────────────────────────────────────────────────────────────────
const argVal = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : undefined; };
const SINCE = (argVal('--since') || '').trim();
const IDS = (argVal('--ids') || '').split(',').map(s => s.trim()).filter(Boolean);
const TREND_DAYS = argVal('--days') ? Number(argVal('--days')) : 14;
const TOPN = argVal('--top') ? Number(argVal('--top')) : 10;
const NO_FETCH = process.argv.includes('--no-fetch');
const NAMES_FILE = argVal('--names');

// ─── 快手开放平台 ─────────────────────────────────────────────────────────────
async function getToken() {
  let token;
  try { token = fs.readFileSync(TOKEN_FILE, 'utf8').trim(); } catch {}
  if (token && token.length >= 10) return token;
  const { app_id, app_secret } = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
  const r = await fetch(`https://open.kuaishou.com/oauth2/access_token?grant_type=client_credentials&app_id=${app_id}&app_secret=${app_secret}`);
  const j = await r.json();
  if (!j.access_token) throw new Error('token failed: ' + j.error_msg);
  fs.writeFileSync(TOKEN_FILE, j.access_token, { mode: 0o600 });
  return j.access_token;
}

async function fetchAll(token, app_id) {
  const all = [];
  let cursor = '0';
  for (let page = 0; page < 20; page++) {
    const url = `https://open.kuaishou.com/openapi/mp/developer/plc/photo/query?page_size=500&cursor=${cursor}&access_token=${token}&app_id=${app_id}`;
    const j = await (await fetch(url)).json();
    if (j.result !== 1) throw new Error('plc/photo/query failed: ' + (j.error_msg || JSON.stringify(j).slice(0, 200)));
    const recs = j.data?.records?.plcPhotoDetailList || [];
    all.push(...recs);
    const next = j.data?.next_cursor;
    if (!next || next === '0' || next === cursor || recs.length === 0) break;
    cursor = next;
  }
  return all;
}

// ─── 任务标识 ────────────────────────────────────────────────────────────────
// 只认 beauty-scratch?id=N → 'N'; 其余挂载目标(emperor/cr7/back-view-killer…)返回 null,
// 由 otherTargets 单列备查, 不进任务表(铁律5)。
function taskIdOf(v) {
  const p = v.plcMntPath || '';
  const m = p.match(/beauty-scratch\?id=(\d+)/);
  return m ? m[1] : null;
}
function otherTargetOf(v) {
  const p = v.plcMntPath || '';
  const m = p.match(/target=([^&]+)/);
  if (m) return m[1].split('?')[0];
  const pg = p.match(/pages\/([^/?]+)/);
  return pg ? pg[1] : 'index';
}
const dayOf = (v) => (v.uploadDt || '').slice(0, 10);

// ─── 人物名映射(prompt-log + 可选 --names) ─────────────────────────────────
function loadNames() {
  const map = {};
  try {
    for (const line of fs.readFileSync(PROMPT_LOG, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line);
        const subj = (r.dna && r.dna.subject) || '';
        if (r.db_id != null && subj) map[String(r.db_id)] = subj;
      } catch {}
    }
  } catch {}
  if (NAMES_FILE) {
    try { Object.assign(map, JSON.parse(fs.readFileSync(NAMES_FILE, 'utf8'))); } catch (e) { console.log('⚠️ names 文件读取失败:', e.message); }
  }
  return map;
}
const labelOf = (key, names) => {
  const subj = names[key];
  if (!subj) return `id${key}`;
  const s = subj.split('reinterpret')[0].replace(/[，,]\s*$/, '').trim();
  return s.length > 22 ? s.slice(0, 22) + '…' : s;
};

// ─── 取数 ────────────────────────────────────────────────────────────────────
let videos;
if (NO_FETCH) {
  videos = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'ks-mp-mounted-videos.json'), 'utf8'));
  console.log(`复用本地快照: ${videos.length} 条`);
} else {
  const { app_id } = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
  let token = await getToken();
  try {
    videos = await fetchAll(token, app_id);
  } catch (e) {
    if (!/token/i.test(e.message)) throw e;
    try { fs.unlinkSync(TOKEN_FILE); } catch {}
    token = await getToken();
    videos = await fetchAll(token, app_id);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'ks-mp-mounted-videos.json'), JSON.stringify(videos, null, 1));
  console.log(`拉取挂载视频: ${videos.length} 条`);
}
if (!videos.length) { console.log('无数据'); process.exit(0); }

// ─── 数据新鲜度(铁律1: 延迟约2天) ─────────────────────────────────────────────
const allDays = [...new Set(videos.map(dayOf))].filter(Boolean).sort();
const latestDay = allDays[allDays.length - 1];
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const staleDays = Math.round((new Date(today) - new Date(latestDay)) / 86400000);
if (staleDays >= 1) console.log(`⚠️ 数据最新日为 ${latestDay}(今天 ${today}), 接口延迟约 ${staleDays} 天——今日发布的任务此刻不可见, 勿把旧数据当当日数据`);

// ─── 预分流: beauty 任务 vs 其他目标 ─────────────────────────────────────────
const recs = [];          // {v, id, day, author}
const otherTargets = {};  // 其他挂载目标 → 条数(备查, 不进表)
for (const v of videos) {
  const id = taskIdOf(v);
  if (id) { recs.push({ v, id, day: dayOf(v), author: v.authorName || '(未知)' }); continue; }
  const t = otherTargetOf(v);
  otherTargets[t] = (otherTargets[t] || 0) + 1;
}

// ─── 农场号识别(铁律2, 仅 beauty 口径) ───────────────────────────────────────
const byAuthor = new Map();
for (const r of recs) {
  if (!byAuthor.has(r.author)) byAuthor.set(r.author, []);
  byAuthor.get(r.author).push(r);
}
const farm = new Set();
for (const [a, lst] of byAuthor) {
  const days = new Set(lst.map(x => x.day));
  const ids = new Set(lst.map(x => x.id));
  if (days.size === 1 && ids.size >= 3) farm.add(a);
}
const isFarm = (a) => farm.has(a);
const isBrush = (v) => (v.plcClickEnterCnt || 0) >= 5 && (v.displayPlayCnt || 0) > 0 && (v.displayPlayCnt || 0) < 1000 && (v.plcClickEnterCnt / v.displayPlayCnt) > 0.01;

// ─── 窗口过滤 ────────────────────────────────────────────────────────────────
const scope = SINCE ? recs.filter(r => r.day >= SINCE) : recs;
const scopeLabel = SINCE ? `${SINCE} 起` : '全历史';
const organicCnt = scope.filter(r => !isFarm(r.author)).length;

// ─── 每日趋势(有机 vs 农场) ───────────────────────────────────────────────────
const daily = {};
for (const r of scope) {
  (daily[r.day] = daily[r.day] || { organic: 0, farm: 0 });
  if (isFarm(r.author)) daily[r.day].farm++;
  else daily[r.day].organic++;
}
const trendDays = Object.keys(daily).sort().slice(-TREND_DAYS);

// ─── 任务级聚合 ──────────────────────────────────────────────────────────────
const agg = {};
for (const r of scope) {
  (agg[r.id] = agg[r.id] || { task: r.id, total: 0, farm: 0, authors: new Set(), plays: 0, enter: 0, click: 0, days: {}, brush: 0 });
  const a = agg[r.id];
  a.total++;
  if (isFarm(r.author)) { a.farm++; continue; }
  if (isBrush(r.v)) a.brush++;
  a.authors.add(r.author);
  a.plays += r.v.displayPlayCnt || 0;
  a.enter += r.v.plcClickEnterCnt || 0;
  a.click += r.v.plcClickCnt || 0;
  a.days[r.day] = (a.days[r.day] || 0) + 1;
}
const names = loadNames();
const tasks = Object.values(agg).map(a => {
  const dayKeys = Object.keys(a.days);
  const peakDay = dayKeys.sort((x, y) => a.days[y] - a.days[x])[0] || '';
  const peakCnt = a.days[peakDay] || 0;
  return {
    ...a,
    label: labelOf(a.task, names),
    creators: a.authors.size,
    days: dayKeys.length,
    peakDay, peakCnt,
    peakShare: a.total ? peakCnt / a.total : 0,
    enterPerPlay: a.plays ? a.enter / a.plays * 100 : 0,
  };
});
const byCreators = [...tasks].sort((x, y) => y.creators - x.creators || y.plays - x.plays);

// ─── 达人级聚合(有机) ────────────────────────────────────────────────────────
const creators = {};
for (const r of scope) {
  if (isFarm(r.author)) continue;
  (creators[r.author] = creators[r.author] || { author: r.author, videos: 0, plays: 0, enter: 0, ids: new Set(), brushVideos: 0 });
  const c = creators[r.author];
  c.videos++;
  c.plays += r.v.displayPlayCnt || 0;
  c.enter += r.v.plcClickEnterCnt || 0;
  c.ids.add(r.id);
  if (isBrush(r.v)) c.brushVideos++;
}
const creatorRows = Object.values(creators).map(c => ({
  ...c,
  taskCount: c.ids.size,
  taskList: [...c.ids].sort((x, y) => Number(y) - Number(x)).join('/'),
  enterPerPlay: c.plays ? c.enter / c.plays * 100 : 0,
  flag: c.brushVideos > 0 ? '⚠️刷量嫌疑' : (c.ids.size >= 5 ? '⚠️多任务型' : ''),
})).sort((x, y) => y.enter - x.enter || y.plays - x.plays);

// ─── 控制台报告 ──────────────────────────────────────────────────────────────
const n = (x) => Number(x || 0).toLocaleString();
const pct = (a, b) => b ? (a / b * 100).toFixed(2) : '-';
console.log(`\n════ 任务级挂载分析 (${scopeLabel}, beauty任务 ${scope.length} 条, 有机 ${organicCnt} 条) ════`);
console.log(`农场号 ${farm.size} 个: ${[...farm].slice(0, 6).join(', ') || '无'}${farm.size > 6 ? ' …' : ''}`);
const others = Object.entries(otherTargets).sort((a, b) => b[1] - a[1]);
if (others.length) console.log(`其他挂载目标(不进表): ${others.map(([t, c]) => `${t}×${c}`).join(', ')}`);

console.log(`\n── 每日挂载趋势(近${TREND_DAYS}天, beauty任务) ──`);
for (const d of trendDays) {
  const x = daily[d];
  const bar = '▉'.repeat(Math.min(40, x.organic));
  console.log(`  ${d}  有机${String(x.organic).padStart(3)} ${bar}${x.farm ? `  (农场${x.farm})` : ''}`);
}

console.log(`\n── 任务 Top${TOPN}(按有机达人, 已剔农场) ──`);
console.log(`  ${'任务'.padStart(5)} ${'人物'.padEnd(20)} ${'达人'.padStart(3)} ${'总挂载'.padStart(4)} ${'播放'.padStart(8)} ${'进入'.padStart(4)} ${'进/播'.padStart(6)} 跨天 峰值日`);
for (const t of byCreators.slice(0, TOPN)) {
  console.log(`  ${String(t.task).padStart(5)} ${t.label.padEnd(20)} ${String(t.creators).padStart(3)} ${String(t.total).padStart(4)} ${n(t.plays).padStart(8)} ${n(t.enter).padStart(4)} ${pct(t.enter, t.plays).padStart(6)} ${String(t.days).padStart(4)} ${t.peakDay}(${t.peakCnt})`);
}

console.log(`\n── 达人 Top${TOPN}(有机, 按进入) ──`);
for (const c of creatorRows.slice(0, TOPN)) {
  console.log(`  ${c.author.padEnd(16)} ${String(c.videos).padStart(2)}条 播放${n(c.plays).padStart(8)} 进入${n(c.enter).padStart(4)} 进/播${pct(c.enter, c.plays).padStart(6)} 任务:${c.taskList.slice(0, 30)} ${c.flag}`);
}

// ─── 聚焦模式(实验复盘: 配对比较) ─────────────────────────────────────────────
if (IDS.length) {
  const latestOrganic = daily[latestDay] ? daily[latestDay].organic : 0;
  console.log(`\n════ 聚焦模式: ${IDS.join(' vs ')} ════`);
  if (latestOrganic < 10) console.log(`⚠️ 最新日(${latestDay})全平台有机挂载仅 ${latestOrganic} <10 → 判定无效轮, 结论不可信, 建议重跑`);
  console.log(`  ${'任务'.padStart(5)} ${'人物'.padEnd(20)} ${'达人'.padStart(3)} ${'总挂载'.padStart(4)} ${'播放'.padStart(8)} ${'进入'.padStart(4)} ${'进/播'.padStart(6)} 跨天 峰值日(占比)`);
  for (const id of IDS) {
    const row = tasks.find(x => x.task === id);
    if (!row) { console.log(`  ${String(id).padStart(5)} ${'(无挂载记录)'.padEnd(20)}`); continue; }
    console.log(`  ${String(id).padStart(5)} ${row.label.padEnd(20)} ${String(row.creators).padStart(3)} ${String(row.total).padStart(4)} ${n(row.plays).padStart(8)} ${n(row.enter).padStart(4)} ${pct(row.enter, row.plays).padStart(6)} ${String(row.days).padStart(4)} ${row.peakDay}(${(row.peakShare * 100).toFixed(0)}%)`);
  }
  console.log('  配对比较: 主 KPI=有机达人; 进/播仅辅助(小样本); 结论外推需多图多日重复');
}

// ─── 文件输出 ────────────────────────────────────────────────────────────────
const stamp = latestDay.replace(/-/g, '');
fs.mkdirSync(OUT_DIR, { recursive: true });
const csvEsc = (s) => `"${String(s).replace(/"/g, '""')}"`;
const csvHeader = ['任务id', '人物', '总挂载', '农场挂载', '有机达人', '播放', '点击', '进入', '进/播%', '跨天数', '峰值日', '峰值挂载', '刷量嫌疑视频'];
const csvRows = byCreators.map(t => [t.task, t.label, t.total, t.farm, t.creators, t.plays, t.click, t.enter, pct(t.enter, t.plays), t.days, t.peakDay, t.peakCnt, t.brush].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, `ks-task-analytics-${stamp}.csv`), '\uFEFF' + [csvHeader.join(','), ...csvRows].join('\n'));

const md = [];
md.push(`# 男人宝快手小程序 · 任务级挂载分析 (${scopeLabel})`);
md.push('');
md.push(`- 数据源: plc/photo/query (挂载明细, 拉取于 ${new Date().toLocaleString('zh-CN')})`);
md.push(`- 口径: 任务=beauty-scratch?id=N; 达人=authorName; 有机=剔除农场号(单日跨≥3任务); 主 KPI=有机达人增量`);
md.push(`- ⚠️ 数据最新日 ${latestDay} (接口延迟约2天, 今日发布的任务此刻不可见)`);
md.push(`- 农场号 ${farm.size} 个: ${[...farm].join(', ') || '无'}`);
if (others.length) md.push(`- 其他挂载目标(不进表): ${others.map(([t, c]) => `${t}×${c}`).join(', ')}`);
md.push('');
md.push('## 每日挂载趋势');
md.push('| 日期 | 有机挂载 | 农场挂载 |');
md.push('|---|---|---|');
for (const d of trendDays) md.push(`| ${d} | ${daily[d].organic} | ${daily[d].farm || 0} |`);
md.push('');
md.push(`## 任务 Top${TOPN} (按有机达人)`);
md.push('| 任务 | 人物 | 有机达人 | 总挂载 | 播放 | 进入 | 进/播% | 跨天 | 峰值日 |');
md.push('|---|---|---|---|---|---|---|---|---|');
for (const t of byCreators.slice(0, TOPN)) md.push(`| ${t.task} | ${t.label} | ${t.creators} | ${t.total} | ${n(t.plays)} | ${n(t.enter)} | ${pct(t.enter, t.plays)} | ${t.days} | ${t.peakDay}(${t.peakCnt}) |`);
md.push('');
md.push(`## 达人 Top${TOPN} (有机, 按进入)`);
md.push('| 达人 | 视频 | 播放 | 进入 | 进/播% | 任务 | 标记 |');
md.push('|---|---|---|---|---|---|---|');
for (const c of creatorRows.slice(0, TOPN)) md.push(`| ${c.author} | ${c.videos} | ${n(c.plays)} | ${n(c.enter)} | ${pct(c.enter, c.plays)} | ${c.taskList.slice(0, 40)} | ${c.flag} |`);
md.push('');
if (IDS.length) {
  md.push(`## 聚焦: ${IDS.join(' vs ')}`);
  md.push('| 任务 | 人物 | 有机达人 | 总挂载 | 播放 | 进入 | 进/播% | 跨天 | 峰值日(占比) |');
  md.push('|---|---|---|---|---|---|---|---|---|');
  for (const id of IDS) {
    const row = tasks.find(x => x.task === id);
    if (!row) { md.push(`| ${id} | (无挂载记录) | - | - | - | - | - | - | - |`); continue; }
    md.push(`| ${id} | ${row.label} | ${row.creators} | ${row.total} | ${n(row.plays)} | ${n(row.enter)} | ${pct(row.enter, row.plays)} | ${row.days} | ${row.peakDay}(${(row.peakShare * 100).toFixed(0)}%) |`);
  }
  md.push('');
}
fs.writeFileSync(path.join(OUT_DIR, `ks-task-analytics-${stamp}.md`), md.join('\n'));
fs.writeFileSync(path.join(OUT_DIR, `ks-task-analytics-${stamp}.json`), JSON.stringify({
  scope: scopeLabel, latestDay, generatedAt: new Date().toISOString(),
  farmAccounts: [...farm],
  otherTargets,
  daily: trendDays.map(d => ({ day: d, ...daily[d] })),
  tasks: byCreators.map(t => ({ ...t, authors: undefined })),
  creators: creatorRows.map(c => ({ ...c, ids: undefined })),
  focus: IDS.length ? IDS.map(id => { const t = tasks.find(x => x.task === id); return t ? { task: id, label: t.label, creators: t.creators, plays: t.plays, enter: t.enter, enterPerPlay: +t.enterPerPlay.toFixed(3), days: t.days, peakDay: t.peakDay, peakShare: +t.peakShare.toFixed(2) } : { task: id, missing: true }; }) : undefined,
}, null, 1));

console.log(`\n输出: ${OUT_DIR}/ks-task-analytics-${stamp}.{md,csv,json}`);
