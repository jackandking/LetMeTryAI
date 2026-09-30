#!/usr/bin/env node
/**
 * Kuaishou Login - Mobile Phone + SMS Verification
 * 
 * Interactive login for Kuaishou Creator Platform.
 * Saves session to .automation/.local/auth/kuaishou_auth.json for reuse by other scripts.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default configuration
const DEFAULT_AUTH_FILE = '.automation/.local/auth/kuaishou_auth.json';
const DEFAULT_PHONE = '13810417594';
const LOGIN_URL = 'https://daren.kuaishou.com/distribution-plan-list';

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// ── 单实例锁：避免两个登录进程抢同一个 /tmp/ks_qr.png（之前就因残留进程导致死码）──
const LOCK_FILE = '/tmp/kuaishou_login.lock';
function _readLockPid() {
    try { return parseInt(fs.readFileSync(LOCK_FILE, 'utf-8').trim(), 10) || 0; } catch { return 0; }
}
function _isPidAlive(pid) {
    if (!pid) return false;
    try { process.kill(pid, 0); return true; } catch { return false; }
}
function killExistingInstance() {
    const pid = _readLockPid();
    if (pid && _isPidAlive(pid)) {
        try { process.kill(pid, 'SIGTERM'); } catch {}
        for (let i = 0; i < 25 && _isPidAlive(pid); i++) {
            const t0 = Date.now(); while (Date.now() - t0 < 200) {}
        }
    }
    try { fs.unlinkSync(LOCK_FILE); } catch {}
}
function acquireLock() {
    const pid = _readLockPid();
    if (pid && _isPidAlive(pid)) return pid; // 另一个活进程持有锁
    try { fs.writeFileSync(LOCK_FILE, String(process.pid)); } catch {}
    return 0;
}
function releaseLock() {
    try { if (_readLockPid() === process.pid) fs.unlinkSync(LOCK_FILE); } catch {}
}

// ── 实时二维码页面（本地 HTTP 服务）：页面每 2 秒自动刷新，扫的是活码，不再有快照过期竞速 ──
const QR_PAGE_HTML = `<!doctype html><html lang="zh"><head><meta charset="utf-8">
<title>快手登录二维码</title>
<meta http-equiv="refresh" content="30">
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0e0e10;color:#eee;text-align:center;margin:0;padding:24px}img{width:340px;height:340px;background:#fff;border-radius:12px;margin-top:16px}.tip{color:#9aa;font-size:13px}</style>
</head><body>
<h2>快手创作者平台 · 扫码登录</h2>
<img id="qr" src="/qr.png" alt="二维码">
<p class="tip">二维码每隔几秒自动刷新，直接用快手 App 扫即可</p>
<script>setInterval(function(){document.getElementById('qr').src='/qr.png?t='+Date.now();},2000);</script>
</body></html>`;

/**
 * Prompt user for input with optional default value
 */
function prompt(question, defaultValue = '') {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    const displayQuestion = defaultValue 
        ? `${question} (${defaultValue}): `
        : question;
    
    return new Promise((resolve) => {
        rl.question(displayQuestion, (answer) => {
            rl.close();
            const trimmed = answer.trim();
            resolve(trimmed || defaultValue);
        });
    });
}

/**
 * Ensure directory exists
 */
