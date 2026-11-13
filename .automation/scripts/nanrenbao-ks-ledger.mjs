/**
 * nanrenbao-ks-ledger.mjs — 快手小程序挂载视频达人台账 + 内容治理 (v2)
 * 数据源: GET /openapi/mp/developer/plc/photo/query (短视频挂载明细, 全字段)
 *
 * v2 修正: v1 把"军事/养生"一律判为不相关是错的——挂载目标(ww2-tank-faceoff/
 * spring-tea-health)与视频主题是配套的。真正的治理维度是「视频主题 ↔ 挂载目标主题」
 * 匹配度, 而非是否写真。
 *
 * 输出: reports/ks-mp-mounted-videos.json (原始)
 *       reports/ks-mp-author-ledger.csv  (达人台账, 含匹配度与裁决)
 *       reports/ks-mp-target-ledger.csv (H5产品线台账)
 * 用法: node nanrenbao-ks-ledger.mjs
 */
import fs from 'fs';
import path from 'path';

const CREDS = '/Users/jak/.secrets/ks_mp_creds.json';
const TOKEN_FILE = '/tmp/ks_access_token.txt';
const OUT_DIR = path.join(process.env.HOME, 'LetMeTryAI/.automation/reports');

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
    const r = await fetch(url);
    const j = await r.json();
    if (j.result !== 1) throw new Error('plc/photo/query failed: ' + (j.error_msg || JSON.stringify(j).slice(0, 200)));
    const recs = j.data?.records?.plcPhotoDetailList || [];
    all.push(...recs);
    const next = j.data?.next_cursor;
    if (!next || next === '0' || next === cursor || recs.length === 0) break;
    cursor = next;
  }
  return all;
}

// ─── 视频主题 ──────────────────────────────────────────────────────────────
const THEMES = [
  { name: '写真/颜值', kw: ['美女', '写真', '小姐姐', '辣妹', '模特', '女孩', '女生', '头像', '壁纸', '穿搭', '颜值', '气质', '甜美', '复古', '美人', '少女', '少妇', '御姐', '甜妹', '网红', '明星', '电影', '古风', '汉服', '港风', '日系', '韩系'] },
  { name: '军事/历史', kw: ['二战', '军事', '战舰', '军舰', '战争', '坦克', '德军', '日军', '美军', '海军', '航母', '战机', '潜艇', '战列舰', '战役', '历史', '皇帝', '宫廷', '三国', '古装'] },
  { name: '养生/健康', kw: ['养生', '茶', '保健', '健康', '中医', '枸杞', '失眠', '湿气', '热量', '减肥'] },
  { name: '足球/体育', kw: ['C罗', 'c罗', '足球', '梅西', '体育', '球星', '篮球', '世界杯'] },
  { name: '美食', kw: ['美食', '烧烤', '小吃', '做饭', '吃货', '探店'] },
  { name: '科技/机器人', kw: ['机器人', '机器狗', '科技', 'AI', '人工智能', '无人机'] },
  { name: '娱乐/其他', kw: ['搞笑', '段子', '娱乐', '综艺', '短剧', '小说', '情感'] },
];
function classify(title) {
  for (const t of THEMES) if (t.kw.some(k => title.includes(k))) return t.name;
  return '未分类';
}

