#!/usr/bin/env node
/**
 * Kuaishou API POC
 *
 * Two modes:
 *   --sniff   Use Playwright to intercept network requests and discover APIs
 *   (default) Use pure HTTP to call APIs directly (no browser needed)
 *
 * Usage:
 *   node .harness/scripts/ks-api-poc.js            # API mode
 *   node .harness/scripts/ks-api-poc.js --sniff     # Sniff mode
 *
 * Environment:
 *   HEADLESS=true|false  — for sniff mode (default: false)
 */

import fs from 'fs';
import path from 'path';
import {
    resolveKuaishouAuthFile,
    resolveRuntimeDir,
    ensureDirectory,
    ensureParentDirectory
} from './lib/runtime-paths.js';

const AUTH_FILE = resolveKuaishouAuthFile(import.meta.url);
const RUNTIME_DIR = resolveRuntimeDir(import.meta.url);
const OUTPUT_DIR = path.join(RUNTIME_DIR, 'exports', 'api-poc');
ensureDirectory(OUTPUT_DIR);

const MODE = process.argv.includes('--sniff') ? 'sniff' : 'api';
const HEADLESS = process.env.HEADLESS === 'true';

const BASE_URL = 'https://daren.kuaishou.com';
const API_DELAY_MS = { min: 500, max: 1500 }; // random delay between API calls

function log(level, msg) {
    console.log(`[${new Date().toISOString()}] [${level}] ${msg}`);
}

function randomDelay() {
    const ms = API_DELAY_MS.min + Math.random() * (API_DELAY_MS.max - API_DELAY_MS.min);
    return new Promise(r => setTimeout(r, ms));
}

// ─── Cookie extraction from Playwright storageState ───

function extractCookieHeader() {
    if (!fs.existsSync(AUTH_FILE)) {
        log('ERROR', `Auth file not found: ${AUTH_FILE}`);
        log('ERROR', 'Run sniff mode first: node .harness/scripts/ks-api-poc.js --sniff');
        process.exit(1);
    }
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const cookies = (state.cookies || [])
        .filter(c => c.domain?.includes('kuaishou.com'))
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
    log('INFO', `Extracted ${state.cookies?.length || 0} cookies from auth file`);
    return cookies;
}

// ─── HTTP API helper ───

async function apiRequest(endpoint, body = {}, cookies) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://daren.kuaishou.com/distribution-plan-list',
            'Origin': 'https://daren.kuaishou.com'
        },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (data.result === 109) {
        throw new Error('Session expired (result=109). Re-run --sniff to login again.');
    }
    if (data.result !== 1) {
        throw new Error(`API error: result=${data.result}, message=${data.message}`);
    }
    return data.data;
}

// ─── API Mode ───