function ensureDir(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Check if session file exists and is valid JSON
 */
function sessionExists(authFile) {
    try {
        if (!fs.existsSync(authFile)) return false;
        const content = fs.readFileSync(authFile, 'utf-8');
        const data = JSON.parse(content);
        // Check if it has cookies
        return data && data.cookies && data.cookies.length > 0;
    } catch (e) {
        return false;
    }
}

/**
 * Main login class
 */
export class KuaishouLogin {
    constructor(options = {}) {
        this.authFile = options.authFile || DEFAULT_AUTH_FILE;
        this.headless = options.headless !== undefined ? options.headless : false;
        this.viewport = options.viewport || { width: 1280, height: 800 };
        this.servePort = options.servePort || 0;
        this._qrServer = null;
        this.browser = null;
        this.context = null;
        this.page = null;
    }

    /**
     * Initialize browser
     */
    async init() {
        log('🚀 Launching browser...', 'cyan');
        
        this.browser = await chromium.launch({ 
            headless: this.headless,
            executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            args: [
                '--disable-blink-features=AutomationControlled',
                '--no-sandbox',
                '--disable-dev-shm-usage',   // 防止长空闲渲染进程崩溃 (Page crashed)
                '--disable-gpu'
            ]
        });
        
        // Load existing session if available
        const storageState = sessionExists(this.authFile) 
            ? this.authFile 
            : undefined;
        
        this.context = await this.browser.newContext({
            viewport: this.viewport,
            storageState: storageState
        });
        
        this.page = await this.context.newPage();
        
        // Hide automation indicators
        await this.page.addInitScript(() => {
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        });
    }

    /**
     * Check if currently logged in by navigating to the target URL
     */
    async isLoggedIn() {
        try {
            log('🔍 Checking login status...', 'cyan');
            await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
            await this.page.waitForTimeout(3000);
            return this.checkPageLoggedIn();
        } catch (error) {
            log(`⚠️ Error checking login status: ${error.message}`, 'yellow');
            return false;
        }
    }

    /**
     * Check if the current page shows a logged-in state (no navigation)
     */
    async checkPageLoggedIn() {
        try {
            // If URL is still on login/passport page, not logged in
            const currentUrl = this.page.url();
            if (currentUrl.includes('passport.kuaishou.com') || currentUrl.includes('/login')) {
                log('⚠️ Still on login page', 'yellow');
                return false;
            }

            // If URL reached the target page (distribution-plan-list), we're logged in
            if (currentUrl.includes('distribution-plan-list') || currentUrl.includes('daren.kuaishou.com')) {
                // Double check: look for login form indicators (SMS/password inputs)
                const hasLoginForm = await this.page.locator('input[placeholder*="密码"], input[placeholder*="验证码"]').first()
                    .isVisible({ timeout: 1000 }).catch(() => false);
                if (hasLoginForm) {
                    log('⚠️ Login form still visible on page', 'yellow');
                    return false;
                }
                log('✅ Reached target page - logged in', 'green');
                return true;
            }

            // Check for common logged-in indicators
            const loginIndicators = [
                '.distribution-plan-list-container',
                '.create-plan-btn',
                '.user-avatar',
                '.ks-dropdown-menu',
                '[class*="user-info"]',
                '[class*="sidebar"]',
                '[class*="nav-menu"]'
            ];

            for (const selector of loginIndicators) {
                try {
                    const element = this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 1000 })) {
                        log(`✅ Found login indicator: ${selector}`, 'green');
                        return true;
                    }
                } catch (e) {
                    // Continue
                }
            }

            // Check for login-form-specific text (not just any "登录")
            const pageText = await this.page.content();
            if (pageText.includes('手机号登录') || pageText.includes('密码登录') || pageText.includes('验证码登录')) {
                log('⚠️ Login page detected', 'yellow');
                return false;
            }

            // If we're on the target domain and no login form, assume logged in
            if (currentUrl.includes('kuaishou.com') && !currentUrl.includes('passport')) {
                log('✅ On Kuaishou domain without login redirect', 'green');
                return true;
            }

            return false;
        } catch (error) {
            log(`⚠️ Error checking page state: ${error.message}`, 'yellow');
            return false;
        }
    }

    /**
     * Perform phone + SMS login
     */
    async login(defaultPhone = DEFAULT_PHONE, autoMode = false, codeMode = false) {
        await this.init();

        // Resolve the phone number up-front so the retry loop can reuse it.
        let phoneNumber = defaultPhone;
        if (autoMode) {
            log(`📱 Auto mode: Using phone number: ${defaultPhone}`, 'cyan');
        } else {
            const input = await prompt('📱 Enter your phone number', defaultPhone);
            phoneNumber = input || defaultPhone;
        }
        if (!phoneNumber || phoneNumber.length < 11) {
            throw new Error('Invalid phone number');
        }

        // Re-runnable setup: go to login page, switch to the SMS tab, fill the phone.
        // Called at the start of every attempt so a retry always lands on a clean
        // SMS form (after a wrong code the page often flips back to password tab).
        const setupPhoneSession = async () => {
            await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
            await this.page.waitForTimeout(2500);
            await this.switchToPhoneLogin();
            await this.page.waitForTimeout(2000);
            const phoneInput = await this.findPhoneInput();
            if (!phoneInput) throw new Error('Could not find phone number input field');
            await phoneInput.fill(phoneNumber);
            await phoneInput.click();
            await this.page.waitForTimeout(500);
            log('\u2705 Entered phone number', 'green');
        };

        try {
            // Fast path: a still-valid saved session
            if (await this.isLoggedIn()) {
                log('\n\u2705 Already logged in!', 'green');
                await this.saveSession();
                return true;
            }

            log('\n🔐 Need to login', 'yellow');
            await this.page.waitForTimeout(3000);
            await this.page.screenshot({ path: 'login_initial.png' }).catch(() => {});

            // Loop: each iteration mints a FRESH SMS code. Handles a wrong/expired
            // code (re-request) and a transient Chromium crash (relaunch + retry).
            const maxAttempts = 4;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    await setupPhoneSession();

                    // 1) Request a fresh SMS code
                    await this.page.waitForTimeout(1500);
                    log('\n📲 Clicking SMS code button...', 'cyan');
                    let smsBtn = await this.clickGetSMSButton();
                    if (!smsBtn) {
                        log('\u26A0\uFE0F First try missed, retrying once...', 'yellow');
                        await this.page.waitForTimeout(2000);
                        smsBtn = await this.clickGetSMSButton();
                    }
                    log(smsBtn ? '\u2705 Clicked SMS code button' : '\u26A0\uFE0F Could not click SMS code button', smsBtn ? 'green' : 'yellow');
                    await this.page.waitForTimeout(3000);

                    // 2) Wait for the code (file-poll in agent mode; prompt in TTY)
                    let smsCode;
                    if (codeMode) {
                        log('\n\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500', 'cyan');
                        log('📲 已请求短信验证码，请在聊天里把 6 位验证码告诉我', 'yellow');
                        log('   我会把它写入 .automation/.local/auth/_pending_sms_code.txt 供脚本读取', 'yellow');
                        log('\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n', 'cyan');
                        smsCode = await this.waitForCodeFile(600);
                    } else {
                        log('\n📲 请查看手机短信 / Please check your phone SMS', 'yellow');
                        smsCode = await prompt('🔢 请输入验证码 / Enter verification code');
                    }
                    if (!smsCode || smsCode.length < 4) throw new Error('Invalid SMS code');

                    // 3) Fill the code
                    const codeInput = await this.findCodeInput();
                    if (!codeInput) throw new Error('Could not find verification code input field');
                    await codeInput.fill(smsCode);
                    log('\u2705 Entered verification code', 'green');
                    await this.page.waitForTimeout(1000);

                    // Guard 1: page sometimes flips back to the password tab
                    const passwordVisible = await this.page.locator('input[placeholder*="\u5BC6\u7801"]:visible').count();
                    if (passwordVisible > 0) {
                        log('\u26A0\uFE0F 页面跳回了密码登录 tab，重新点击「验证码登录」...', 'yellow');
                        await this.page.locator('text=\u9A8C\u8BC1\u7801\u767B\u5F55').first().click({ force: true });
                        await this.page.waitForTimeout(1500);
                        const codeInput2 = await this.findCodeInput();
                        if (codeInput2) {
                            await codeInput2.fill(smsCode);
                            log('\u2705 Re-entered verification code after tab switch', 'green');
                        }
                    }

                    // Guard 2: ensure the agreement checkbox is checked
                    try {
                        const checked = await this.page.evaluate(() => {
                            const boxes = document.querySelectorAll('input[type="checkbox"]');
                            for (const b of boxes) {
                                if (b.closest('form') || b.offsetParent) return b.checked;
                            }
                            return true;
                        });
                        if (!checked) {
                            log('\u26A0\uFE0F 协议复选框未勾选，自动勾选「我同意」...', 'yellow');
                            await this.page.locator('text=\u6211\u540C\u610F').first().click({ force: true });
                            await this.page.waitForTimeout(500);
                        } else {
                            log('\u2705 Agreement checkbox already checked', 'green');
                        }
                    } catch (e) {
                        log(`  (agreement check skipped: ${e.message})`, 'cyan');
                    }

                    // 4) Submit
                    log('\n🔐 Clicking login button...', 'cyan');
                    const submitBtn = await this.findLoginButton();
                    if (submitBtn) {
                        await submitBtn.click({ force: true });
                        log('\u2705 Clicked login button automatically', 'green');
                    } else {
                        log('\n\u26A0\uFE0F Could not find login button automatically', 'yellow');
                        await prompt('\n\u23F8\uFE0F 点击完成后请按回车 / Press Enter after clicking...');
                    }

                    // 5) Wait for completion
                    log('\n\u23F3 Waiting for login to complete...', 'cyan');
                    await this.page.waitForTimeout(5000);

                    const hasSlider = await this.checkForSliderCaptcha();
                    if (hasSlider) {
                        if (codeMode) {
                            log('\n\u26A0\uFE0F 检测到滑块验证！请在弹出的浏览器窗口手动拖动完成', 'yellow');
                            log('\u23F3 等待你在窗口中完成滑块（最长 120 秒）...', 'yellow');
                            const deadline = Date.now() + 120000;
                            while (Date.now() < deadline) {
                                await this.page.waitForTimeout(3000);
                                if (await this.checkPageLoggedIn()) break;
                            }
                        } else if (process.stdin.isTTY) {
                            log('\n\u26A0\uFE0F Slider captcha detected!', 'yellow');
                            await prompt('\n\u23F8\uFE0F Press Enter after completing captcha...');
                        } else {
                            throw new Error('\u26A0\uFE0F 检测到滑块验证，但当前为非交互环境无法手动完成。请改为在本地终端运行：node .automation/skills/kuaishou-login/scripts/login.js');
                        }
                    }

                    if (await this.checkPageLoggedIn()) {
                        log('\n\u2705 Login successful!', 'green');
                        await this.saveSession();
                        return true;
                    }

                    // 6) Poll for the redirect to settle
                    let ok = false;
                    for (let a = 0; a < 6; a++) {
                        await this.page.waitForTimeout(5000);
                        log(`  Poll ${a + 1}/6...`, 'cyan');
                        if (await this.isLoggedIn()) { ok = true; break; }
                        try { await this.page.screenshot({ path: '/tmp/ks_login_debug.png', fullPage: false }); } catch (_) {}
                    }
                    if (ok) {
                        log('\n\u2705 Login successful!', 'green');
                        await this.saveSession();
                        return true;
                    }

                    // 7) Not logged in -> decide whether to retry with a fresh code
                    const onLoginPage = /passport|\/login/.test(this.page.url()) || await this.isOnSmsLoginForm().catch(() => false);
                    const pageText = await this.page.evaluate(() => document.body.innerText).catch(() => '');
                    const codeErr = /\u9A8C\u8BC1\u7801.{0,6}(\u9519\u8BEF|\u6709\u8BEF|\u5931\u6548|\u8FC7\u671F|\u4E0D\u6B63\u786E)|\u8BE5\u9A8C\u8BC1\u7801/.test(pageText);
                    if (codeErr || onLoginPage) {
                        log(`\u26A0\uFE0F 登录未通过（${codeErr ? '验证码错误/失效' : '仍停留在登录页'}），重新获取验证码（第 ${attempt}/${maxAttempts} 次）`, 'yellow');
                        continue;
                    }

                    log('--- \u9875\u9762\u53EF\u89C1\u6587\u672C ---\n' + pageText.slice(0, 800) + '\n--- end ---', 'yellow');
                    throw new Error('Login failed after submit (unknown reason)');

                } catch (err) {
                    const msg = (err && err.message) ? err.message : String(err);

                    // Crash / detach recovery: relaunch and retry (fresh code next loop)
                    if (/Page crashed|Target closed|Execution context was destroyed|detached|Session closed|Browser closed/i.test(msg)) {
                        if (attempt >= maxAttempts) {
                            throw new Error(`\u26A0\uFE0F 页面反复崩溃（${attempt} 次），停止重试。请检查系统 Chrome 是否正常。`);
                        }
                        log(`  \u26A0\uFE0F 页面崩溃，自动重启浏览器并重试（第 ${attempt}/${maxAttempts} 次）...`, 'yellow');
                        try { await this.browser.close().catch(() => {}); } catch (_) {}
                        await this.init();
                        continue;
                    }

                    if (/Invalid SMS code/.test(msg)) {
                        log(`\u26A0\uFE0F 验证码无效，重新获取（第 ${attempt}/${maxAttempts} 次）`, 'yellow');
                        continue;
                    }

                    throw err;
                }
            }

            throw new Error('\u23F0 多次尝试仍未登录成功（验证码反复失效或页面异常）');
        } catch (error) {
            log(`\n\u274C Login failed: ${error.message}`, 'red');
            throw error;
        }
    }

    /**
     * Check if we're on the SMS login form (code input visible)
     */
    async isOnSmsLoginForm() {
        try {
            const codeInput = this.page.locator('input[placeholder*="验证码"]').first();
            return await codeInput.isVisible({ timeout: 1000 });
        } catch (e) {
            return false;
        }
    }

    /**
     * Switch to phone/SMS login method if not already on it
     */
    async switchToPhoneLogin() {
        log('\n📱 Checking current login method...', 'cyan');

        // Wait for page to fully load
        await this.page.waitForTimeout(2000);

        // Check if already on SMS login form
        if (await this.isOnSmsLoginForm()) {
            log('✅ Already on SMS login page', 'green');
            return;
        }

        // Click "验证码登录" tab - use force:true for Svelte components
        log('🔍 Clicking "验证码登录" tab...', 'cyan');

        // Strategy 1: Svelte tab li with force click
        try {
            const smsTab = this.page.locator('li:has(span:has-text("验证码登录"))').first();
            await smsTab.click({ force: true, timeout: 3000 });
            log('✅ Clicked "验证码登录" tab', 'green');
            await this.page.waitForTimeout(2000);
            if (await this.isOnSmsLoginForm()) {
                log('✅ Successfully switched to SMS login', 'green');
                return;
            }
        } catch (e) {
            log(`  Strategy 1 (li force click) failed: ${e.message}`, 'blue');
        }

        // Strategy 2: Click span directly with force
        try {
            const smsSpan = this.page.locator('span:has-text("验证码登录")').first();
            await smsSpan.click({ force: true, timeout: 3000 });
            log('✅ Clicked "验证码登录" span', 'green');
            await this.page.waitForTimeout(2000);
            if (await this.isOnSmsLoginForm()) {
                log('✅ Successfully switched to SMS login', 'green');
                return;
            }
        } catch (e) {
            log(`  Strategy 2 (span force click) failed: ${e.message}`, 'blue');
        }

        // Strategy 3: JavaScript dispatchEvent (proper bubbling for Svelte)
        log('🔍 Trying dispatchEvent...', 'cyan');
        try {
            await this.page.evaluate(() => {
                const lis = document.querySelectorAll('li');
                for (const li of lis) {
                    if (li.textContent?.trim() === '验证码登录') {
                        li.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                        return;
                    }
                }
            });
            await this.page.waitForTimeout(2000);
            if (await this.isOnSmsLoginForm()) {
                log('✅ Successfully switched to SMS login', 'green');
                return;
            }
        } catch (e) {
            log(`  Strategy 3 (dispatchEvent) failed: ${e.message}`, 'blue');
        }

        log('⚠️ Could not auto-switch to SMS login', 'yellow');
        log('📝 Please manually click "验证码登录" tab in the browser', 'yellow');
        if (process.stdin.isTTY) {
            await prompt('\n⏸️ 点击完成后请按回车 / Press Enter after clicking...');
        } else {
            throw new Error('⚠️ 无法自动切换到验证码登录，且当前为非交互环境。请改为在本地终端运行：node .automation/skills/kuaishou-login/scripts/login.js');
        }
    }

    /**
     * Find phone input field
     */
    async findPhoneInput() {
        const phoneInputSelectors = [
            'input[placeholder*="手机号"]',
            'input[placeholder*="手机"]',
            'input[placeholder*="电话"]',
            'input[type="tel"]',
            'input[name*="phone"]',
            'input[name*="mobile"]',
            'input[class*="phone"]',
            'input[maxlength="11"]'
        ];

        for (const selector of phoneInputSelectors) {
            try {
                const input = this.page.locator(selector).first();
                if (await input.isVisible({ timeout: 3000 })) {
                    log(`  Found phone input: ${selector}`, 'blue');
                    return input;
                }
            } catch (e) {
                // Try next
            }
        }

        // Fallback: first visible text input on the page
        try {
            const inputs = await this.page.locator('input[type="text"]').all();
            for (const input of inputs) {
                if (await input.isVisible()) {
                    log('  Found phone input (first visible text input)', 'blue');
                    return input;
                }
            }
        } catch (e) {
            // Continue
        }

        return null;
    }

    /**
     * Click get SMS code button with multiple strategies
     */
    async clickGetSMSButton() {
        // Strategy 1: Any visible element with exact text "获取验证码"
        const textSelectors = [
            'text="获取验证码"',
            'span:has-text("获取验证码")',
            'a:has-text("获取验证码")',
            'div:has-text("获取验证码")',
            'button:has-text("获取验证码")',
            '[class*="code-btn"]',
            '[class*="verify-btn"]',
            '[class*="send-code"]',
            '[class*="get-code"]'
        ];

        for (const selector of textSelectors) {
            try {
                const btn = this.page.locator(selector).first();
                if (await btn.isVisible({ timeout: 2000 })) {
                    await btn.click({ force: true });
                    log(`  Clicked SMS button: ${selector}`, 'blue');
                    return btn;
                }
            } catch (e) {
                // Try next selector
            }
        }

        // Strategy 2: JavaScript find and click with dispatchEvent
        log('  Trying JavaScript click for 获取验证码...', 'blue');
        try {
            const clicked = await this.page.evaluate(() => {
                const all = document.querySelectorAll('span, a, div, button');
                for (const el of all) {
                    if (el.textContent?.trim() === '获取验证码' && el.offsetParent !== null) {
                        el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
                        return `Clicked: ${el.tagName}`;
                    }
                }
                return 'not found';
            });
            log(`  ${clicked}`, clicked.includes('Clicked') ? 'blue' : 'yellow');
            if (clicked.includes('Clicked')) return true;
        } catch (e) {
            log(`  JS click failed: ${e.message}`, 'yellow');
        }

        return null;
    }

    /**
     * Find verification code input
     */
    async findCodeInput() {
        const codeInputSelectors = [
            'input[placeholder*="验证码"]',
            'input[placeholder*="短信"]',
            'input[name*="code"]',
            'input[name*="verify"]',
            'input[name*="captcha"]',
            'input[class*="code"]',
            'input[class*="verify"]',
            'input[maxlength="4"]',
            'input[maxlength="6"]'
        ];

        for (const selector of codeInputSelectors) {
            try {
                const input = this.page.locator(selector).first();
                if (await input.isVisible({ timeout: 3000 })) {
                    log(`  Found code input: ${selector}`, 'blue');
                    return input;
                }
            } catch (e) {
                // Try next
            }
        }

        // Fallback: find second visible text input (first is phone)
        try {
            const inputs = await this.page.locator('input[type="text"]').all();
            const visibleInputs = [];
            for (const input of inputs) {
                if (await input.isVisible()) visibleInputs.push(input);
            }
            if (visibleInputs.length >= 2) {
                log('  Found code input (second visible text input)', 'blue');
                return visibleInputs[1];
            }
        } catch (e) {
            // Continue
        }

        return null;
    }

    /**
     * Find and click login button
     */
    async findLoginButton() {
        const submitSelectors = [
            'button:has-text("登录")',
            'button:has-text("登 录")',
            'button[type="submit"]',
            '[class*="submit-btn"]',
            '[class*="login-btn"]',
            'button[class*="primary"]'
        ];
        
        for (const selector of submitSelectors) {
            try {
                const btn = this.page.locator(selector).first();
                if (await btn.isVisible({ timeout: 3000 })) {
                    log(`  Found login button: ${selector}`, 'blue');
                    return btn;
                }
            } catch (e) {
                // Try next
            }
        }
        
        return null;
    }

    /**
     * Check for slider captcha
     */
    async checkForSliderCaptcha() {
        try {
            const captchaSelectors = [
                '[class*="captcha"]',
                '[class*="slider"]',
                '[class*="verify"]',
                'iframe[src*="captcha"]'
            ];
            
            for (const selector of captchaSelectors) {
                const element = this.page.locator(selector).first();
                if (await element.isVisible({ timeout: 1000 })) {
                    return true;
                }
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * Wait for SMS code written to a file (non-TTY / agent mode).
     * The operator pastes the code into chat; the agent writes it to this file,
     * and the script picks it up. File is deleted after consumption.
     */
    async waitForCodeFile(timeoutSec = 240) {
        const file = path.resolve(process.cwd(), '.automation/.local/auth/_pending_sms_code.txt');
        const deadline = Date.now() + timeoutSec * 1000;
        log(`⏳ 等待验证码文件: ${file}`, 'cyan');
        while (Date.now() < deadline) {
            try {
                if (fs.existsSync(file)) {
                    const code = fs.readFileSync(file, 'utf-8').trim();
                    if (/^\d{4,8}$/.test(code)) {
                        fs.unlinkSync(file);
                        log('✅ 已从文件读取验证码', 'green');
                        return code;
                    }
                }
            } catch (e) {
                // ignore and retry
            }
            await new Promise(r => setTimeout(r, 2000));
        }
        throw new Error('⏰ 等待验证码文件超时 (timeout waiting for SMS code file)');
    }

    /**
     * Manual login mode: open a headed window, let the HUMAN log in
     * (QR code or SMS, whatever is easiest), poll until logged in, then save session.
     * No fragile automation — most reliable path when a human is present.
     */
    async captureQr() {
        try {
            const el = await this.page.$('img[src^="data:image/png"]');
            if (el) {
                await el.screenshot({ path: '/tmp/ks_qr.png' }).catch(async () => {
                    await this.page.screenshot({ path: '/tmp/ks_qr.png' });
                });
            } else {
                await this.page.screenshot({ path: '/tmp/ks_qr.png' });
            }
        } catch (_) {}
    }

    /**
     * 启动本地 HTTP 服务，提供“实时二维码”页面。
     * 用户在自己浏览器打开 http://localhost:<port>/ 即可看到每 2 秒自动刷新的活码，
     * 从根本上消除“聊天里发的是静态快照、等你扫时早已过期”的时序竞速。
     */
    async startQrServer() {
        if (!this.servePort) return;
        this._qrServer = http.createServer((req, res) => {
            const url = (req.url || '/').split('?')[0];
            try {
                if (url === '/' || url === '/index.html') {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(QR_PAGE_HTML);
                } else if (url === '/qr.png') {
                    if (fs.existsSync('/tmp/ks_qr.png')) {
                        const buf = fs.readFileSync('/tmp/ks_qr.png');
                        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
                        res.end(buf);
                    } else { res.writeHead(404); res.end('qr not ready'); }
                } else if (url === '/status') {
                    let age = -1, exists = false;
                    try { const s = fs.statSync('/tmp/ks_qr.png'); exists = true; age = Math.round((Date.now() - s.mtimeMs) / 1000); } catch (_) {}
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ qrExists: exists, qrAgeSec: age }));
                } else { res.writeHead(404); res.end('not found'); }
            } catch (e) {
                try { res.writeHead(500); res.end('server error'); } catch (_) {}
            }
        });
        await new Promise((resolve, reject) => {
            this._qrServer.once('error', reject);
            this._qrServer.listen(this.servePort, () => {
                log(`\n🌐 实时二维码已启动 → http://localhost:${this.servePort}/  （用本机或同网手机浏览器打开，页面每2秒自动刷新，直接扫）`, 'green');
                resolve();
            });
        });
    }

    stopQrServer() {
        if (this._qrServer) {
            try { this._qrServer.close(); } catch (_) {}
            this._qrServer = null;
            log('🔌 已关闭二维码服务', 'blue');
        }
    }

    /**
     * Probe the current login page for QR state.
     * Returns whether the QR shows an expiry overlay, whether a QR img is
     * present, and a short slice of the QR image src (used to detect a
     * silently-stale QR whose token hasn't rotated in a while).
     */
    async qrExpired() {
        try {
            return await this.page.evaluate(() => {
                const body = document.body.innerText || '';
                const expiredText = /失效|已过期|点击刷新|刷新二维码/.test(body);
                const qr = document.querySelector('img[src^="data:image/png"]');
                return {
                    expiredText,
                    hasQr: !!qr,
                    src: qr ? qr.src.slice(0, 80) : ''
                };
            });
        } catch (e) {
            return { expiredText: false, hasQr: false, src: '' };
        }
    }

    /**
     * Actively mint a brand-new QR token. Kuaishou's login page rotates the QR
     * on its own only via a client-side timer, which Chromium throttles when the
     * tab is backgrounded/headless — so the token silently dies. We click the
     * "刷新" trigger ourselves to force a fresh token, then the caller waits a
     * beat and captures. Falls back to clicking the QR img (the whole area is
     * usually clickable to refresh).
     */
    async _refreshQr() {
        try {
            return await this.page.evaluate(() => {
                const all = [...document.querySelectorAll('*')];
                // A short leaf element whose text is exactly a refresh cue
                const byText = all.find(e => {
                    const t = (e.innerText || e.textContent || '').trim();
                    return /点击刷新|刷新二维码|^刷新$/.test(t) && t.length <= 12 && e.children.length === 0;
                });
                if (byText) { byText.click(); return 'clicked-text'; }
                const qr = document.querySelector('img[src^="data:image/png"]');
                if (qr) { qr.click(); return 'clicked-img'; }
                return 'no-target';
            });
        } catch (e) {
            return 'eval-failed';
        }
    }

    async manualLogin(timeoutSec = 1800) {
        await this.init();
        log('\n' + '━'.repeat(45), 'yellow');
        log('👉 请在弹出的浏览器窗口里手动完成登录', 'yellow');
        log('   （推荐用「扫码登录」——最省事，不用等短信）', 'yellow');
        log(`⏳ 我会在旁边等你，最长 ${Math.round(timeoutSec / 60)} 分钟`, 'yellow');
        log('   （二维码会自动续期，页面崩溃也会自动重启，随时回来扫都有效）', 'yellow');
        log('━'.repeat(45) + '\n', 'yellow');

        // 初始加载登录页 + 截二维码，同样做崩溃自愈（开局崩不能 fatal 退出）
        let initialOk = false;
        for (let i = 0; i < 5 && !initialOk; i++) {
            try {
                await this._gotoLoginAndCaptureQr();
                initialOk = true;
            } catch (err) {
                const msg = (err && err.message) ? err.message : String(err);
                if (/Page crashed|Target closed|Execution context was destroyed|detached|Session closed|Browser closed/i.test(msg)) {
                    log(`  ⚠️ 初始加载崩溃，自动重启浏览器（第 ${i + 1} 次）...`, 'yellow');
                    try { await this.browser.close().catch(() => {}); } catch (_) {}
                    await this.init();
                } else {
                    throw err;
                }
            }
        }
        if (!initialOk) throw new Error('⚠️ 初始加载反复崩溃，停止重试。请检查系统 Chrome 是否正常。');

        // 若启用了 --serve，启动本地实时二维码服务（用户用浏览器打开即可扫码，无需等聊天发图）
        if (this.servePort) {
            await this.startQrServer().catch(e => log(`⚠️ 启动二维码服务失败，将仅写文件：${e.message}`, 'yellow'));
        }

        const deadline = Date.now() + timeoutSec * 1000;
        let lastUrl = '';
        this._lastQrSrc = '';
        this._lastQrTs = 0;
        let crashCount = 0;
        while (Date.now() < deadline) {
            try {
                await this.page.waitForTimeout(4000);

                // 1) Login detection first — never interrupt a successful login
                const url = this.page.url();
                if (url !== lastUrl) {
                    log(`  🧭 url: ${url}`, 'cyan');
                    lastUrl = url;
                }
                if (await this.checkPageLoggedIn()) {
                    log('\n✅ 检测到登录成功！', 'green');
                    await this.saveSession();
                    this.stopQrServer();
                    return true;
                }
                // Also treat presence of a login cookie as success (user may stop on the main site)
                try {
                    const cookies = await this.context.cookies();
                    const names = cookies.map(c => c.name);
                    const hasAuthCookie = names.some(n => /passToken|userId|api_ph|api_st|kuaishou\.web\.cp/i.test(n));
                    if (hasAuthCookie) {
                        log(`\n✅ 检测到登录 cookie（${names.filter(n => /passToken|userId|api_ph|api_st/i.test(n)).join(', ')}），判定登录成功`, 'green');
                        await this.saveSession();
                        this.stopQrServer();
                        return true;
                    }
                } catch (_) {}

                // 2) Keep /tmp/ks_qr.png fresh. Two mechanisms:
                //    (a) If the page ever shows an "expired / click to refresh" overlay,
                //        actively click the refresh trigger to mint a NEW token.
                //    (b) Proactively refresh every ~80s regardless, to defeat Chromium's
                //        timer throttling on headless/background tabs (the page's own
                //        auto-rotation gets frozen, so the token silently dies).
                //    We deliberately do NOT full-page reload here — that was what
                //    destabilized Chromium and caused "Page crashed".
                const info = await this.qrExpired().catch(() => ({ expiredText: false, hasQr: true, src: '' }));
                this._cycle = (this._cycle || 0) + 1;
                const proactiveRefresh = this._cycle % 20 === 0; // 20 * 4s = ~80s
                if (info.expiredText || !info.hasQr || proactiveRefresh) {
                    const how = await this._refreshQr();
                    if (info.expiredText || !info.hasQr) {
                        log(`  🔄 二维码过期，强制刷新（${how}）...`, 'yellow');
                    } else if (proactiveRefresh) {
                        log(`  🔄 主动刷新二维码（${how}）保持新鲜...`, 'yellow');
                    }
                    await this.page.waitForTimeout(1800); // let the new token render
                }

                // 3) Capture current QR into the shared file
                await this.captureQr();
            } catch (err) {
                const msg = (err && err.message) ? err.message : String(err);
                // Crash / detach recovery: relaunch the browser instead of dying
                if (/Page crashed|Target closed|Execution context was destroyed|detached|Session closed|Browser closed/i.test(msg)) {
                    crashCount++;
                    if (crashCount > 30) {
                        throw new Error(`⚠️ 页面反复崩溃（${crashCount} 次），停止重试。请检查系统 Chrome 是否正常。`);
                    }
                    log(`  ⚠️ 页面崩溃，自动重启浏览器（第 ${crashCount} 次）...`, 'yellow');
                    let recovered = false;
                    for (let attempt = 1; attempt <= 3 && !recovered; attempt++) {
                        try {
                            try { await this.browser.close().catch(() => {}); } catch (_) {}
                            await this.init();
                            await this._gotoLoginAndCaptureQr();
                            lastUrl = '';
                            recovered = true;
                        } catch (re) {
                            if (attempt === 3) throw re;
                            log(`  ⚠️ 重启失败（第 ${attempt} 次），重试...`, 'yellow');
                        }
                    }
                    continue;
                }
                throw err;
            }
        }
        this.stopQrServer();
        throw new Error('⏰ 手动登录等待超时（未检测到登录成功）');
    }

    /**
     * Navigate to the login page, click the "扫码登录" tab, and capture the QR.
     * Extracted so it can be reused both on first launch and after a crash.
     */
    async _gotoLoginAndCaptureQr() {
        await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
        await this.page.waitForTimeout(2500);
        // 确保停在「扫码登录」tab（默认即此，但稳妥起见点一下）
        await this.page.evaluate(() => {
            const t = [...document.querySelectorAll('*')].find(e => e.textContent.trim() === '扫码登录');
            if (t) t.click();
        }).catch(() => {});
        await this.page.waitForTimeout(1500);
        await this.captureQr();
    }

    /**
     * Save session to file
     */
    async saveSession() {
        try {
            ensureDir(this.authFile);
            await this.context.storageState({ path: this.authFile });
            log(`\n💾 Session saved to: ${this.authFile}`, 'green');
            
            // Show session info
            const stats = fs.statSync(this.authFile);
            log(`📊 File size: ${(stats.size / 1024).toFixed(2)} KB`, 'blue');
            
        } catch (error) {
            log(`\n⚠️ Failed to save session: ${error.message}`, 'yellow');
        }
    }

    /**
     * Validate existing session
     */
    async validateSession() {
        if (!sessionExists(this.authFile)) {
            log('❌ No session file found', 'red');
            return false;
        }
        
        await this.init();
        
        try {
            const isValid = await this.isLoggedIn();
            if (isValid) {
                log('✅ Session is valid!', 'green');
            } else {
                log('❌ Session has expired', 'red');
            }
            return isValid;
        } catch (error) {
            log(`❌ Error validating session: ${error.message}`, 'red');
            return false;
        }
    }

    /**
     * Close browser
     */
    async close() {
        if (this.browser) {
            await this.browser.close();
            log('\n🔒 Browser closed', 'blue');
        }
    }
}