// ─── 挂载目标(H5产品线) ────────────────────────────────────────────────────
const TARGET_THEME = [
  [/beauty-scratch|back-view|top10|nanrenbao/i, '写真/颜值'],
  [/tank|warship|fighter|military|ww2/i, '军事/历史'],
  [/tea|health|calorie/i, '养生/健康'],
  [/cr7|ronaldo|football/i, '足球/体育'],
  [/shaokao|food|tanbidian/i, '美食'],
  [/robot|dog/i, '科技/机器人'],
  [/emperor/i, '军事/历史'], // 皇帝/宫廷归历史大类
  [/index|pages\//i, '官方页'],
];
function mountInfo(mntPath) {
  if (!mntPath) return { target: 'unknown', theme: '未分类' };
  const m = mntPath.match(/target=([^&]+)/);
  const target = m ? m[1] : (mntPath.match(/pages\/([^/?]+)/) || [, mntPath.slice(0, 24)])[1];
  const theme = (TARGET_THEME.find(([re]) => re.test(target)) || [, '未分类'])[1];
  return { target, theme };
}

// ─── 主流程 ────────────────────────────────────────────────────────────────
const token = await getToken();
const { app_id } = JSON.parse(fs.readFileSync(CREDS, 'utf8'));
const videos = await fetchAll(token, app_id);
console.log(`拉取挂载视频: ${videos.length} 条`);
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'ks-mp-mounted-videos.json'), JSON.stringify(videos, null, 1));

for (const v of videos) {
  v._theme = classify(v.photoTitle || '');
  v._mount = mountInfo(v.plcMntPath);
  v._match = (v._theme === v._mount.theme) || (v._theme === '娱乐/其他' && v._mount.theme !== '未分类') ? '匹配' : '不匹配';
}

// 按达人聚合
const byAuthor = {};
for (const v of videos) {
  const a = v.authorName || '(未知)';
  if (!byAuthor[a]) byAuthor[a] = { author: a, videos: 0, fans: 0, plays: 0, plcShow: 0, plcClick: 0, plcEnter: 0, submit: 0, pay: 0, payAmt: 0, themes: {}, targets: {}, matchN: 0, maxVideoPlays: 0 };
  const s = byAuthor[a];
  s.videos++;
  s.fans = Math.max(s.fans, v.accuDisplayFansUserNum || 0);
  s.plays += v.displayPlayCnt || 0;
  s.plcShow += v.plcShowCnt || 0;
  s.plcClick += v.plcClickCnt || 0;
  s.plcEnter += v.plcClickEnterCnt || 0;
  s.submit += v.submitOrderNum || 0;
  s.pay += v.payOrderNum || 0;
  s.payAmt += v.payOrderAmt || 0;
  s.maxVideoPlays = Math.max(s.maxVideoPlays, v.displayPlayCnt || 0);
  if (v._match === '匹配') s.matchN++;
  s.themes[v._theme] = (s.themes[v._theme] || 0) + 1;
  s.targets[v._mount.target] = (s.targets[v._mount.target] || 0) + 1;
}
const authors = Object.values(byAuthor).map(s => {
  const theme = Object.entries(s.themes).sort((a, b) => b[1] - a[1])[0][0];
  const target = Object.entries(s.targets).sort((a, b) => b[1] - a[1])[0][0];
  const matchRate = s.matchN / s.videos;
  return { ...s, theme, target, matchRate,
    enterPerPlay: s.plays ? (s.plcEnter / s.plays * 100) : 0,
    viralShare: s.plays ? (s.maxVideoPlays / s.plays * 100) : 0 };
}).sort((a, b) => b.plcEnter - a.plcEnter);

// 裁决: 匹配度优先, 再看进入率与集中度
for (const a of authors) {
  if (a.matchRate < 0.5 && a.videos >= 2) a.verdict = '换挂载-主题错配';
  else if (a.enterPerPlay >= 1 && a.viralShare < 60) a.verdict = '★核心达人-加大投入';
  else if (a.enterPerPlay >= 1) a.verdict = '★爆款驱动-追加同主题任务';
  else if (a.enterPerPlay >= 0.3) a.verdict = '达标-维持';
  else if (a.videos >= 3) a.verdict = '低效-优化锚点文案或淘汰';
  else a.verdict = '观察-样本少';
}

