/**
 * nanrenbao-page-usage.mjs — 男人宝快手小程序「各页面被达人使用情况」查询
 * 数据源: GET /openapi/mp/developer/plc/photo/query (短视频挂载明细, 只读)
 *
 * 概念:
 *   页面 = plcMntPath 的挂载目标(H5), 如 nanrenbao/back-view-killer / index / beauty-scratch?id=636
 *          (beauty-scratch?id=N 按基础页 beauty-scratch 归并, 原目标记入「细分」)
 *   达人 = authorName; 「使用」= 达人把短视频挂载到该页面(挂载即使用, 与是否接单无关)
 *
 * 用法:
 *   node nanrenbao-page-usage.mjs                  # 最近一天(=数据最新日) + 近7日上下文
 *   node nanrenbao-page-usage.mjs --days 3         # 最近3天
 *   node nanrenbao-page-usage.mjs --date 20261015  # 指定日期(数据里的最新日兜底)
 *   node nanrenbao-page-usage.mjs --top 5          # 每页展示Top N达人(默认3)
 *   node nanrenbao-page-usage.mjs --no-fetch       # 复用本地快照不重新拉取(调试用)
 *
 * 输出(OUT_DIR=~/LetMeTryAI/.automation/reports):
 *   ks-page-usage-<latest>.md          当日报告(页面×达人)
 *   ks-page-usage-<latest>.csv         页面级汇总
 *   ks-page-usage-<latest>-authors.csv 页面×达人明细
 *   ks-page-usage-<latest>.json        聚合原始数据
 */
import fs from 'fs';
import path from 'path';

const CREDS = '/Users/jak/.secrets/ks_mp_creds.json';
const TOKEN_FILE = '/tmp/ks_access_token.txt';
const OUT_DIR = process.env.PAGE_USAGE_OUT || path.join(process.env.HOME, 'LetMeTryAI/.automation/reports');
const NODE = process.execPath;

// ─── 参数 ────────────────────────────────────────────────────────────────────
const argVal = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : undefined; };
const DAYS = argVal('--days') ? Number(argVal('--days')) : 1;
const DATE = (argVal('--date') || '').replace(/-/g, '');
const TOPN = argVal('--top') ? Number(argVal('--top')) : 3;
const NO_FETCH = process.argv.includes('--no-fetch');

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

// ─── 页面解析 ────────────────────────────────────────────────────────────────
function rawTarget(v) {
  const p = v.plcMntPath || '';
  const m = p.match(/target=([^&]+)/);
  if (m) return m[1];
  const pg = p.match(/pages\/([^/?]+)/);
  return pg ? pg[1] : 'index';
}
const pageBase = (t) => t.split('?')[0];           // beauty-scratch?id=636 → beauty-scratch
const variant = (t) => { const m = t.match(/\?(.+)$/); return m ? m[1] : ''; };
const dayOf = (v) => (v.uploadDt || '').slice(0, 10);

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
    // token 过期(48h)时清缓存重新换取, 重试一次
    if (!/token/i.test(e.message)) throw e;
    try { fs.unlinkSync(TOKEN_FILE); } catch {}
    token = await getToken();
    videos = await fetchAll(token, app_id);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'ks-mp-mounted-videos.json'), JSON.stringify(videos, null, 1));
  console.log(`拉取挂载视频: ${videos.length} 条 (${dayOf(videos[0] || {})} ~ ${dayOf(videos[videos.length - 1] || {})})`);
}
if (!videos.length) { console.log('无数据'); process.exit(0); }

// ─── 时间窗 ──────────────────────────────────────────────────────────────────
const allDays = [...new Set(videos.map(dayOf))].sort();
const latestDay = DATE ? allDays.filter(d => d.replace(/-/g, '') >= DATE).sort()[0] || allDays[allDays.length - 1] : allDays[allDays.length - 1];
const winDays = [];
for (let i = 0; i < DAYS; i++) {
  const idx = allDays.indexOf(latestDay) - i;
  if (idx >= 0) winDays.push(allDays[idx]);
}
const inWin = videos.filter(v => winDays.includes(dayOf(v)));
const ctxDays = allDays.slice(-7);                 // 近7日上下文(含窗口)
const inCtx = videos.filter(v => ctxDays.includes(dayOf(v)));

// 全历史首次出现日(用于识别窗口内新达人)
const firstSeen = {};
for (const v of videos) {
  const a = v.authorName || '(未知)';
  if (!firstSeen[a] || dayOf(v) < firstSeen[a]) firstSeen[a] = dayOf(v);
}