/**
 * CLI main function
 */
async function main() {
    const args = process.argv.slice(2);
    
    // Parse arguments
    let authFile = DEFAULT_AUTH_FILE;
    let phoneNumber = DEFAULT_PHONE;
    let checkOnly = false;
    let headless = false;
    let autoMode = false;
    let codeMode = false;
    let manualMode = false;
    let manualTimeout = 900;
    let smsCode = null;
    let serve = false;
    let servePort = 8731;
    let killFlag = false;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--auth-file' && args[i + 1]) {
            authFile = args[i + 1];
            i++;
        } else if (args[i] === '--phone' && args[i + 1]) {
            phoneNumber = args[i + 1];
            i++;
        } else if (args[i] === '--check') {
            checkOnly = true;
        } else if (args[i] === '--headless') {
            headless = true;
        } else if (args[i] === '--auto') {
            autoMode = true;
        } else if (args[i] === '--code') {
            codeMode = true;
        } else if (args[i] === '--manual') {
            manualMode = true;
        } else if (args[i] === '--manual-timeout' && args[i + 1]) {
            manualTimeout = parseInt(args[i + 1], 10) || 900;
            i++;
        } else if (args[i] === '--serve') {
            serve = true;
        } else if (args[i] === '--serve-port' && args[i + 1]) {
            servePort = parseInt(args[i + 1], 10) || 8731;
            i++;
        } else if (args[i] === '--kill') {
            killFlag = true;
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            process.exit(0);
        }
    }
    
    // Resolve auth file path
    if (!path.isAbsolute(authFile)) {
        authFile = path.resolve(process.cwd(), authFile);
    }
    
    // --kill：终止任何正在运行的登录进程（并清除单实例锁），用于清理卡住的旧进程
    if (killFlag) {
        killExistingInstance();
        log('✅ 已尝试终止已有的登录进程（如存在）', 'green');
        process.exit(0);
    }

    // 单实例锁：避免两个登录进程同时跑、互相抢 /tmp/ks_qr.png
    const lockPid = acquireLock();
    if (lockPid) {
        log(`⚠️ 已有登录进程在运行 (pid ${lockPid})。如需重启请先运行：node login.js --kill`, 'yellow');
        process.exit(1);
    }
    const _releaseLock = () => releaseLock();
    process.on('exit', _releaseLock);
    process.on('SIGINT', () => { _releaseLock(); process.exit(130); });
    process.on('SIGTERM', () => { _releaseLock(); process.exit(143); });

    const login = new KuaishouLogin({ authFile, headless, servePort });
    
    try {
        if (checkOnly) {
            // Just check if session is valid
            const isValid = await login.validateSession();
            await login.close();
            process.exit(isValid ? 0 : 1);
        } else if (manualMode) {
            // Human logs in manually in the headed window; we just capture the session
            await login.manualLogin(manualTimeout);

            log('\n─────────────────────────────────', 'green');
            log('✅ Kuaishou Login Complete!', 'green');
            log('─────────────────────────────────', 'green');
            log(`\nSession saved to: ${authFile}`, 'cyan');
            log('\nYou can now run other scripts that use this session.', 'blue');

            await login.close();
        } else {
            // Perform login with default phone
            await login.login(phoneNumber, autoMode, codeMode);
            
            log('\n─────────────────────────────────', 'green');
            log('✅ Kuaishou Login Complete!', 'green');
            log('─────────────────────────────────', 'green');
            log(`\nSession saved to: ${authFile}`, 'cyan');
            log('\nYou can now run other scripts that use this session.', 'blue');
            
            await login.close();
        }
    } catch (error) {
        log(`\n❌ Fatal: ${error && error.stack ? error.stack : error}`, 'red');
        await login.close();
        process.exit(1);
    }
}

