#!/usr/bin/env node
/**
 * Daily Kuaishou Report Generator (API mode)
 *
 * Uses pure HTTP API calls to fetch distribution task data from Kuaishou.
 * No browser needed — just cookies from a prior login session.
 *
 * Usage:
 *   node .harness/scripts/daily-kuaishou-report.js
 *
 * Environment Variables:
 *   KUAISHOU_EMAIL_TO=jackandking@163.com
 *   AGENTMAIL_API_KEY=xxx
 *
 * To refresh auth session (when cookies expire):
 *   node .harness/scripts/ks-api-poc.js --sniff
 */

import fs from 'fs';
import path from 'path';
import {
    ensureDirectory,
    ensureParentDirectory,
    resolveKuaishouAuthFile,
    resolveProjectRoot,
    resolveRuntimeDir
} from './lib/runtime-paths.js';
import { buildUsageReport, formatEmailBody as formatAdoptionEmail } from './lib/usage-report-builder.js';
import { requestOfficialAccessToken } from './kuaishou-follow-api.js';
import { loadFollowAppConfigs } from './kuaishou-follow-config.js';

const PROJECT_ROOT = resolveProjectRoot(import.meta.url);
const RUNTIME_DIR = resolveRuntimeDir(import.meta.url);

// Configuration
const CONFIG = {
    authFile: resolveKuaishouAuthFile(import.meta.url),
    outputDir: path.join(RUNTIME_DIR, 'exports', 'metrics', 'kuaishou', 'daily'),
    emailTo: process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com',
    apiKey: process.env.AGENTMAIL_API_KEY || 'am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4',
    baseUrl: 'https://daren.kuaishou.com',
    delayMin: 500,   // ms between API calls (random range)
    delayMax: 1500,
    maxRetries: 3,
    pageSize: 50      // tasks per page
};

ensureDirectory(CONFIG.outputDir);

// Logger
function log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
}

function randomDelay() {
    const ms = CONFIG.delayMin + Math.random() * (CONFIG.delayMax - CONFIG.delayMin);
    return new Promise(r => setTimeout(r, ms));
}

// ─── Cookie extraction from Playwright storageState ───

function extractCookieHeader() {
    if (!fs.existsSync(CONFIG.authFile)) {
        log('ERROR', `Auth file not found: ${CONFIG.authFile}`);
        log('ERROR', 'Run sniff mode to login: node .harness/scripts/ks-api-poc.js --sniff');
        process.exit(1);
    }
    const state = JSON.parse(fs.readFileSync(CONFIG.authFile, 'utf-8'));
    const cookies = (state.cookies || [])
        .filter(c => c.domain?.includes('kuaishou.com'))
        .map(c => `${c.name}=${c.value}`)
        .join('; ');

    if (!cookies) {
        log('ERROR', 'No kuaishou cookies found in auth file. Re-login with --sniff mode.');
        process.exit(1);
    }
    return cookies;
}

// ─── HTTP API helper ───

async function apiRequest(endpoint, body, cookies) {
    const url = `${CONFIG.baseUrl}${endpoint}`;
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
        throw new Error('SESSION_EXPIRED');
    }
    if (data.result !== 1) {
        throw new Error(`API error: result=${data.result}, message=${data.message}`);
    }
    return data.data;
}

// ─── Data fetching ───

async function fetchAllTasks(cookies) {
    log('INFO', 'Fetching task list...');
    const allTasks = [];
    let pageNum = 1;

    while (true) {
        const result = await apiRequest('/rest/pc/creator/marketing/distribution/list', {
            pageNum,
            pageSize: CONFIG.pageSize,
            distributionStatus: 0,
            resourceTitle: '',
            distributionPlanTitle: '',
            distributionPlanId: ''
        }, cookies);

        const tasks = (result.dataList || []).filter(t => t.status !== '待结束');
        allTasks.push(...tasks);
        log('INFO', `  Page ${pageNum}: ${tasks.length} tasks (total: ${allTasks.length}/${result.total})`);

        if (allTasks.length >= result.total || tasks.length === 0) break;
        pageNum++;
        await randomDelay();
    }

    log('INFO', `Total tasks: ${allTasks.length}`);
    return allTasks;
}

async function fetchTaskStats(planId, cookies) {
    return await apiRequest('/rest/pc/creator/marketing/distribution/data', {
        distributionPlanId: planId
    }, cookies);
}

