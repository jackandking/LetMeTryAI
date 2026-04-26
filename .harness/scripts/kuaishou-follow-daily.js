import { spawn } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';

import { resolveKuaishouAuthFile, readAuthStateFile, hasLoggedInKuaishouAuth, checkCookieExpiry } from './kuaishou-follow-auth.js';
import { buildPastDayRange, fetchOfficialPastDayData, formatDateInTimeZone, writeExportFile } from './kuaishou-follow-api.js';
import { loadFollowAppConfigs } from './kuaishou-follow-config.js';
import {
    DEFAULT_DAILY_FOLLOW_CAP,
    DEFAULT_HOURLY_BATCH_SIZE,
    DEFAULT_MIN_FOLLOW_INTERVAL_MS,
    DEFAULT_REPORT_HOUR,
    appendFollowRecord,
    appendHourlyRunState,
    buildDailyEmailReport,
    buildFollowRuntimePaths,
    buildNextDayResumeAt,
    buildRoundRobinBatch,
    computeDailyQuotaUsage,
    createFollowRecord,
    createPendingCandidate,
    ensureFollowRuntime,
    isFollowableVideoUrl,
    loadDailyRunState,
    loadPendingQueue,
    mergeCandidatesIntoQueue,
    readFollowHistory,
    removeQueuedCandidate,
    savePendingQueue,
    updateDailyIngestionState,
    updateDailyReportState,
    updateQueuedCandidate,
    writeJsonFile
} from './kuaishou-follow-workflow.js';

const WEB_URL = 'https://www.kuaishou.com/short-video/bootstrap';
const RATE_LIMIT_KEYWORDS = [
    '操作过于频繁',
    '请稍后再试',
    '今日关注已达上限',
    '今日已达上限',
    '频繁',
    '安全验证',
    '异常行为'
];
const INVALID_VIDEO_KEYWORDS = ['找不到该作品', '热门作品'];
const IMAGE_POST_KEYWORDS = ['暂未支持显示图片作品'];
const FOLLOWED_TEXTS = new Set(['已关注', '互相关注', '回关']);
const FOLLOW_BUTTON_TEXTS = new Set(['关注', '+关注', '＋关注', '+ 关注']);
const RETRYABLE_REASONS = new Set(['follow-button-not-found', 'invalid-video', 'image-post', 'follow-state-not-confirmed']);
const MAX_FOLLOW_ATTEMPTS = 3;

function getFollowPaths(repoRoot) {
    const paths = buildFollowRuntimePaths(repoRoot);
    mkdirSync(join(repoRoot, '.harness', '.local', 'auth'), { recursive: true });
    mkdirSync(join(repoRoot, '.harness', '.local', 'logs'), { recursive: true });
    ensureFollowRuntime(paths);
    return paths;
}

function buildRuntimeDirs(repoRoot) {
    return {
        authDir: join(repoRoot, '.harness', '.local', 'auth'),
        logsDir: join(repoRoot, '.harness', '.local', 'logs')
    };
}

function sendAuthAlert(repoRoot, env, subject, bodyText) {
    const recipient = String(env.KUAISHOU_FOLLOW_REPORT_TO || '').trim();
    if (!recipient) return;

    const tmpFile = join(repoRoot, '.harness', '.local', 'logs', `auth-alert-${Date.now()}.txt`);
    writeFileSync(tmpFile, bodyText, 'utf-8');

    try {
        spawn('python3', [
            join(repoRoot, '.harness', 'scripts', 'send-email.py'),
            subject,
            recipient,
            tmpFile
        ], { stdio: 'ignore', detached: true }).unref();
    } catch {
        // Best-effort alert — don't crash the worker.
    }
}

function getRunDateKey(now = new Date()) {
    return formatDateInTimeZone(now);
}

