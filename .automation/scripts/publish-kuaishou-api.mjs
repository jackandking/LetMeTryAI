// 快手星火任务 · 纯 API 发布器（从 .harness/src/services/kuaishou-publisher.ts 移植）
// 读真实会话 cookie (.automation/.local/auth/kuaishou_auth.json)，逐接口打日志，验证 API 发布通路。
// 用法: node publish-kuaishou-api.mjs <appId> <appName> [profileId] [sourceTaskId]
import fs from 'fs';

const AUTH_FILE = '/Users/jak/LetMeTryAI/.automation/.local/auth/kuaishou_auth.json';
const BASE_URL = 'https://daren.kuaishou.com';

const PROFILE_SOURCE_TASKS = {
  nanrenbao: '165805',
  'elder-love': '183044',
  'parent-tools': '186229',
  womanai: '188816',
};

const args = process.argv.slice(2);
const appId = args[0] || 'nanrenbao/back-view-killer';
const appName = args[1] || '男人宝背影杀';
const profileId = args[2] || 'nanrenbao';
const SOURCE_TASK_ID = args[3] || PROFILE_SOURCE_TASKS[profileId] || '165805';

const log = (m, c = '') => console.log(`${c}${m}\x1b[0m`);
const ok = (m) => log(`✅ ${m}`, '\x1b[32m');
const warn = (m) => log(`⚠️  ${m}`, '\x1b[33m');
const err = (m) => log(`❌ ${m}`, '\x1b[31m');

// ── 品牌路径一致性校验（避免挂错小程序）──
const PREFIXES = { 'parent-tools': ['parent-tools/'], nanrenbao: ['nanrenbao/'], womanai: ['womanai/'], 'elder-love': ['elder-love/'] };
function brandCheck(id, profile) {
  for (const [brand, prefs] of Object.entries(PREFIXES)) {
    for (const p of prefs) {
      if (id.startsWith(p) && profile !== brand) {
        return `BRAND_MISMATCH: appId "${id}" 以 "${p}" 开头但 profile 是 "${profile}"`;
      }
    }
  }
  return null;
}

function buildCookies() {
  const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
  const c = (state.cookies || []).filter(x => (x.domain || '').includes('kuaishou.com')).map(x => `${x.name}=${x.value}`).join('; ');
  if (!c) throw new Error('auth 文件里没有 kuaishou cookie');
  return c;
}
const cookies = buildCookies();

const headers = () => ({
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Cookie': cookies,
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Referer': `${BASE_URL}/distribution-plan-create/recreate/${SOURCE_TASK_ID}`,
  'Origin': BASE_URL,
});

async function apiPost(endpoint, body) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  const data = await res.json();
  if (data.result === 109) throw new Error('SESSION_EXPIRED');
  return data;
}
async function apiGet(endpoint) {
  const res = await fetch(`${BASE_URL}${endpoint}`, { method: 'GET', headers: headers() });
  const data = await res.json();
  if (data.result === 109) throw new Error('SESSION_EXPIRED');
  return data;
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms + Math.random() * 500));

