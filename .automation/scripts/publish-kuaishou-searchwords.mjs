#!/usr/bin/env node
/**
 * 男人宝 · 快手小程序搜索词 自动填表
 * ─────────────────────────────────────────────────────────────
 * 复用 publish-kuaishou-task.js 的 Playwright 持久登录 + headless + 手动登录兜底模式，
 * 把 nanrenbao-search-keywords.json 生成的合规搜索词填进小程序后台「搜索词」配置页。
 *
 * ⚠️  CONFIG 里的 URL / 选择器目前是占位（TODO），需先用 --discover 跑一次、
 *     对照真实表单结构填实后再正式提交。不要瞎猜表单——见 README 末尾。
 *
 * 用法：
 *   # 只看将填什么词（不启浏览器）
 *   node .automation/scripts/publish-kuaishou-searchwords.mjs --dry-run
 *
 *   # 先探一次表单结构（保存登录态 + dump 表单 HTML/选择器到 .local/exports/ks-mp）
 *   HEADLESS=false node .automation/scripts/publish-kuaishou-searchwords.mjs --discover
 *
 *   # 正式填表（需已确认 CONFIG 且登录态有效）
 *   HEADLESS=true PUBLISH_NON_INTERACTIVE=true \
 *     node .automishou-searchwords.mjs
 *
 * 依赖：playwright（与 publish-kuaishou-task.js 同环境）
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LETMETRYAI_DIR = process.env.LETMETRYAI_DIR || path.resolve(__dirname, '../../');
const HEADLESS = process.env.HEADLESS !== 'false';
const NON_INTERACTIVE = process.env.PUBLISH_NON_INTERACTIVE === 'true';

// ─── CONFIG：待对照真实后台填实（先用 --discover 取结构） ─────────────
const CONFIG = {
  // 快手小程序管理后台「搜索词 / 搜索关键词」配置页完整 URL
  // 常见入口：mp.kuaishou.com → 流量 / 搜索展示 / 搜索关键词
  SEARCH_KEYWORDS_URL:
    process.env.KS_MP_SEARCH_URL ||
    'TODO: https://mp.kuaishou.com/.../search-keyword',

  // 单条搜索词输入框候选选择器（按顺序尝试，命中第一个可见的）
  // 不同后台可能是「N 个独立 input」或「一个 tag 输入」。下方为常见占位。
  KEYWORD_INPUT_SELECTORS: [
    'input[placeholder*="搜索词"]',
    'input[placeholder*="关键词"]',
    'input[placeholder*="keyword"]',
    '.ks-input__inner'
  ],

  // 保存 / 提交按钮候选选择器
  SUBMIT_SELECTOR: 'button:has-text("保存"), button:has-text("提交"), button:has-text("确定")',

  // 每条关键词最大长度（与生成器保持一致，按需调）
  MAX_KEYWORDS: 10
};

// 小程序后台登录态文件（与 daren.kuaishou.com 星火后台不同域，需单独登录）
const AUTH_FILE =
  process.env.KUAISHOU_MP_AUTH_FILE ||
  path.resolve(LETMETRYAI_DIR, '.runtime', 'kuaishou_mp_auth.json');

const EXPORT_DIR = path.resolve(LETMETRYAI_DIR, '.automation/.local/exports/ks-mp');

// ─── 读取关键词 ───────────────────────────────────────────────────
function loadKeywords() {
  const explicit = process.argv.find(a => a.startsWith('--file='));
  const candidates = [];
  if (explicit) candidates.push(path.resolve(explicit.split('=')[1]));
  candidates.push(path.resolve(__dirname, 'nanrenbao-search-keywords.json'));

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
        if (Array.isArray(data.keywords) && data.keywords.length) return data.keywords;
      } catch (e) { /* try next */ }
    }
  }
  // 兜底内嵌（与生成器输出一致）
  return [
    'AI艺术写真', '古风汉服写真', '港风复古写真', '日系清新写真',
    '电影感写真', '氛围感写真', '艺术美图欣赏', '女生头像写真',
    '锁屏壁纸写真', '手机壁纸写真'
  ];
}