function sortCandidates(candidates) {
    return [...candidates].sort((left, right) => {
        const leftPlay = Number(left.playCnt || 0) || 0;
        const rightPlay = Number(right.playCnt || 0) || 0;
        const leftClick = Number(left.clickCnt || 0) || 0;
        const rightClick = Number(right.clickCnt || 0) || 0;
        return rightPlay - leftPlay || rightClick - leftClick;
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function detectPageCondition(text) {
    const bodyText = String(text || '');
    if (INVALID_VIDEO_KEYWORDS.some(keyword => bodyText.includes(keyword))) {
        return 'invalid-video';
    }
    if (IMAGE_POST_KEYWORDS.some(keyword => bodyText.includes(keyword))) {
        return 'image-post';
    }
    if (RATE_LIMIT_KEYWORDS.some(keyword => bodyText.includes(keyword))) {
        return 'rate-limited';
    }
    if (bodyText.includes('登录/注册') || bodyText.includes('立即登录')) {
        return 'not-logged-in';
    }
    if (/^\s*\{"result":\s*\d/.test(bodyText)) {
        return 'not-logged-in';
    }
    return '';
}

async function getPageBodyText(page) {
    try {
        return await page.locator('body').innerText({ timeout: 5000 });
    } catch {
        return '';
    }
}

async function findFollowButton(page) {
    // Phase 1: explicit locators (fast, specific)
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
        } catch {
            // Try the next locator.
        }
    }

    // Phase 2: fuzzy text search (handles icons + text composites)
    try {
        const fuzzyButton = page.locator('button, [role="button"], a').filter({
            hasText: /^(关注|\+关注|\+ 关注|＋关注)$/
        }).first();
        if (await fuzzyButton.count() > 0 && await fuzzyButton.isVisible({ timeout: 1000 })) {
            return fuzzyButton;
        }
    } catch {
        // Fall through.
    }

    // Phase 3: evaluate in page context (last resort, catches shadow DOM or dynamic renders)
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
    } catch {
        // Fall through.
    }

    return null;
}

async function readFollowButtonText(page) {
    const button = await findFollowButton(page);
    if (!button) {
        return '';
    }

    try {
        const innerText = String(await button.innerText()).replace(/\s+/g, ' ').trim();
        if (innerText) {
            return innerText;
        }
    } catch {
        // Fall through to aria-label.
    }

    try {
        const ariaLabel = await button.getAttribute('aria-label');
        if (ariaLabel) {
            return String(ariaLabel).trim();
        }
    } catch {
        // Fall through to title.
    }

    try {
        const title = await button.getAttribute('title');
        if (title) {
            return String(title).trim();
        }
    } catch {
        // Exhausted.
    }

    return '';
}

function isFollowButtonText(text) {
    if (!text) {
        return false;
    }
    const normalized = text.replace(/\s+/g, ' ').trim();
    return FOLLOW_BUTTON_TEXTS.has(normalized);
}

async function followCandidate(page, candidate, { logsDir }) {
    await page.goto(candidate.videoUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2500);

    let bodyText = await getPageBodyText(page);
    let condition = detectPageCondition(bodyText);
    if (condition) {
        return {
            status: condition === 'rate-limited' ? 'rate-limited' : 'failed',
            reason: condition
        };
    }

    const initialText = await readFollowButtonText(page);
    if (FOLLOWED_TEXTS.has(initialText)) {
        return {
            status: 'already-followed',
            reason: 'already-followed',
            buttonText: initialText
        };
    }

    if (!isFollowButtonText(initialText)) {
        // Diagnostic: save page snippet when button text is unexpected
        const diagPath = join(
            logsDir,
            `follow-diag-${Date.now()}-${candidate.queueKey.replace(/[^a-z0-9_-]/gi, '-')}`
        );
        try {
            const html = await page.content();
            writeFileSync(`${diagPath}.html`, html, 'utf-8');
            await page.screenshot({ path: `${diagPath}.png`, fullPage: true }).catch(() => {});
        } catch {
            // Best-effort diagnostics.
        }
        return {
            status: 'failed',
            reason: initialText ? `unsupported-button:${initialText}` : 'follow-button-not-found'
        };
    }

    const button = await findFollowButton(page);
    if (!button) {
        return {
            status: 'failed',
            reason: 'follow-button-not-found'
        };
    }

    await button.click({ timeout: 10000 });
    await page.waitForTimeout(2000);
    bodyText = await getPageBodyText(page);
    condition = detectPageCondition(bodyText);
    if (condition === 'rate-limited') {
        return {
            status: 'rate-limited',
            reason: condition
        };
    }

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForTimeout(2000);

    const finalText = await readFollowButtonText(page);
    if (FOLLOWED_TEXTS.has(finalText)) {
        return {
            status: 'followed',
            reason: 'followed',
            buttonText: finalText
        };
    }

    const screenshotPath = join(
        logsDir,
        `kuaishou-follow-${Date.now()}-${candidate.queueKey.replace(/[^a-z0-9_-]/gi, '-')}.png`
    );
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});
    return {
        status: 'failed',
        reason: 'follow-state-not-confirmed',
        screenshotPath
    };
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

    // Hide webdriver flag to evade anti-automation detection
    await page.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => undefined
        });
    });

    return {
        browser,
        context,
        page
    };
}