function showHelp() {
    console.log(`
Kuaishou Login - Mobile Phone + SMS Verification

Usage:
  node login.js [options]

Options:
  --auth-file <path>   Custom auth file path (default: .automation/.local/auth/kuaishou_auth.json)
  --phone <number>     Phone number (default: ${DEFAULT_PHONE})
  --auto               Auto mode: use default phone, prompt only for SMS code
  --code               Agent mode: poll .automation/.local/auth/_pending_sms_code.txt for the SMS code (no TTY needed)
  --manual             Human mode: open a headed window, YOU log in (QR/SMS), script polls and saves the session automatically
  --manual-timeout <s> Seconds to wait in --manual mode (default: 900)
  --serve              Start a local HTTP server serving a live, auto-refreshing QR at http://localhost:8731/ (scan from your own browser, no chat snapshot race)
  --serve-port <p>     Port for --serve (default: 8731)
  --kill               Kill any running login instance (clears the single-instance lock), then exit
  --check              Check if existing session is valid
  --headless           Run in headless mode (no browser window)
  --help, -h           Show this help message

Examples:
  # Interactive login with default phone
  node login.js

  # Use different phone number
  node login.js --phone 139****8888

  # Auto mode (for remote/SSH): auto-fill phone, only prompt SMS code
  node login.js --auto

  # Check session validity
  node login.js --check

  # Live QR over HTTP: open http://localhost:8731/ in your browser and scan the auto-refreshing code
  node login.js --manual --serve

  # Kill a stuck login process (single-instance guard)
  node login.js --kill

  # Custom auth file
  node login.js --auth-file ./my_auth.json
`);
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
