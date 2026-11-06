#!/usr/bin/env node
/**
 * 男人宝 ④ 自有账号宣传视频 · 隔天发安全模板流水线
 *
 * 与 kuaishou-openapi-publish/publish.mjs 配合：本脚本负责"挑素材 + 控频控 + 记发布记录"，
 * 真正的上传/发布交给 publish.mjs（纯 OpenAPI，绝不碰网页）。
 *
 * 安全约束（铁律）：
 *   - 只发布 config 里 safe:true 且 enabled:true 的素材；默认全 false，需人工确认不擦边后开启。
 *   - 挂小程序卡片不可逆，且 config.miniApp.enabled 默认 false；开启需填真实 beauty_images id。
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
  if (mini.enabled && mini.appId && mini.path && !mini.path.includes('<真实')) {
    env.KS_MINI_APP_ID = mini.appId; env.KS_MINI_PATH = mini.path;
    if (mini.title) env.KS_MINI_TITLE = mini.title;
    miniNote = `挂卡片 path=${mini.path}`;
  } else if (mini.enabled) {
    log('miniApp.enabled=true 但 path 仍含占位符 <真实...>，本次不挂卡片以免绑错。');
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