async function apiMode() {
    log('INFO', '=== Kuaishou API Mode (pure HTTP) ===');
    const cookies = extractCookieHeader();
    const dateStr = new Date().toISOString().split('T')[0];

    // 1. Fetch all tasks
    log('INFO', 'Fetching task list...');
    const allTasks = [];
    let pageNum = 1;
    const pageSize = 50;

    while (true) {
        const result = await apiRequest('/rest/pc/creator/marketing/distribution/list', {
            pageNum,
            pageSize,
            distributionStatus: 0,
            resourceTitle: '',
            distributionPlanTitle: '',
            distributionPlanId: ''
        }, cookies);

        const tasks = result.dataList || [];
        allTasks.push(...tasks);
        log('INFO', `  Page ${pageNum}: ${tasks.length} tasks (total so far: ${allTasks.length}/${result.total})`);

        if (allTasks.length >= result.total || tasks.length === 0) break;
        pageNum++;
        await randomDelay();
    }

    log('INFO', `Total tasks: ${allTasks.length}`);

    // 2. Fetch stats for each task
    log('INFO', 'Fetching stats for each task...');
    const results = [];

    for (let i = 0; i < allTasks.length; i++) {
        const task = allTasks[i];
        const planId = task.distributionPlanId;
        log('INFO', `  [${i + 1}/${allTasks.length}] ${task.distributionPlanTitle || task.miniAppName} (planId: ${planId})`);

        try {
            const stats = await apiRequest('/rest/pc/creator/marketing/distribution/data', {
                distributionPlanId: planId
            }, cookies);

            results.push({
                planId,
                name: task.distributionPlanTitle,
                source: task.source,
                miniAppName: task.miniAppName,
                status: task.distributionStatus?.desc || '',
                auditStatus: task.auditStatus || '',
                stats: {
                    组件曝光数: stats.playCount || 0,
                    组件点击数: stats.clickCount || 0,
                    任务下发人数: stats.assignUsers || 0,
                    已履单达人数量: stats.attendUsers || 0,
                    已发布作品数: stats.photoCount || 0,
                    已结算金额: stats.settlementGmv || 0,
                    // Raw API fields for reference
                    _raw: {
                        playCount: stats.playCount,
                        clickCount: stats.clickCount,
                        assignUsers: stats.assignUsers,
                        attendUsers: stats.attendUsers,
                        photoCount: stats.photoCount,
                        liveCount: stats.liveCount,
                        consumedBudget: stats.consumedBudget,
                        freezeBudget: stats.freezeBudget,
                        settlementGmv: stats.settlementGmv
                    }
                }
            });
        } catch (e) {
            log('WARN', `    Failed: ${e.message}`);
            results.push({ planId, name: task.distributionPlanTitle, source: task.source, status: task.distributionStatus?.desc, stats: { error: e.message } });
        }

        if (i < allTasks.length - 1) await randomDelay();
    }

    // 3. Generate report
    const withData = results.filter(r => r.stats && !r.stats.error);
    const summary = {
        totalTasks: results.length,
        withData: withData.length,
        totalExposure: withData.reduce((s, r) => s + (r.stats.组件曝光数 || 0), 0),
        totalClicks: withData.reduce((s, r) => s + (r.stats.组件点击数 || 0), 0),
        totalDaren: withData.reduce((s, r) => s + (r.stats.已履单达人数量 || 0), 0),
        totalWorks: withData.reduce((s, r) => s + (r.stats.已发布作品数 || 0), 0)
    };
    summary.clickRate = summary.totalExposure > 0
        ? ((summary.totalClicks / summary.totalExposure) * 100).toFixed(2) + '%'
        : 'N/A';

    const topByExposure = [...withData]
        .sort((a, b) => (b.stats.组件曝光数 || 0) - (a.stats.组件曝光数 || 0))
        .slice(0, 10);
    const topByDaren = [...withData]
        .sort((a, b) => (b.stats.已履单达人数量 || 0) - (a.stats.已履单达人数量 || 0))
        .slice(0, 10);

    const report = { summary, topByExposure, topByDaren, allTasks: results };

    // 4. Save results
    const jsonFile = path.join(OUTPUT_DIR, `api_report_${dateStr}.json`);
    fs.writeFileSync(jsonFile, JSON.stringify(report, null, 2));

    const csvHeaders = ['序号', '计划ID', '任务名称', '来源', '小程序', '状态', '曝光数', '点击数', '达人', '作品', '结算金额'];
    const csvRows = results.map((r, i) => [
        i + 1, r.planId, `"${r.name || ''}"`, `"${r.source || ''}"`, `"${r.miniAppName || ''}"`,
        `"${r.status || ''}"`,
        r.stats.组件曝光数 || 0, r.stats.组件点击数 || 0,
        r.stats.已履单达人数量 || 0, r.stats.已发布作品数 || 0,
        r.stats.已结算金额 || 0
    ]);
    const csvFile = path.join(OUTPUT_DIR, `api_report_${dateStr}.csv`);
    fs.writeFileSync(csvFile, [csvHeaders.join(','), ...csvRows.map(r => r.join(','))].join('\n'));

    // 5. Print summary
    console.log('\n' + '='.repeat(50));
    console.log('  KUAISHOU API REPORT');
    console.log('='.repeat(50));
    console.log(`  Date: ${dateStr}`);
    console.log(`  Total Tasks: ${summary.totalTasks}`);
    console.log(`  With Data: ${summary.withData}`);
    console.log(`  Total Exposure: ${summary.totalExposure.toLocaleString()}`);
    console.log(`  Total Clicks: ${summary.totalClicks.toLocaleString()}`);
    console.log(`  Click Rate: ${summary.clickRate}`);
    console.log(`  Total Daren: ${summary.totalDaren.toLocaleString()}`);
    console.log(`  Total Works: ${summary.totalWorks.toLocaleString()}`);
    console.log('');
    console.log('  TOP 5 by Exposure:');
    topByExposure.slice(0, 5).forEach((r, i) => {
        console.log(`    ${i + 1}. [${r.planId}] ${r.name} — ${r.stats.组件曝光数} exposure, ${r.stats.已履单达人数量} daren`);
    });
    console.log('');
    console.log(`  JSON: ${jsonFile}`);
    console.log(`  CSV:  ${csvFile}`);
    console.log('='.repeat(50) + '\n');
}

