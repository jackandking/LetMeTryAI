#!/usr/bin/env node
/**
 * Kuaishou SMS Login — headless browser login via phone + SMS code.
 *
 * Usage:
 *   node .automation/scripts/ks-sms-login.js <phone>
 *
 * Flow:
 *   1. Opens Kuaishou login page (headless Chromium)
 *   2. Enters phone number, clicks "send SMS"
 *   3. Takes screenshot, waits for SMS code from stdin
 *   4. Enters code, submits, saves session to auth file
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import {
    resolveKuaishouAuthFile,
    resolveRuntimeDir,
    ensureDirectory,
    ensureParentDirectory
} from './runtime-paths.js';

const AUTH_FILE = resolveKuaishouAuthFile(import.meta.url);
const RUNTIME_DIR = resolveRuntimeDir(import.meta.url);
const SCREENSHOT_DIR = path.join(RUNTIME_DIR, 'screenshots');
ensureDirectory(SCREENSHOT_DIR);

const PHONE = process.argv[2];
if (!PHONE) {
    console.error('Usage: node ks-sms-login.js <phone>');
    process.exit(1);
}

const LOGIN_URL = 'https://passport.kuaishou.com/pc/account/login?sid=kuaishou.creator.marketing&redirectURL=https%3A%2F%2Fdaren.kuaishou.com%2Fdistribution-plan-list';
const TARGET_HOST = 'daren.kuaishou.com';

function log(tag, msg) {
    console.log(`[ks-login][${new Date().toISOString()}][${tag}] ${msg}`);
}

function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function screenshot(page, name) {
    const filePath = path.join(SCREENSHOT_DIR, `${name}.png`);
    await page.screenshot({ path: filePath, fullPage: true });
    log('SCREENSHOT', filePath);
    return filePath;
}

async function main() {
    const { chromium } = await import('playwright');

    log('INFO', `Phone: ${PHONE}`);
    log('INFO', `Auth file: ${AUTH_FILE}`);

    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox']
    });

    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    try {
        // Step 1: Navigate to login page
        log('INFO', 'Navigating to login page...');
        await page.goto(LOGIN_URL, { timeout: 30000, waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(3000);
        await screenshot(page, '01-login-page');

        // Step 2: Switch to SMS login tab if needed
        // Kuaishou login page typically has tabs: QR code / Phone+SMS / Password
        const smsTab = page.locator('text=短信登录').or(page.locator('text=验证码登录')).or(page.locator('text=手机号登录'));
        if (await smsTab.count() > 0) {
            log('INFO', 'Clicking SMS login tab...');
            await smsTab.first().click();
            await page.waitForTimeout(1000);
        }
        await screenshot(page, '02-sms-tab');

        // Step 3: Enter phone number
        log('INFO', `Entering phone: ${PHONE}`);
        const phoneInput = page.locator('input[placeholder*="手机号"]')
            .or(page.locator('input[type="tel"]'))
            .or(page.locator('input[name="phoneNum"]'))
            .or(page.locator('input[name="mobile"]'));

        if (await phoneInput.count() === 0) {
            // Try generic approach - find the first visible input
            log('WARN', 'Could not find phone input by specific selectors, trying generic...');
            await screenshot(page, '02b-no-phone-input');
            // Dump page content for debugging
            const html = await page.content();
            const debugPath = path.join(SCREENSHOT_DIR, 'debug-login-html.txt');
            fs.writeFileSync(debugPath, html);
            log('DEBUG', `Page HTML saved to ${debugPath}`);
            await browser.close();
            process.exit(1);
        }

        await phoneInput.first().click();
        await phoneInput.first().fill(PHONE);
        await page.waitForTimeout(500);
        await screenshot(page, '03-phone-entered');

        // Step 4: Click send SMS button
        log('INFO', 'Clicking send SMS code button...');
        const sendBtn = page.locator('text=获取验证码')
            .or(page.locator('text=发送验证码'))
            .or(page.locator('text=获取短信验证码'))
            .or(page.locator('button:has-text("获取")'));

        if (await sendBtn.count() === 0) {
            log('ERROR', 'Cannot find "send SMS" button');
            await screenshot(page, '04-no-send-btn');
            await browser.close();
            process.exit(1);
        }

        await sendBtn.first().click();
        await page.waitForTimeout(2000);
        await screenshot(page, '04-sms-sent');
        log('INFO', 'SMS code sent! Check your phone.');

        // Step 5: Wait for user to input SMS code
        const code = await ask('\n>>> 请输入短信验证码: ');
        if (!code) {
            log('ERROR', 'No code entered');
            await browser.close();
            process.exit(1);
        }

        // Step 6: Enter SMS code
        log('INFO', `Entering code: ${code}`);
        const codeInput = page.locator('input[placeholder*="验证码"]')
            .or(page.locator('input[placeholder*="请输入"]').nth(1))
            .or(page.locator('input[name="smsCode"]'));

        if (await codeInput.count() === 0) {
            log('WARN', 'Could not find code input by specific selectors, trying second input...');
            const allInputs = page.locator('input:visible');
            const count = await allInputs.count();
            if (count >= 2) {
                await allInputs.nth(1).click();
                await allInputs.nth(1).fill(code);
            } else {
                log('ERROR', 'Cannot find code input');
                await screenshot(page, '05-no-code-input');
                await browser.close();
                process.exit(1);
            }
        } else {
            await codeInput.first().click();
            await codeInput.first().fill(code);
        }
        await page.waitForTimeout(500);
        await screenshot(page, '05-code-entered');

        // Step 7: Click login button
        log('INFO', 'Clicking login button...');
        const loginBtn = page.locator('button:has-text("登录")')
            .or(page.locator('text=登 录'))
            .or(page.locator('[class*="login-btn"]'));

        if (await loginBtn.count() > 0) {
            await loginBtn.first().click();
        } else {
            // Try pressing Enter
            await page.keyboard.press('Enter');
        }

        // Step 8: Wait for redirect to daren.kuaishou.com
        log('INFO', 'Waiting for login redirect...');
        try {
            await page.waitForURL(
                u => {
                    try {
                        return new URL(u.toString()).hostname === TARGET_HOST;
                    } catch { return false; }
                },
                { timeout: 30000 }
            );
        } catch {
            log('WARN', `Redirect wait timed out. Current URL: ${page.url()}`);
            await screenshot(page, '06-redirect-timeout');
            // Try navigating directly
            await page.goto('https://daren.kuaishou.com/distribution-plan-list', { timeout: 30000, waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(3000);
        }

        await page.waitForTimeout(3000);
        await screenshot(page, '07-logged-in');
        log('INFO', `Final URL: ${page.url()}`);

        // Step 9: Save session
        ensureParentDirectory(AUTH_FILE);
        await context.storageState({ path: AUTH_FILE });
        const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        log('OK', `Session saved! ${saved.cookies?.length || 0} cookies → ${AUTH_FILE}`);

        // Verify login
        const finalUrl = page.url();
        if (finalUrl.includes(TARGET_HOST)) {
            log('OK', 'Login successful!');
        } else {
            log('WARN', `May not be logged in. Final URL: ${finalUrl}`);
            log('WARN', 'Check screenshots for details.');
        }

    } catch (err) {
        log('ERROR', err.message);
        await screenshot(page, 'error');
        process.exit(1);
    } finally {
        await browser.close();
    }
}

main();
