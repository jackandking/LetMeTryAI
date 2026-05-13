#!/usr/bin/env node
/**
 * Batch stop Kuaishou distribution tasks (停止接单)
 *
 * Usage:
 *   node batch-stop-tasks.js --plan-ids 326043,313564
 *   node batch-stop-tasks.js --ctr-below 0.1 --days-old 14 --dry-run
 *   node batch-stop-tasks.js --ctr-below 0.1 --days-old 14 --brand elder-love --execute
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://daren.kuaishou.com';
const AUTH_FILE = '/Users/weiping/prod/LetMeTryAI/.harness/.local/auth/kuaishou_auth.json';
const REPORT_FILE = '/Users/weiping/prod/LetMeTryAI/.harness/.local/exports/metrics/kuaishou/daily/kuaishou_report_2026-05-12.json';

function parseArgs() {
    const args = process.argv.slice(2);
    const parsed = { dryRun: true, planIds: [], ctrBelow: null, daysOld: null, brand: null };
    for (let i = 0; i < args.length; i++) {
        if (args[i] === '--plan-ids' && args[i + 1]) {
            parsed.planIds = args[i + 1].split(',').map(s => s.trim()).filter(Boolean);
            i++;
        } else if (args[i] === '--ctr-below' && args[i + 1]) {
            parsed.ctrBelow = parseFloat(args[i + 1]);
            i++;
        } else if (args[i] === '--days-old' && args[i + 1]) {
            parsed.daysOld = parseInt(args[i + 1], 10);
            i++;
        } else if (args[i] === '--brand' && args[i + 1]) {
            parsed.brand = args[i + 1];
            i++;
        } else if (args[i] === '--execute') {
            parsed.dryRun = false;
        }
    }
    return parsed;
}

function loadCookies() {
    if (!fs.existsSync(AUTH_FILE)) {
        throw new Error('Auth file not found: ' + AUTH_FILE);
    }
    const auth = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    if (!auth.cookies || !auth.cookies.length) {
        throw new Error('No cookies in auth file');
    }
    const cookieHeader = auth.cookies.map(c => `${c.name}=${c.value}`).join('; ');
    return cookieHeader;
}

async function apiCall(endpoint, body, cookieHeader) {
    const url = BASE_URL + endpoint;
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': cookieHeader,
            'Referer': BASE_URL + '/content/promotion/distribution',
            'Origin': BASE_URL
        },
        body: JSON.stringify(body)
    });
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return { error: true, raw: text };
    }
}

async function getTaskDetail(planId, cookieHeader) {
    const data = await apiCall('/rest/pc/creator/marketing/distribution/detail', {
        distributionPlanId: planId,
        detailType: 'Online'
    }, cookieHeader);
    if (data.result !== 1) {
        throw new Error(`Failed to get detail for ${planId}: ${data.message}`);
    }
    return data.data;
}

async function stopTask(planId, version, cookieHeader) {
    const data = await apiCall('/rest/pc/creator/marketing/distribution/update', {
        distributionPlanId: planId,
        version: version,
        updateFields: {
            planOffline: '1'
        }
    }, cookieHeader);
    if (data.result !== 1) {
        throw new Error(`Failed to stop ${planId}: ${data.message}`);
    }
    return data.data;
}

function loadReport() {
    if (!fs.existsSync(REPORT_FILE)) {
        console.warn('Report file not found, skipping report-based filtering');
        return null;
    }
    return JSON.parse(fs.readFileSync(REPORT_FILE, 'utf-8'));
}

function filterTasksFromReport(report, ctrBelow, daysOld, brand) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // Load daily-app-runs to get publish dates
    const runsDir = '/Users/weiping/prod/LetMeTryAI/.harness/.local/state/daily-app-runs';
    const publishDates = {};
    if (fs.existsSync(runsDir)) {
        fs.readdirSync(runsDir).forEach(f => {
            if (!f.endsWith('.jsonl')) return;
            const lines = fs.readFileSync(path.join(runsDir, f), 'utf-8')
                .trim().split('\n').filter(Boolean);
            lines.forEach(line => {
                try {
                    const r = JSON.parse(line);
                    if (r.publish && r.publish.distributionPlanId && r.timestamp) {
                        publishDates[r.publish.distributionPlanId] = r.timestamp.split('T')[0];
                    }
                } catch {}
            });
        });
    }

    return report.allTasks.filter(t => {
        if (!t.stats || (t.stats.组件曝光数 || 0) === 0) return false;
        const ctr = (t.stats.组件点击数 || 0) / (t.stats.组件曝光数 || 1) * 100;
        if (ctr > ctrBelow) return false;
        const pubDate = publishDates[t.planId];
        if (!pubDate || pubDate >= cutoffStr) return false;
        if (brand && t.miniAppName !== brand) return false;
        return true;
    }).map(t => {
        const exposure = t.stats.组件曝光数 || 0;
        const clicks = t.stats.组件点击数 || 0;
        const ctr = exposure > 0 ? (clicks / exposure * 100).toFixed(2) : '0.00';
        return {
            planId: t.planId,
            name: t.name,
            miniAppName: t.miniAppName || '',
            exposure,
            clicks,
            ctr,
            published: publishDates[t.planId] || 'unknown'
        };
    });
}

async function main() {
    const args = parseArgs();
    const cookieHeader = loadCookies();

    let targets = [];

    if (args.planIds.length > 0) {
        targets = args.planIds.map(id => ({ planId: id, name: 'unknown' }));
    } else if (args.ctrBelow !== null && args.daysOld !== null) {
        const report = loadReport();
        if (!report) {
            console.error('No report file available. Use --plan-ids instead.');
            process.exit(1);
        }
        targets = filterTasksFromReport(report, args.ctrBelow, args.daysOld, args.brand);
        if (targets.length === 0) {
            console.log('No tasks match the filter criteria.');
            process.exit(0);
        }
    } else {
        console.log(`
Usage:
  node batch-stop-tasks.js --plan-ids 326043,313564 [--execute]
  node batch-stop-tasks.js --ctr-below 0.1 --days-old 14 [--brand elder-love] [--execute]

Options:
  --plan-ids    Comma-separated plan IDs to stop
  --ctr-below   Filter: CTR below this percentage (e.g. 0.1)
  --days-old    Filter: published more than N days ago
  --brand       Filter: specific miniAppName (optional)
  --execute     Actually execute stops (default: dry-run)
`);
        process.exit(0);
    }

    console.log(`Mode: ${args.dryRun ? 'DRY-RUN' : 'EXECUTE'}`);
    console.log(`Targets: ${targets.length} tasks`);
    console.log('');

    const results = [];
    for (const task of targets) {
        try {
            console.log(`[${task.planId}] ${task.name || ''}`);
            if (args.dryRun) {
                console.log('  -> DRY-RUN: would stop');
                results.push({ planId: task.planId, status: 'dry-run' });
                continue;
            }

            const detail = await getTaskDetail(parseInt(task.planId, 10), cookieHeader);
            const version = detail.version || 1;
            console.log(`  -> version: ${version}`);

            const result = await stopTask(parseInt(task.planId, 10), version, cookieHeader);
            console.log(`  -> STOPPED (new version: ${result.version})`);
            results.push({ planId: task.planId, status: 'stopped', version: result.version });
        } catch (err) {
            console.error(`  -> FAILED: ${err.message}`);
            results.push({ planId: task.planId, status: 'failed', error: err.message });
        }
        // Rate limit: 500ms between requests
        await new Promise(r => setTimeout(r, 500));
    }

    console.log('');
    console.log('=== Summary ===');
    const stopped = results.filter(r => r.status === 'stopped').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const dryRun = results.filter(r => r.status === 'dry-run').length;
    console.log(`Stopped: ${stopped} | Failed: ${failed} | Dry-run: ${dryRun}`);
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
