#!/usr/bin/env node
/**
 * Diagnose Kuaishou follow button selector
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { join } from 'path';

const AUTH_FILE = '/Users/weiping/prod/LetMeTryAI/.harness/.local/auth/kuaishou_www_auth.json';
const VIDEO_URL = 'https://www.kuaishou.com/short-video/3xqwt433bh3wjcq';

async function main() {
    const authState = JSON.parse(readFileSync(AUTH_FILE, 'utf-8'));
    const browser = await chromium.launch({ headless: true });
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

    console.log('Navigating to:', VIDEO_URL);
    await page.goto(VIDEO_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(5000);

    // Save screenshot and HTML
    const ts = Date.now();
    await page.screenshot({ path: `/Users/weiping/prod/LetMeTryAI/.harness/.local/logs/diagnose-follow-${ts}.png`, fullPage: true });
    const html = await page.content();
    const fs = await import('fs');
    fs.writeFileSync(`/Users/weiping/prod/LetMeTryAI/.harness/.local/logs/diagnose-follow-${ts}.html`, html, 'utf-8');

    // Check body text
    const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
    console.log('\n--- Body text (first 500 chars) ---');
    console.log(bodyText.slice(0, 500));

    // Check for login indicators
    const loginTexts = ['登录/注册', '立即登录', '登录', '注册', '手机号登录', '验证码登录'];
    console.log('\n--- Login detection ---');
    for (const t of loginTexts) {
        if (bodyText.includes(t)) {
            console.log(`Found login indicator: "${t}"`);
        }
    }

    // Try to find follow button using various selectors
    console.log('\n--- Selector search ---');
    const selectors = [
        '.follow-button',
        '.follow-btn',
        '.btn-follow',
        '[data-action="follow"]',
        '[data-testid*="follow" i]',
        'button:has-text("关注")',
        'button:has-text("+关注")',
        'div:has-text("关注")',
        'a:has-text("关注")',
        '[role="button"]:has-text("关注")',
        // Common Chinese follow button patterns
        'text=关注',
        'text=+关注',
        'text=＋关注',
        'text=已关注',
        'text=互相关注',
        'text=回关'
    ];

    for (const sel of selectors) {
        try {
            const count = await page.locator(sel).count();
            if (count > 0) {
                const first = page.locator(sel).first();
                const visible = await first.isVisible().catch(() => false);
                const text = await first.innerText().catch(() => '');
                console.log(`Selector "${sel}": count=${count}, visible=${visible}, text="${text.slice(0, 50)}"`);
            }
        } catch (e) {
            // ignore
        }
    }

    // Deep search: find all buttons/elements containing 关注
    console.log('\n--- Deep text search for 关注 ---');
    const deepResults = await page.evaluate(() => {
        const all = document.querySelectorAll('button, [role="button"], a, div, span');
        const results = [];
        for (const el of all) {
            const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (text.includes('关注') && text.length < 50) {
                results.push({
                    tag: el.tagName,
                    className: el.className,
                    id: el.id,
                    text: text,
                    rect: el.getBoundingClientRect ? {
                        x: el.getBoundingClientRect().x,
                        y: el.getBoundingClientRect().y,
                        width: el.getBoundingClientRect().width,
                        height: el.getBoundingClientRect().height
                    } : null
                });
            }
        }
        return results.slice(0, 20);
    });

    for (const r of deepResults) {
        console.log(`  ${r.tag} class="${r.className}" id="${r.id}" text="${r.text}" rect=${JSON.stringify(r.rect)}`);
    }

    // Check if in iframe
    const frames = page.frames();
    console.log(`\n--- Frames: ${frames.length} ---`);
    for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        console.log(`  Frame ${i}: url=${f.url()}`);
    }

    await browser.close();
    console.log('\nScreenshot saved to:', `/Users/weiping/prod/LetMeTryAI/.harness/.local/logs/diagnose-follow-${ts}.png`);
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