function ensureDir(d) { fs.mkdirSync(d, { recursive: true }); }

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const discover = args.includes('--discover');
  const keywords = loadKeywords().slice(0, CONFIG.MAX_KEYWORDS);

  console.log('═'.repeat(56));
  console.log(' 男人宝 · 快手小程序搜索词填表');
  console.log('═'.repeat(56));
  console.log(` 目标词(${keywords.length}): ${keywords.join(' | ')}`);
  console.log(` 后台URL: ${CONFIG.SEARCH_KEYWORDS_URL}`);
  console.log(` 登录态:  ${AUTH_FILE}`);
  console.log('═'.repeat(56));

  if (dryRun) {
    console.log('\n[dry-run] 不启动浏览器。将上述词填入后台「搜索词」即可。');
    return;
  }

  if (CONFIG.SEARCH_KEYWORDS_URL.startsWith('TODO')) {
    console.error('\n❌ SEARCH_KEYWORDS_URL 还是占位 TODO。');
    console.error('   先跑: HEADLESS=false node publish-kuaishou-searchwords.mjs --discover');
    console.error('   对照 dump 出的表单结构，把 CONFIG 里的 URL / 选择器填实。');
    process.exit(1);
  }

  ensureDir(EXPORT_DIR);
  const browser = await chromium.launch({
    headless: HEADLESS,
    executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--disable-blink-features=AutomationControlled', '--no-sandbox']
  });

  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined
  });
  const page = await context.newPage();

  try {
    console.log('\n🌐 打开后台搜索词配置页...');
    await page.goto(CONFIG.SEARCH_KEYWORDS_URL, { timeout: 60000, waitUntil: 'domcontentloaded' });

    // 登录态失效 → 手动登录兜底
    const needsLogin = /passport|login|account/.test(page.url());
    if (needsLogin || !fs.existsSync(AUTH_FILE)) {
      console.log('⚠️  未登录或登录态缺失，请在浏览器窗口手动登录（短信验证码推荐）。');
      if (HEADLESS) {
        console.error('❌ headless 无法手动登录，请 HEADLESS=false 重跑。');
        process.exit(1);
      }
      await page.waitForURL(u => !/passport|login/.test(u.toString()), { timeout: 300000 });
      ensureDir(path.dirname(AUTH_FILE));
      await context.storageState({ path: AUTH_FILE });
      console.log(`💾 小程序后台登录态已存: ${AUTH_FILE}`);
    }

    if (discover) {
      console.log('🔍 --discover：dump 表单结构...');
      await page.waitForTimeout(3000);
      const ts = new Date().toISOString().replace(/[:.]/g, '-');
      const htmlPath = path.join(EXPORT_DIR, `search-form-${ts}.html`);
      fs.writeFileSync(htmlPath, await page.content());

      const inputs = await page.$$eval('input, textarea', els =>
        els.map(e => ({
          tag: e.tagName,
          type: e.type || '',
          placeholder: e.placeholder || '',
          name: e.name || '',
          cls: e.className || '',
          id: e.id || ''
        }))
      );
      const buttons = await page.$$eval('button', els =>
        els.map(e => ({ text: (e.textContent || '').trim(), cls: e.className || '' }))
          .filter(b => b.text)
      );
      const dump = { url: page.url(), inputs, buttons };
      const jsonPath = path.join(EXPORT_DIR, `search-form-${ts}.json`);
      fs.writeFileSync(jsonPath, JSON.stringify(dump, null, 2));
      console.log(`✅ 表单结构已 dump:\n   HTML: ${htmlPath}\n   JSON: ${jsonPath}`);
      console.log('   把这两个文件发我，我把 CONFIG 的 selector 锁死后再正式填。');
      await browser.close();
      return;
    }

    // 正式填表：按顺序把词填进可见输入框
    console.log('📝 逐条填入搜索词...');
    let filled = 0;
    for (const kw of keywords) {
      let inputEl = null;
      for (const sel of CONFIG.KEYWORD_INPUT_SELECTORS) {
        const loc = page.locator(sel).nth(filled);
        if (await loc.count() > 0 && await loc.isVisible().catch(() => false)) {
          inputEl = loc;
          break;
        }
      }
      if (!inputEl) {
        // 退而求其次：取第 filled 个任意文本输入框
        const anyInput = page.locator('input[type="text"], input:not([type]), textarea').nth(filled);
        if (await anyInput.count() > 0) inputEl = anyInput;
      }
      if (!inputEl) {
        console.log(`⚠️  第 ${filled + 1} 个输入框没找到，停止填充（已填 ${filled} 条）。`);
        break;
      }
      await inputEl.fill(kw);
      await page.waitForTimeout(400);
      filled += 1;
      console.log(`   ✔ ${kw}`);
    }

    if (filled === 0) {
      console.error('❌ 没填进任何词，请先 --discover 确认选择器。');
      process.exitCode = 1;
      await browser.close();
      return;
    }

    // 提交 / 保存
    console.log('💾 点击保存/提交...');
    const submitBtn = page.locator(CONFIG.SUBMIT_SELECTOR).first();
    if (await submitBtn.count() > 0) {
      await submitBtn.click();
      await page.waitForTimeout(3000);
      console.log('✅ 已点击保存，请在后台确认审核状态（搜索词审核通常 1–3 个工作日）。');
    } else {
      console.log('⚠️  没找到保存按钮（SUBMIT_SELECTOR）。请 --discover 后补 selector，或手动点保存。');
    }

    if (!NON_INTERACTIVE) {
      console.log('（非交互模式未开，已暂停 10s 供人工核对，Ctrl+C 退出）');
      await page.waitForTimeout(10000);
    }
  } catch (e) {
    console.error('❌ 填表异常:', e.message);
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const errPath = path.join(EXPORT_DIR, `error-${ts}.png`);
    try { await page.screenshot({ path: errPath, fullPage: true }); console.log(`📸 ${errPath}`); } catch {}
    process.exitCode = 1;
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch(e => { console.error(e); process.exit(1); });