const csvEsc = (s) => `"${String(s).replace(/"/g, '""')}"`;
const header = ['达人', '视频数', '粉丝数', '总播放', '挂载曝光', '挂载点击', '进入小程序', '进入/播放%', '单条最高播放', '爆款集中度%', '提交订单', '支付订单', '支付金额', '视频主题', '主挂载目标', '匹配度%', '裁决'];
const rows = authors.map(a => [a.author, a.videos, a.fans, a.plays, a.plcShow, a.plcClick, a.plcEnter, a.enterPerPlay.toFixed(3), a.maxVideoPlays, a.viralShare.toFixed(0), a.submit, a.pay, a.payAmt.toFixed(2), a.theme, a.target, (a.matchRate * 100).toFixed(0), a.verdict].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, 'ks-mp-author-ledger.csv'), '\uFEFF' + [header.join(','), ...rows].join('\n'));

// 按 H5 产品线聚合
const byTarget = {};
for (const v of videos) {
  const t = v._mount.target;
  if (!byTarget[t]) byTarget[t] = { target: t, theme: v._mount.theme, videos: 0, plays: 0, plcShow: 0, plcClick: 0, plcEnter: 0, submit: 0, pay: 0, payAmt: 0 };
  const s = byTarget[t];
  s.videos++; s.plays += v.displayPlayCnt || 0; s.plcShow += v.plcShowCnt || 0; s.plcClick += v.plcClickCnt || 0; s.plcEnter += v.plcClickEnterCnt || 0; s.submit += v.submitOrderNum || 0; s.pay += v.payOrderNum || 0; s.payAmt += v.payOrderAmt || 0;
}
const targets = Object.values(byTarget).map(s => ({ ...s, enterPerPlay: s.plays ? (s.plcEnter / s.plays * 100) : 0 })).sort((a, b) => b.plays - a.plays);
const tHeader = ['挂载目标(H5)', '主题', '视频数', '总播放', '进入小程序', '进入/播放%', '提交订单', '支付订单', '支付金额'];
const tRows = targets.map(t => [t.target, t.theme, t.videos, t.plays, t.plcEnter, t.enterPerPlay.toFixed(3), t.submit, t.pay, t.payAmt.toFixed(2)].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, 'ks-mp-target-ledger.csv'), '\uFEFF' + [tHeader.join(','), ...tRows].join('\n'));

// 汇总
const T = (k) => videos.reduce((s, v) => s + (v[k] || 0), 0);
const zeroAuthors = authors.filter(a => a.plcEnter === 0);
console.log(`\n== 总体 == 达人${authors.length} | 播放${T('displayPlayCnt')} | 进入${T('plcClickEnterCnt')} | 进/播${(T('plcClickEnterCnt') / T('displayPlayCnt') * 100).toFixed(3)}% | 订单${T('submitOrderNum')} | 支付${T('payOrderNum')}单/¥${T('payOrderAmt').toFixed(2)}`);
const top1 = videos.slice().sort((a, b) => b.displayPlayCnt - a.displayPlayCnt)[0];
console.log(`播放集中度: 第1名占 ${(top1.displayPlayCnt / T('displayPlayCnt') * 100).toFixed(1)}% (${top1.authorName} / ${top1._mount.target})`);
console.log(`零进入达人: ${zeroAuthors.length}/${authors.length} 个, 合计播放 ${zeroAuthors.reduce((s, a) => s + a.plays, 0)}`);
const matched = videos.filter(v => v._match === '匹配'), mismatched = videos.filter(v => v._match !== '匹配');
console.log(`主题匹配: ${matched.length}条(进/播${(matched.reduce((s, v) => s + v.plcClickEnterCnt, 0) / Math.max(1, matched.reduce((s, v) => s + v.displayPlayCnt, 0)) * 100).toFixed(3)}%) vs 错配 ${mismatched.length}条(进/播${(mismatched.reduce((s, v) => s + v.plcClickEnterCnt, 0) / Math.max(1, mismatched.reduce((s, v) => s + v.displayPlayCnt, 0)) * 100).toFixed(3)}%)`);

console.log('\n== H5产品线台账(按播放) ==');
for (const t of targets) console.log(`  ${t.target.padEnd(38, ' ')} | ${String(t.videos).padStart(3)}条 | 播放${String(t.plays).padStart(7)} | 进入${String(t.plcEnter).padStart(4)} | 进/播${t.enterPerPlay.toFixed(2)}% | ${t.theme}`);

