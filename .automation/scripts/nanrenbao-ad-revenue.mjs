/**
 * nanrenbao-ad-revenue.mjs — 男人宝快手小程序广告收入查询(激励视频广告)
 * 数据源: POST /openapi/mp/developer/ad/data/query (只读)
 *
 * 口径:
 *   收入 = costTotal, 单位「元」(非分); 男人宝唯一变现=激励广告, 支付订单长期为0(无支付设计)
 *   曝光 = impression; 点击 = click; 拉取 = queryCnt; ecpm = 收入/曝光*1000
 *
 * 用法:
 *   node nanrenbao-ad-revenue.mjs              # 默认 7天+30天 两个窗口
 *   node nanrenbao-ad-revenue.mjs --days 7     # 只要近7天
 *   node nanrenbao-ad-revenue.mjs --days 3,7,30  # 任意多个窗口(逗号分隔)
 *
 * 输出(OUT_DIR 可用环境变量 AD_REVENUE_OUT 覆盖, 默认 ~/LetMeTryAI/.automation/reports):
 *   ks-ad-revenue-<YYYYMMDD>.md   报告(窗口汇总+每日明细[含发布任务量]+信号)
 *   ks-ad-revenue-<YYYYMMDD>.csv  每日明细(长表: 窗口,日期,发布,拉取,曝光,点击,收入)
 *   ks-ad-revenue-<YYYYMMDD>.json 原始聚合
 *
 * 发布任务量口径(第二个数据源):
 *   源 = 达人平台任务列表 daren.kuaishou.com/rest/pc/creator/marketing/distribution/list
 *        (cookie 登录态 ~/.automation/.local/auth/kuaishou_auth.json, KS_AUTH_FILE 可覆盖)
 *   只统计 miniAppName=「人人爱男人宝」(飞轮任务发布阵地)的计划;
 *   每个任务(标题尾部数字=图片id)取 effectiveTime 最早的计划行为「首发」, 按 GMT+8 落日;
 *   改名会在平台生成新计划行(旧行保留), 后续行计为「改名」不计入发布量;
 *   拉取失败时发布数列留空并注明, 不影响收入数据。
 *   --no-tasks 跳过任务列表拉取(只要收入)。
 */
import fs from 'fs';
import path from 'path';

const CREDS = '/Users/jak/.secrets/ks_mp_creds.json';
const TOKEN_FILE = '/tmp/ks_access_token.txt';
const OUT_DIR = process.env.AD_REVENUE_OUT || path.join(process.env.HOME, 'LetMeTryAI/.automation/reports');
const KS_AUTH = process.env.KS_AUTH_FILE || path.join(process.env.HOME, 'LetMeTryAI/.automation/.local/auth/kuaishou_auth.json');
const TASK_APP = '人人爱男人宝'; // 飞轮星火任务发布的小程序名

const argVal = (flag) => { const i = process.argv.indexOf(flag); return i > -1 ? process.argv[i + 1] : undefined; };
const WINDOWS = (argVal('--days') || '7,30').split(',').map(s => Number(s.trim())).filter(n => n > 0);
const WITH_TASKS = !process.argv.includes('--no-tasks');

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