async function fetchAllStats(tasks, cookies) {
    log('INFO', 'Fetching stats for each task...');
    const results = [];

    for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        const planId = task.distributionPlanId;
        const name = task.distributionPlanTitle || task.miniAppName;
        log('INFO', `  [${i + 1}/${tasks.length}] ${name}`);

        let stats = null;
        let retries = 0;

        while (retries < CONFIG.maxRetries) {
            try {
                const raw = await fetchTaskStats(planId, cookies);
                stats = {
                    组件曝光数: raw.playCount || 0,
                    组件点击数: raw.clickCount || 0,
                    任务下发人数: raw.assignUsers || 0,
                    已履单达人数量: raw.attendUsers || 0,
                    已发布作品数: raw.photoCount || 0,
                    已结算金额: raw.settlementGmv || 0
                };
                break;
            } catch (e) {
                if (e.message === 'SESSION_EXPIRED') throw e; // don't retry auth failures
                retries++;
                log('WARN', `    Retry ${retries}/${CONFIG.maxRetries}: ${e.message}`);
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        results.push({
            planId,
            name,
            source: task.source || '',
            miniAppName: task.miniAppName || '',
            status: task.distributionStatus?.desc || '',
            stats: stats || { error: 'Failed after retries' }
        });

        if (i < tasks.length - 1) await randomDelay();
    }

    return results;
}

// ─── Topic Performance persistence ───

function inferProfileId(source, name, miniAppName) {
    // Priority 1: miniAppName is the most reliable brand indicator
    const miniAppLower = (miniAppName || '').toLowerCase();
    if (miniAppLower.includes('男人宝')) return 'nanrenbao';
    if (miniAppLower.includes('女人宝')) return 'womanai';
    if (miniAppLower.includes('老人') || miniAppLower.includes('爱老人')) return 'elder-love';
    if (miniAppLower.includes('家长') || miniAppLower.includes('博物馆')) return 'parent-tools';

    // Priority 2: direct source match
    const direct = ['nanrenbao', 'womanai', 'parent-tools', 'elder-love'];
    if (direct.includes(source)) return source;

    // Priority 3: fallback to name-based heuristic
    const nameLower = (name || '').toLowerCase();
    // womanai: beauty, fashion, celebrity, entertainment
    if (nameLower.includes('女人') || nameLower.includes('护肤') || nameLower.includes('穿搭') || nameLower.includes('美妆') || nameLower.includes('香氛')) return 'womanai';
    if (nameLower.includes('美人') || nameLower.includes('背影') || nameLower.includes('颜值') || nameLower.includes('女神')) return 'womanai';
    if (nameLower.includes('综艺') || nameLower.includes('女星') || nameLower.includes('女明星') || nameLower.includes('演员')) return 'womanai';
    if (nameLower.includes('情感') || nameLower.includes('闺蜜') || nameLower.includes('恋爱')) return 'womanai';
    // parent-tools: education, family, museum
    if (nameLower.includes('家长') || nameLower.includes('孩子') || nameLower.includes('亲子') || nameLower.includes('书包') || nameLower.includes('阅读')) return 'parent-tools';
    if (nameLower.includes('考古') || nameLower.includes('博物馆') || nameLower.includes('文物')) return 'parent-tools';
    // nanrenbao: men, military, tech, cars (keep last to avoid catching museum/history which now go to parent-tools)
    if (nameLower.includes('男人') || nameLower.includes('军事') || nameLower.includes('坦克') || nameLower.includes('战机') || nameLower.includes('火箭')) return 'nanrenbao';
    if (nameLower.includes('汽车') || nameLower.includes('游戏') || nameLower.includes('体育')) return 'nanrenbao';
    // elder-love
    if (nameLower.includes('老人') || nameLower.includes('养生') || nameLower.includes('广场舞') || nameLower.includes('社区')) return 'elder-love';
    return 'unknown';
}

// ─── Layer 4: Cross-check brand mismatch (content vs mini-app) ───

function inferExpectedBrandByName(name) {
    const nameLower = (name || '').toLowerCase();
    // parent-tools: education, books, family
    if (nameLower.includes('书单') || nameLower.includes('家长') || nameLower.includes('孩子') || nameLower.includes('亲子') || nameLower.includes('书包') || nameLower.includes('阅读')) return 'parent-tools';
    if (nameLower.includes('考古') || nameLower.includes('博物馆') || nameLower.includes('文物')) return 'parent-tools';
    // womanai: beauty, fashion, celebrity
    if (nameLower.includes('护肤') || nameLower.includes('穿搭') || nameLower.includes('美妆') || nameLower.includes('香氛')) return 'womanai';
    if (nameLower.includes('美人') || nameLower.includes('背影') || nameLower.includes('颜值') || nameLower.includes('女神')) return 'womanai';
    if (nameLower.includes('综艺') || nameLower.includes('女星') || nameLower.includes('女明星') || nameLower.includes('演员')) return 'womanai';
    if (nameLower.includes('情感') || nameLower.includes('闺蜜') || nameLower.includes('恋爱')) return 'womanai';
    // nanrenbao: men, military, tech, cars
    if (nameLower.includes('军事') || nameLower.includes('坦克') || nameLower.includes('战机') || nameLower.includes('火箭')) return 'nanrenbao';
    if (nameLower.includes('汽车') || nameLower.includes('游戏') || nameLower.includes('体育')) return 'nanrenbao';
    // elder-love
    if (nameLower.includes('养生') || nameLower.includes('广场舞') || nameLower.includes('社区')) return 'elder-love';
    return null; // no strong signal
}

function getActualBrandByMiniApp(miniAppName) {
    const lower = (miniAppName || '').toLowerCase();
    if (lower.includes('男人宝')) return 'nanrenbao';
    if (lower.includes('女人宝') || lower.includes('女人爱')) return 'womanai';
    if (lower.includes('老人') || lower.includes('爱老人')) return 'elder-love';
    if (lower.includes('家长') || lower.includes('博物馆')) return 'parent-tools';
    return null;
}

function crossCheckBrandMismatch(report) {
    const alerts = [];
    const brandNames = {
        'parent-tools': '家长爱',
        'nanrenbao': '男人宝',
        'womanai': '女人爱',
        'elder-love': '爱老人'
    };

    for (const task of report.allTasks || []) {
        const expected = inferExpectedBrandByName(task.name);
        const actual = getActualBrandByMiniApp(task.miniAppName);
        if (expected && actual && expected !== actual) {
            alerts.push({
                planId: task.planId,
                name: task.name,
                expectedBrand: brandNames[expected] || expected,
                actualBrand: brandNames[actual] || actual,
                miniAppName: task.miniAppName,
                severity: 'CRITICAL'
            });
        }
    }

    if (alerts.length > 0) {
        log('WARN', `⚠️ BRAND MISMATCH DETECTED: ${alerts.length} task(s) mounted on wrong mini-app!`);
        for (const a of alerts) {
            log('WARN', `  [${a.severity}] ${a.name} (Plan ${a.planId}): expected ${a.expectedBrand}, actual ${a.actualBrand}`);
        }
    }

    return alerts;
}

function appendTopicPerformance(report, dateStr, projectRoot) {
    const perfFile = path.join(projectRoot, '.automation', '.local', 'state', 'topic-performance.jsonl');
    ensureParentDirectory(perfFile);

    // Load all existing records keyed by planId (global dedup + update)
    const recordMap = new Map();
    if (fs.existsSync(perfFile)) {
        const lines = fs.readFileSync(perfFile, 'utf-8').split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                const r = JSON.parse(line);
                if (r.planId) {
                    recordMap.set(String(r.planId), r);
                }
            } catch {
                // ignore malformed lines
            }
        }
    }

    let added = 0;
    let updated = 0;
    for (const task of report.allTasks || []) {
        if (!task.stats || task.stats.error) continue;
        const planId = String(task.planId || '');
        if (!planId) continue;

        const exposure = task.stats.组件曝光数 || 0;
        const clicks = task.stats.组件点击数 || 0;
        const daren = task.stats.已履单达人数量 || 0;
        const works = task.stats.已发布作品数 || 0;
        const ctr = exposure > 0 ? (clicks / exposure) : 0;
        const score = Number((ctr * 1000 + daren * 0.1 + works * 0.05).toFixed(4));

        if (recordMap.has(planId)) {
            updated++;
        } else {
            added++;
        }

        recordMap.set(planId, {
            date: dateStr,
            planId: planId,
            name: task.name || '',
            source: task.source || '',
            miniAppName: task.miniAppName || '',
            status: task.status || '',
            profileId: inferProfileId(task.source, task.name, task.miniAppName),
            metrics: { exposure, clicks, daren, works },
            score
        });
    }

    if (added === 0 && updated === 0) return;

    const allRecords = [...recordMap.values()];
    const lines = allRecords.map(r => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(perfFile, lines, 'utf-8');
    log('INFO', `Topic-performance: +${added} new, ~${updated} updated, total=${allRecords.length} records`);
}