// ─── 聚合 ────────────────────────────────────────────────────────────────────
function blank() { return { videos: 0, authors: new Set(), plays: 0, show: 0, click: 0, enter: 0, submit: 0, pay: 0, payAmt: 0, variants: {} }; }
function acc(s, v) {
  s.videos++;
  if (s.authors) s.authors.add(v.authorName || '(未知)');
  s.plays += v.displayPlayCnt || 0;
  s.show += v.plcShowCnt || 0;
  s.click += v.plcClickCnt || 0;
  s.enter += v.plcClickEnterCnt || 0;
  s.submit += v.submitOrderNum || 0;
  s.pay += v.payOrderNum || 0;
  s.payAmt += v.payOrderAmt || 0;
}
const byPage = {}, byPageAuthor = {};
for (const v of inWin) {
  const pg = pageBase(rawTarget(v));
  (byPage[pg] = byPage[pg] || blank());
  acc(byPage[pg], v);
  const rt = rawTarget(v);
  byPage[pg].variants[rt] = (byPage[pg].variants[rt] || 0) + 1;
  const key = pg + '|' + (v.authorName || '(未知)');
  (byPageAuthor[key] = byPageAuthor[key] || { page: pg, author: v.authorName || '(未知)', videos: 0, plays: 0, enter: 0, click: 0, show: 0 });
  acc(byPageAuthor[key], v);
}
const byPageCtx = {};
for (const v of inCtx) {
  const pg = pageBase(rawTarget(v));
  (byPageCtx[pg] = byPageCtx[pg] || blank());
  acc(byPageCtx[pg], v);
}

const pages = Object.entries(byPage).map(([pg, s]) => {
  const topVariants = Object.entries(s.variants).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t, k]) => `${t}×${k}`).join(', ');
  return { ...s, page: pg, topVariants, ctr: s.show ? s.click / s.show * 100 : 0, enterPerPlay: s.plays ? s.enter / s.plays * 100 : 0 };
}).sort((a, b) => b.enter - a.enter || b.plays - a.plays);

const pct = (a, b) => b ? (a / b * 100).toFixed(2) : '0.00';
const n = (x) => Number(x || 0).toLocaleString();

// ─── 控制台报告 ──────────────────────────────────────────────────────────────
const W = winDays.length === 1 ? winDays[0] : `${winDays[winDays.length - 1]} ~ ${winDays[0]}`;
const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })();
const staleDays = Math.round((new Date(today) - new Date(latestDay)) / 86400000);
if (staleDays >= 1) console.log(`⚠️ 数据最新日为 ${latestDay}(今天${today}), 最近${staleDays}天无新挂载上传`);
console.log(`\n════ 各页面被达人使用情况 (${W}, 共${inWin.length}条) ════`);
const authorsInWin = new Set(inWin.map(v => v.authorName || '(未知)'));
const newAuthors = [...authorsInWin].filter(a => winDays.includes(firstSeen[a]));
const T = (k) => inWin.reduce((s, v) => s + (v[k] || 0), 0);
console.log(`当日合计: 页面${pages.length}个 | 达人${authorsInWin.size}人(新面孔${newAuthors.length}: ${newAuthors.slice(0, 8).join(', ') || '无'}) | 播放${n(T('displayPlayCnt'))} | 曝光${n(T('plcShowCnt'))} | 点击${n(T('plcClickCnt'))} | 进入${n(T('plcClickEnterCnt'))} | CTR ${pct(T('plcClickCnt'), T('plcShowCnt'))}% | 进/播 ${pct(T('plcClickEnterCnt'), T('displayPlayCnt'))}%`);

console.log('\n── 页面级(按进入数) ──');
for (const p of pages) {
  console.log(`  ${p.page.padEnd(30, ' ')} | ${String(p.videos).padStart(2)}条/${String(p.authors.size).padStart(2)}人 | 播放${n(p.plays).padStart(8)} | 进入${n(p.enter).padStart(4)} | CTR ${pct(p.click, p.show).padStart(5)}% | 进/播 ${pct(p.enter, p.plays).padStart(5)}%`);
  console.log(`    细分: ${p.topVariants}`);
  const pa = Object.values(byPageAuthor).filter(x => x.page === p.page).sort((a, b) => b.enter - a.enter || b.plays - a.plays).slice(0, TOPN);
  for (const x of pa) console.log(`    └ ${x.author.padEnd(16, ' ')} ${String(x.videos).padStart(2)}条 播放${n(x.plays).padStart(8)} 进入${n(x.enter).padStart(4)} (进/播 ${pct(x.enter, x.plays)}%)`);
}

console.log(`\n── 近7日页面趋势(${ctxDays[0]} ~ ${ctxDays[ctxDays.length - 1]}) ──`);
const ctx = Object.values(byPageCtx).map(s => ({ ...s, page: Object.keys(byPageCtx).find(k => byPageCtx[k] === s), ctr: s.show ? s.click / s.show * 100 : 0 })).sort((a, b) => b.enter - a.enter || b.plays - a.plays);
for (const p of ctx) console.log(`  ${p.page.padEnd(30, ' ')} | ${String(p.videos).padStart(3)}条/${String(p.authors.size).padStart(2)}人 | 播放${n(p.plays).padStart(8)} | 进入${n(p.enter).padStart(4)} | 进/播 ${pct(p.enter, p.plays).padStart(5)}%`);

