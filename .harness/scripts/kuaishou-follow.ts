#!/usr/bin/env tsx
/**
 * Kuaishou Follow Workflow - 手动首轮 + 后续自动化状态沉淀
 *
 * Usage:
 *   tsx scripts/kuaishou-follow.ts start [options]
 *   tsx scripts/kuaishou-follow.ts record [options]
 *   tsx scripts/kuaishou-follow.ts observe [options]
 *   tsx scripts/kuaishou-follow.ts inspect [options]
 *   tsx scripts/kuaishou-follow.ts status
 *   tsx scripts/kuaishou-follow.ts finish [options]
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { spawn } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import { ensureDirectories, PATHS } from '../src/config/index.js';
import {
    backupAuthStateFile,
    hasLoggedInKuaishouAuth,
    readAuthStateFile,
    resolveKuaishouAuthFile
} from './kuaishou-follow-auth.js';
import {
    runDailyIngestion,
    runHourlyFollowWorker,
    sendDailyFollowReport
} from './kuaishou-follow-daily.js';
import {
    buildPastDayRange,
    fetchInternalPastDayData,
    fetchOfficialPastDayData,
    formatDateInTimeZone,
    normalizeInternalDetailPayload,
    writeExportFile
} from './kuaishou-follow-api.js';
import {
    DEFAULT_START_URL,
    appendFollowRecord,
    appendObservationEvent,
    buildObservationPaths,
    buildFollowRuntimePaths,
    buildManualSession,
    buildManualStartInstructions,
    completeSession,
    computeDailyQuotaUsage,
    createObservationEvent,
    createObservationSession,
    createFollowRecord,
    loadDailyRunState,
    loadPendingQueue,
    ensureFollowRuntime,
    ensureObservationRuntime,
    filterRecordsByPlanId,
    formatPageInspectionReport,
    formatObservationReport,
    formatStatusReport,
    hasProcessedCreator,
    parseJsonLines,
    readFollowHistory,
    readLatestSession,
    saveSession,
    saveObservationSession,
    summarizeFollowRecords
} from './kuaishou-follow-workflow.js';

const __filename = fileURLToPath(import.meta.url);
const HARNESS_ROOT = dirname(dirname(__filename));
const REPO_ROOT = dirname(HARNESS_ROOT);
const OBSERVER_BINDING = '__HARNESS_RECORD_EVENT__';
const DEFAULT_OBSERVER_PORT = 9333;
const CHROME_CANDIDATES = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium'
];

function parseArgs(argv) {
    if (argv[0] === '--help' || argv[0] === '-h') {
        return {
            command: 'status',
            help: 'true'
        };
    }

    const [command = 'status', ...rest] = argv;
    const options = { command };

    for (let index = 0; index < rest.length; index += 1) {
        const current = rest[index];
        const next = rest[index + 1];

        switch (current) {
            case '--plan-id':
                options.planId = next;
                index += 1;
                break;
            case '--limit':
                options.limit = next;
                index += 1;
                break;
            case '--url':
                options.url = next;
                index += 1;
                break;
            case '--wait':
                options.wait = next;
                index += 1;
                break;
            case '--duration':
                options.duration = next;
                index += 1;
                break;
            case '--port':
                options.port = next;
                index += 1;
                break;
            case '--chrome-path':
                options.chromePath = next;
                index += 1;
                break;
            case '--session-id':
                options.sessionId = next;
                index += 1;
                break;
            case '--strategy':
                options.strategy = next;
                index += 1;
                break;
            case '--app-id':
                options.appId = next;
                index += 1;
                break;
            case '--days':
                options.days = next;
                index += 1;
                break;
            case '--config-file':
                options.configFile = next;
                index += 1;
                break;
            case '--date':
                options.date = next;
                index += 1;
                break;
            case '--batch-size':
                options.batchSize = next;
                index += 1;
                break;
            case '--min-interval-ms':
                options.minIntervalMs = next;
                index += 1;
                break;
            case '--report-email':
                options.reportEmail = next;
                index += 1;
                break;
            case '--official-endpoint':
                options.officialEndpoint = next;
                index += 1;
                break;
            case '--json':
                options.json = 'true';
                break;
            case '--creator-id':
                options.creatorId = next;
                index += 1;
                break;
            case '--handle':
                options.handle = next;
                index += 1;
                break;
            case '--display-name':
                options.displayName = next;
                index += 1;
                break;
            case '--status':
                options.status = next;
                index += 1;
                break;
            case '--reason':
                options.reason = next;
                index += 1;
                break;
            case '--source-url':
                options.sourceUrl = next;
                index += 1;
                break;
            case '--note':
                options.note = next;
                index += 1;
                break;
            case '--headless':
                options.headless = 'true';
                break;
            case '--no-browser':
                options.noBrowser = 'true';
                break;
            case '--help':
            case '-h':
                options.help = 'true';
                break;
            default:
                if (current.startsWith('--')) {
                    throw new Error(`Unknown option: ${current}`);
                }
                break;
        }
    }

    return options;
}

function showHelp() {
    console.log(`
Kuaishou Follow Workflow

Commands:
  start                 打开已登录快手创作者平台，并创建本轮手动 session
  record                记录一个账号的处理结果（followed/skipped/failed）
  observe               启动受控 Chrome，并把手工点击/输入/跳转写入 JSONL
  inspect               用同一份登录态并行检查指定页面并保存截图
  fetch-data            拉取过去 N 天的挂载数据（official / browser / auto）
  daily-ingest          用 official-only 为全部配置 app 拉取当天视频清单并合并进 pending queue
  run-hourly            每小时执行一批 follow（默认 10 人，批内至少 1 分钟间隔）
  send-report           发送当日快手 follow email 报告
  status                查看当前 session 和历史汇总
  finish                结束当前手动 session，写入备注

Examples:
  npm run kuaishou:follow -- start --plan-id 257060
  npm run kuaishou:follow -- record --creator-id 12345 --handle @abc --status followed
  npm run kuaishou:follow -- observe --url https://open.kuaishou.com/console
  npm run kuaishou:follow -- inspect --url https://open.kuaishou.com/console
  KUAISHOU_APP_ID=xxx KUAISHOU_APP_SECRET=xxx npm run kuaishou:follow -- fetch-data --days 1 --strategy auto
  KUAISHOU_FOLLOW_APPS='[...]' npm run kuaishou:follow -- daily-ingest
  KUAISHOU_FOLLOW_APPS='[...]' KUAISHOU_FOLLOW_REPORT_TO=me@example.com npm run kuaishou:follow -- run-hourly
  KUAISHOU_FOLLOW_REPORT_TO=me@example.com npm run kuaishou:follow -- send-report --date 2026-04-12
  npm run kuaishou:follow -- record --handle @abc --status skipped --reason "内容不匹配"
  npm run kuaishou:follow -- status
  npm run kuaishou:follow -- finish --note "第一轮手动样本完成"

Options:
  --plan-id <id>        当前处理的星火/分销任务 ID
  --limit <n>           手动样本数量提示，默认 5
  --url <url>           自定义起始页面，默认 ${DEFAULT_START_URL}
  --port <n>            observe 使用的 Chrome 调试端口，默认 ${DEFAULT_OBSERVER_PORT}
  --duration <ms>       observe 自动停止时长；仅用于自测/调试
  --chrome-path <path>  指定 Chrome 可执行文件
  --wait <ms>           inspect 时额外等待页面稳定，默认 5000
  --strategy <mode>     fetch-data 使用 official | browser | auto，默认 auto
  --app-id <id>         fetch-data 使用的小程序 AppID（也可走 KUAISHOU_APP_ID）
  --days <n>            fetch-data 查询最近 N 天，默认 1
  --config-file <path>  daily-ingest / run-hourly 使用的本地 app config 文件
  --date <YYYY-MM-DD>   send-report 指定报告日期，默认今天（中国时区）
  --batch-size <n>      run-hourly 本批处理人数，默认 10
  --min-interval-ms     run-hourly 批内两次 follow 的最小间隔，默认 60000
  --report-email <mail> send-report 或 run-hourly 覆盖默认收件邮箱
  --official-endpoint   覆盖官方 API endpoint，默认 /openapi/mp/data/video_mount/get
  --json                fetch-data 仅输出 JSON
  --headless            无头打开浏览器（通常只用于自测）
  --no-browser          只创建 session，不打开浏览器
  --creator-id <id>     达人/用户唯一 ID
  --handle <name>       达人账号名
  --display-name <text> 页面展示名
  --status <state>      followed | skipped | failed
  --reason <text>       跳过/失败原因
  --source-url <url>    记录来源页面 URL
  --note <text>         finish 时附加备注
`);
}

function getAuthFile(targetUrl = DEFAULT_START_URL) {
    return resolveKuaishouAuthFile(PATHS.auth, targetUrl);
}

function loadAuthState(targetUrl = DEFAULT_START_URL, { required = true } = {}) {
    ensureDirectories();
    const authFile = getAuthFile(targetUrl);

    if (!existsSync(authFile)) {
        if (required) {
            throw new Error(`Auth file not found: ${authFile}`);
        }
        return null;
    }

    const parsed = JSON.parse(readFileSync(authFile, 'utf-8'));
    if (!Array.isArray(parsed.cookies) || parsed.cookies.length === 0) {
        if (required) {
            throw new Error(`Auth file is missing cookies: ${authFile}`);
        }
        return null;
    }

    return parsed;
}

function resolveChromeExecutable(customPath) {
    const candidates = customPath ? [customPath, ...CHROME_CANDIDATES] : CHROME_CANDIDATES;
    const chromePath = candidates.find(candidate => existsSync(candidate));
    if (!chromePath) {
        throw new Error('Chrome executable not found. Use --chrome-path to specify it.');
    }

    return chromePath;
}

function extractActor(authState) {
    const getCookieValue = (name) => {
        const cookie = authState.cookies.find(item => item.name === name);
        return cookie?.value || '';
    };

    return {
        userId: getCookieValue('userId'),
        bUserId: getCookieValue('bUserId')
    };
}

function getFollowPaths() {
    const paths = buildFollowRuntimePaths(REPO_ROOT);
    ensureFollowRuntime(paths);
    return paths;
}

async function persistAuthState(context, targetUrl = DEFAULT_START_URL) {
    const latestState = await context.storageState();
    const authFile = getAuthFile(targetUrl);
    const existingState = readAuthStateFile(authFile);

    if (!hasLoggedInKuaishouAuth(latestState)) {
        return {
            authFile,
            saved: false,
            preserved: hasLoggedInKuaishouAuth(existingState)
        };
    }

    backupAuthStateFile(authFile);
    writeFileSync(authFile, JSON.stringify(latestState, null, 2), 'utf-8');
    return {
        authFile,
        saved: true,
        preserved: false
    };
}

async function waitForDebugger(port, timeoutMs = 15000) {
    const startedAt = Date.now();
    const endpoint = `http://127.0.0.1:${port}/json/version`;

    while (Date.now() - startedAt < timeoutMs) {
        try {
            const response = await fetch(endpoint);
            if (response.ok) {
                return;
            }
        } catch {
            // Wait until Chrome exposes the debugger endpoint.
        }

        await new Promise(resolve => setTimeout(resolve, 300));
    }

    throw new Error(`Chrome remote debugger did not start on port ${port}`);
}

function buildObserverScript() {
    return `(() => {
        if (window.__HARNESS_OBSERVER_INSTALLED__) return;
        window.__HARNESS_OBSERVER_INSTALLED__ = true;
        const emit = (payload) => {
            if (typeof window.${OBSERVER_BINDING} === 'function') {
                window.${OBSERVER_BINDING}(payload);
            }
        };
        const selectorFor = (element) => {
            if (!element || !(element instanceof Element)) return '';
            const parts = [];
            let current = element;
            while (current && current.nodeType === 1 && parts.length < 5) {
                let part = current.tagName.toLowerCase();
                if (current.id) {
                    part += '#' + current.id;
                    parts.unshift(part);
                    break;
                }
                if (current.classList && current.classList.length > 0) {
                    part += '.' + Array.from(current.classList).slice(0, 2).join('.');
                }
                const parent = current.parentElement;
                if (parent) {
                    const siblings = Array.from(parent.children).filter(node => node.tagName === current.tagName);
                    if (siblings.length > 1) {
                        part += ':nth-of-type(' + (siblings.indexOf(current) + 1) + ')';
                    }
                }
                parts.unshift(part);
                current = current.parentElement;
            }
            return parts.join(' > ');
        };
        const textFor = (element) => {
            if (!element) return '';
            return String(element.innerText || element.textContent || '')
                .replace(/\\s+/g, ' ')
                .trim()
                .slice(0, 200);
        };
        const publish = (type, element, extra = {}) => {
            emit({
                type,
                url: location.href,
                title: document.title,
                targetText: textFor(element),
                targetSelector: selectorFor(element),
                value: typeof extra.value === 'string' ? extra.value : ''
            });
        };
        document.addEventListener('pointerdown', event => {
            publish('pointerdown', event.target);
        }, true);
        document.addEventListener('mousedown', event => {
            publish('mousedown', event.target);
        }, true);
        document.addEventListener('click', event => {
            publish('click', event.target);
        }, true);
        document.addEventListener('input', event => {
            const target = event.target;
            const value = target && 'value' in target ? String(target.value || '') : '';
            publish('input', target, { value });
        }, true);
        document.addEventListener('change', event => {
            const target = event.target;
            const value = target && 'value' in target ? String(target.value || '') : '';
            publish('change', target, { value });
        }, true);
        const wrapHistory = (name) => {
            const original = history[name];
            history[name] = function(...args) {
                const result = original.apply(this, args);
                emit({ type: 'history-' + name, url: location.href, title: document.title });
                return result;
            };
        };
        wrapHistory('pushState');
        wrapHistory('replaceState');
        window.addEventListener('hashchange', () => emit({ type: 'hashchange', url: location.href, title: document.title }));
        window.addEventListener('popstate', () => emit({ type: 'popstate', url: location.href, title: document.title }));
        emit({ type: 'observer-installed', url: location.href, title: document.title });
    })();`;
}

function readObservationHistory(eventsFile) {
    if (!existsSync(eventsFile)) {
        return [];
    }

    return parseJsonLines(readFileSync(eventsFile, 'utf-8'));
}

async function openBrowserWithSession(authState, session, sessionFile) {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({ storageState: authState });
    const page = await context.newPage();
    const authFile = getAuthFile(session.startUrl);
    const screenshotPath = join(PATHS.logs, `${session.sessionId}.png`);
    const autoSaveTimer = setInterval(() => {
        void persistAuthState(context, session.startUrl);
    }, 15000);

    const persistNow = async () => {
        try {
            await persistAuthState(context, session.startUrl);
        } catch {
            // Ignore storage export failures during manual browsing.
        }
    };

    page.on('framenavigated', () => {
        void persistNow();
    });

    const closeBrowser = async (signal) => {
        clearInterval(autoSaveTimer);

        await persistNow();

        try {
            await page.close();
        } catch {
            // Ignore close failures.
        }

        try {
            await context.close();
        } catch {
            // Ignore close failures.
        }

        try {
            await browser.close();
        } catch {
            // Ignore close failures.
        }

        console.log(`\nBrowser session closed (${signal}). Session file kept at: ${sessionFile}`);
        process.exit(0);
    };

    process.once('SIGINT', () => {
        void closeBrowser('SIGINT');
    });
    process.once('SIGTERM', () => {
        void closeBrowser('SIGTERM');
    });

    console.log(`Opening: ${session.startUrl}`);
    await page.goto(session.startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

    try {
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Landing screenshot: ${screenshotPath}`);
    } catch {
        console.log('Landing screenshot skipped.');
    }

    console.log('');
    console.log(buildManualStartInstructions(session));
    console.log('');
    console.log(`Live auth will be synced to: ${authFile}`);
    console.log('Browser is kept open for the manual round. Press Ctrl+C when you want to close it.');

    await new Promise(() => {});
}

async function handleStart(options) {
    const startUrl = options.url || DEFAULT_START_URL;
    const authState = loadAuthState(startUrl);
    const paths = getFollowPaths();
    const session = buildManualSession({
        planId: options.planId || '',
        startUrl,
        limit: Number(options.limit || 5),
        actor: extractActor(authState)
    });
    const sessionFile = saveSession(paths, session);

    console.log(`Session created: ${session.sessionId}`);
    console.log(`Session file: ${sessionFile}`);
    console.log(`History file: ${paths.historyFile}`);

    if (options.noBrowser === 'true') {
        console.log('');
        console.log(buildManualStartInstructions(session));
        return;
    }

    if (options.headless === 'true') {
        const browser = await chromium.launch({ headless: true });
        const context = await browser.newContext({ storageState: authState });
        const page = await context.newPage();
        await page.goto(session.startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        console.log(`Headless check ok: ${page.url()}`);
        await context.close();
        await browser.close();
        console.log(buildManualStartInstructions(session));
        return;
    }

    await openBrowserWithSession(authState, session, sessionFile);
}

async function launchObserverChrome(options, startUrl, profileDir) {
    const chromePath = resolveChromeExecutable(options.chromePath || '');
    const debugPort = Number(options.port || DEFAULT_OBSERVER_PORT);
    const args = [
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profileDir}`,
        '--new-window',
        '--no-first-run',
        '--no-default-browser-check',
        startUrl
    ];

    if (options.headless === 'true') {
        args.unshift('--headless=new');
    }

    const child = spawn(chromePath, args, {
        stdio: 'ignore'
    });

    await waitForDebugger(debugPort);
    return { child, debugPort };
}

async function installObserverIntoPage(page) {
    try {
        await page.evaluate(buildObserverScript());
    } catch {
        // Ignore transient pages that are navigating away.
    }
}

async function seedAuthStateIntoContext(context, authState) {
    if (!authState) {
        return;
    }

    const cookies = Array.isArray(authState.cookies)
        ? authState.cookies.filter(cookie => String(cookie?.domain || '').includes('kuaishou.com'))
        : [];

    if (cookies.length > 0) {
        await context.addCookies(cookies);
    }

    const origins = Array.isArray(authState.origins) ? authState.origins : [];
    if (origins.length === 0) {
        return;
    }

    const page = context.pages()[0] || await context.newPage();
    for (const originState of origins) {
        if (!originState?.origin || !Array.isArray(originState.localStorage) || originState.localStorage.length === 0) {
            continue;
        }

        try {
            await page.goto(originState.origin, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.evaluate((items: Array<{ name: string; value: string }>) => {
                items.forEach(item => {
                    window.localStorage.setItem(item.name, item.value);
                });
            }, originState.localStorage);
        } catch {
            // Ignore origins that cannot be restored during bootstrap.
        }
    }
}

function shouldRecordNetworkTraffic(request) {
    const resourceType = request.resourceType();
    return resourceType === 'xhr' || resourceType === 'fetch';
}

function parseJsonSafely(value) {
    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

async function snapshotFollowState(page) {
    try {
        return await page.evaluate(() => {
            const texts = ['关注', '已关注', '互相关注', '回关'];
            const candidates = Array.from(document.querySelectorAll('div,button,span,a'))
                .map(element => ({
                    text: String(element.innerText || element.textContent || '').replace(/\s+/g, ' ').trim(),
                    className: String(element.className || '').trim(),
                    tagName: element.tagName
                }))
                .filter(candidate => texts.includes(candidate.text))
                .slice(0, 6);

            return {
                loginVisible: document.body?.innerText.includes('登录/注册') ? 'true' : 'false',
                buttons: JSON.stringify(candidates)
            };
        });
    } catch {
        return {
            loginVisible: 'unknown',
            buttons: '[]'
        };
    }
}

async function handleObserve(options) {
    ensureDirectories();

    const observationPaths = buildObservationPaths(REPO_ROOT);
    ensureObservationRuntime(observationPaths);
    const durationMs = Number(options.duration || 0);

    const startUrl = options.url || 'https://open.kuaishou.com/console';
    const authState = loadAuthState(startUrl, { required: false });
    const authFile = getAuthFile(startUrl);
    const session = createObservationSession({
        startUrl,
        debugPort: Number(options.port || DEFAULT_OBSERVER_PORT)
    });
    const sessionFile = saveObservationSession(observationPaths, session);
    const profileDir = options.headless === 'true' || durationMs > 0
        ? join(observationPaths.browserProfileDir, session.observerSessionId)
        : join(observationPaths.browserProfileDir, 'live-profile');
    ensureObservationRuntime({
        ...observationPaths,
        browserProfileDir: profileDir
    });

    const { child, debugPort } = await launchObserverChrome(options, 'about:blank', profileDir);
    const browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
    const context = browser.contexts()[0] || await browser.newContext();
    await seedAuthStateIntoContext(context, authState);
    const attachedPages = new WeakSet();

    const recordEvent = async (page, payload) => {
        let screenshotPath = '';
        if (
            payload.type === 'click' ||
            payload.type === 'pointerdown' ||
            payload.type === 'navigation' ||
            payload.type === 'history-pushState' ||
            payload.type === 'history-replaceState' ||
            payload.type === 'download'
        ) {
            const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17);
            screenshotPath = join(observationPaths.screenshotsDir, `${stamp}-${payload.type}.png`);
            try {
                await page.screenshot({ path: screenshotPath, fullPage: true });
            } catch {
                screenshotPath = '';
            }
        }

        const event = createObservationEvent({
            sessionId: session.observerSessionId,
            type: payload.type,
            url: payload.url,
            title: payload.title,
            targetText: payload.targetText,
            targetSelector: payload.targetSelector,
            value: payload.value,
            screenshotPath,
            metadata: payload.metadata
        });
        appendObservationEvent(observationPaths.eventsFile, event);

        const targetText = String(payload.targetText || '').trim();
        const selector = String(payload.targetSelector || '').trim();
        const looksLikeFollowAction = payload.type === 'click' && (
            targetText === '关注' ||
            targetText === '已关注' ||
            targetText === '互相关注' ||
            selector.includes('follow-button')
        );

        if (looksLikeFollowAction) {
            await page.waitForTimeout(1200).catch(() => {});
            const followState = await snapshotFollowState(page);
            appendObservationEvent(observationPaths.eventsFile, createObservationEvent({
                sessionId: session.observerSessionId,
                type: 'follow-state',
                url: page.url(),
                title: await page.title().catch(() => ''),
                targetText,
                targetSelector: selector,
                value: followState.buttons,
                metadata: {
                    loginVisible: followState.loginVisible
                }
            }));
        }
    };

    await context.exposeBinding(OBSERVER_BINDING, async ({ page }, payload) => {
        if (!page || !payload || typeof payload !== 'object') {
            return;
        }

        await recordEvent(page, payload);
    });
    await context.addInitScript(buildObserverScript());

    const attachPage = async (page) => {
        if (attachedPages.has(page)) {
            return;
        }
        attachedPages.add(page);

        page.on('framenavigated', frame => {
            if (frame !== page.mainFrame()) {
                return;
            }

            void (async () => {
                const title = await page.title().catch(() => '');
                await recordEvent(page, {
                    type: 'navigation',
                    url: frame.url(),
                    title
                });
            })();
            void installObserverIntoPage(page);
            void persistAuthState(context, startUrl);
        });

        page.on('load', () => {
            void installObserverIntoPage(page);
            void persistAuthState(context, startUrl);
        });

        page.on('download', download => {
            void (async () => {
                const suggestedFilename = download.suggestedFilename();
                await recordEvent(page, {
                    type: 'download',
                    url: page.url(),
                    title: await page.title().catch(() => ''),
                    targetText: suggestedFilename,
                    value: suggestedFilename
                });
            })();
        });

        page.on('request', request => {
            if (!shouldRecordNetworkTraffic(request)) {
                return;
            }

            const postData = request.postData() || '';
            const parsed = parseJsonSafely(postData);
            void recordEvent(page, {
                type: 'network-request',
                url: request.url(),
                title: page.url(),
                targetText: `${request.method()} ${request.resourceType()}`,
                targetSelector: '',
                value: postData,
                metadata: {
                    pageUrl: page.url(),
                    operationName: parsed?.operationName || ''
                }
            });
        });

        page.on('response', response => {
            const request = response.request();
            if (shouldRecordNetworkTraffic(request)) {
                void (async () => {
                    const postData = request.postData() || '';
                    const parsed = parseJsonSafely(postData);
                    const operationName = parsed?.operationName || '';
                    let responseSnippet = '';

                    if (response.url().includes('/graphql')) {
                        try {
                            responseSnippet = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 400);
                        } catch {
                            responseSnippet = '';
                        }
                    }

                    await recordEvent(page, {
                        type: 'network-response',
                        url: response.url(),
                        title: page.url(),
                        targetText: `${request.method()} ${request.resourceType()}`,
                        targetSelector: '',
                        value: String(response.status()),
                        metadata: {
                            pageUrl: page.url(),
                            operationName,
                            responseSnippet
                        }
                    });
                })();
            }

            const headers = response.headers();
            const disposition = headers['content-disposition'] || headers['Content-Disposition'] || '';
            const contentType = headers['content-type'] || headers['Content-Type'] || '';
            const isDownload = /attachment/i.test(disposition) || /(csv|excel|spreadsheet|octet-stream)/i.test(contentType);
            if (!isDownload) {
                return;
            }

            void recordEvent(page, {
                type: 'download-response',
                url: response.url(),
                title: page.url(),
                targetText: disposition || contentType,
                value: contentType
            });
        });

        await installObserverIntoPage(page);
    };

    context.on('page', page => {
        void attachPage(page);
    });

    await Promise.all(context.pages().map(page => attachPage(page)));
    const startPage = context.pages()[0] || await context.newPage();
    if (startPage.url() !== startUrl) {
        await startPage.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
    }

    console.log(formatObservationReport({
        session,
        eventsFile: observationPaths.eventsFile,
        browserProfileDir: profileDir,
        screenshotDir: observationPaths.screenshotsDir
    }));
    console.log(`Session file: ${sessionFile}`);
    console.log(`Chrome PID: ${child.pid}`);
    console.log(`Live auth sync: ${authFile}`);

    if (durationMs > 0) {
        await new Promise(resolve => setTimeout(resolve, durationMs));
    } else {
        await new Promise(() => {});
    }

    await persistAuthState(context, startUrl);
    const completed = {
        ...session,
        status: 'done',
        endedAt: new Date().toISOString()
    };
    saveObservationSession(observationPaths, completed);

    if (durationMs > 0 || options.headless === 'true') {
        try {
            process.kill(child.pid);
        } catch {
            // Chrome may already have exited during short self-test runs.
        }
    }
}

async function handleInspect(options) {
    const targetUrl = options.url || DEFAULT_START_URL;
    const authState = loadAuthState(targetUrl, { required: false });
    const waitMs = Number(options.wait || 5000);
    const browser = await chromium.launch({ headless: true });

    try {
        const context = authState
            ? await browser.newContext({ storageState: authState })
            : await browser.newContext();
        const page = await context.newPage();
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (waitMs > 0) {
            await page.waitForTimeout(waitMs);
        }

        const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
        const screenshotPath = join(PATHS.logs, `inspect-${timestamp}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });

        const pageInfo = await page.evaluate(() => ({
            url: location.href,
            title: document.title,
            text: document.body.innerText.slice(0, 2500)
        }));

        console.log(formatPageInspectionReport({
            requestedUrl: targetUrl,
            url: pageInfo.url,
            title: pageInfo.title,
            screenshotPath,
            text: pageInfo.text
        }));

        await context.close();
    } finally {
        await browser.close();
    }
}

async function handleFetchData(options) {
    ensureDirectories();

    const paths = getFollowPaths();
    const strategy = String(options.strategy || 'auto').trim() || 'auto';
    const appId = String(options.appId || process.env.KUAISHOU_APP_ID || '').trim();
    const appSecret = String(process.env.KUAISHOU_APP_SECRET || '').trim();
    if (!appId) {
        throw new Error('fetch-data requires --app-id or KUAISHOU_APP_ID');
    }

    const range = buildPastDayRange({
        days: Number(options.days || 1)
    });
    const officialEndpoint = options.officialEndpoint || undefined;
    const browserAuthFile = getAuthFile('https://open.kuaishou.com/console');
    const failures = [];
    let result = null;

    if (strategy === 'official' || strategy === 'auto') {
        if (!appSecret) {
            failures.push({
                strategy: 'official',
                error: 'KUAISHOU_APP_SECRET is not set'
            });
        } else {
            try {
                result = await fetchOfficialPastDayData({
                    appId,
                    appSecret,
                    range,
                    endpoint: officialEndpoint
                });
            } catch (error) {
                failures.push({
                    strategy: 'official',
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        }
    }

    if (!result && (strategy === 'browser' || strategy === 'auto')) {
        try {
            result = await fetchInternalPastDayData({
                appId,
                authFile: browserAuthFile,
                range
            });
            if ((result.records || []).length === 0) {
                throw new Error('Direct cookie request returned 0 records, retrying inside browser context');
            }
        } catch (error) {
            failures.push({
                strategy: 'browser',
                error: error instanceof Error ? error.message : String(error)
            });

            try {
                result = await fetchInternalPastDayDataViaBrowser({
                    appId,
                    range,
                    debugPort: Number(options.port || DEFAULT_OBSERVER_PORT)
                });
            } catch (browserError) {
                failures.push({
                    strategy: 'browser-page',
                    error: browserError instanceof Error ? browserError.message : String(browserError)
                });
            }
        }
    }

    if (!result) {
        throw new Error(`fetch-data failed: ${JSON.stringify(failures)}`);
    }

    const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    const exportPayload = {
        appId,
        requestedStrategy: strategy,
        strategyUsed: result.strategy,
        range,
        totalRecords: Array.isArray(result.records) ? result.records.length : 0,
        sample: Array.isArray(result.records) ? result.records.slice(0, 5) : [],
        failures,
        result
    };
    const exportFile = writeExportFile(paths.exportsDir, `mount-data-${timestamp}.json`, exportPayload);

    if (options.json === 'true') {
        console.log(JSON.stringify({
            ...exportPayload,
            exportFile
        }, null, 2));
        return;
    }

    const sample = exportPayload.sample[0];
    const lines = [
        'Kuaishou Mount Data',
        `Requested strategy: ${strategy}`,
        `Used strategy: ${result.strategy}`,
        `App ID: ${appId}`,
        `Range: ${range.startDate} -> ${range.lastDate}`,
        `Records: ${exportPayload.totalRecords}`,
        `Export: ${exportFile}`
    ];

    if (sample) {
        lines.push(
            '',
            'First record:',
            `- authorName: ${sample.authorName || '-'}`,
            `- openId: ${sample.openId || '-'}`,
            `- videoId: ${sample.videoId || '-'}`,
            `- videoUrl: ${sample.videoUrl || '-'}`
        );
    }

    if (failures.length > 0) {
        lines.push('', 'Failures:', ...failures.map(item => `- ${item.strategy}: ${item.error}`));
    }

    console.log(lines.join('\n'));
}

async function fetchInternalPastDayDataViaBrowser({
    appId,
    range,
    debugPort
}) {
    const targetUrl = `https://open.kuaishou.com/project/data-operation-data?appId=${appId}`;
    let browser = null;
    let context = null;
    let page = null;
    let ownsBrowser = false;

    try {
        try {
            browser = await chromium.connectOverCDP(`http://127.0.0.1:${debugPort}`);
            context = browser.contexts()[0] || null;
        } catch {
            browser = await chromium.launch({ headless: true });
            const authState = loadAuthState(targetUrl, { required: false });
            context = authState
                ? await browser.newContext({ storageState: authState })
                : await browser.newContext();
            ownsBrowser = true;
        }

        if (!context) {
            throw new Error('No browser context available for browser-page fallback');
        }

        const existingPages = context.pages();
        page = existingPages.find(item => item.url().includes('data-operation-data') && item.url().includes(appId))
            || await context.newPage();

        await page.goto(targetUrl, { waitUntil: 'networkidle', timeout: 120000 });
        await page.waitForTimeout(3000);

        const payload = await page.evaluate(async ({ startMs, endMs }) => {
            const detailUrl = `/rest/bi/plcDetailDataV2?page=1&start=${startMs}&end=${endMs}`;
            const coreUrl = `/rest/bi/plcCoreDataV2?start=${startMs}&end=${endMs}`;
            const [detailResponse, coreResponse] = await Promise.all([
                fetch(detailUrl, { credentials: 'include' }),
                fetch(coreUrl, { credentials: 'include' })
            ]);
            return {
                detailUrl,
                coreUrl,
                detail: await detailResponse.json(),
                core: await coreResponse.json()
            };
        }, range);

        const normalized = normalizeInternalDetailPayload(payload.detail);
        return {
            strategy: 'browser-page',
            detailUrl: payload.detailUrl,
            coreUrl: payload.coreUrl,
            records: normalized.records,
            coreData: payload.core?.data || null,
            raw: {
                detail: payload.detail,
                core: payload.core
            }
        };
    } finally {
        if (ownsBrowser) {
            if (page) {
                await page.close().catch(() => {});
            }
            if (context) {
                await context.close().catch(() => {});
            }
            if (browser) {
                await browser.close().catch(() => {});
            }
        } else if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

function handleRecord(options) {
    const paths = getFollowPaths();
    const latestSession = readLatestSession(paths.latestSessionFile);
    const history = readFollowHistory(paths.historyFile);
    const sessionId = options.sessionId || latestSession?.sessionId || '';
    const planId = options.planId || latestSession?.planId || '';
    const record = createFollowRecord({
        sessionId,
        planId,
        creatorId: options.creatorId || '',
        handle: options.handle || '',
        displayName: options.displayName || '',
        status: options.status || 'followed',
        reason: options.reason || '',
        sourceUrl: options.sourceUrl || ''
    });

    if (hasProcessedCreator(history, record)) {
        console.log(`Already processed: ${record.displayName || record.handle || record.creatorId}`);
        return;
    }

    appendFollowRecord(paths.historyFile, record);
    console.log(`Recorded: ${record.status} ${record.displayName || record.handle || record.creatorId}`);
}

function handleStatus(options) {
    const paths = getFollowPaths();
    const session = readLatestSession(paths.latestSessionFile);
    const history = readFollowHistory(paths.historyFile);
    const queue = loadPendingQueue(paths.queueFile);
    const planId = options.planId || session?.planId || '';
    const scopedRecords = filterRecordsByPlanId(history, planId);
    const summary = summarizeFollowRecords(scopedRecords);
    const dateKey = formatDateInTimeZone(new Date());
    const dayState = loadDailyRunState(paths.dailyRunsDir, dateKey);
    const quotaUsed = computeDailyQuotaUsage(history, dateKey);

    const lines = [formatStatusReport({
        session,
        summary,
        records: scopedRecords
    })];
    lines.push(
        '',
        'Automation queue:',
        `Pending queue: ${queue.length}`,
        `Today quota used: ${quotaUsed}`,
        `Today hourly runs: ${Array.isArray(dayState.hourlyRuns) ? dayState.hourlyRuns.length : 0}`,
        `Today report sent: ${dayState.report?.sentAt || 'no'}`
    );
    console.log(lines.join('\n'));
}

function handleFinish(options) {
    const paths = getFollowPaths();
    const session = readLatestSession(paths.latestSessionFile);

    if (!session) {
        throw new Error('No active session found');
    }

    const finished = completeSession(session, {
        note: options.note || '',
        status: 'done'
    });
    const sessionFile = saveSession(paths, finished);

    console.log(`Session finished: ${finished.sessionId}`);
    console.log(`Session file: ${sessionFile}`);
}

async function handleDailyIngest(options) {
    const summary = await runDailyIngestion({
        repoRoot: REPO_ROOT,
        configFile: options.configFile || '',
        env: {
            ...process.env,
            ...(options.reportEmail ? { KUAISHOU_FOLLOW_REPORT_TO: options.reportEmail } : {})
        },
        days: Number(options.days || 1)
    });

    console.log([
        'Kuaishou Daily Ingestion',
        `Apps: ${summary.appCount}`,
        `Fetched: ${summary.totalFetched}`,
        `Eligible: ${summary.eligibleCandidates}`,
        `Queue added: ${summary.queueAdded}`,
        `Queue replaced: ${summary.queueReplaced}`,
        `Skipped missing URL: ${summary.skippedMissingVideoUrl}`
    ].join('\n'));
}

async function handleRunHourly(options) {
    const summary = await runHourlyFollowWorker({
        repoRoot: REPO_ROOT,
        env: {
            ...process.env,
            ...(options.reportEmail ? { KUAISHOU_FOLLOW_REPORT_TO: options.reportEmail } : {})
        },
        batchSize: Number(options.batchSize || 10),
        minFollowIntervalMs: Number(options.minIntervalMs || 60000),
        headless: true
    });

    console.log([
        'Kuaishou Hourly Follow Worker',
        `Attempted: ${summary.attempted}`,
        `Followed: ${summary.followed}`,
        `Already followed: ${summary.alreadyFollowed}`,
        `Failed: ${summary.failed}`,
        `Stop reason: ${summary.stopReason}`
    ].join('\n'));
}

async function handleSendReport(options) {
    const report = await sendDailyFollowReport({
        repoRoot: REPO_ROOT,
        env: {
            ...process.env,
            ...(options.reportEmail ? { KUAISHOU_FOLLOW_REPORT_TO: options.reportEmail } : {})
        },
        dateKey: options.date || '',
        toEmail: options.reportEmail || '',
        force: true
    });

    console.log([
        'Kuaishou Follow Report Sent',
        `To: ${report.toEmail}`,
        `Subject: ${report.subject}`,
        `Sent at: ${report.sentAt}`
    ].join('\n'));
}

async function main() {
    const options = parseArgs(process.argv.slice(2));

    if (options.help === 'true') {
        showHelp();
        return;
    }

    switch (options.command) {
        case 'start':
            await handleStart(options);
            return;
        case 'record':
            handleRecord(options);
            return;
        case 'observe':
            await handleObserve(options);
            return;
        case 'inspect':
            await handleInspect(options);
            return;
        case 'fetch-data':
            await handleFetchData(options);
            return;
        case 'daily-ingest':
            await handleDailyIngest(options);
            return;
        case 'run-hourly':
            await handleRunHourly(options);
            return;
        case 'send-report':
            await handleSendReport(options);
            return;
        case 'status':
            handleStatus(options);
            return;
        case 'finish':
            handleFinish(options);
            return;
        default:
            throw new Error(`Unknown command: ${options.command}`);
    }
}

main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