// ─── Mini-app event tracking data ───

const EVENT_SUMMARY_URL = 'https://letmetry.cloud/api/track/summary';

const KS_TOKEN_URL = 'https://letmetry.cloud/oauth/kuaishou/token';
const KS_OPEN_API = 'https://open.kuaishou.com';
const KS_APP_ID = 'ks683421244533878879';
const KS_FOLLOW_CONFIG_FILE = path.join(resolveRuntimeDir(import.meta.url), 'state', 'kuaishou-follow', 'app-config.local.json');

async function fetchAccountInfo() {
    try {
        const tokenResp = await fetch(KS_TOKEN_URL);
        if (!tokenResp.ok) return null;
        const { access_token } = await tokenResp.json();
        if (!access_token) return null;

        const resp = await fetch(`${KS_OPEN_API}/openapi/user_info?access_token=${access_token}&app_id=${KS_APP_ID}`);
        if (!resp.ok) return null;
        const data = await resp.json();
        if (data.result !== 1 || !data.user_info) return null;
        return data.user_info;
    } catch (e) {
        log('WARN', `Account info fetch failed: ${e.message}`);
        return null;
    }
}

function saveAccountHistory(dateStr, accountInfo, outputDir) {
    if (!accountInfo) return;
    const historyFile = path.join(outputDir, 'account_history.jsonl');
    const record = { date: dateStr, fan: accountInfo.fan, follow: accountInfo.follow, name: accountInfo.name };
    fs.appendFileSync(historyFile, JSON.stringify(record) + '\n');
}

function loadCronEnv() {
    const cronEnvPath = path.join(resolveRuntimeDir(import.meta.url), 'state', 'kuaishou-follow', 'cron.env');
    if (fs.existsSync(cronEnvPath)) {
        const content = fs.readFileSync(cronEnvPath, 'utf-8');
        content.split('\n').forEach(line => {
            const idx = line.indexOf('=');
            if (idx > 0) {
                const key = line.substring(0, idx).trim();
                const value = line.substring(idx + 1).trim();
                if (key && !process.env[key]) {
                    process.env[key] = value;
                }
            }
        });
    }
}

