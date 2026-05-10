#!/usr/bin/env node
/**
 * Deep DOM analysis of Kuaishou follow button
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const AUTH_FILE = '/Users/weiping/prod/LetMeTryAI/.harness/.local/auth/kuaishou_www_auth.json';
const VIDEO_URL = 'https://www.kuaishou.com/short-video/3xqwt433bh3wjcq';

async function main() {
    const authState = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-blink-features=AutomationControlled']
    });
    const context = await browser.newContext({
        storageState: authState,
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'zh-CN',
        timezoneId: 'Asia/Shanghai'
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });

    // Listen to network requests to see if follow API is called
    page.on('request', request => {
        const url = request.url();
        if (url.includes('follow') || url.includes('relation')) {
            console.log('Network request:', request.method(), url);
        }
    });

    await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(3000);

    // Deep DOM analysis
    const domInfo = await page.evaluate(() => {
        // Find all elements that might be the follow button
        const candidates = [];
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.includes('关注') && text.length < 30) {
                const rect = el.getBoundingClientRect();
                candidates.push({
                    tag: el.tagName,
                    className: el.className,
                    id: el.id,
                    text: text,
                    innerHTML: el.innerHTML.slice(0, 200),
                    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
                    clickable: el.onclick !== null || el.tagName === 'BUTTON' || el.tagName === 'A',
                    parentTag: el.parentElement?.tagName,
                    parentClass: el.parentElement?.className
                });
            }
        }
        return candidates;
    });

    console.log('=== Follow button candidates ===');
    for (const c of domInfo) {
        if (c.rect.width > 0 && c.rect.height > 0) {
            console.log(`${c.tag} class="${c.className}" text="${c.text}" rect=${JSON.stringify(c.rect)} clickable=${c.clickable}`);
            console.log(`  innerHTML: ${c.innerHTML}`);
            console.log(`  parent: ${c.parentTag} class="${c.parentClass}"`);
            console.log();
        }
    }

    // Try clicking different elements
    console.log('=== Click tests ===');

    // Test 1: click .follow-button
    try {
        const btn = page.locator('.follow-button').first();
        console.log('Test 1 - .follow-button count:', await btn.count());
        console.log('Test 1 - .follow-button visible:', await btn.isVisible().catch(() => false));
        console.log('Test 1 - .follow-button text:', await btn.innerText().catch(() => ''));
        console.log('Test 1 - .follow-button html:', await btn.innerHTML().catch(() => ''));
    } catch (e) {
        console.log('Test 1 error:', e.message);
    }

    // Test 2: click the element by evaluating
    try {
        const clicked = await page.evaluate(() => {
            const el = document.querySelector('.follow-button');
            if (el) {
                el.click();
                return { clicked: true, className: el.className };
            }
            return { clicked: false };
        });
        console.log('Test 2 - evaluate click:', clicked);
    } catch (e) {
        console.log('Test 2 error:', e.message);
    }

    await page.waitForTimeout(2000);

    // Check if button changed
    const afterClick = await page.evaluate(() => {
        const el = document.querySelector('.follow-button');
        return el ? el.textContent.replace(/\s+/g, ' ').trim() : 'not found';
    });
    console.log('After click text:', afterClick);

    // Save screenshot
    const ts = Date.now();
    await page.screenshot({ path: `/Users/weiping/prod/LetMeTryAI/.harness/.local/logs/diagnose-follow3-${ts}.png`, fullPage: true });

    await browser.close();
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