async function fetchAdData(app_id, token, startMs, endMs) {
  const items = [];
  for (let page = 1; page <= 10; page++) {
    const r = await fetch(`https://open.kuaishou.com/openapi/mp/developer/ad/data/query?app_id=${app_id}&access_token=${token}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startTime: startMs, endTime: endMs, type: 0, page, pageSize: 100 }),
    });
    const j = await r.json();
    if (j.result !== 1) throw new Error('ad/data/query failed: ' + (j.error_msg || JSON.stringify(j).slice(0, 200)));
    const rows = j.data?.items || [];
    items.push(...rows);
    if (rows.length < 100) break;
  }
  return items;
}

// 本地时区日期串(勿用 toISOString, GMT+8 的 00:00 在 UTC 还是前一天, 会切掉整整天)
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yuan = (x) => Math.round((x + Number.EPSILON) * 100) / 100;
const n = (x) => Number(x || 0).toLocaleString();

// ─── 达人平台任务列表(发布任务量数据源) ────────────────────────────────────────
async function fetchTaskList() {
  let cookies;
  try {
    const d = JSON.parse(fs.readFileSync(KS_AUTH, 'utf8'));
    cookies = d.cookies || [];
  } catch (e) { throw new Error('任务列表登录态缺失: ' + KS_AUTH); }
  const seen = new Map();
  for (const c of cookies) { const v = c.value || ''; if (v && !seen.has(c.name)) seen.set(c.name, `${c.name}=${v}`); }
  const HEADERS = {
    'Content-Type': 'application/json',
    'Cookie': [...seen.values()].join('; '),
    'Referer': 'https://daren.kuaishou.com/content/promotion/distribution',
    'Origin': 'https://daren.kuaishou.com',
    'X-Requested-With': 'XMLHttpRequest',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_7) AppleWebKit/537.36',
  };
  const all = [];
  let pageNum = 1;
  while (pageNum <= 40) {
    const r = await fetch('https://daren.kuaishou.com/rest/pc/creator/marketing/distribution/list', {
      method: 'POST', headers: HEADERS,
      body: JSON.stringify({ pageNum, pageSize: 50, status: 'all', keyword: '' }),
    });
    const j = await r.json().catch(() => ({}));
    if (j.result !== 1) throw new Error('任务列表接口失败: ' + (j.message || j.error_msg || JSON.stringify(j).slice(0, 120)));
    const arr = j.data?.dataList || j.data?.list || j.data?.records || j.data?.distributionPlanList || [];
    all.push(...arr);
    const total = j.data?.total;
    if (!arr.length || (total && all.length >= total)) break;
    pageNum++;
  }
  return all;
}

// 每日发布任务量: 每标题id取最早 effectiveTime 计划行为首发; 后续行=改名; 首发即拒绝=拒绝
function taskStatsByDay(tasks) {
  const idOf = (t) => { const m = /(\d+)$/.exec(t.distributionPlanTitle || ''); return m ? +m[1] : null; };
  const dayOf = (ms) => ymd(new Date(ms));
  const first = new Map(); // id -> 最早行
  for (const t of tasks) {
    if (t.miniAppName !== TASK_APP) continue;
    const id = idOf(t); if (id == null) continue;
    const cur = first.get(id);
    if (!cur || t.effectiveTime < cur.effectiveTime) first.set(id, t);
  }
  const byDay = {};
  const bump = (day, key) => { (byDay[day] = byDay[day] || { publishes: 0, retitles: 0, rejected: 0 })[key]++; };
  const firstIds = new Set(first.keys());
  for (const t of tasks) {
    if (t.miniAppName !== TASK_APP) continue;
    const id = idOf(t); if (id == null) continue;
    const day = dayOf(t.effectiveTime);
    if (first.get(id) === t) {
      bump(day, 'publishes');
      if (t.auditStatus === '审核拒绝') bump(day, 'rejected');
    } else if (firstIds.has(id)) {
      bump(day, 'retitles'); // 同id的后续计划行=改名
    }
  }
  return { byDay, totalFirst: first.size, totalRows: tasks.filter(t => t.miniAppName === TASK_APP).length };
}

// ─── 主流程 ──────────────────────────────────────────────────────────────────
let token = await getToken();
const { app_id } = JSON.parse(fs.readFileSync(CREDS, 'utf8'));

// token 过期(48h)时清缓存重新换取, 重试一次
async function callAd(startMs, endMs) {
  try { return await fetchAdData(app_id, token, startMs, endMs); }
  catch (e) {
    if (!/token/i.test(e.message)) throw e;
    try { fs.unlinkSync(TOKEN_FILE); } catch {}
    token = await getToken();
    return await fetchAdData(app_id, token, startMs, endMs);
  }
}

// 发布任务量(任务列表, 独立数据源; 失败不影响收入)
let taskStats = null, taskNote = '';
if (WITH_TASKS) {
  try {
    const t0 = Date.now();
    const tasks = await fetchTaskList();
    taskStats = taskStatsByDay(tasks);
    taskNote = `任务列表 ${taskStats.totalRows} 条计划(小程序「${TASK_APP}」), 去重后 ${taskStats.totalFirst} 个任务; 拉取耗时 ${((Date.now() - t0) / 1000).toFixed(0)}s`;
  } catch (e) { taskNote = '任务列表拉取失败: ' + e.message + ' (发布数列略; 收入数据不受影响)'; }
}

const results = [];
for (const days of WINDOWS) {
  const end = new Date(); end.setHours(0, 0, 0, 0);
  const start = new Date(end); start.setDate(start.getDate() - days);
  const startStr = ymd(start), endStr = ymd(end); // endStr=今天(不含), 过滤与展示用
  const endIncl = new Date(end); endIncl.setDate(endIncl.getDate() - 1);
  const items = (await callAd(start.getTime(), end.getTime() - 1))
    .filter(it => { const d = String(it.date || ''); return d >= startStr && d < endStr; });
  const sum = (k) => items.reduce((s, i) => s + (i[k] || 0), 0);
  const daily = {};
  for (const it of items) {
    const d = String(it.date);
    (daily[d] = daily[d] || { pulls: 0, impressions: 0, clicks: 0, revenue: 0 });
    const s = daily[d];
    s.pulls += it.queryCnt || 0; s.impressions += it.impression || 0; s.clicks += it.click || 0; s.revenue += it.costTotal || 0;
  }
  // 补齐窗口内有发布但无广告数据行的日期(接口滞后时该日不出现在 items 里)
  if (taskStats) {
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      const k = ymd(d);
      if (!daily[k] && taskStats.byDay[k]?.publishes > 0) daily[k] = { pulls: 0, impressions: 0, clicks: 0, revenue: 0 };
    }
  }
  const daysArr = Object.keys(daily).sort();
  const pub = (d) => taskStats?.byDay[d]?.publishes ?? null;
  const retitle = (d) => taskStats?.byDay[d]?.retitles ?? null;
  const rejected = (d) => taskStats?.byDay[d]?.rejected ?? null;
  results.push({
    days, startDate: startStr, endDate: ymd(endIncl),
    revenue: yuan(sum('costTotal')), pulls: sum('queryCnt'), impressions: sum('impression'), clicks: sum('click'),
    ecpm: sum('impression') ? yuan(sum('costTotal') / sum('impression') * 1000) : 0,
    ctr: sum('impression') ? +(sum('click') / sum('impression') * 100).toFixed(2) : 0,
    activeDays: daysArr.filter(d => daily[d].revenue > 0).length,
    publishes: daysArr.reduce((s, d) => s + (pub(d) || 0), 0),
    retitles: daysArr.reduce((s, d) => s + (retitle(d) || 0), 0),
    rejected: daysArr.reduce((s, d) => s + (rejected(d) || 0), 0),
    bestDay: daysArr.map(d => ({ date: d, ...daily[d] })).sort((a, b) => b.revenue - a.revenue)[0] || null,
    daily: daysArr.map(d => ({ date: d, ...daily[d], revenue: yuan(daily[d].revenue), publishes: pub(d), retitles: retitle(d), rejected: rejected(d) })),
  });
}

// ─── 控制台 ──────────────────────────────────────────────────────────────────
console.log(`男人宝快手小程序 · 广告(激励视频)收入 (拉取于 ${new Date().toLocaleString('zh-CN')})`);
if (taskNote) console.log(taskNote);
for (const r of results) {
  console.log(`\n── 近${r.days}天 (${r.startDate} ~ ${r.endDate}, 有收入${r.activeDays}天) ──`);
  console.log(`  收入 ¥${r.revenue} | 发布任务${r.publishes}个 | 拉取${n(r.pulls)} | 曝光${n(r.impressions)} | 点击${n(r.clicks)} | CTR ${r.ctr}% | ecpm ¥${r.ecpm} | 日均 ¥${yuan(r.revenue / r.days)}`);
  if (r.bestDay) console.log(`  最好一天: ${r.bestDay.date} ¥${yuan(r.bestDay.revenue)}`);
  console.log('  每日: ' + r.daily.map(d => `${d.date.slice(5)}:¥${d.revenue}${d.publishes != null ? '(发布' + d.publishes + ')' : ''}`).join(' '));
}
const w7 = results.find(r => r.days === 7), w30 = results.find(r => r.days === 30);
if (w7 && w30 && w30.revenue > 0) console.log(`\n趋势: 近7天收入占近30天 ${(w7.revenue / w30.revenue * 100).toFixed(0)}%, 曝光占 ${(w7.impressions / Math.max(1, w30.impressions) * 100).toFixed(0)}%`);

// ─── 文件输出 ────────────────────────────────────────────────────────────────
const stamp = ymd(new Date()).replace(/-/g, '');
fs.mkdirSync(OUT_DIR, { recursive: true });
const csvEsc = (s) => `"${String(s).replace(/"/g, '""')}"`;
const cHeader = ['窗口(天)', '日期', '发布任务', '拉取', '曝光', '点击', '收入(元)'];
const cRows = [];
for (const r of results) for (const d of r.daily) cRows.push([r.days, d.date, d.publishes ?? '', d.pulls, d.impressions, d.clicks, d.revenue].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, `ks-ad-revenue-${stamp}.csv`), '\uFEFF' + [cHeader.join(','), ...cRows].join('\n'));

