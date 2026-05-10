#!/usr/bin/env node
/**
 * Test followCandidate with exact production code
 */
import { chromium } from 'playwright';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Reproduce exact production functions
const AUTH_FILE = '/Users/weiping/prod/LetMeTryAI/.harness/.local/auth/kuaishou_www_auth.json';
const WEB_URL = 'https://www.kuaishou.com/short-video/bootstrap';

const FOLLOWED_TEXTS = new Set(['已关注', '互相关注', '回关']);
const FOLLOW_BUTTON_TEXTS = new Set(['关注', '+关注', '＋关注', '+ 关注']);

function buildRuntimeDirs(repoRoot) {
    return {
        authDir: join(repoRoot, '.harness', '.local', 'auth'),
        logsDir: join(repoRoot, '.harness', '.local', 'logs')
    };
}

function resolveKuaishouAuthFile(authDir, url = '') {
    const host = url ? new URL(url).host : '';
    const filename = (host === 'www.kuaishou.com' || host === 'id.kuaishou.com')
        ? 'kuaishou_www_auth.json'
        : 'kuaishou_auth.json';
    return join(authDir, filename);
}

function readAuthStateFile(authFile) {
    if (!existsSync(authFile)) return null;
    return JSON.parse(readFileSync(authFile, 'utf-8'));
}

function hasLoggedInKuaishouAuth(authState) {
    if (!authState || !Array.isArray(authState.cookies)) return false;
    const cookieNames = new Set(authState.cookies.map(c => String(c?.name || '').trim()).filter(Boolean));
    const LOGIN_COOKIE_NAMES = ['kuaishou.server.web_st', 'kuaishou.creator.marketing_st', 'userId', 'bUserId', 'passToken'];
    return LOGIN_COOKIE_NAMES.some(name => cookieNames.has(name));
}

async function openFollowBrowser({ headless = true, runtimeDirs }) {
    const authFile = resolveKuaishouAuthFile(runtimeDirs.authDir, WEB_URL);
    const authState = readAuthStateFile(authFile);
    if (!hasLoggedInKuaishouAuth(authState)) {
        throw new Error(`Website auth is missing or not logged in: ${authFile}`);
    }

    const browser = await chromium.launch({
        headless,
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
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
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

function isFollowButtonText(text) {
    if (!text) return false;
    const normalized = text.replace(/\s+/g, ' ').trim();
    return FOLLOW_BUTTON_TEXTS.has(normalized);
}

const RATE_LIMIT_KEYWORDS = ['操作过于频繁', '请稍后再试', '今日关注已达上限', '今日已达上限', '频繁', '安全验证', '异常行为'];
const INVALID_VIDEO_KEYWORDS = ['找不到该作品', '热门作品'];
const IMAGE_POST_KEYWORDS = ['暂未支持显示图片作品'];

function detectPageCondition(text) {
    const bodyText = String(text || '');
    if (INVALID_VIDEO_KEYWORDS.some(kw => bodyText.includes(kw))) return 'invalid-video';
    if (IMAGE_POST_KEYWORDS.some(kw => bodyText.includes(kw))) return 'image-post';
    if (RATE_LIMIT_KEYWORDS.some(kw => bodyText.includes(kw))) return 'rate-limited';
    if (bodyText.includes('登录/注册') || bodyText.includes('立即登录')) return 'not-logged-in';
    if (/^\s*\{"result":\s*\d/.test(bodyText)) return 'not-logged-in';
    return '';
}

async function followCandidate(page, candidate, { logsDir }) {
    const fs = await import('fs');
    await page.goto(candidate.videoUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2500);

    let bodyText = await getPageBodyText(page);
    let condition = detectPageCondition(bodyText);
    if (condition) {
        return { status: condition === 'rate-limited' ? 'rate-limited' : 'failed', reason: condition };
    }

    const initialText = await readFollowButtonText(page);
    console.log(`  initialText: "${initialText}"`);

    if (FOLLOWED_TEXTS.has(initialText)) {
        return { status: 'already-followed', reason: 'already-followed', buttonText: initialText };
    }

    if (!isFollowButtonText(initialText)) {
        const diagPath = join(logsDir, `test-follow-diag-${Date.now()}`);
        try {
            const html = await page.content();
            fs.writeFileSync(`${diagPath}.html`, html, 'utf-8');
            await page.screenshot({ path: `${diagPath}.png`, fullPage: true }).catch(() => {});
            console.log(`  Saved diag: ${diagPath}.html`);
        } catch {}
        return { status: 'failed', reason: initialText ? `unsupported-button:${initialText}` : 'follow-button-not-found' };
    }

    const button = await findFollowButton(page);
    if (!button) {
        return { status: 'failed', reason: 'follow-button-not-found' };
    }

    await button.click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    bodyText = await getPageBodyText(page);
    condition = detectPageCondition(bodyText);
    if (condition === 'rate-limited') {
        return { status: 'rate-limited', reason: condition };
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2000);

    const finalText = await readFollowButtonText(page);
    console.log(`  finalText: "${finalText}"`);

    if (FOLLOWED_TEXTS.has(finalText)) {
        return { status: 'followed', reason: 'followed', buttonText: finalText };
    }

    const screenshotPath = join(logsDir, `test-follow-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    return { status: 'failed', reason: 'follow-state-not-confirmed', screenshotPath };
}

async function main() {
    const repoRoot = '/Users/weiping/prod/LetMeTryAI';
    const runtimeDirs = buildRuntimeDirs(repoRoot);

    console.log('Opening browser with production auth...');
    const session = await openFollowBrowser({ headless: true, runtimeDirs });

    const candidates = [
        { videoUrl: 'https://www.kuaishou.com/short-video/3xqwt433bh3wjcq', queueKey: 'test-1' },
        { videoUrl: 'https://www.kuaishou.com/short-video/3xsmkgjqrdjj3n9', queueKey: 'test-2' },
    ];

    try {
        for (let i = 0; i < candidates.length; i++) {
            console.log(`\n=== Candidate ${i + 1}: ${candidates[i].videoUrl} ===`);
            const result = await followCandidate(session.page, candidates[i], { logsDir: runtimeDirs.logsDir });
            console.log('Result:', JSON.stringify(result));
        }
    } finally {
        await session.browser.close();
    }
}

main().catch(e => {
    console.error('Error:', e);
    process.exit(1);
});