function buildExportName(prefix) {
    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `${prefix}-${timestamp}.json`;
}

function normalizeCandidateRecord(profile, record, now) {
    if (!isFollowableVideoUrl(record.videoUrl)) {
        return null;
    }

    return createPendingCandidate({
        profileId: profile.profileId,
        profileName: profile.profileName,
        appId: profile.appId,
        planDate: record.date,
        sourceStrategy: 'official',
        record,
        now
    });
}

export function planHourlyExecution({
    queue = [],
    history = [],
    dateKey = '',
    batchSize = DEFAULT_HOURLY_BATCH_SIZE,
    dailyCap = DEFAULT_DAILY_FOLLOW_CAP,
    now = new Date()
} = {}) {
    const quotaUsed = computeDailyQuotaUsage(history, dateKey);
    const remainingCap = Math.max(0, Number(dailyCap || DEFAULT_DAILY_FOLLOW_CAP) - quotaUsed);
    if (remainingCap <= 0) {
        return {
            quotaUsed,
            remainingCap,
            selected: [],
            stopReason: 'daily-cap-reached'
        };
    }

    const selected = buildRoundRobinBatch(queue, {
        limit: Math.min(Number(batchSize || DEFAULT_HOURLY_BATCH_SIZE), remainingCap),
        now
    });
    if (selected.length === 0) {
        return {
            quotaUsed,
            remainingCap,
            selected: [],
            stopReason: 'queue-empty'
        };
    }

    return {
        quotaUsed,
        remainingCap,
        selected,
        stopReason: ''
    };
}

export async function runDailyIngestion({
    repoRoot,
    configFile = '',
    env = process.env,
    now = new Date(),
    days = 2,
    autoSendReport = true,
    sendReport = sendDailyFollowReport
} = {}) {
    const paths = getFollowPaths(repoRoot);
    const configs = loadFollowAppConfigs({
        configFile: configFile || paths.appConfigFile,
        env
    });
    const range = buildPastDayRange({ days, now });
    const queue = loadPendingQueue(paths.queueFile);
    const history = readFollowHistory(paths.historyFile);
    const runDateKey = getRunDateKey(now);
    const startedAt = now instanceof Date ? now.toISOString() : String(now);
    const appSummaries = [];
    const candidates = [];
    let mergedQueue = queue;
    let totalFetched = 0;
    let skippedMissingVideoUrl = 0;
    let totalQueueAdded = 0;
    let totalQueueReplaced = 0;
    let totalQueueSkipped = 0;

    for (const profile of configs) {
        const result = await fetchOfficialPastDayData({
            appId: profile.appId,
            appSecret: profile.appSecret,
            range
        });
        const records = Array.isArray(result.records) ? result.records : [];
        totalFetched += records.length;

        const accepted = [];
        for (const record of sortCandidates(records)) {
            const candidate = normalizeCandidateRecord(profile, record, now);
            if (!candidate) {
                skippedMissingVideoUrl += 1;
                continue;
            }
            accepted.push(candidate);
            candidates.push(candidate);
        }

        const exportFile = writeExportFile(paths.exportsDir, buildExportName(`${profile.profileId}-official-mount-data`), {
            runDateKey,
            profileId: profile.profileId,
            appId: profile.appId,
            range,
            totalRecords: records.length,
            acceptedCandidates: accepted.length,
            sample: records.slice(0, 5),
            result
        });

        appSummaries.push({
            profileId: profile.profileId,
            appId: profile.appId,
            fetched: records.length,
            acceptedCandidates: accepted.length,
            queueAdded: 0,
            queueReplaced: 0,
            queueSkipped: 0,
            exportFile
        });

        const mergeResult = mergeCandidatesIntoQueue(mergedQueue, accepted, history);
        mergedQueue = mergeResult.queue;
        totalQueueAdded += mergeResult.added;
        totalQueueReplaced += mergeResult.replaced;
        totalQueueSkipped += mergeResult.skipped;
        appSummaries[appSummaries.length - 1].queueAdded = mergeResult.added;
        appSummaries[appSummaries.length - 1].queueReplaced = mergeResult.replaced;
        appSummaries[appSummaries.length - 1].queueSkipped = mergeResult.skipped;
    }

    savePendingQueue(paths.queueFile, mergedQueue);

    const ingestionSummary = {
        startedAt,
        completedAt: new Date().toISOString(),
        range,
        appCount: configs.length,
        totalFetched,
        eligibleCandidates: candidates.length,
        queueAdded: totalQueueAdded,
        queueReplaced: totalQueueReplaced,
        queueSkipped: totalQueueSkipped,
        skippedMissingVideoUrl,
        apps: appSummaries
    };
    updateDailyIngestionState(paths.dailyRunsDir, runDateKey, ingestionSummary);
    if (autoSendReport) {
        await sendReport({
            repoRoot,
            env,
            now,
            dateKey: runDateKey,
            force: true
        });
    }
    return ingestionSummary;
}