async function fetchAdRevenue(dateStr) {
    try {
        loadCronEnv();
        let configs;
        try {
            configs = loadFollowAppConfigs({ configFile: KS_FOLLOW_CONFIG_FILE });
        } catch (e) {
            log('WARN', `Failed to load follow app configs: ${e.message}`);
            return null;
        }

        const end = new Date(dateStr + 'T00:00:00Z');
        const start = new Date(end);
        start.setDate(start.getDate() - 7);

        let totalImpressions = 0, totalClicks = 0, totalRevenue = 0;
        const dailyMap = new Map();
        const byApp = [];

        for (const cfg of configs) {
            try {
                const tokenPayload = await requestOfficialAccessToken({
                    appId: cfg.appId,
                    appSecret: cfg.appSecret,
                });
                const token = tokenPayload.access_token;

                const resp = await fetch(
                    `${KS_OPEN_API}/openapi/mp/developer/ad/data/query?app_id=${cfg.appId}&access_token=${token}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            startTime: start.getTime(),
                            endTime: end.getTime() - 1,
                            type: 0,
                            page: 1,
                            pageSize: 100,
                        }),
                    }
                );
                const data = await resp.json();
                if (data.result !== 1) {
                    log('WARN', `Ad revenue API [${cfg.profileName}]: ${data.error_msg || data.result}`);
                    continue;
                }

                const items = data.data?.items || [];
                let appImpressions = 0, appClicks = 0, appRevenue = 0;
                for (const item of items) {
                    const imp = item.impression || 0;
                    const clk = item.click || 0;
                    const rev = item.costTotal || 0;
                    appImpressions += imp;
                    appClicks += clk;
                    appRevenue += rev;

                    const key = item.date;
                    if (!dailyMap.has(key)) {
                        dailyMap.set(key, { date: key, impressions: 0, clicks: 0, revenue: 0 });
                    }
                    const d = dailyMap.get(key);
                    d.impressions += imp;
                    d.clicks += clk;
                    d.revenue += rev;
                }

                totalImpressions += appImpressions;
                totalClicks += appClicks;
                totalRevenue += appRevenue;
                byApp.push({
                    appName: cfg.profileName,
                    appId: cfg.appId,
                    impressions: appImpressions,
                    clicks: appClicks,
                    revenue: +appRevenue.toFixed(2),
                });
                log('INFO', `Ad revenue [${cfg.profileName}]: ${appRevenue.toFixed(2)}元`);
            } catch (e) {
                log('WARN', `Ad revenue fetch failed [${cfg.profileName}]: ${e.message}`);
            }
        }

        if (byApp.length === 0) {
            return null;
        }

        const daily = Array.from(dailyMap.values())
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(d => ({ ...d, revenue: +d.revenue.toFixed(2) }));

        return {
            days: daily.length,
            totalImpressions,
            totalClicks,
            totalRevenue: +totalRevenue.toFixed(2),
            avgEcpm: totalImpressions > 0 ? +(totalRevenue / totalImpressions * 1000).toFixed(2) : 0,
            daily,
            byApp,
        };
    } catch (e) {
        log('WARN', `Ad revenue fetch failed: ${e.message}`);
        return null;
    }
}

function formatAccountSection(accountInfo, outputDir) {
    if (!accountInfo) return '';

    let trend = '';
    const historyFile = path.join(outputDir, 'account_history.jsonl');
    if (fs.existsSync(historyFile)) {
        const lines = fs.readFileSync(historyFile, 'utf-8').trim().split('\n').filter(Boolean);
        if (lines.length >= 2) {
            try {
                const prev = JSON.parse(lines[lines.length - 2]);
                const diff = accountInfo.fan - prev.fan;
                trend = diff > 0 ? ` (+${diff})` : diff < 0 ? ` (${diff})` : ' (±0)';
            } catch {}
        }
    }

    return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 账号概况 (${accountInfo.name})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 粉丝数: ${accountInfo.fan.toLocaleString()}${trend}
• 关注数: ${accountInfo.follow.toLocaleString()}
• 城市: ${accountInfo.city || 'N/A'}`;
}

async function fetchEventSummary(dateStr) {
    try {
        const resp = await fetch(`${EVENT_SUMMARY_URL}?date=${dateStr}`);
        if (!resp.ok) return null;
        return await resp.json();
    } catch (e) {
        log('WARN', `Event summary fetch failed: ${e.message}`);
        return null;
    }
}

function formatEventSection(summary) {
    if (!summary || summary.events === 0) {
        return '(今日无小程序用户事件数据)';
    }

    const be = summary.byEvent || {};
    const apps = summary.apps || {};
    const realApps = Object.entries(apps).filter(([id]) => !['test', 'diag-from-home', 'test-plain-fixed', 'prod-test', 'connectivity-test'].includes(id));

    const totalPageLoads = be.page_load || 0;
    const totalVotes = be.vote_complete || 0;
    const totalAdTrigger = be.rewarded_ad_trigger || 0;
    const totalAdComplete = be.rewarded_ad_complete || 0;
    const totalAdSkip = be.rewarded_ad_skip || 0;
    const adCompletionRate = totalAdTrigger > 0 ? ((totalAdComplete / totalAdTrigger) * 100).toFixed(0) : 'N/A';

    const lines = [
        `📱 小程序用户行为 (${summary.date})`,
        '',
        `• 页面访问: ${totalPageLoads}`,
        `• 投票完成: ${totalVotes}`,
        `• 广告触发: ${totalAdTrigger}`,
        `• 广告看完: ${totalAdComplete} | 跳过: ${totalAdSkip}`,
        `• 广告完成率: ${adCompletionRate}%`,
        `• 活跃小程序: ${realApps.length} 个`,
    ];

    if (realApps.length > 0) {
        lines.push('');
        lines.push('各应用明细:');
        for (const [appId, events] of realApps.sort((a, b) => (b[1].page_load || 0) - (a[1].page_load || 0))) {
            const pl = events.page_load || 0;
            const vc = events.vote_complete || 0;
            const ac = events.rewarded_ad_complete || 0;
            const at = events.rewarded_ad_trigger || 0;
            lines.push(`  ${appId}: 访问${pl} 投票${vc} 广告${ac}/${at}`);
        }
    }

    return lines.join('\n');
}

// ─── Report generation ───

function generateReport(tasks) {
    const withData = tasks.filter(t => t.stats && !t.stats.error);
    const totalExposure = withData.reduce((s, t) => s + (t.stats.组件曝光数 || 0), 0);
    const totalClicks = withData.reduce((s, t) => s + (t.stats.组件点击数 || 0), 0);
    const totalDaren = withData.reduce((s, t) => s + (t.stats.已履单达人数量 || 0), 0);
    const totalWorks = withData.reduce((s, t) => s + (t.stats.已发布作品数 || 0), 0);

    const topByExposure = [...withData]
        .sort((a, b) => (b.stats.组件曝光数 || 0) - (a.stats.组件曝光数 || 0))
        .slice(0, 10);

    const topByDaren = [...withData]
        .sort((a, b) => (b.stats.已履单达人数量 || 0) - (a.stats.已履单达人数量 || 0))
        .slice(0, 10);

    // ─── CTR Analysis ───
    const ctrByApp = {};
    for (const t of withData) {
        const app = t.miniAppName || 'unknown';
        if (!ctrByApp[app]) ctrByApp[app] = { exposure: 0, clicks: 0, count: 0 };
        ctrByApp[app].exposure += t.stats.组件曝光数 || 0;
        ctrByApp[app].clicks += t.stats.组件点击数 || 0;
        ctrByApp[app].count++;
    }
    const ctrByAppList = Object.entries(ctrByApp)
        .map(([app, d]) => ({
            app,
            exposure: d.exposure,
            clicks: d.clicks,
            count: d.count,
            ctr: d.exposure > 0 ? ((d.clicks / d.exposure) * 100).toFixed(3) : '0.000'
        }))
        .sort((a, b) => b.exposure - a.exposure);

    const highExposureLowCtr = [...withData]
        .filter(t => (t.stats.组件曝光数 || 0) > 10000)
        .map(t => ({ ...t, ctrVal: (t.stats.组件曝光数 || 0) > 0 ? (t.stats.组件点击数 || 0) / (t.stats.组件曝光数 || 0) : 0 }))
        .filter(t => t.ctrVal < 0.002)
        .sort((a, b) => b.stats.组件曝光数 - a.stats.组件曝光数)
        .slice(0, 10);

    const ctrBuckets = {
        zero: withData.filter(t => (t.stats.组件曝光数 || 0) > 0 && (t.stats.组件点击数 || 0) === 0).length,
        low: withData.filter(t => { const c = (t.stats.组件点击数 || 0) / (t.stats.组件曝光数 || 1); return c > 0 && c < 0.001; }).length,
        mid: withData.filter(t => { const c = (t.stats.组件点击数 || 0) / (t.stats.组件曝光数 || 1); return c >= 0.001 && c < 0.005; }).length,
        good: withData.filter(t => { const c = (t.stats.组件点击数 || 0) / (t.stats.组件曝光数 || 1); return c >= 0.005 && c < 0.01; }).length,
        high: withData.filter(t => { const c = (t.stats.组件点击数 || 0) / (t.stats.组件曝光数 || 1); return c >= 0.01; }).length
    };

    const topByCtr = [...withData]
        .filter(t => (t.stats.组件曝光数 || 0) > 500)
        .map(t => ({ ...t, ctrVal: (t.stats.组件点击数 || 0) / (t.stats.组件曝光数 || 0) }))
        .sort((a, b) => b.ctrVal - a.ctrVal)
        .slice(0, 10);

    return {
        summary: {
            totalTasks: tasks.length,
            withData: withData.length,
            totalExposure,
            totalClicks,
            totalDaren,
            totalWorks,
            clickRate: totalExposure > 0 ? ((totalClicks / totalExposure) * 100).toFixed(2) + '%' : 'N/A'
        },
        topByExposure,
        topByDaren,
        ctrByApp: ctrByAppList,
        highExposureLowCtr,
        ctrBuckets,
        topByCtr,
        allTasks: tasks
    };
}

// ─── Delta comparison (daily + 7-day trend) ───

function dateOffset(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d + days);
    const yy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
}

function loadHistoricalReport(dateStr) {
    const filePath = path.join(CONFIG.outputDir, `kuaishou_report_${dateStr}.json`);
    if (!fs.existsSync(filePath)) return null;
    try {
        return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch { return null; }
}

function buildTaskMap(report) {
    const map = new Map();
    if (!report?.allTasks) return map;
    for (const t of report.allTasks) {
        if (t.stats && !t.stats.error) {
            map.set(t.planId, t);
        }
    }
    return map;
}

function buildDeltaReport(todayReport, dateStr) {
    const yesterday = dateOffset(dateStr, -1);
    const prevReport = loadHistoricalReport(yesterday);

    if (!prevReport) {
        log('INFO', `No previous report found for ${yesterday}, skipping delta`);
        return null;
    }

    log('INFO', `Comparing with ${yesterday} report`);
    const prevMap = buildTaskMap(prevReport);
    const todayTasks = todayReport.allTasks.filter(t => t.stats && !t.stats.error);

    const deltas = todayTasks.map(t => {
        const prev = prevMap.get(t.planId);
        const prevDaren = prev?.stats?.已履单达人数量 || 0;
        const prevWorks = prev?.stats?.已发布作品数 || 0;
        const prevExposure = prev?.stats?.组件曝光数 || 0;
        return {
            planId: t.planId,
            name: t.name,
            source: t.source,
            daren: t.stats.已履单达人数量 || 0,
            works: t.stats.已发布作品数 || 0,
            exposure: t.stats.组件曝光数 || 0,
            deltaDaren: (t.stats.已履单达人数量 || 0) - prevDaren,
            deltaWorks: (t.stats.已发布作品数 || 0) - prevWorks,
            deltaExposure: (t.stats.组件曝光数 || 0) - prevExposure,
            isNew: !prev
        };
    });

    // Top gainers by new daren (only tasks with positive delta)
    const topGainersByDaren = deltas
        .filter(d => d.deltaDaren > 0)
        .sort((a, b) => b.deltaDaren - a.deltaDaren)
        .slice(0, 15);

    const topGainersByWorks = deltas
        .filter(d => d.deltaWorks > 0)
        .sort((a, b) => b.deltaWorks - a.deltaWorks)
        .slice(0, 15);

    // Summary delta
    const prevSummary = prevReport.summary || {};
    const summaryDelta = {
        deltaDaren: (todayReport.summary.totalDaren || 0) - (prevSummary.totalDaren || 0),
        deltaWorks: (todayReport.summary.totalWorks || 0) - (prevSummary.totalWorks || 0),
        deltaExposure: (todayReport.summary.totalExposure || 0) - (prevSummary.totalExposure || 0),
        deltaClicks: (todayReport.summary.totalClicks || 0) - (prevSummary.totalClicks || 0)
    };

    return {
        comparedWith: yesterday,
        summaryDelta,
        topGainersByDaren,
        topGainersByWorks,
        allDeltas: deltas
    };
}

function build7DayTrend(planIds, dateStr) {
    // Load 7 days of history (today + 6 previous days)
    const dates = [];
    for (let i = -6; i <= 0; i++) {
        dates.push(dateOffset(dateStr, i));
    }

    const reports = dates.map(d => ({ date: d, report: loadHistoricalReport(d) }));
    const availableDates = reports.filter(r => r.report).map(r => r.date);

    if (availableDates.length < 2) {
        log('INFO', `Only ${availableDates.length} historical reports available, need 2+ for trend`);
        return null;
    }

    log('INFO', `Building 7-day trend from ${availableDates.length} reports (${availableDates[0]} ~ ${availableDates[availableDates.length - 1]})`);

    const trends = planIds.map(planId => {
        const dailyData = reports.map(({ date, report }) => {
            if (!report) return { date, daren: null, works: null, exposure: null };
            const task = report.allTasks?.find(t => t.planId === planId);
            if (!task?.stats || task.stats.error) return { date, daren: null, works: null, exposure: null };
            return {
                date,
                daren: task.stats.已履单达人数量 || 0,
                works: task.stats.已发布作品数 || 0,
                exposure: task.stats.组件曝光数 || 0
            };
        });

        // Calculate daily increments (delta between consecutive days)
        const increments = [];
        for (let i = 1; i < dailyData.length; i++) {
            const prev = dailyData[i - 1];
            const curr = dailyData[i];
            if (prev.daren !== null && curr.daren !== null) {
                increments.push({
                    date: curr.date,
                    deltaDaren: curr.daren - prev.daren,
                    deltaWorks: curr.works - prev.works,
                    deltaExposure: curr.exposure - prev.exposure
                });
            }
        }

        const name = (() => {
            for (const { report } of reports) {
                const t = report?.allTasks?.find(t => t.planId === planId);
                if (t?.name) return t.name;
            }
            return `planId:${planId}`;
        })();

        return { planId, name, dailyData, increments };
    });

    return { dates: availableDates, trends };
}

// ─── Format delta section for email ───

function formatDeltaEmail(deltaReport, trendReport) {
    if (!deltaReport) return '(无历史数据，明天开始可以看增量对比)';

    const sd = deltaReport.summaryDelta;
    const lines = [
        `📊 日增量对比 (vs ${deltaReport.comparedWith})`,
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        '📈 总量变化',
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        `• 达人: ${fmtDelta(sd.deltaDaren)}`,
        `• 作品: ${fmtDelta(sd.deltaWorks)}`,
        `• 曝光: ${fmtDelta(sd.deltaExposure)}`,
        `• 点击: ${fmtDelta(sd.deltaClicks)}`,
    ];

    if (deltaReport.topGainersByDaren.length > 0) {
        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push('🔥 今日达人增长 TOP 15');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        deltaReport.topGainersByDaren.forEach((t, i) => {
            const tag = t.isNew ? ' [新]' : '';
            lines.push(`${String(i + 1).padStart(2)}. ${t.name}${tag}`);
            lines.push(`    达人 +${t.deltaDaren} (总${t.daren}) | 作品 ${fmtDelta(t.deltaWorks)} (总${t.works})`);
        });
    } else {
        lines.push('');
        lines.push('(今日无新增达人)');
    }

    // 7-day trend for top gainers
    if (trendReport && trendReport.trends.length > 0) {
        lines.push('');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        lines.push('📈 TOP 达人增长 — 7日趋势（每日新增达人）');
        lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        for (const t of trendReport.trends) {
            if (t.increments.length === 0) continue;
            const sparkline = t.increments.map(inc => {
                const d = inc.date.slice(5); // MM-DD
                const v = inc.deltaDaren;
                return `${d}:${v >= 0 ? '+' : ''}${v}`;
            }).join('  ');
            lines.push(`• ${t.name}`);
            lines.push(`  ${sparkline}`);
        }
    }

    return lines.join('\n');
}

function fmtDelta(n) {
    if (n > 0) return `+${n.toLocaleString()}`;
    if (n < 0) return n.toLocaleString();
    return '0';
}

// ─── Save results ───

function saveResults(report, dateStr) {
    const filename = `kuaishou_report_${dateStr}`;

    // JSON
    fs.writeFileSync(
        path.join(CONFIG.outputDir, `${filename}.json`),
        JSON.stringify(report, null, 2)
    );

    // CSV
    const headers = ['序号', '计划ID', '任务名称', '来源', '状态', '曝光数', '点击数', '达人', '作品'];
    const rows = report.allTasks.map((t, i) => [
        i + 1,
        t.planId,
        `"${t.name || ''}"`,
        `"${t.source || ''}"`,
        `"${t.status || ''}"`,
        t.stats?.组件曝光数 || '',
        t.stats?.组件点击数 || '',
        t.stats?.已履单达人数量 || '',
        t.stats?.已发布作品数 || ''
    ]);

    fs.writeFileSync(
        path.join(CONFIG.outputDir, `${filename}.csv`),
        [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    );

    log('INFO', `Results saved: ${filename}.json/csv`);
    return filename;
}

// ─── Email ───

function buildEmailBody(report, adoptionReport, deltaReport, trendReport, dateStr, filename, eventSummary, accountInfo) {
    const rawSection = `📊 快手星火计划日报 (${dateStr})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 数据概览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 总任务数: ${report.summary.totalTasks} 个
• 有数据任务: ${report.summary.withData} 个
• 总曝光数: ${report.summary.totalExposure.toLocaleString()}
• 总点击数: ${report.summary.totalClicks.toLocaleString()}
• 总达人数量: ${report.summary.totalDaren.toLocaleString()}
• 总作品数量: ${report.summary.totalWorks.toLocaleString()}
• 整体点击率: ${report.summary.clickRate}
${report.adRevenue ? `\n💰 广告收入 (近7天)\n• 总收入: ${report.adRevenue.totalRevenue}元\n• 展示量: ${report.adRevenue.totalImpressions.toLocaleString()}\n• 平均eCPM: ${report.adRevenue.avgEcpm}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 TOP 10 曝光任务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${report.topByExposure.map((t, i) => `${i + 1}. [${t.planId}] ${t.name}\n   曝光: ${t.stats.组件曝光数} | 点击: ${t.stats.组件点击数 || 'N/A'} | 达人: ${t.stats.已履单达人数量 || 'N/A'}`).join('\n')}`;

    // ─── CTR Analysis Section ───
    const ctrSection = report.ctrByApp?.length ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 CTR 深度分析
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
整体CTR: ${report.summary.clickRate}

CTR分布:
• CTR=0%: ${report.ctrBuckets?.zero || 0} 个
• 0-0.1%: ${report.ctrBuckets?.low || 0} 个
• 0.1-0.5%: ${report.ctrBuckets?.mid || 0} 个
• 0.5-1%: ${report.ctrBuckets?.good || 0} 个
• >1%: ${report.ctrBuckets?.high || 0} 个

按小程序CTR:
${report.ctrByApp.map(a => `• ${a.app}: ${a.ctr}% | ${a.count}个任务 | 曝光${a.exposure.toLocaleString()} 点击${a.clicks.toLocaleString()}`).join('\n')}

🏆 TOP10 高CTR任务:
${report.topByCtr?.length ? report.topByCtr.map((t, i) => {
    const ctr = t.stats.组件曝光数 > 0 ? ((t.stats.组件点击数 / t.stats.组件曝光数) * 100).toFixed(2) : '0.00';
    return `${i + 1}. ${t.name} | ${t.miniAppName || ''}\n   曝光:${t.stats.组件曝光数.toLocaleString()} 点击:${t.stats.组件点击数} CTR:${ctr}%`;
}).join('\n') : '(今日无)'}

⚠️ 高曝光低CTR预警（曝光>1万, CTR<0.2%）:
${report.highExposureLowCtr?.length ? report.highExposureLowCtr.map((t, i) => {
    const ctr = t.stats.组件曝光数 > 0 ? ((t.stats.组件点击数 / t.stats.组件曝光数) * 100).toFixed(2) : '0.00';
    return `${i + 1}. [${t.planId}] ${t.name} | ${t.miniAppName || ''}\n   曝光:${t.stats.组件曝光数.toLocaleString()} 点击:${t.stats.组件点击数} CTR:${ctr}%`;
}).join('\n') : '(今日无)'}` : '';

    const deltaSection = formatDeltaEmail(deltaReport, trendReport);
    const adoptionSection = formatAdoptionEmail(adoptionReport);
    const eventSection = formatEventSection(eventSummary);
    const accountSection = formatAccountSection(accountInfo, CONFIG.outputDir);

    return `${rawSection}
${ctrSection}
${accountSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${deltaSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${adoptionSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${eventSection}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 附件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ${filename}.csv - 完整数据表格
• ${filename}.json - JSON格式数据

文件位置: ${CONFIG.outputDir}
`;
}

async function sendEmailWithSystemMail(to, subject, body, attachmentPath) {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);

    await execAsync('test -x /usr/sbin/sendmail');

    let csvContent = '';
    if (attachmentPath && fs.existsSync(attachmentPath)) {
        csvContent = fs.readFileSync(attachmentPath, 'utf-8');
    }

    const date = new Date().toUTCString();
    const emailContent = `To: ${to}
From: daily-report@letmetryai.cn
Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=
Date: ${date}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: base64

${Buffer.from(body + (csvContent ? '\n\n--- CSV Data Preview ---\n' + csvContent.split('\n').slice(0, 15).join('\n') + '\n... (see attachment for full data)' : '')).toString('base64')}`;

    const tempEmail = `/tmp/kuaishou_email_${Date.now()}.eml`;
    fs.writeFileSync(tempEmail, emailContent);

    try {
        await execAsync(`/usr/sbin/sendmail ${to} < "${tempEmail}"`);
        fs.unlinkSync(tempEmail);
        return true;
    } catch (e) {
        fs.unlinkSync(tempEmail);
        throw e;
    }
}

async function sendEmail(report, adoptionReport, deltaReport, trendReport, dateStr, filename, eventSummary, accountInfo) {
    log('INFO', 'Sending email report...');

    const body = buildEmailBody(report, adoptionReport, deltaReport, trendReport, dateStr, filename, eventSummary, accountInfo);
    const fanLabel = accountInfo ? ` ${accountInfo.fan}粉丝` : '';
    const subject = `[快手日报] ${dateStr} |${fanLabel} ${report.summary.totalDaren}达人 ${report.summary.totalWorks}作品 ${report.summary.totalExposure.toLocaleString()}曝光`;
    const attachmentPath = path.join(CONFIG.outputDir, `${filename}.csv`);

    // Try AgentMail first
    try {
        log('INFO', 'Trying AgentMail...');
        const { AgentMailClient } = await import('agentmail');
        const client = new AgentMailClient({ apiKey: CONFIG.apiKey });

        const inboxesResp = await client.inboxes.list();
        const inboxes = inboxesResp.inboxes || inboxesResp.data || [];
        if (!inboxes.length) throw new Error('No inboxes found');
        const inbox = inboxes.find(i => String(i.inboxId || i.inbox_id || i.id || '').includes('letmetry')) || inboxes[0];
        const inboxId = inbox.inboxId || inbox.inbox_id || inbox.id;

        await client.inboxes.messages.send(inboxId, {
            to: [CONFIG.emailTo],
            subject: subject,
            text: body,
            attachments: fs.existsSync(attachmentPath) ? [{
                filename: `${filename}.csv`,
                content: fs.readFileSync(attachmentPath).toString('base64'),
                content_type: 'text/csv'
            }] : []
        });

        log('INFO', 'Email sent via AgentMail');
        return true;
    } catch (e) {
        log('WARN', `AgentMail failed: ${e.message}`);
    }

    // Fallback to system mail
    try {
        log('INFO', 'Trying system mail command...');
        await sendEmailWithSystemMail(CONFIG.emailTo, subject, body, attachmentPath);
        log('INFO', 'Email sent via system mail');
        return true;
    } catch (e) {
        log('ERROR', `System mail also failed: ${e.message}`);
    }

    return false;
}

// ─── Main ───

function parseDateArg() {
    const idx = process.argv.indexOf('--date');
    if (idx !== -1 && process.argv[idx + 1]) {
        const candidate = process.argv[idx + 1];
        if (/^\d{4}-\d{2}-\d{2}$/.test(candidate)) {
            return candidate;
        }
    }
    return null;
}

async function main() {
    const startTime = Date.now();
    const dateOverride = parseDateArg();
    const today = dateOverride ? new Date(dateOverride + 'T00:00:00Z') : new Date();
    const dateStr = today.toISOString().split('T')[0];

    log('INFO', '========================================');
    log('INFO', `Daily Kuaishou Report - ${dateStr}`);
    if (dateOverride) {
        log('INFO', `Date override: ${dateOverride}`);
    }
    log('INFO', '========================================');

    try {
        // 1. Extract cookies
        const cookies = extractCookieHeader();
        log('INFO', 'Auth cookies loaded');

        // 2. Fetch all tasks
        const tasks = await fetchAllTasks(cookies);

        // 3. Fetch stats for each task
        const results = await fetchAllStats(tasks, cookies);

        // 4. Generate report
        log('INFO', 'Generating report...');
        const report = generateReport(results);

        log('INFO', 'Summary:');
        log('INFO', `  Total Tasks: ${report.summary.totalTasks}`);
        log('INFO', `  Total Exposure: ${report.summary.totalExposure.toLocaleString()}`);
        log('INFO', `  Total Clicks: ${report.summary.totalClicks.toLocaleString()}`);
        log('INFO', `  Click Rate: ${report.summary.clickRate}`);

        // 4.5. Cross-check brand mismatch (Layer 4: post-publish validation)
        const brandAlerts = crossCheckBrandMismatch(report);
        report.brandAlerts = brandAlerts;

        // 5. Save results
        const filename = saveResults(report, dateStr);

        // 6. Build adoption analysis
        log('INFO', 'Building adoption analysis...');
        const adoptionReport = buildUsageReport(dateStr, report);
        const usageOutputDir = path.join(RUNTIME_DIR, 'exports', 'metrics', 'daily-usage');
        ensureDirectory(usageOutputDir);
        fs.writeFileSync(
            path.join(usageOutputDir, `usage_${dateStr}.json`),
            JSON.stringify(adoptionReport, null, 2)
        );
        log('INFO', `Adoption report: ${adoptionReport.summary.tasksWithData} tasks, ${adoptionReport.summary.totalDaren} daren, ${adoptionReport.summary.totalWorks} works`);

        // 7. Build delta comparison (vs yesterday)
        log('INFO', 'Building delta comparison...');
        const deltaReport = buildDeltaReport(report, dateStr);

        // 8. Build 7-day trend for top gainers
        let trendReport = null;
        if (deltaReport && deltaReport.topGainersByDaren.length > 0) {
            const topPlanIds = deltaReport.topGainersByDaren.slice(0, 10).map(t => t.planId);
            trendReport = build7DayTrend(topPlanIds, dateStr);
        }

        // Save delta report
        if (deltaReport) {
            fs.writeFileSync(
                path.join(CONFIG.outputDir, `kuaishou_delta_${dateStr}.json`),
                JSON.stringify({ delta: deltaReport, trend: trendReport }, null, 2)
            );
            log('INFO', `Delta report saved: kuaishou_delta_${dateStr}.json`);
        }

        // 9. Append topic-performance for downstream analysis
        appendTopicPerformance(report, dateStr, PROJECT_ROOT);

        // 10. Fetch mini-app event tracking summary
        log('INFO', 'Fetching mini-app event summary...');
        const eventSummary = await fetchEventSummary(dateStr);
        if (eventSummary) {
            log('INFO', `Event summary: ${eventSummary.events} events from ${Object.keys(eventSummary.apps || {}).length} apps`);
        }

        // 11. Fetch account info (fan count etc.)
        log('INFO', 'Fetching account info...');
        const accountInfo = await fetchAccountInfo();
        if (accountInfo) {
            log('INFO', `Account: ${accountInfo.name}, fans=${accountInfo.fan}, follow=${accountInfo.follow}`);
            saveAccountHistory(dateStr, accountInfo, CONFIG.outputDir);
        }

        // 11.5. Fetch ad revenue from Open API
        log('INFO', 'Fetching ad revenue...');
        const adRevenue = await fetchAdRevenue(dateStr);
        if (adRevenue) {
            log('INFO', `Ad revenue (7d): ${adRevenue.totalRevenue}元, impressions=${adRevenue.totalImpressions}`);
            report.adRevenue = adRevenue;
        }

        // 12. Send combined email
        await sendEmail(report, adoptionReport, deltaReport, trendReport, dateStr, filename, eventSummary, accountInfo);

        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log('INFO', `Completed in ${duration}s`);

    } catch (error) {
        if (error.message === 'SESSION_EXPIRED') {
            log('ERROR', 'Kuaishou session expired!');
            log('ERROR', 'Re-login: node .harness/scripts/ks-api-poc.js --sniff');
        } else {
            log('ERROR', `Fatal error: ${error.message}`);
        }
        process.exit(1);
    }
}

main();
