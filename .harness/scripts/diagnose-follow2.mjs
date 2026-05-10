#!/usr/bin/env node
/**
 * Diagnose Kuaishou follow - simulate exact production conditions
 */
import { chromium } from 'playwright';
import { readFileSync } from 'fs';

const AUTH_FILE = '/Users/weiping/prod/LetMeTryAI/.harness/.local/auth/kuaishou_www_auth.json';
const VIDEO_URLS = [
    'https://www.kuaishou.com/short-video/3xqwt433bh3wjcq',  // 老肖杂货铺
    'https://www.kuaishou.com/short-video/3xsmkgjqrdjj3n9',  // 金箭电动车
    'https://www.kuaishou.com/short-video/3xy3398hp8vcy5a',  // 幽悠短剧
];

async function openBrowser() {
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
        timezoneId: 'Asia/Shanghai',
        permissions: []
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    });
    return { browser, context, page };
}

async function getPageBodyText(page) {
    try {
        return await page.locator('body').innerText({ timeout: 5000 });
    } catch {
        return '';
    }
}

async function findFollowButton(page) {
    const explicitCandidates = [
        page.locator('.follow-button').first(),
        page.locator('.follow-btn').first(),
        page.locator('.btn-follow').first(),
        page.locator('[data-action="follow"]').first(),
        page.locator('[data-testid*="follow" i]').first(),
        page.getByText('关注', { exact: true }).first(),
        page.getByText('+关注').first(),
        page.getByText('+ 关注').first(),
        page.getByText('已关注', { exact: true }).first(),
        page.getByText('互相关注', { exact: true }).first(),
        page.getByText('回关', { exact: true }).first()
    ];
    for (const candidate of explicitCandidates) {
        try {
            if (await candidate.count() > 0 && await candidate.isVisible({ timeout: 1000 })) {
                return candidate;
            }
        } catch {}
    }
    try {
        const fuzzyButton = page.locator('button, [role="button"], a').filter({
            hasText: /^(关注|\+关注|\+ 关注|＋关注)$/
        }).first();
        if (await fuzzyButton.count() > 0 && await fuzzyButton.isVisible({ timeout: 1000 })) {
            return fuzzyButton;
        }
    } catch {}
    try {
        const handle = await page.evaluateHandle(() => {
            const allButtons = document.querySelectorAll('button, [role="button"], a, div');
            for (const el of allButtons) {
                const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
                if (text === '关注' || text === '+关注' || text === '+ 关注' || text === '＋关注') {
                    return el;
                }
            }
            return null;
        });
        const element = handle.asElement();
        if (element) {
            return page.locator('html').locator('*').nth(await page.evaluate(el => {
                const all = document.querySelectorAll('*');
                return Array.from(all).indexOf(el);
            }, element)).first();
        }
    } catch {}
    return null;
}

async function readFollowButtonText(page) {
    const button = await findFollowButton(page);
    if (!button) return '';
    try {
        const innerText = String(await button.innerText()).replace(/\s+/g, ' ').trim();
        if (innerText) return innerText;
    } catch {}
    try {
        const ariaLabel = await button.getAttribute('aria-label');
        if (ariaLabel) return String(ariaLabel).trim();
    } catch {}
    try {
        const title = await button.getAttribute('title');
        if (title) return String(title).trim();
    } catch {}
    return '';
}

async function diagnoseUrl(page, url, index) {
    console.log(`\n=== Candidate ${index + 1}: ${url} ===`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2500);

    const bodyText = await getPageBodyText(page);
    console.log(`Body text length: ${bodyText.length}`);
    console.log(`Body preview: ${bodyText.slice(0, 200)}`);

    const initialText = await readFollowButtonText(page);
    console.log(`Follow button text: "${initialText}"`);

    const hasLogin = bodyText.includes('登录/注册') || bodyText.includes('立即登录') || bodyText.includes('登录');
    console.log(`Has login indicator: ${hasLogin}`);

    // Save diag
    const ts = Date.now();
    const fs = await import('fs');
    const html = await page.content();
    fs.writeFileSync(`/Users/weiping/prod/LetMeTryAI/.harness/.local/logs/diagnose-follow2-${ts}.html`, html, 'utf-8');
    await page.screenshot({ path: `/Users/weiping/prod/LetMeTryAI/.harness/.local/logs/diagnose-follow2-${ts}.png`, fullPage: true });
}

async function main() {
    const session = await openBrowser();
    try {
        for (let i = 0; i < VIDEO_URLS.length; i++) {
            await diagnoseUrl(session.page, VIDEO_URLS[i], i);
        }
    } finally {
        await session.browser.close();
    }
    console.log('\nDone.');
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