function deferEntireQueue(queue, deferUntil, now, reason) {
    return (Array.isArray(queue) ? queue : []).map(candidate => ({
        ...candidate,
        deferUntil,
        updatedAt: now,
        lastError: reason || candidate.lastError || ''
    }));
}

export async function sendDailyFollowReport({
    repoRoot,
    env = process.env,
    now = new Date(),
    dateKey = '',
    toEmail = '',
    force = false
} = {}) {
    const paths = getFollowPaths(repoRoot);
    const effectiveDateKey = String(dateKey || getRunDateKey(now)).trim();
    const dayState = loadDailyRunState(paths.dailyRunsDir, effectiveDateKey);
    if (dayState.report?.sentAt && !force) {
        return dayState.report;
    }

    const history = readFollowHistory(paths.historyFile);
    const queue = loadPendingQueue(paths.queueFile);
    const report = buildDailyEmailReport({
        dateKey: effectiveDateKey,
        dayState,
        history,
        queue,
        dailyCap: Number(env.KUAISHOU_FOLLOW_DAILY_CAP || DEFAULT_DAILY_FOLLOW_CAP)
    });
    const recipient = String(toEmail || env.KUAISHOU_FOLLOW_REPORT_TO || '').trim();
    if (!recipient) {
        throw new Error('Missing KUAISHOU_FOLLOW_REPORT_TO for follow email report');
    }

    const bodyFile = join(paths.reportsDir, `follow-report-${effectiveDateKey}.txt`);
    const summaryFile = join(paths.reportsDir, `follow-report-${effectiveDateKey}.json`);
    writeJsonFile(summaryFile, report.summary);
    writeFileSync(bodyFile, report.body, 'utf-8');

    await new Promise((resolve, reject) => {
        const child = spawn('python3', [
            join(repoRoot, '.harness', 'scripts', 'send-kuaishou-follow-report.py'),
            report.subject,
            recipient,
            bodyFile,
            summaryFile
        ], {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        let stderr = '';
        child.stderr.on('data', chunk => {
            stderr += String(chunk);
        });
        child.on('exit', code => {
            if (code === 0) {
                resolve(null);
                return;
            }
            reject(new Error(stderr.trim() || `send report exited with code ${code}`));
        });
        child.on('error', reject);
    });

    const sentReport = {
        sentAt: new Date().toISOString(),
        toEmail: recipient,
        subject: report.subject,
        bodyFile,
        summaryFile
    };
    updateDailyReportState(paths.dailyRunsDir, effectiveDateKey, sentReport);
    return sentReport;
}

export async function runHourlyFollowWorker({
    repoRoot,
    env = process.env,
    now = new Date(),
    headless = true,
    batchSize = Number(env.KUAISHOU_FOLLOW_BATCH_SIZE || DEFAULT_HOURLY_BATCH_SIZE),
    dailyCap = Number(env.KUAISHOU_FOLLOW_DAILY_CAP || DEFAULT_DAILY_FOLLOW_CAP),
    minFollowIntervalMs = Number(env.KUAISHOU_FOLLOW_MIN_INTERVAL_MS || DEFAULT_MIN_FOLLOW_INTERVAL_MS),
    autoSendReport = true,
    sendReport = sendDailyFollowReport
} = {}) {
    const paths = getFollowPaths(repoRoot);
    const runDateKey = getRunDateKey(now);
    let queue = loadPendingQueue(paths.queueFile);
    const history = readFollowHistory(paths.historyFile);
    const startedAt = now instanceof Date ? now.toISOString() : String(now);
    const executionPlan = planHourlyExecution({
        queue,
        history,
        dateKey: runDateKey,
        batchSize,
        dailyCap,
        now
    });
    let stopReason = executionPlan.stopReason;

    if (stopReason === 'daily-cap-reached') {
        queue = deferEntireQueue(queue, buildNextDayResumeAt(now, DEFAULT_REPORT_HOUR), new Date().toISOString(), stopReason);
        savePendingQueue(paths.queueFile, queue);
        const dayState = appendHourlyRunState(paths.dailyRunsDir, runDateKey, {
            startedAt,
            completedAt: new Date().toISOString(),
            attempted: 0,
            followed: 0,
            alreadyFollowed: 0,
            failed: 0,
            stopReason
        });
        if (autoSendReport) {
            await sendReport({ repoRoot, env, now, dateKey: runDateKey, force: true });
        }
        return dayState.hourlyRuns[dayState.hourlyRuns.length - 1];
    }

    const selected = executionPlan.selected;

    if (stopReason === 'queue-empty') {
        const dayState = appendHourlyRunState(paths.dailyRunsDir, runDateKey, {
            startedAt,
            completedAt: new Date().toISOString(),
            attempted: 0,
            followed: 0,
            alreadyFollowed: 0,
            failed: 0,
            stopReason
        });
        return dayState.hourlyRuns[dayState.hourlyRuns.length - 1];
    }

    const metrics = {
        startedAt,
        completedAt: '',
        attempted: 0,
        followed: 0,
        alreadyFollowed: 0,
        failed: 0,
        stopReason: ''
    };

    const runtimeDirs = buildRuntimeDirs(repoRoot);

    // Preflight: check cookie TTL before opening browser
    const authFile = resolveKuaishouAuthFile(runtimeDirs.authDir, WEB_URL);
    const cookieStatus = checkCookieExpiry(authFile);

    if (cookieStatus.isExpired) {
        const deferUntil = buildNextDayResumeAt(now, DEFAULT_REPORT_HOUR);
        queue = deferEntireQueue(queue, deferUntil, new Date().toISOString(), 'auth-expired');
        savePendingQueue(paths.queueFile, queue);

        sendAuthAlert(repoRoot, env,
            '[Kuaishou Follow] Auth cookie 已过期，follow 已暂停',
            `Cookie "${cookieStatus.cookieName}" 已过期 (${cookieStatus.reason || cookieStatus.expiresAt})。\n`
            + `队列中 ${queue.length} 个候选人已暂停，等待手动刷新 auth。\n\n`
            + `刷新方法: cd .harness && npx tsx scripts/kuaishou-follow.ts start`
        );

        const dayState = appendHourlyRunState(paths.dailyRunsDir, runDateKey, {
            startedAt,
            completedAt: new Date().toISOString(),
            attempted: 0, followed: 0, alreadyFollowed: 0, failed: 0,
            stopReason: 'auth-expired'
        });
        if (autoSendReport) {
            await sendReport({ repoRoot, env, now, dateKey: runDateKey, force: true });
        }
        return dayState.hourlyRuns[dayState.hourlyRuns.length - 1];
    }

    if (cookieStatus.isExpiringSoon) {
        sendAuthAlert(repoRoot, env,
            `[Kuaishou Follow] Auth cookie 将在 ${cookieStatus.ttlHours}h 后过期`,
            `Cookie "${cookieStatus.cookieName}" 将于 ${cookieStatus.expiresAt} 过期 (剩余 ${cookieStatus.ttlHours}h)。\n`
            + `请尽快刷新以避免 follow 中断。\n\n`
            + `刷新方法: cd .harness && npx tsx scripts/kuaishou-follow.ts start`
        );
    }

    const browserSession = await openFollowBrowser({ headless, runtimeDirs });
    try {
        for (let index = 0; index < selected.length; index += 1) {
            if (index > 0) {
                await sleep(Math.max(Number(minFollowIntervalMs || DEFAULT_MIN_FOLLOW_INTERVAL_MS), DEFAULT_MIN_FOLLOW_INTERVAL_MS));
            }

            const candidate = selected[index];
            metrics.attempted += 1;
            const result = await followCandidate(browserSession.page, candidate, { logsDir: runtimeDirs.logsDir });

            if (result.status === 'rate-limited') {
                const deferUntil = buildNextDayResumeAt(now, DEFAULT_REPORT_HOUR);
                queue = deferEntireQueue(queue, deferUntil, new Date().toISOString(), result.reason);
                queue = updateQueuedCandidate(queue, candidate.queueKey, {
                    attemptCount: Number(candidate.attemptCount || 0) + 1,
                    lastAttemptAt: new Date().toISOString(),
                    lastError: result.reason,
                    deferUntil
                });
                stopReason = 'rate-limited';
                break;
            }

            if (result.reason === 'not-logged-in') {
                const deferUntil = buildNextDayResumeAt(now, DEFAULT_REPORT_HOUR);
                queue = deferEntireQueue(queue, deferUntil, new Date().toISOString(), 'auth-expired');
                stopReason = 'auth-expired';

                sendAuthAlert(repoRoot, env,
                    '[Kuaishou Follow] 运行中检测到 auth 失效，已暂停',
                    `在 follow 第 ${index + 1} 个候选人时检测到未登录状态。\n`
                    + `队列中 ${queue.length} 个候选人已暂停。\n\n`
                    + `刷新方法: cd .harness && npx tsx scripts/kuaishou-follow.ts start`
                );
                break;
            }

            if (result.status === 'followed') {
                metrics.followed += 1;
            } else if (result.status === 'already-followed') {
                metrics.alreadyFollowed += 1;
            } else {
                metrics.failed += 1;
            }

            const isRetryable = result.status === 'failed' && RETRYABLE_REASONS.has(result.reason);
            const newAttemptCount = Number(candidate.attemptCount || 0) + 1;

            if (isRetryable && newAttemptCount < MAX_FOLLOW_ATTEMPTS) {
                queue = updateQueuedCandidate(queue, candidate.queueKey, {
                    attemptCount: newAttemptCount,
                    lastAttemptAt: new Date().toISOString(),
                    lastError: result.reason
                });
            } else {
                appendFollowRecord(paths.historyFile, createFollowRecord({
                    creatorId: candidate.authorOpenId,
                    displayName: candidate.authorName,
                    status: result.status === 'already-followed' ? 'already-followed' : result.status,
                    reason: result.reason || '',
                    sourceUrl: candidate.videoUrl,
                    now: new Date().toISOString()
                }));
                queue = removeQueuedCandidate(queue, candidate.queueKey);

                if (isRetryable && newAttemptCount >= MAX_FOLLOW_ATTEMPTS) {
                    metrics.exhaustedRetries = (metrics.exhaustedRetries || 0) + 1;
                }
            }
        }
    } finally {
        await browserSession.page.close().catch(() => {});
        await browserSession.context.close().catch(() => {});
        await browserSession.browser.close().catch(() => {});
    }

    metrics.completedAt = new Date().toISOString();
    metrics.stopReason = stopReason || (queue.length === 0 ? 'queue-empty' : 'batch-finished');
    savePendingQueue(paths.queueFile, queue);

    const dayState = appendHourlyRunState(paths.dailyRunsDir, runDateKey, metrics);
    const shouldReport = metrics.followed > 0 || metrics.failed > 0
        || metrics.exhaustedRetries > 0 || stopReason === 'rate-limited' || stopReason === 'auth-expired';
    if (autoSendReport && shouldReport) {
        await sendReport({ repoRoot, env, now, dateKey: runDateKey, force: true });
    }

    return metrics;
}

export function hasFollowAppConfig(configFile) {
    return existsSync(configFile);
}
