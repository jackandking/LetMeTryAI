#!/usr/bin/env node
/**
 * Kuaishou Login - Mobile Phone + SMS Verification
 * 
 * Interactive login for Kuaishou Creator Platform.
 * Saves session to .runtime/kuaishou_auth.json for reuse by other scripts.
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default configuration
const DEFAULT_AUTH_FILE = '.runtime/kuaishou_auth.json';
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
     * Check if currently logged in
     */
    async isLoggedIn() {
        try {
            log('🔍 Checking login status...', 'cyan');
            await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
            
            // Wait a moment for page to stabilize
            await this.page.waitForTimeout(2000);
            
            // Check for login indicators
            const loginIndicators = [
                '.distribution-plan-list-container',
                '.create-plan-btn',
                '.user-avatar',
                '.ks-dropdown-menu',
                '[class*="user-info"]',
                '[class*="profile"]'
            ];
            
            for (const selector of loginIndicators) {
                try {
                    const element = this.page.locator(selector).first();
                    if (await element.isVisible({ timeout: 2000 })) {
                        log(`✅ Found login indicator: ${selector}`, 'green');
                        return true;
                    }
                } catch (e) {
                    // Continue checking other indicators
                }
            }
            
            // Check for login-related text
            const pageText = await this.page.content();
            if (pageText.includes('登录') || pageText.includes('手机号登录') || pageText.includes('密码登录')) {
                log('⚠️ Login page detected', 'yellow');
                return false;
            }
            
            // Check if URL changed to login page
            const currentUrl = this.page.url();
            if (currentUrl.includes('login') || currentUrl.includes('passport')) {
                log('⚠️ Redirected to login page', 'yellow');
                return false;
            }
            
            return false;
        } catch (error) {
            log(`⚠️ Error checking login status: ${error.message}`, 'yellow');
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
            await this.page.waitForTimeout(1000);
            const smsBtn = await this.clickGetSMSButton();
            
            if (smsBtn) {
                log('✅ Clicked "获取验证码" button automatically', 'green');
                log('⏳ Waiting 3 seconds for SMS to be sent...', 'cyan');
                await this.page.waitForTimeout(3000);
            } else {
                log('\n⚠️ Could not auto-click SMS button', 'yellow');
                log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'yellow');
                log('👉 请在浏览器中手动点击"获取验证码"按钮', 'yellow');
                log('👉 Please manually click "获取验证码" button in browser', 'yellow');
                log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'yellow');
                await prompt('\n⏸️ 点击完成后请按回车 / Press Enter after clicking...');
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
                await submitBtn.click();
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
            
            // Wait for login success
            log('⏳ Waiting for login success...', 'cyan');
            
            let attempts = 0;
            const maxAttempts = 12; // 60 seconds total
            
            while (attempts < maxAttempts) {
                if (await this.isLoggedIn()) {
                    log('\n✅ Login successful!', 'green');
                    await this.saveSession();
                    return true;
                }
                
                await this.page.waitForTimeout(5000);
                attempts++;
                log(`  Attempt ${attempts}/${maxAttempts}...`, 'cyan');
            }
            
            throw new Error('Login timeout - please check if SMS code was correct');
            
        } catch (error) {
            log(`\n❌ Login failed: ${error.message}`, 'red');
            throw error;
        }
    }

    /**
     * Switch to phone/SMS login method if not already on it
     */
    async switchToPhoneLogin() {
        log('\n📱 Checking current login method...', 'cyan');
        
        // First, check if we can find the "获取验证码" button - this is the definitive SMS login indicator
        try {
            const smsBtn = this.page.locator('button:has-text("获取验证码")').first();
            if (await smsBtn.isVisible({ timeout: 2000 })) {
                log('✅ Already on SMS login page (found 获取验证码 button)', 'green');
                return;
            }
        } catch (e) {
            // Not on SMS login yet
        }
        
        // Try to find and click "验证码登录" tab
        log('🔍 Looking for "验证码登录" tab...', 'cyan');
        
        // Get all tabs first to understand the structure
        try {
            const allTabs = await this.page.locator('div[class*="tab"], [role="tab"], button[class*="tab"], a[class*="tab"]').all();
            log(`  Found ${allTabs.length} tab elements`, 'blue');
            
            for (const tab of allTabs) {
                const text = await tab.textContent().catch(() => '');
                log(`  Tab text: "${text.trim()}"`, 'blue');
                
                if (text.includes('验证码登录') || text === '验证码') {
                    await tab.click();
                    log('✅ Clicked "验证码登录" tab', 'green');
                    await this.page.waitForTimeout(2500);
                    return;
                }
            }
        } catch (e) {
            log(`  Error finding tabs: ${e.message}`, 'yellow');
        }
        
        // Try specific selectors
        const smsLoginSelectors = [
            'div:has-text("验证码登录"):not(:has(div))',
            'span:has-text("验证码登录")',
            'text="验证码登录"',
            'div[class*="tab"]:has-text("验证码")',
            'button:has-text("验证码")',
            'a:has-text("验证码")'
        ];
        
        for (const selector of smsLoginSelectors) {
            try {
                const btn = this.page.locator(selector).first();
                if (await btn.isVisible({ timeout: 2000 })) {
                    await btn.click();
                    log(`✅ Clicked SMS tab with selector: ${selector}`, 'green');
                    await this.page.waitForTimeout(2500);
                    return;
                }
            } catch (e) {
                // Try next selector
            }
        }
        
        // Try to find by evaluating all clickable elements
        log('🔍 Searching all clickable elements...', 'cyan');
        try {
            const result = await this.page.evaluate(() => {
                const allElements = document.querySelectorAll('div, span, button, a, [class*="tab"]');
                for (const el of allElements) {
                    if (el.textContent && (el.textContent.includes('验证码登录') || el.textContent === '验证码')) {
                        el.click();
                        return `Clicked element: ${el.tagName} with text "${el.textContent.trim()}"`;
                    }
                }
                return 'No SMS login tab found';
            });
            log(`  ${result}`, result.includes('Clicked') ? 'green' : 'yellow');
            if (result.includes('Clicked')) {
                await this.page.waitForTimeout(2500);
                return;
            }
        } catch (e) {
            log(`  Error in evaluate: ${e.message}`, 'yellow');
        }
        
        log('⚠️ Could not auto-click SMS login tab', 'yellow');
        log('📝 Please manually click "验证码登录" tab in the browser', 'yellow');
        await prompt('\n⏸️ Press Enter after clicking "验证码登录" tab...');
    }

    /**
     * Find phone input field
     */
    async findPhoneInput() {
        const phoneInputSelectors = [
            'input[placeholder*="手机号"]',
            'input[type="tel"]',
            'input[name*="phone"]',
            'input[name*="mobile"]',
            'input[class*="phone"]',
            'input[maxlength="11"]',
            'input[placeholder*="电话"]',
            'input[placeholder*="手机"]'
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
        
        // Try to find by input type
        try {
            const inputs = await this.page.locator('input').all();
            for (const input of inputs) {
                const type = await input.getAttribute('type').catch(() => '');
                const placeholder = await input.getAttribute('placeholder').catch(() => '');
                if (type === 'tel' || type === 'number' || placeholder.includes('手机') || placeholder.includes('电话')) {
                    if (await input.isVisible()) {
                        log('  Found phone input by type/placeholder', 'blue');
                        return input;
                    }
                }
            }
        } catch (e) {
            // Continue
        }
        
        return null;
    }

    /**
     * Click get SMS code button
     */
    async clickGetSMSButton() {
        const smsButtonSelectors = [
            'button:has-text("获取验证码")',
            'button:has-text("发送验证码")',
            'button:has-text("获取")',
            '[class*="code-btn"]',
            '[class*="verify-btn"]',
            'button[class*="sms"]',
            'button[class*="code"]'
        ];
        
        for (const selector of smsButtonSelectors) {
            try {
                const btn = this.page.locator(selector).first();
                if (await btn.isVisible({ timeout: 3000 })) {
                    // Check if button is enabled
                    const disabled = await btn.isDisabled().catch(() => false);
                    if (!disabled) {
                        await btn.click();
                        log(`  Clicked SMS button: ${selector}`, 'blue');
                        return btn;
                    } else {
                        log(`  SMS button disabled: ${selector}`, 'yellow');
                    }
                }
            } catch (e) {
                // Try next selector
            }
        }
        
        return null;
    }

    /**
     * Find verification code input
     */
    async findCodeInput() {
        const codeInputSelectors = [
            'input[placeholder*="验证码"]',
            'input[type="number"][maxlength="6"]',
            'input[name*="code"]',
            'input[name*="verify"]',
            'input[name*="captcha"]',
            'input[class*="code"]',
            'input[class*="verify"]',
            'input[placeholder*="短信"]',
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
        
        // Try to find second input (usually phone is first, code is second)
        try {
            const inputs = await this.page.locator('input').all();
            let phoneFound = false;
            for (const input of inputs) {
                const type = await input.getAttribute('type').catch(() => '');
                const placeholder = await input.getAttribute('placeholder').catch(() => '');
                
                if (!phoneFound) {
                    if (type === 'tel' || placeholder.includes('手机')) {
                        phoneFound = true;
                        continue;
                    }
                } else {
                    if (await input.isVisible()) {
                        log('  Found code input (second input)', 'blue');
                        return input;
                    }
                }
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
  --auth-file <path>   Custom auth file path (default: .runtime/kuaishou_auth.json)
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
