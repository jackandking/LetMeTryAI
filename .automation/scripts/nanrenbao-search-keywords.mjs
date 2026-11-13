#!/usr/bin/env node
/**
 * 男人宝 · 快手小程序「搜索词」生成 + 合规校验
 * ─────────────────────────────────────────────────────────────
 * ⚠️ 2026-10-17 策略修正（基于快手官方《小程序搜索词添加审核规范》原文
 *    + mp.kuaishou.com 后台「搜索词配置」页实测截图）：
 *   旧版假设「搜索词 = 可自由提交的关键词（ASO 式）」，产出风格/用途词
 *   （AI艺术写真/古风汉服写真/锁屏壁纸写真…）——**该假设被官方规范证伪**。
 *
 *   官方规则（searchReview.html，2025-09-17 版 + 后台页面提示）：
 *   1. 搜索词 = 小程序别名（辅助搜索词），「只支持精准搜索词配置」；
 *   2. 别名必须是「用户认知非常高的简称/英文名」，如 AcFun→a站/A站；
 *   3. **别名≠泛化词**——品类/风格/用途词（写真/壁纸/美女/古风…）全部属
 *      「宽泛、行业概括」，强行占用搜索资源，必拒（旧词被拒的真因）；
 *   4. 上限：最多 5 个别名；每周限配 3 个；
 *   5. 未过审词汇不支持二次修改提交 → 每次提交都珍贵，先过本脚本再提交；
 *   6. 未上线小程序不支持配置。
 *   7. 【后台实测】「本名」「本名+小程序」「小程序+本名」会在一个工作日内
 *      **自动配置**为搜索词，无需额外提交 → 不要浪费每周配额在本名上。
 *
 * 用法：
 *   node nanrenbao-search-keywords.mjs --name "人人爱男人宝"              # 指定小程序本名生成别名
 *   node nanrenbao-search-keywords.mjs --name "..." --rejected "美女,写真"  # 追加历史被拒词（永久不可再提交）
 *   node nanrenbao-search-keywords.mjs --blocked "男人宝"                # 追加被占用的词（他小程序未注销，别名不清空）
 * 输出：nanrenbao-search-keywords.json（含 aliases / autoConfigured / submissionPlan / rejected / blocked）
 *
 * ⚠️ 2026-10-18 更新：`男人宝` 被用户更早的一个已下线（但未注销）小程序占用——
 *   快手规则：小程序「下线」不释放搜索别名，只有走完「注销」流程才清空别名
 *   （注销条件含下线>90天或被永久封禁等；审核7工作日+清退14工作日）。
 *   释放后需尽快认领，避免被他人注册。
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── 0. 参数解析 ────────────────────────────────────────────────
function argVal(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}
const MP_NAME = argVal('--name') || '人人爱男人宝'; // mp.kuaishou.com 后台注册本名
const extraRejected = (argVal('--rejected') || '').split(',').map(s => s.trim()).filter(Boolean);
const extraBlocked = (argVal('--blocked') || '男人宝').split(',').map(s => s.trim()).filter(Boolean);

// ─── 1. 平台硬限制（来自官方文档 + 后台页面） ────────────────────
const MAX_ALIASES = 5;        // 最多 5 个小程序别名
const MAX_PER_WEEK = 3;       // 每周限配置 3 个
const MAX_LEN = 10;           // 单条长度上限（字符）

// ─── 2. 违规规则（命中即拒） ────────────────────────────────────
// 2a. 泛化词：品类/风格/用途/媒介词——官方明令「别名≠泛化词」，单列必拒
const GENERIC_CATEGORY = new Set([
  '美女', '写真', '壁纸', '图片', '美图', '头像', '相册', 'gallery',
  '古风', '汉服', '港风', '日系', '韩系', '国风', '电影感', '氛围', '胶片',
  'AI', '艺术', '欣赏', '收藏', '看图', '视频', '直播', '交友', '社区',
  '小程序', 'app', '应用', '人人'
]);

// 2b. 名人 / 影视动漫 IP / 其他品牌（干扰其他小程序搜索 + 侵权，双违规）
const SENSITIVE_NAMES = [
  '小龙女', '神雕侠侣', '杨过', '迪丽热巴', '杨幂', '赵丽颖', '刘亦菲',
  '迪士尼', '漫威', '王者荣耀', '原神', '抖音', '小红书', '快手',
  'acfun', 'a站', 'pptv', '芒果tv', '芒果视频'
];

// 2c. 极限 / 营销 / 诱导词（平台通用风控）
const ABSOLUTE_WORDS = ['最', '第一', '唯一', '极致', '顶级', '史上', '全网', '绝对'];
const MARKETING_WORDS = ['免费', '赚钱', '秒赚', '日入', '福利', '红包', '兼职', '点击', '查看'];

function validate(kw, mpName) {
  const errors = [];
  const lower = kw.toLowerCase();
  if ([...kw].length > MAX_LEN) errors.push(`过长(>${MAX_LEN}字符)`);
  if (GENERIC_CATEGORY.has(lower) || ([...kw].length <= 2 && GENERIC_CATEGORY.has(lower))) {
    errors.push('泛化词(品类/风格/用途/通用词，官方明令拒绝)');
  }
  if (SENSITIVE_NAMES.some(n => lower.includes(n))) errors.push('名人/IP/他牌(干扰他人搜索+侵权)');
  if ([...kw].some(ch => ABSOLUTE_WORDS.includes(ch))) errors.push('极限词');
  if (MARKETING_WORDS.some(w => kw.includes(w))) errors.push('营销/诱导词');
  // 别名必须源自本名：与本名无字面重叠的一律高危（可能是泛化词或蹭别家）
  const nameChars = new Set([...mpName]);
  const overlap = [...kw].filter(ch => nameChars.has(ch)).length;
  if (overlap === 0 && !/^[a-z0-9]+$/.test(lower)) errors.push('与本名无重叠(疑似泛化/蹭量词)');
  return errors;
}

// ─── 3. 别名候选生成（全部派生自小程序本名） ─────────────────────
// 后台会自动配置：本名 / 本名+小程序 / 小程序+本名（英文不区分大小写）
function autoConfigured(mpName) {
  return [mpName, `${mpName}小程序`, `小程序${mpName}`];
}

function deriveAliases(mpName) {
  // 返回 [{kw, pos}]：pos = 'tail' | 'prefix'，品牌核心通常在尾部
  const out = [];
  const push = (kw, pos) => { if (kw) out.push({ kw, pos }); };
  // 3a. 去掉常见后缀的简称（画廊/图库/社区/平台/小程序…）
  const stripped = mpName.replace(/(画廊|图库|社区|平台|小程序|助手|神器|中心)+$/, '');
  if (stripped && stripped !== mpName) push(stripped, 'prefix');
  // 3b. 尾部子串（2-4 字）——「人人爱男人宝」→「男人宝」这类品牌核心
  const chars = [...mpName];
  for (let len = 2; len <= 4 && len < chars.length; len++) {
    push(chars.slice(chars.length - len).join(''), 'tail');
    // 3c. 首部子串（2-4 字）——「人人爱男人宝」→「人人爱」
    push(chars.slice(0, len).join(''), 'prefix');
  }
  return out;
}

// ─── 4. 校验 + 评分 + 截断到平台上限 ────────────────────────────
const auto = autoConfigured(MP_NAME);
const seen = new Set(auto); // 自动配置的不进候选池（不浪费配额）

const rejected = [
  ...extraRejected.map(kw => ({ kw, errors: ['历史被拒(官方不支持二次修改提交,永久拉黑)'] })),
];
// 被其他小程序占用的词：别名不清空前提交必冲突，旧小程序注销释放后才可认领
const blocked = extraBlocked.map(kw => ({ kw, reason: '被其他小程序占用(其注销后搜索别名字才清空)' }));
const accepted = [];
for (const { kw, pos } of deriveAliases(MP_NAME)) {
  if (seen.has(kw)) continue;
  seen.add(kw);
  if (extraRejected.includes(kw)) continue;
  if (extraBlocked.includes(kw)) continue;
  const errs = validate(kw, MP_NAME);
  if (errs.length) { rejected.push({ kw, errors: errs }); continue; }
  accepted.push({ kw, pos });
}

// 评分：尾部子串（品牌核心）优先；长度贴近 3 字（高认知简称的典型长度）
function score({ kw, pos }) {
  let s = 0;
  if (pos === 'tail') s += 30;
  if (pos === 'prefix') s += 15;
  s += Math.max(0, 10 - Math.abs([...kw].length - 3) * 3);
  return s;
}
accepted.sort((a, b) => score(b) - score(a));
const finalAliases = accepted.slice(0, MAX_ALIASES).map(x => x.kw);

// 本周提交计划：上限 MAX_PER_WEEK，优先最像别名的
const thisWeek = finalAliases.slice(0, MAX_PER_WEEK);

const out = {
  brand: 'nanrenbao',
  specSource: 'https://open.kuaishou.com/docs/operate/reviewSpecification/review/searchReview.html',
  specVersion: '2025-09-17',
  miniProgramName: MP_NAME,
  reason: '别名≠泛化词；必须为本名的高认知简称',
  generatedAt: new Date().toISOString(),
  limits: { maxAliases: MAX_ALIASES, maxPerWeek: MAX_PER_WEEK, maxLenPerAlias: MAX_LEN },
  autoConfigured: auto,
  aliases: finalAliases,
  submissionPlan: { thisWeek, nextWeek: finalAliases.slice(MAX_PER_WEEK) },
  blocked,
  rejected
};

const outPath = path.resolve(__dirname, 'nanrenbao-search-keywords.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));

const quiet = process.argv.includes('--quiet');
if (!quiet) {
  console.log(`小程序本名：${MP_NAME}`);
  console.log(`\n🤖 自动配置（无需提交，1 个工作日内生效）：${auto.join(' / ')}`);
  console.log(`\n✅ 合规别名候选（≤${MAX_ALIASES}，派生自本名，已规避泛化词/名人IP/极限/营销）：\n`);
  finalAliases.forEach((k, i) => console.log(`  ${i + 1}. ${k}`));
  console.log(`\n📅 提交计划（每周限 ${MAX_PER_WEEK} 个）：`);
  console.log(`  本周提交：${thisWeek.join(' / ') || '(无)'}`);
  const next = finalAliases.slice(MAX_PER_WEEK);
  if (next.length) console.log(`  下周提交：${next.join(' / ')}`);
  console.log(`\n⚠️  提醒：未过审词汇不支持二次修改提交——提交前先跑本脚本校验。`);
  console.log(`已写入: ${outPath}`);
  if (rejected.length) {
    console.log('\n⚠️  被规则剔除/历史被拒的词：');
    rejected.forEach(r => console.log(`  - ${r.kw}  [${r.errors.join(', ')}]`));
  }
  if (blocked.length) {
    console.log('\n🚫 被其他小程序占用的词（旧小程序注销释放后才可提交）：');
    blocked.forEach(b => console.log(`  - ${b.kw}  [${b.reason}]`));
  }
}

export default out;