console.log('\n== 达人台账 Top25(按进入数) ==');
for (const a of authors.slice(0, 25)) console.log(`  ${a.author.padEnd(14, ' ')} | ${String(a.videos).padStart(2)}条 | 播放${String(a.plays).padStart(7)} | 进入${String(a.plcEnter).padStart(4)} | 进/播${a.enterPerPlay.toFixed(2)}% | 匹配${(a.matchRate * 100).toFixed(0)}% | ${a.theme}→${a.target.slice(0, 26)} | ${a.verdict}`);
// ─── 6. 挂载质量治理: 清退名单 + 后台TXT + 追投名单 ──────────────────────
// 农场波段: 同一挂载目标、同一天、≥5 个不同达人各发 1 条 → 疑似激励农场波段
const byTargetDay = {};
for (const v of videos) {
  const key = `${v._mount.target}|${(v.uploadDt || '').slice(0, 10)}`;
  (byTargetDay[key] = byTargetDay[key] || []).push(v);
}
const farmWaves = Object.values(byTargetDay)
  .filter(vs => vs.length >= 5 && new Set(vs.map(v => v.authorName)).size >= 5)
  .map(vs => ({ target: vs[0]._mount.target, day: (vs[0].uploadDt || '').slice(0, 10), videos: vs.length, authors: new Set(vs.map(v => v.authorName)).size, plays: vs.reduce((s, v) => s + (v.displayPlayCnt || 0), 0), enters: vs.reduce((s, v) => s + (v.plcClickEnterCnt || 0), 0) }))
  .sort((a, b) => b.videos - a.videos);
const waveKey = (v) => `${v._mount.target}|${(v.uploadDt || '').slice(0, 10)}`;

// 语录/情感农场标题特征
const QUOTE_PAT = /愿|期待|温柔|停顿|退后|如常|如愿|轰轰烈烈|真心|放下|从容|努力|生活|自己|季节|秋风|添衣|衣角|褶皱|日常|偷闲|当下|强求|讨好|解释|接纳|修行|顿悟|心安|看淡/;
const isQuote = (v) => { const t = v.photoTitle || ''; return (t.match(new RegExp(QUOTE_PAT.source, 'g')) || []).length >= 2 && t.length > 14; };

// 逐视频裁决: 匹配=保留; 错配且零进入=解除挂载; 错配有进入=观察不动
for (const v of videos) {
  const enters = v.plcClickEnterCnt || 0;
  if (v._match === '匹配') v._action = '保留';
  else if (enters > 0) v._action = '观察-错配有进入';
  else v._action = '解除挂载';
  v._reason = [
    v._match !== '匹配' ? `主题错配(${v._theme}→${v._mount.theme})` : '主题匹配',
    isQuote(v) ? '语录农场标题' : '',
    farmWaves.some(w => `${w.target}|${w.day}` === waveKey(v)) ? `农场波段(${v._mount.target} ${(v.uploadDt || '').slice(0, 10)})` : '',
  ].filter(Boolean).join(' | ');
}
const unbind = videos.filter(v => v._action === '解除挂载');
const watch = videos.filter(v => v._action === '观察-错配有进入');

// 清退 CSV(人工审核用, 含证据)
const uHeader = ['photoId', '达人', '上传日期', '播放', '赞', '挂载曝光', '挂载点击', '进入', '挂载目标', '目标主题', '视频标题', '裁决理由'];
const uRows = unbind.map(v => [v.photoId, v.authorName, v.uploadDt, v.displayPlayCnt || 0, v.displayLikeCnt || 0, v.plcShowCnt || 0, v.plcClickCnt || 0, v.plcClickEnterCnt || 0, v._mount.target, v._mount.theme, (v.photoTitle || '').replace(/\n/g, ' ').slice(0, 50), v._reason].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, 'ks-mp-unbind-list.csv'), '\uFEFF' + [uHeader.join(','), ...uRows].join('\n'));