// ─── 文件输出 ────────────────────────────────────────────────────────────────
const stamp = latestDay.replace(/-/g, '');
fs.mkdirSync(OUT_DIR, { recursive: true });
const csvEsc = (s) => `"${String(s).replace(/"/g, '""')}"`;

const csvHeader = ['页面', '视频数', '达人数', '播放', '挂载曝光', '点击', '进入小程序', 'CTR%', '进/播%', '提交订单', '支付订单', 'Top细分目标'];
const csvRows = pages.map(p => [p.page, p.videos, p.authors.size, p.plays, p.show, p.click, p.enter, pct(p.click, p.show), pct(p.enter, p.plays), p.submit, p.pay, p.topVariants].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, `ks-page-usage-${stamp}.csv`), '\uFEFF' + [csvHeader.join(','), ...csvRows].join('\n'));

const aHeader = ['页面', '达人', '视频数', '播放', '点击', '进入', '进/播%', '是否窗口内新达人'];
const aRows = Object.values(byPageAuthor).sort((a, b) => b.enter - a.enter || b.plays - a.plays).map(x => [x.page, x.author, x.videos, x.plays, x.click, x.enter, pct(x.enter, x.plays), winDays.includes(firstSeen[x.author]) ? '新' : ''].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, `ks-page-usage-${stamp}-authors.csv`), '\uFEFF' + [aHeader.join(','), ...aRows].join('\n'));

const md = [];
md.push(`# 男人宝快手小程序 · 各页面被达人使用情况 (${W})`);
md.push('');
md.push(`- 数据源: plc/photo/query (挂载明细, 拉取于 ${new Date().toLocaleString('zh-CN')})`);
md.push(`- 口径: 页面=挂载目标(H5); 达人=authorName; 使用=达人把短视频挂载到该页面`);
md.push(`- 当日合计: 页面${pages.length}个 | 达人${authorsInWin.size}人(新面孔${newAuthors.length}) | 播放${n(T('displayPlayCnt'))} | 进入${n(T('plcClickEnterCnt'))} | CTR ${pct(T('plcClickCnt'), T('plcShowCnt'))}% | 进/播 ${pct(T('plcClickEnterCnt'), T('displayPlayCnt'))}%`);
md.push('');
md.push('## 页面级');
md.push('| 页面 | 视频数 | 达人数 | 播放 | 进入 | CTR% | 进/播% | Top细分 |');
md.push('|---|---|---|---|---|---|---|---|');
for (const p of pages) md.push(`| ${p.page} | ${p.videos} | ${p.authors.size} | ${n(p.plays)} | ${n(p.enter)} | ${pct(p.click, p.show)} | ${pct(p.enter, p.plays)} | ${p.topVariants} |`);
md.push('');
md.push('## 页面×达人 Top');
for (const p of pages) {
  const pa = Object.values(byPageAuthor).filter(x => x.page === p.page).sort((a, b) => b.enter - a.enter || b.plays - a.plays).slice(0, TOPN);
  if (!pa.length) continue;
  md.push(`### ${p.page}`);
  md.push('| 达人 | 视频数 | 播放 | 进入 | 进/播% |');
  md.push('|---|---|---|---|---|');
  for (const x of pa) md.push(`| ${x.author} | ${x.videos} | ${n(x.plays)} | ${n(x.enter)} | ${pct(x.enter, x.plays)} |`);
  md.push('');
}
md.push(`## 近7日趋势(${ctxDays[0]} ~ ${ctxDays[ctxDays.length - 1]})`);
md.push('| 页面 | 视频数 | 达人数 | 播放 | 进入 | 进/播% |');
md.push('|---|---|---|---|---|---|');
for (const p of ctx) md.push(`| ${p.page} | ${p.videos} | ${p.authors.size} | ${n(p.plays)} | ${n(p.enter)} | ${pct(p.enter, p.plays)} |`);
md.push('');
fs.writeFileSync(path.join(OUT_DIR, `ks-page-usage-${stamp}.md`), md.join('\n'));

fs.writeFileSync(path.join(OUT_DIR, `ks-page-usage-${stamp}.json`), JSON.stringify({
  window: W, latestDay, generatedAt: new Date().toISOString(),
  totals: { pages: pages.length, authors: authorsInWin.size, newAuthors, videos: inWin.length, plays: T('displayPlayCnt'), show: T('plcShowCnt'), click: T('plcClickCnt'), enter: T('plcClickEnterCnt') },
  pages: pages.map(p => ({ ...p, authors: [...p.authors], variants: p.variants })),
  pageAuthors: Object.values(byPageAuthor).map(x => ({ ...x, isNewAuthor: winDays.includes(firstSeen[x.author]) })),
  ctx7: { days: ctxDays, pages: ctx.map(p => ({ ...p, authors: [...p.authors] })) },
}, null, 1));

console.log(`\n输出: ${OUT_DIR}/ks-page-usage-${stamp}.{md,csv} + -authors.csv + .json`);