async function main() {
  log(`\n🚀 API 发布: appId=${appId} | appName=${appName} | profile=${profileId} | 模板=${SOURCE_TASK_ID}`, '\x1b[36m');

  const bc = brandCheck(appId, profileId);
  if (bc) { err(bc); process.exit(1); }
  ok('品牌路径一致性通过');

  // 1) 取模板详情
  log('\n[1] distribution/detail');
  const tpl = await apiPost('/rest/pc/creator/marketing/distribution/detail', { distributionPlanId: Number(SOURCE_TASK_ID), detailType: 'Online' });
  if (tpl.result !== 1) throw new Error(`detail 失败: ${tpl.message}`);
  const template = tpl.data;
  ok(`模板加载成功 miniAppId=${template.miniAppId}`);
  await sleep(300);

  // 2) 文本审核
  log('\n[2] common/textCheck');
  const tc = await apiPost('/rest/pc/creator/marketing/common/textCheck', { text: appName });
  if (tc.result !== 1) throw new Error(`textCheck 接口错误: ${tc.message}`);
  if (!tc.data?.valid) throw new Error(`文本被拒: ${tc.data?.message}`);
  ok(`文本审核通过: "${appName}"`);
  await sleep(300);

  // 3) 资源路径校验
  const resourcePath = `pages/rewardedWebview/rewardedWebview?target=${appId}&showAd=true`;
  log(`\n[3] resource/checkResource  path=${resourcePath}`);
  const rc = await apiPost('/rest/pc/creator/marketing/distribution/resource/checkResource', { appId: template.miniAppId, appPath: resourcePath });
  if (rc.result !== 1) throw new Error(`checkResource 接口错误: ${rc.message}`);
  if (!rc.data?.result) throw new Error('资源路径被拒（appId 或路径在小程序里不存在）');
  ok('资源路径校验通过');
  await sleep(300);

  // 4) AI 封面（失败则退回模板封面）
  let coverUri = null;
  log('\n[4] AI 封面生成（可选）');
  try {
    const review = await apiGet('/rest/node/ai/review');
    await sleep(300);
    const img = await apiGet('/rest/node/ai/img');
    if (img.result === 1 && img.data) {
      const up = await apiPost('/rest/pc/creator/marketing/common/uploadImage', { url: img.data });
      if (up.result === 1 && up.data?.uri) { coverUri = up.data.uri; ok(`AI 封面: ${coverUri}`); }
    }
  } catch (e) { warn(`AI 封面失败，将用模板封面: ${e.message}`); }
  if (!coverUri) {
    const tplCover = template.resourceInfos?.[0]?.resourceCover || '';
    const m = tplCover.match(/\/kos\/[^\s?]+/);
    coverUri = m ? m[0] : tplCover;
    ok(`使用模板封面: ${coverUri}`);
  }

  // 5) 提交
  log('\n[5] distribution/create', '\x1b[36m');
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const fiveYearsMs = todayMs + 5 * 365 * 24 * 60 * 60 * 1000;
  const bidInfos = (template.bidInfos || []).map(b => ({
    bidValueType: b.bidValueType, bidValue: b.bidValue,
    bidCondition: { key: b.bidCondition?.key, op: b.bidCondition?.op, value: b.bidCondition?.value },
  }));
  const payload = {
    resourceSource: 1,
    miniAppId: template.miniAppId,
    indicators: template.indicatorValues || [1],
    bidType: 2,
    distributionMatchType: template.distributionMatchType || 1,
    payType: template.payType || 3,
    bidInfos,
    budget: null,
    classifications: template.classifications || [11, 8],
    effectiveTime: todayMs,
    lostTime: fiveYearsMs,
    introduce: template.introduce,
    settleDesc: template.settleDesc,
    agreement: template.agreement || { title: '', url: '' },
    attendLimit: template.attendLimit ?? -1,
    crowdInfo: { type: 1, channels: [], userIds: [], uploadFileName: '' },
    minFansCount: template.minFansCount ?? -1,
    maxFansCount: template.maxFansCount ?? -1,
    autoAppendSwitch: template.autoAppendSwitch || 0,
    onceAppendAmount: 0,
    appendAmountRatio: '',
    appendAmountCeiling: 0,
    resourceInfos: [{
      resourceLink: '', resourceCover: coverUri, resourceId: 1, resourcePath,
      resourceTitle: appName, uniqueId: 0, aiSuggestion: '{"title":"","img":""}', status: 1,
    }],
    distributionPlanTitle: appName,
    subResourceType: template.subResourceType || 2,
    miniAppResourceType: template.miniAppResourceType || 1,
    taskMountType: template.taskMountType || 1,
    examples: [],
  };
  const create = await apiPost('/rest/pc/creator/marketing/distribution/create', payload);
  if (create.result !== 1) throw new Error(`create 失败: result=${create.result}, message=${create.message}`);
  ok(`🎉 提交成功！Plan ID: ${create.data?.distributionPlanId}`);
  ok('已进入审核，预计 3-5 个工作日');
}

main().catch(e => { err(e.message); process.exit(1); });