// 后台直传 TXT(每批≤20行, 一行一个 photoId; 先清旧批次再写)
for (const f of fs.readdirSync(OUT_DIR)) {
  if (/^ks-unbind-batch-\d+\.txt$/.test(f)) fs.unlinkSync(path.join(OUT_DIR, f));
}
unbind.forEach((v, i) => {
  const b = Math.floor(i / 20) + 1;
  fs.appendFileSync(path.join(OUT_DIR, `ks-unbind-batch-${b}.txt`), v.photoId + '\n');
});

// 追投名单: 主题匹配 且 (进入≥3 或 进/播≥1%)
const invite = authors
  .filter(a => a.matchRate >= 0.5 && (a.plcEnter >= 3 || (a.plays > 0 && a.plcEnter / a.plays >= 0.01)))
  .map(a => {
    const vs = videos.filter(v => (v.authorName || '(未知)') === a.author && v._match === '匹配');
    const best = vs.sort((x, y) => (y.plcClickEnterCnt || 0) - (x.plcClickEnterCnt || 0))[0] || {};
    return { ...a, bestTitle: (best.photoTitle || '').replace(/\n/g, ' ').slice(0, 60), bestTarget: best._mount?.target || a.target, bestEnter: best.plcClickEnterCnt || 0 };
  })
  .sort((a, b) => b.plcEnter - a.plcEnter);
const iHeader = ['达人', '粉丝数', '匹配视频数', '总播放', '进入小程序', '进入/播放%', '主挂载目标', '最高转化视频标题', '建议动作'];
const iRows = invite.map(a => [a.author, a.fans, a.videos, a.plays, a.plcEnter, a.enterPerPlay.toFixed(2), a.bestTarget, a.bestTitle, a.plcEnter >= 10 ? '定向邀请进宽口径任务+长期合作' : a.plcEnter >= 3 ? '定向邀请进宽口径任务' : '发同主题任务观察'].map(csvEsc).join(','));
fs.writeFileSync(path.join(OUT_DIR, 'ks-mp-invite-list.csv'), '\uFEFF' + [iHeader.join(','), ...iRows].join('\n'));

console.log('\n== 挂载质量治理 ==');
console.log(`解除挂载候选: ${unbind.length} 条(播放${unbind.reduce((s, v) => s + (v.displayPlayCnt || 0), 0).toLocaleString()} 进入${unbind.reduce((s, v) => s + (v.plcClickEnterCnt || 0), 0)} — 进入损失应≈0) | 观察(错配有进入): ${watch.length} 条(进入${watch.reduce((s, v) => s + (v.plcClickEnterCnt || 0), 0)})`);
console.log(`后台TXT批次: ${Math.ceil(unbind.length / 20)} 个(每个≤20行photoId, 走 流量管理→视频解除挂载)`);
console.log(`\n农场波段(同目标同日≥5账号):`);
for (const w of farmWaves) console.log(`  ${w.day} | ${w.target.slice(0, 40).padEnd(42, ' ')} | ${w.videos}条/${w.authors}账号 | 播放${w.plays.toLocaleString()} | 进入${w.enters}`);
console.log(`\n追投名单: ${invite.length} 个达人`);
for (const a of invite.slice(0, 12)) console.log(`  ${a.author.padEnd(14, ' ')} | 粉丝${String(a.fans).padStart(6)} | 进入${String(a.plcEnter).padStart(3)} (${a.enterPerPlay.toFixed(1)}%) | ${a.bestTarget.slice(0, 30)} | ${a.bestTitle.slice(0, 34)}`);
console.log('\n输出: ' + OUT_DIR + '/ks-mp-unbind-list.csv + ks-unbind-batch-*.txt + ks-mp-invite-list.csv');

console.log('\n输出: ' + OUT_DIR + '/ks-mp-author-ledger.csv + ks-mp-target-ledger.csv + ks-mp-mounted-videos.json');
