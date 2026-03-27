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
            args: ['--disable-blink-features=AutomationControlled']
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
    async login(defaultPhone = DEFAULT_PHONE, autoMode = false) {
        await this.init();
        
        try {
            // Check if already logged in
            if (await this.isLoggedIn()) {
                log('\n✅ Already logged in!', 'green');
                await this.saveSession();
                return true;
            }
            
            log('\n🔐 Need to login', 'yellow');
            
            // Wait for login page to fully load
            log('\n⏳ Waiting for login page to load...', 'cyan');
            await this.page.waitForTimeout(3000);
            
            // Take screenshot to see current state
            await this.page.screenshot({ path: 'login_initial.png' });
            
            // Check current login method and switch to phone login if needed
            await this.switchToPhoneLogin();
            
            // Wait for phone login form to appear
            await this.page.waitForTimeout(2000);
            
            // Use default phone or prompt
            log('\n─────────────────────────────────', 'cyan');
            let phoneNumber = defaultPhone;
            
            if (autoMode) {
                // Auto mode: use default without prompting
                log(`📱 Auto mode: Using phone number: ${defaultPhone}`, 'cyan');
            } else {
                // Interactive mode: prompt for phone
                const input = await prompt('📱 Enter your phone number', defaultPhone);
                phoneNumber = input || defaultPhone;
            }
            log('─────────────────────────────────\n', 'cyan');
            
            if (!phoneNumber || phoneNumber.length < 11) {
                throw new Error('Invalid phone number');
            }
            
            // Find and fill phone input
            const phoneInput = await this.findPhoneInput();
            if (!phoneInput) {
                throw new Error('Could not find phone number input field');
            }
            
            await phoneInput.fill(phoneNumber);
            await phoneInput.click();
            await this.page.waitForTimeout(500);
            log('✅ Entered phone number', 'green');
            
            // Click get SMS code button
            await this.page.waitForTimeout(1500);
            log('\n📲 Attempting to click "获取验证码" button...', 'cyan');
            const smsBtn = await this.clickGetSMSButton();
            
            if (smsBtn) {
                log('✅ Clicked "获取验证码" button automatically', 'green');
                log('⏳ Waiting 3 seconds for SMS to be sent...', 'cyan');
                await this.page.waitForTimeout(3000);
            } else {
                log('\n⚠️ Could not auto-click SMS button automatically', 'yellow');
                log('等待 5 秒后重试... / Retrying in 5 seconds...', 'cyan');
                await this.page.waitForTimeout(5000);
                
                // Retry once
                const retryBtn = await this.clickGetSMSButton();
                if (retryBtn) {
                    log('✅ Clicked "获取验证码" button on retry', 'green');
                    await this.page.waitForTimeout(3000);
                } else {
                    log('⚠️ Still could not click SMS button', 'yellow');
                    log('页面可能加载中，继续等待 3 秒...', 'cyan');
                    await this.page.waitForTimeout(3000);
                }
            }
            
            // Prompt for SMS code
            log('\n─────────────────────────────────', 'cyan');
            log('📲 请查看手机短信 / Please check your phone SMS', 'yellow');
            const smsCode = await prompt('🔢 请输入验证码 / Enter verification code');
            log('─────────────────────────────────\n', 'cyan');
            
            if (!smsCode || smsCode.length < 4) {
                throw new Error('Invalid SMS code');
            }
            
            // Find and fill SMS code input
            const codeInput = await this.findCodeInput();
            if (!codeInput) {
                throw new Error('Could not find verification code input field');
            }
            
            await codeInput.fill(smsCode);
            log('✅ Entered verification code', 'green');
            
            await this.page.waitForTimeout(1000);
            
            // Click login/submit button
            log('\n🔐 Clicking login button...', 'cyan');
            const submitBtn = await this.findLoginButton();
            
            if (submitBtn) {
                await submitBtn.click({ force: true });
                log('✅ Clicked login button automatically', 'green');
            } else {
                log('\n⚠️ Could not find login button automatically', 'yellow');
                log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'yellow');
                log('👉 请在浏览器中手动点击"登录"按钮', 'yellow');
                log('👉 Please manually click "登录" button in browser', 'yellow');
                log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'yellow');
                await prompt('\n⏸️ 点击完成后请按回车 / Press Enter after clicking...');
            }
            
            // Wait for login to complete
            log('\n⏳ Waiting for login to complete...', 'cyan');
            await this.page.waitForTimeout(5000);

            // Check for slider captcha
            const hasSlider = await this.checkForSliderCaptcha();
            if (hasSlider) {
                log('\n⚠️ Slider captcha detected!', 'yellow');
                log('📝 Please complete the captcha manually in the browser', 'yellow');
                await prompt('\n⏸️ Press Enter after completing captcha...');
            }

            // First check current page without re-navigating
            if (await this.checkPageLoggedIn()) {
                log('\n✅ Login successful!', 'green');
                await this.saveSession();
                return true;
            }

            // Wait and check again with navigation
            log('⏳ Waiting for login success...', 'cyan');

            let attempts = 0;
            const maxAttempts = 6; // 30 seconds total

            while (attempts < maxAttempts) {
                await this.page.waitForTimeout(5000);
                attempts++;
                log(`  Attempt ${attempts}/${maxAttempts}...`, 'cyan');
                if (await this.isLoggedIn()) {
                    log('\n✅ Login successful!', 'green');
                    await this.saveSession();
                    return true;
                }
            }
            
            throw new Error('Login timeout - please check if SMS code was correct');
            
        } catch (error) {
            log(`\n❌ Login failed: ${error.message}`, 'red');
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
        await prompt('\n⏸️ 点击完成后请按回车 / Press Enter after clicking...');
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
        } else if (args[i] === '--help' || args[i] === '-h') {
            showHelp();
            process.exit(0);
        }
    }
    
    // Resolve auth file path
    if (!path.isAbsolute(authFile)) {
        authFile = path.resolve(process.cwd(), authFile);
    }
    
    const login = new KuaishouLogin({ authFile, headless });
    
    try {
        if (checkOnly) {
            // Just check if session is valid
            const isValid = await login.validateSession();
            await login.close();
            process.exit(isValid ? 0 : 1);
        } else {
            // Perform login with default phone
            await login.login(phoneNumber, autoMode);
            
            log('\n─────────────────────────────────', 'green');
            log('✅ Kuaishou Login Complete!', 'green');
            log('─────────────────────────────────', 'green');
            log(`\nSession saved to: ${authFile}`, 'cyan');
            log('\nYou can now run other scripts that use this session.', 'blue');
            
            await login.close();
        }
    } catch (error) {
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

  # Custom auth file
  node login.js --auth-file ./my_auth.json
`);
}

// Run if executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}
