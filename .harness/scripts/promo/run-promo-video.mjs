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
 *   - 2026-11-08 事故补充：「id 在册」只证明落地页不 404，不证明内容合适。published-record
 *     里的 id 指向某张具体 beauty_images 写真；曾把保守汉服视频挂到肚兜深 V 图上，Owner
 *     手动删视频。故增加 safeCardIds 内容安全白名单 + blockedCardIds 黑名单，白名单为空则
 *     拒绝任何挂卡发布。视频 safe:true 与卡片 safeCardIds 是两套独立审批，缺一不可。
 *   - 隔天策略：距上次成功发布不足 36h 则跳过（launchd 每天跑，脚本控频）。
 *
 * 用法：
 *   node run-promo-video.mjs            # 真实发布（受 safe/enabled + 隔天约束）
 *   node run-promo-video.mjs --dry-run  # 只校验 token/素材/计划，不真正上传
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
const MIN_GAP_MS = 36 * 3600 * 1000; // 隔天

const DRY_RUN = process.argv.includes('--dry-run');
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
// 所以在 spawn publish.mjs 之前把 path 格式和 beauty_images id 在册性一次性验死。
function validateMiniPath(mini) {
  const p = mini.path || '';
  const m = p.match(/^pages\/rewardedWebview\/rewardedWebview\?target=nanrenbao\/beauty-scratch\?id=(\d+)&showAd=true$/);
  if (!m) throw new Error(`小程序卡片 path 格式不合法（绑错改不了，已拒绝发布）: ${p}`);
  if (!mini.appId) throw new Error('miniApp.appId 缺失，已拒绝挂卡发布');
  const id = Number(m[1]);
  // 「在册」只保证落地页不 404，不保证图片内容适合挂在这条视频下。
  // 2026-11-08 事故：685 在册且格式合法，但落地页是肚兜深 V 写真，与保守汉服视频相反。
  const blocked = Array.isArray(mini.blockedCardIds) ? mini.blockedCardIds.map(Number) : [];
  if (blocked.includes(id)) throw new Error(`卡片 id=${id} 在 blockedCardIds 黑名单（2026-11-08 事故：落地页内容与视频不符、Owner 手动删视频），拒绝挂卡发布`);
  const safeIds = Array.isArray(mini.safeCardIds) ? mini.safeCardIds.map(Number) : [];
  if (!safeIds.includes(id)) throw new Error(`卡片 id=${id} 不在 safeCardIds 内容安全白名单（当前为空：无任何落地页 id 通过不擦边复核），拒绝挂卡发布；须 Owner 复核该 id 指向的图片后再加入白名单`);
  let rec;
  try { rec = JSON.parse(fs.readFileSync(PUBLISHED_RECORD, 'utf-8')); }
  catch (e) { throw new Error(`读不到 published-record.json(${PUBLISHED_RECORD})，拒绝挂卡发布: ${e.message}`); }
  const arr = Array.isArray(rec.published) ? rec.published : [];
  if (!arr.includes(id)) throw new Error(`卡片 id=${id} 不在 published-record.json 的 ${arr.length} 个已审核已发 id 中，拒绝挂卡发布（点开会 404）`);
  return id;
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

  if (!DRY_RUN && (now - (state.lastPublishedAt || 0)) < MIN_GAP_MS) {
    log(`距上次发布不足 ${MIN_GAP_MS / 3600000}h，跳过（隔天策略）。`);
    return;
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
    const id = validateMiniPath(mini);
    env.KS_MINI_APP_ID = mini.appId; env.KS_MINI_PATH = mini.path;
    if (mini.title) env.KS_MINI_TITLE = mini.title;
    miniNote = `挂卡片 path=${mini.path} (id=${id} 已校验在册)`;
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
