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
 * Prompt user for input
 */
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
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
    async login() {
        await this.init();
        
        try {
            // Check if already logged in
            if (await this.isLoggedIn()) {
                log('\n✅ Already logged in!', 'green');
                await this.saveSession();
                return true;
            }
            
            log('\n🔐 Need to login', 'yellow');
            
            // Wait for login options to appear
            await this.page.waitForTimeout(2000);
            
            // Try to find and click phone login
            log('\n📱 Looking for "手机号登录" button...', 'cyan');
            
            const phoneLoginSelectors = [
                'button:has-text("手机号登录")',
                'a:has-text("手机号登录")',
                '[class*="phone"]:has-text("登录")',
                '[class*="login-method"]:has-text("手机")'
            ];
            
            let phoneLoginClicked = false;
            for (const selector of phoneLoginSelectors) {
                try {
                    const btn = this.page.locator(selector).first();
                    if (await btn.isVisible({ timeout: 2000 })) {
                        await btn.click();
                        log('✅ Clicked phone login button', 'green');
                        phoneLoginClicked = true;
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            if (!phoneLoginClicked) {
                log('⚠️ Could not find phone login button, assuming already on phone login page', 'yellow');
            }
            
            await this.page.waitForTimeout(1500);
            
            // Prompt for phone number
            log('\n─────────────────────────────────', 'cyan');
            const phoneNumber = await prompt('📱 Enter your phone number: ');
            log('─────────────────────────────────\n', 'cyan');
            
            if (!phoneNumber || phoneNumber.length < 11) {
                throw new Error('Invalid phone number');
            }
            
            // Find and fill phone input
            const phoneInputSelectors = [
                'input[placeholder*="手机号"]',
                'input[type="tel"]',
                'input[name*="phone"]',
                'input[name*="mobile"]',
                'input[class*="phone"]'
            ];
            
            for (const selector of phoneInputSelectors) {
                try {
                    const input = this.page.locator(selector).first();
                    if (await input.isVisible({ timeout: 2000 })) {
                        await input.fill(phoneNumber);
                        log('✅ Entered phone number', 'green');
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            await this.page.waitForTimeout(1000);
            
            // Click get SMS code button
            log('\n📲 Clicking "获取验证码" button...', 'cyan');
            
            const smsButtonSelectors = [
                'button:has-text("获取验证码")',
                'button:has-text("发送验证码")',
                '[class*="code"]:has-text("获取")',
                '[class*="verify"]:has-text("获取")'
            ];
            
            for (const selector of smsButtonSelectors) {
                try {
                    const btn = this.page.locator(selector).first();
                    if (await btn.isVisible({ timeout: 2000 })) {
                        await btn.click();
                        log('✅ Clicked get SMS code button', 'green');
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            // Prompt for SMS code
            log('\n─────────────────────────────────', 'cyan');
            log('⏳ Please check your phone for SMS', 'yellow');
            const smsCode = await prompt('🔢 Enter SMS verification code: ');
            log('─────────────────────────────────\n', 'cyan');
            
            if (!smsCode || smsCode.length < 4) {
                throw new Error('Invalid SMS code');
            }
            
            // Find and fill SMS code input
            const codeInputSelectors = [
                'input[placeholder*="验证码"]',
                'input[type="number"]',
                'input[name*="code"]',
                'input[name*="verify"]',
                'input[class*="code"]'
            ];
            
            for (const selector of codeInputSelectors) {
                try {
                    const input = this.page.locator(selector).first();
                    if (await input.isVisible({ timeout: 2000 })) {
                        await input.fill(smsCode);
                        log('✅ Entered SMS code', 'green');
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
            }
            
            await this.page.waitForTimeout(1000);
            
            // Click login/submit button
            log('\n🔐 Clicking login button...', 'cyan');
            
            const submitSelectors = [
                'button:has-text("登录")',
                'button:has-text("登 录")',
                'button[type="submit"]',
                '[class*="submit"]',
                '[class*="login-btn"]'
            ];
            
            for (const selector of submitSelectors) {
                try {
                    const btn = this.page.locator(selector).first();
                    if (await btn.isVisible({ timeout: 2000 })) {
                        await btn.click();
                        log('✅ Clicked login button', 'green');
                        break;
                    }
                } catch (e) {
                    // Try next selector
                }
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
    let checkOnly = false;
    let headless = false;
    
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--auth-file' && args[i + 1]) {
            authFile = args[i + 1];
            i++;
        } else if (args[i] === '--check') {
            checkOnly = true;
        } else if (args[i] === '--headless') {
            headless = true;
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
            // Perform login
            await login.login();
            
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
  --check              Check if existing session is valid
  --headless           Run in headless mode (no browser window)
  --help, -h           Show this help message

Examples:
  # Interactive login (default)
  node login.js

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