const md = [];
md.push(`# 男人宝快手小程序 · 广告收入 (${ymd(new Date())})`);
md.push('');
md.push(`- 数据源: ad/data/query (激励视频广告, costTotal 单位元), 拉取于 ${new Date().toLocaleString('zh-CN')}`);
md.push('- 口径: 男人宝唯一变现=激励广告; 支付订单长期为0(无支付设计); ecpm=收入/曝光*1000');
if (taskNote) md.push(`- 发布任务量: ${taskNote}`);
md.push('- 发布口径: 任务标题尾部数字=图片id, 每id取达人平台任务列表中 effectiveTime 最早的计划行为首发(GMT+8落日); 改名生成的后续计划行单列为「改名」不计入发布量; 首发即审核拒绝的单列「拒绝」');
md.push('');
for (const r of results) {
  md.push(`## 近${r.days}天 (${r.startDate} ~ ${r.endDate})`);
  md.push('');
  md.push(`| 指标 | 值 |`);
  md.push(`|---|---|`);
  md.push(`| 收入 | **¥${r.revenue}** (日均 ¥${yuan(r.revenue / r.days)}) |`);
  md.push(`| 发布任务(首发) | ${r.publishes} 个${r.retitles ? ` (另有改名 ${r.retitles} 个${r.rejected ? `, 拒绝 ${r.rejected} 个` : ''})` : ''} |`);
  md.push(`| 拉取 / 曝光 / 点击 | ${n(r.pulls)} / ${n(r.impressions)} / ${n(r.clicks)} |`);
  md.push(`| CTR / ecpm | ${r.ctr}% / ¥${r.ecpm} |`);
  md.push(`| 有收入天数 | ${r.activeDays}/${r.days} |`);
  if (r.bestDay) md.push(`| 最好一天 | ${r.bestDay.date} ¥${yuan(r.bestDay.revenue)} |`);
  md.push('');
  md.push('| 日期 | 发布 | 拉取 | 曝光 | 点击 | 收入(元) |');
  md.push('|---|---|---|---|---|---|');
  for (const d of r.daily) md.push(`| ${d.date} | ${d.publishes ?? '—'} | ${d.pulls} | ${d.impressions} | ${d.clicks} | ${d.revenue} |`);
  md.push('');
}
if (w7 && w30 && w30.revenue > 0) md.push(`## 趋势\n\n近7天收入占近30天 ${(w7.revenue / w30.revenue * 100).toFixed(0)}%, 曝光占 ${(w7.impressions / Math.max(1, w30.impressions) * 100).toFixed(0)}%。\n`);
md.push('## 解读要点\n\n1. 绝对金额极小(月入十元级), 不值得专门优化; 价值在信号——曝光→点击漏斗本身是通的。\n2. 瓶颈是量: 达人视频播放(日均3k+)只换来约17次广告曝光/天, rewardedWebview 页面内广告触发点弱。\n3. 与发布量联动看: 发布尖峰日(如10-22发70个)当天/次日曝光与收入同步冲高, 但ecpm不随发布量修复——涨量不涨价。\n');
fs.writeFileSync(path.join(OUT_DIR, `ks-ad-revenue-${stamp}.md`), md.join('\n'));
fs.writeFileSync(path.join(OUT_DIR, `ks-ad-revenue-${stamp}.json`), JSON.stringify({ generatedAt: new Date().toISOString(), appId: app_id, taskNote, taskStats: taskStats?.byDay || null, windows: results }, null, 1));
console.log(`\n输出: ${OUT_DIR}/ks-ad-revenue-${stamp}.{md,csv,json}`);