// Capture interesting network responses
function isInterestingUrl(url) {
    const u = new URL(url);
    // Skip static assets, images, fonts, analytics
    if (/\.(js|css|png|jpg|gif|svg|woff|ttf|ico)(\?|$)/.test(u.pathname)) return false;
    if (u.hostname.includes('cdn') || u.hostname.includes('static')) return false;
    if (u.hostname.includes('tracker') || u.hostname.includes('log') || u.hostname.includes('beacon')) return false;
    if (u.hostname.includes('google') || u.hostname.includes('baidu')) return false;
    // Keep API-like calls
    if (u.pathname.includes('/rest/') || u.pathname.includes('/api/') || u.pathname.includes('/graphql')) return true;
    // Keep XHR-like JSON responses
    return true;
}

// ─── Sniff Mode (uses Playwright) ───

async function sniffMode() {
    const { chromium } = await import('playwright');
    log('INFO', '=== Kuaishou API Sniff Mode ===');

    // Load auth if available
    let storageState = undefined;
    if (fs.existsSync(AUTH_FILE)) {
        storageState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        log('INFO', `Auth file loaded, ${storageState.cookies?.length || 0} cookies`);
    } else {
        log('WARN', `No auth file found. Will prompt for login in browser.`);
        if (HEADLESS) {
            log('ERROR', 'Cannot login in headless mode. Run without HEADLESS=true');
            process.exit(1);
        }
    }

    const captured = [];

    // Launch browser
    const browser = await chromium.launch({
        headless: HEADLESS,
        args: ['--no-sandbox']
    });

    const context = await browser.newContext({
        ...(storageState ? { storageState } : {}),
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });

    const page = await context.newPage();

    // Intercept all responses
    page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();

        if (!isInterestingUrl(url)) return;

        const u = new URL(url);
        const request = response.request();
        const resourceType = request.resourceType();

        // Only capture XHR/fetch (skip document, script, stylesheet, etc.)
        if (!['xhr', 'fetch'].includes(resourceType)) return;

        let body = null;
        let bodyPreview = null;
        try {
            const text = await response.text();
            try {
                body = JSON.parse(text);
                // Truncate large arrays for preview
                bodyPreview = JSON.stringify(body, null, 2).slice(0, 3000);
            } catch {
                bodyPreview = text.slice(0, 1000);
            }
        } catch {
            bodyPreview = '(could not read body)';
        }

        const entry = {
            timestamp: new Date().toISOString(),
            method: request.method(),
            url: url,
            pathname: u.pathname,
            search: u.search,
            status,
            resourceType,
            requestHeaders: request.headers(),
            requestPostData: request.postData() || null,
            responseHeaders: response.headers(),
            bodyPreview,
            bodyJson: body
        };

        captured.push(entry);
        log('API', `${request.method()} ${status} ${u.pathname}${u.search ? '?' + u.searchParams.toString().slice(0, 80) : ''}`);
    });

    // Navigate to task list
    log('INFO', 'Navigating to distribution plan list...');
    await page.goto('https://daren.kuaishou.com/distribution-plan-list', { timeout: 60000, waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5000);

    // Check for login redirect
    const currentUrl = page.url();
    const apisReturnedUnauth = captured.some(c => c.bodyJson?.result === 109);
    const needsLogin = currentUrl.includes('login') || currentUrl.includes('passport') || currentUrl.includes('account') || apisReturnedUnauth;

    if (needsLogin) {
        log('WARN', apisReturnedUnauth ? 'APIs returned 109 (unauthenticated)' : 'Redirected to login page');
        if (HEADLESS) {
            log('ERROR', 'Cannot login in headless mode. Run without HEADLESS=true');
            await browser.close();
            process.exit(1);
        }

        // Navigate to login page if not already there
        if (!currentUrl.includes('passport')) {
            const loginUrl = captured.find(c => c.bodyJson?.loginUrl)?.bodyJson?.loginUrl
                || 'https://passport.kuaishou.com/pc/account/login?sid=kuaishou.creator.marketing&redirectURL=https%3A%2F%2Fdaren.kuaishou.com%2Fdistribution-plan-list';
            log('INFO', 'Navigating to login page...');
            await page.goto(loginUrl, { timeout: 60000, waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
        }

        log('INFO', '');
        log('INFO', '======================================');
        log('INFO', '  Please login in the browser window');
        log('INFO', '  (phone + SMS code recommended)');
        log('INFO', '  Waiting up to 5 minutes...');
        log('INFO', '======================================');
        log('INFO', '');

        // Track all URL changes for debugging
        page.on('framenavigated', frame => {
            if (frame === page.mainFrame()) {
                log('NAV', `→ ${frame.url()}`);
            }
        });

        // Wait until we land on daren.kuaishou.com (check hostname, not full URL string)
        try {
            await page.waitForURL(
                u => {
                    try {
                        const parsed = new URL(u.toString());
                        return parsed.hostname === 'daren.kuaishou.com';
                    } catch { return false; }
                },
                { timeout: 300000 }
            );
        } catch (e) {
            log('WARN', `URL wait timed out. Current URL: ${page.url()}`);
            log('INFO', 'Taking debug screenshot...');
            const screenshotPath = path.join(OUTPUT_DIR, 'debug_login_timeout.png');
            await page.screenshot({ path: screenshotPath, fullPage: true });
            log('INFO', `Screenshot: ${screenshotPath}`);

            // Try manual navigation as fallback
            log('INFO', 'Trying direct navigation to task list...');
            await page.goto('https://daren.kuaishou.com/distribution-plan-list', { timeout: 60000, waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);
        }
        log('INFO', `Redirected to: ${page.url()}`);

        // Give page time to fully load after redirect
        await page.waitForTimeout(8000);

        // Save session
        ensureParentDirectory(AUTH_FILE);
        await context.storageState({ path: AUTH_FILE });
        const savedState = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
        log('INFO', `Session saved (${savedState.cookies?.length} cookies) to: ${AUTH_FILE}`);

        // Navigate to task list if not already there
        if (!page.url().includes('distribution-plan-list')) {
            log('INFO', 'Navigating to task list...');
            await page.goto('https://daren.kuaishou.com/distribution-plan-list', { timeout: 60000, waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(5000);
        }
    }

    log('INFO', `Captured ${captured.length} API calls so far`);

    // Wait for table to render
    log('INFO', 'Waiting for task table to load...');
    await page.waitForSelector('table tbody tr', { timeout: 20000 }).catch(async () => {
        log('WARN', 'Table (table tbody tr) not found after 20s.');
        // Check page state
        const state = await page.evaluate(() => ({
            url: location.href,
            title: document.title,
            tables: document.querySelectorAll('table').length,
            anyTr: document.querySelectorAll('tr').length,
            distributionList: document.querySelector('.distribution-list__table')?.innerHTML?.slice(0, 200) || 'not found',
            bodyClasses: document.body.className,
            relevantDivs: [...new Set(Array.from(document.querySelectorAll('[class*="distribution"],[class*="plan"],[class*="list"],[class*="table"]')).map(d => d.className))].slice(0, 15)
        }));
        log('INFO', `Page state: ${JSON.stringify(state, null, 2)}`);

        // Try waiting for any clickable row-like elements
        log('INFO', 'Waiting another 10s for dynamic content...');
        await page.waitForTimeout(10000);
    });
    await page.waitForTimeout(3000);

    // Now click the "data" button on the first task to trigger stats API
    log('INFO', 'Clicking "Data" button on first task...');
    try {
        const clicked = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            if (rows.length === 0) return { success: false, error: 'No rows found' };
            const btns = rows[0]?.querySelector('td:last-child')?.querySelectorAll('button');
            if (!btns || btns.length < 2) return { success: false, error: `Only ${btns?.length || 0} buttons found` };
            btns[1].click(); // Index 1 = "Data" button
            return { success: true, buttonText: btns[1].textContent.trim() };
        });
        log('INFO', `Click result: ${JSON.stringify(clicked)}`);

        // Wait for drawer/overlay and its API calls
        await page.waitForTimeout(3000);

        // Close the drawer
        await page.keyboard.press('Escape');
        await page.waitForTimeout(1000);
    } catch (e) {
        log('WARN', `Could not click data button: ${e.message}`);
    }

    log('INFO', `Total captured API calls: ${captured.length}`);

    // Save full results
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(OUTPUT_DIR, `sniffed_requests_${timestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(captured, null, 2));
    log('INFO', `Full results saved to: ${outputFile}`);

    // Print summary
    printSummary(captured);

    await browser.close();
    log('INFO', 'Done');
}

function printSummary(captured) {
    console.log('\n' + '='.repeat(60));
    console.log('  DISCOVERED API ENDPOINTS');
    console.log('='.repeat(60));

    // Group by pathname
    const byPath = {};
    for (const entry of captured) {
        const key = `${entry.method} ${entry.pathname}`;
        if (!byPath[key]) {
            byPath[key] = { method: entry.method, pathname: entry.pathname, count: 0, statuses: new Set(), example: entry };
        }
        byPath[key].count++;
        byPath[key].statuses.add(entry.status);
    }

    const sorted = Object.values(byPath).sort((a, b) => {
        // Prioritize /rest/ and /api/ endpoints
        const aScore = (a.pathname.includes('/rest/') || a.pathname.includes('/api/')) ? 0 : 1;
        const bScore = (b.pathname.includes('/rest/') || b.pathname.includes('/api/')) ? 0 : 1;
        return aScore - bScore || a.pathname.localeCompare(b.pathname);
    });

    for (const ep of sorted) {
        const statuses = [...ep.statuses].join(',');
        const isRest = ep.pathname.includes('/rest/') || ep.pathname.includes('/api/');
        const marker = isRest ? ' <<<' : '';
        console.log(`\n  ${ep.method} ${ep.pathname} [${statuses}] x${ep.count}${marker}`);

        if (ep.example.search) {
            console.log(`    params: ${ep.example.search}`);
        }

        if (ep.example.bodyJson) {
            const keys = Object.keys(ep.example.bodyJson);
            console.log(`    response keys: ${keys.slice(0, 10).join(', ')}${keys.length > 10 ? '...' : ''}`);

            // If there's a data/result field, show its structure
            const data = ep.example.bodyJson.data || ep.example.bodyJson.result;
            if (data && typeof data === 'object') {
                const dataKeys = Object.keys(data);
                console.log(`    data keys: ${dataKeys.slice(0, 10).join(', ')}${dataKeys.length > 10 ? '...' : ''}`);
            }
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`  Total: ${captured.length} requests, ${sorted.length} unique endpoints`);
    console.log('='.repeat(60) + '\n');
}

// ─── Main ───

const main = MODE === 'sniff' ? sniffMode : apiMode;
main().catch(e => {
    log('ERROR', e.message);
    process.exit(1);
});
