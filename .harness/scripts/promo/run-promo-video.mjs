#!/usr/bin/env node
/**
 * 男人宝 ④ 自有账号宣传视频 · 隔天发安全模板流水线
 *
 * 与 kuaishou-openapi-publish/publish.mjs 配合：本脚本负责"挑素材 + 控频控 + 记发布记录"，
 * 真正的上传/发布交给 publish.mjs（纯 OpenAPI，绝不碰网页）。
 *
 * 安全约束（铁律）：
 *   - 只发布 config 里 safe:true 且 enabled:true 的素材；默认全 false，需人工确认不擦边后开启。
 *   - 挂小程序卡片：绑卡不可改是「单条视频级」（无 unbind / 不支持覆盖），不是账号级，
 *     下一条视频随时可换 path。故发布前强制校验 path 格式 + id 在 published-record.json 在册，
 *     校验不过直接拒绝发布（绑错只能 App 手动删视频重发，代价大）。
 *   - 2026-11-08 事故（卡片点开 404）根因更正：与卡片 id 无关，是站点级 DNS 迁移故障。
 *     letmetryai.cn 于 11-07 由 GitHub Pages 迁至 Lighthouse，nginx 默认不把无扩展名 URL
 *     映射到 .html，导致 /nanrenbao/beauty-scratch 全站 404；09:45 加 try_files $uri.html
 *     后恢复。nginx access log 实证 11-08 00:32 id=826、06:02 id=685、06:09 id=826、
 *     06:18 id=819 的 KsWebView 请求均为 404，10:11 起全部 200。
 *     故新增 verifyTargetReachable()：发布前直接 GET 卡片 H5，非 200 一律拒绝挂卡。
 *     verifyCardOnline() 的 plcClickEnterCnt 只是「转化能力」参考，不能反推 404：
 *     685 的 5 条 0 进入记录全在 10-19~11-02（迁移前），与 11-08 的 404 无因果关系。
 *   - 另保留 safeCardIds 内容安全白名单 + blockedCardIds(685 转化数据待查)，这是第二道关。
 *     视频 safe:true 与卡片 safeCardIds 仍是两套独立审批。
 *   - 隔天策略：距上次成功发布不足 36h 则跳过（launchd 每天跑，脚本控频）。
 *
 * 用法：
 *   node run-promo-video.mjs            # 真实发布（受 safe/enabled + 隔天约束）
 *   node run-promo-video.mjs --dry-run  # 只校验 token/素材/计划，不真正上传
 *   node run-promo-video.mjs --force-once # 仅本次绕过 36h 控频（e2e / 事故后补发用）
 *                                        # 注意：launchd 日常不带此参数，隔天策略不变
 *
 * 产物：
 *   .harness/.local/state/promo-video/state.json            （轮转下标 + 上次发布时间）
 *   .harness/.local/state/promo-video/promo-video-publish.json （发布记录，控制塔 ④ 读这个）
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, 'promo-video.config.json');
const HOME = process.env.HOME || '/Users/jak';
const STATE_DIR = process.env.PROMO_STATE_DIR ||
  path.join(HOME, 'LetMeTryAI', '.harness', '.local', 'state', 'promo-video');
const STATE_FILE = path.join(STATE_DIR, 'state.json');
const RECORD_FILE = path.join(STATE_DIR, 'promo-video-publish.json');
const PUBLISH_MJS = process.env.PUBLISH_MJS ||
  '/Users/jak/.workbuddy/skills/kuaishou-openapi-publish/publish.mjs';
const NODE = process.env.PROMO_NODE || '/Users/jak/.workbuddy/binaries/node/versions/22.22.2-6/bin/node';
const PUBLISHED_RECORD = process.env.PROMO_PUBLISHED_RECORD ||
  path.join(HOME, '.workbuddy', 'skills', '@letmetry', 'nanrenbao-scratch-publish', 'published-record.json');
// 达人挂载监控：只用来衡量卡片历史转化能力（不是 404 判据）
const MOUNTED_VIDEOS = process.env.PROMO_MOUNTED_VIDEOS ||
  path.join(HOME, 'LetMeTryAI', '.automation', 'reports', 'ks-mp-mounted-videos.json');
// 小程序 rewardedWebview 的 H5 baseUrl（见 ~/NanRenBaoKS/pages/rewardedWebview/rewardedWebview.js）
// 卡片是否被点开后显示 404，唯一可靠判据是这个 URL 本身返回什么。
const SITE_BASE = process.env.PROMO_SITE_BASE || 'https://letmetryai.cn/';
const MIN_GAP_MS = 36 * 3600 * 1000; // 隔天

const DRY_RUN = process.argv.includes('--dry-run');
// 仅本次绕过 36h 控频：用于 e2e 验收或事故后补发。发布成功后仍会写 lastPublishedAt，
// 后续 launchd 日常调用不带此参数，隔天策略照常生效。
const FORCE_ONCE = process.argv.includes('--force-once');
const log = (...a) => console.log('[promo]', ...a);

function loadConfig() { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); }
function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')); }
  catch { return { lastIndex: -1, lastPublishedAt: 0 }; }
}
function saveState(s) { fs.mkdirSync(STATE_DIR, { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); }

function pickAsset(cfg, state) {
  const enabled = (cfg.assets || []).filter(a => a.enabled !== false && a.safe === true);
  if (!enabled.length) return null;
  const nextIndex = (state.lastIndex + 1) % enabled.length;
  return { asset: enabled[nextIndex], nextIndex };
}

// 卡片一旦绑错无法改（无 unbind、bind 不支持覆盖），只能 App 手动删视频重发。
// 所以 spawn 之前把 path 格式、内容白名单、黑名单、落地页 HTTP 可达性一次性验死。
async function validateMiniPath(mini) {
  const p = mini.path || '';
  const m = p.match(/^pages\/rewardedWebview\/rewardedWebview\?target=nanrenbao\/beauty-scratch\?id=(\d+)&showAd=true$/);
  if (!m) throw new Error(`小程序卡片 path 格式不合法（绑错改不了，已拒绝发布）: ${p}`);
  if (!mini.appId) throw new Error('miniApp.appId 缺失，已拒绝挂卡发布');
  const id = Number(m[1]);
  const blocked = Array.isArray(mini.blockedCardIds) ? mini.blockedCardIds.map(Number) : [];
  if (blocked.includes(id)) throw new Error(`卡片 id=${id} 在 blockedCardIds 黑名单（历史 0 次进入小程序，转化能力待查；非 404 证据），拒绝挂卡发布`);
  const safeIds = Array.isArray(mini.safeCardIds) ? mini.safeCardIds.map(Number) : [];
  if (!safeIds.includes(id)) throw new Error(`卡片 id=${id} 不在 safeCardIds 内容安全白名单（当前为空：无任何落地页 id 通过内容复核），拒绝挂卡发布；须 Owner 确认后再加入白名单`);
  const online = verifyCardOnline(id); // 转化能力参考：历史是否有人真的点进去过
  const reach = await verifyTargetReachable(id); // 主防线：H5 本身返回 200，不是 404
  let rec;
  try { rec = JSON.parse(fs.readFileSync(PUBLISHED_RECORD, 'utf-8')); }
  catch (e) { throw new Error(`读不到 published-record.json(${PUBLISHED_RECORD})，拒绝挂卡发布: ${e.message}`); }
  const arr = Array.isArray(rec.published) ? rec.published : [];
  // 注：published-record.json 只是去重表，「在册」不代表 target 能打开；仅作辅助校验。
  if (!arr.includes(id)) throw new Error(`卡片 id=${id} 不在 published-record.json 的 ${arr.length} 个已发 id 中，拒绝挂卡发布`);
  return { id, ...online, ...reach };
}

// 站点级可达性：2026-11-08 DNS 迁移 404 事故的唯一可靠判据。
// 小程序 rewardedWebview 用 baseUrl + target 拼出这个 URL（见 ~/NanRenBaoKS/pages/rewardedWebview/rewardedWebview.js）。
async function verifyTargetReachable(id) {
  const url = `${SITE_BASE}nanrenbao/beauty-scratch?id=${id}&showAd=true`;
  let r;
  try {
    r = await fetch(url, { signal: AbortSignal.timeout(10000), headers: { 'User-Agent': 'nanrenbao-promo-preflight/1.0' } });
  } catch (e) { throw new Error(`落地页不可达（${url}）：${e.message}，拒绝挂卡发布`); }
  const body = await r.text().catch(() => '');
  const ctype = r.headers.get('content-type') || '';
  if (r.status !== 200 || !ctype.includes('text/html') || body.length < 1000) {
    throw new Error(`落地页 HTTP ${r.status} / ${ctype} / ${body.length}B（${url}）— 疑似 DNS 迁移类全站 404，拒绝挂卡发布`);
  }
  return { httpStatus: r.status, reachableUrl: url };
}

// 转化能力参考：达人挂载监控里「点击进入小程序」次数。
// 注意：0 进入不能反推 404（685 的 0 进入记录在 10-19~11-02，早于 11-07 DNS 迁移）。
function verifyCardOnline(id) {
  let rows;
  try { rows = JSON.parse(fs.readFileSync(MOUNTED_VIDEOS, 'utf-8')); }
  catch (e) { throw new Error(`读不到挂载监控 ${MOUNTED_VIDEOS}，无法验证卡片可达，拒绝挂卡发布: ${e.message}`); }
  if (!Array.isArray(rows)) throw new Error('挂载监控数据格式异常，拒绝挂卡发布');
  const needle = `id=${id}&`;
  const hits = rows.filter(v => String(v.plcMntPath || '').includes(needle));
  if (!hits.length) throw new Error(`卡片 id=${id} 在挂载监控里无任何记录，无法证明可打开，拒绝挂卡发布`);
  const show = hits.reduce((s, v) => s + (v.plcShowCnt || 0), 0);
  const enter = hits.reduce((s, v) => s + (v.plcClickEnterCnt || 0), 0);
  if (enter <= 0) throw new Error(`卡片 id=${id} 历史 ${show} 次展示、0 次进入小程序，转化能力未验证（不等于 404，可能是审核/曝光/数据口径），拒绝挂卡发布`);
  const last = hits.map(v => v.uploadDt || '').sort().pop();
  const ageDays = last ? (Date.now() - new Date(last + 'T00:00:00').getTime()) / 86400000 : Infinity;
  if (ageDays > 14) throw new Error(`卡片 id=${id} 最近一次在线挂载在 ${last}（${ageDays.toFixed(0)} 天前），任务可能已下线/审核中，拒绝挂卡发布`);
  return { enter, lastMounted: last };
}

async function checkToken() {
  try {
    const r = await fetch('https://letmetry.cn/oauth/kuaishou/token');
    const d = await r.json().catch(() => ({}));
    return { ok: !!d.access_token && !d.access_token_expired, expired: !!d.access_token_expired };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function main() {
  const cfg = loadConfig();
  const state = loadState();
  const now = Date.now();

  if (!DRY_RUN && !FORCE_ONCE && (now - (state.lastPublishedAt || 0)) < MIN_GAP_MS) {
    log(`距上次发布不足 ${MIN_GAP_MS / 3600000}h，跳过（隔天策略）。`);
    return;
  }
  if (FORCE_ONCE && !DRY_RUN) {
    log(`--force-once：本次显式绕过 36h 控频（距上次 ${((now - (state.lastPublishedAt || 0)) / 3600000).toFixed(1)}h）；发布后仍写入 lastPublishedAt，日常隔天策略不变。`);
  }

  const pick = pickAsset(cfg, state);
  if (!pick) {
    log('没有已启用且标记为 safe 的视频素材（config 里 safe/enabled 现均为 false）。需先确认不擦边的素材再发布。退出。');
    return;
  }
  const a = pick.asset;
  const video = path.isAbsolute(a.video) ? a.video : path.resolve(__dirname, a.video);
  if (!fs.existsSync(video)) { console.error('[promo] 视频不存在:', video); process.exit(1); }

  const env = { ...process.env, KS_VIDEO: video, KS_CAPTION: a.caption, KS_TOPICS: (a.topics || []).join(',') };
  if (a.cover) env.KS_COVER = path.isAbsolute(a.cover) ? a.cover : path.resolve(__dirname, a.cover);
  const mini = cfg.miniApp || {};
  let miniNote = '(不挂小程序卡片)';
  if (mini.enabled) {
    // 不静默降级：既然声明要挂卡，参数不合法就整趟拒绝，避免「以为挂了其实没挂」。
    const card = await validateMiniPath(mini);
    env.KS_MINI_APP_ID = mini.appId; env.KS_MINI_PATH = mini.path;
    if (mini.title) env.KS_MINI_TITLE = mini.title;
    miniNote = `挂卡片 path=${mini.path} (id=${card.id} 落地页 HTTP ${card.httpStatus} / 历史进入 ${card.enter} 次 / 最近在线 ${card.lastMounted})`;
  }

  if (DRY_RUN) {
    const tk = await checkToken();
    log('DRY-RUN 计划：');
    log('  video :', video);
    log('  caption:', a.caption.replace(/\n/g, ' / '));
    log('  topics:', (a.topics || []).join(','));
    log('  card  :', miniNote);
    log('  token :', tk.ok ? '有效' : (tk.expired ? '已过期需 refresh/重授权' : '检查失败 ' + (tk.error || '')));
    return;
  }

  log('发布：', path.basename(video));
  const res = spawnSync(NODE, [PUBLISH_MJS], { env, stdio: 'inherit' });
  if (res.status !== 0) { console.error('[promo] publish.mjs 退出码', res.status); process.exit(res.status || 1); }

  fs.mkdirSync(STATE_DIR, { recursive: true });
  let arr = []; try { arr = JSON.parse(fs.readFileSync(RECORD_FILE, 'utf-8')); } catch {}
  arr.push({ date: new Date().toISOString().slice(0, 10), video: path.basename(video), caption: a.caption, card: mini.enabled ? miniNote : 'none' });
  fs.writeFileSync(RECORD_FILE, JSON.stringify(arr, null, 2));
  saveState({ lastIndex: pick.nextIndex, lastPublishedAt: now });
  log('已记录发布：', RECORD_FILE);
}

main().catch(e => { console.error('[promo] ERROR', e.message); process.exit(1); });
