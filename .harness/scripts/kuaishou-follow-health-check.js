#!/usr/bin/env node
/**
 * Kuaishou Follow Health Check
 *
 * Analyzes follow-history.jsonl and daily-run state to detect
 * recurring failure patterns (e.g. follow-button-not-found).
 *
 * Usage:
 *   node scripts/kuaishou-follow-health-check.js <repoRoot>
 *
 * Exit codes:
 *   0 — healthy
 *   1 — degraded (warnings)
 *   2 — critical (needs manual intervention)
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const HISTORY_FILE = 'follow-history.jsonl';
const DAILY_RUNS_DIR = 'daily-runs';
const PENDING_QUEUE_FILE = 'pending-queue.json';
const HOURS_WINDOW = 24;

function readJsonLines(filePath) {
    if (!existsSync(filePath)) {
        return [];
    }
    const content = readFileSync(filePath, 'utf-8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => {
            try {
                return JSON.parse(line);
            } catch {
                return null;
            }
        })
        .filter(Boolean);
}

function readJsonFile(filePath, defaultValue = null) {
    if (!existsSync(filePath)) {
        return defaultValue;
    }
    try {
        return JSON.parse(readFileSync(filePath, 'utf-8'));
    } catch {
        return defaultValue;
    }
}

function getRunDateKey(now = new Date()) {
    const d = new Date(now.getTime() + 8 * 60 * 60 * 1000); // Asia/Shanghai
    return d.toISOString().slice(0, 10);
}

function analyzeHealth(repoRoot) {
    const stateDir = join(repoRoot, '.harness', '.local', 'state', 'kuaishou-follow');
    const historyPath = join(stateDir, HISTORY_FILE);
    const queuePath = join(stateDir, PENDING_QUEUE_FILE);
    const dailyRunsDir = join(stateDir, DAILY_RUNS_DIR);

    const cutoff = new Date(Date.now() - HOURS_WINDOW * 60 * 60 * 1000);

    // 1. Analyze follow-history.jsonl
    const records = readJsonLines(historyPath);
    const recentRecords = records.filter(r => {
        const ts = r.processedAt ? new Date(r.processedAt) : null;
        return ts && ts >= cutoff;
    });

    const totalRecent = recentRecords.length;
    const failedRecent = recentRecords.filter(r => r.status === 'failed');
    const failedByReason = {};
    for (const r of failedRecent) {
        const reason = r.reason || 'unknown';
        failedByReason[reason] = (failedByReason[reason] || 0) + 1;
    }

    const topFailureReason = Object.entries(failedByReason)
        .sort((a, b) => b[1] - a[1])[0] || null;

    const failureRate = totalRecent > 0 ? failedRecent.length / totalRecent : 0;

    // 2. Analyze today's daily run state
    const todayKey = getRunDateKey();
    const todayRun = readJsonFile(join(dailyRunsDir, `${todayKey}.json`), {});
    const ingestion = todayRun.ingestion || null;
    const hourlyRuns = todayRun.hourlyRuns || [];

    const recentHourlyRuns = hourlyRuns.filter(h => {
        const ts = h.startedAt ? new Date(h.startedAt) : null;
        return ts && ts >= cutoff;
    });

    const totalAttempted = recentHourlyRuns.reduce((sum, h) => sum + (h.attempted || 0), 0);
    const totalFollowed = recentHourlyRuns.reduce((sum, h) => sum + (h.followed || 0), 0);
    const totalFailed = recentHourlyRuns.reduce((sum, h) => sum + (h.failed || 0), 0);
    const queueEmptyRuns = recentHourlyRuns.filter(h => h.stopReason === 'queue-empty').length;

    // 3. Check pending queue
    const pendingQueue = readJsonFile(queuePath, []);
    const queueSize = Array.isArray(pendingQueue) ? pendingQueue.length : 0;

    // 4. Check for actual auth failures (not cookie expires prediction)
    const authExpiredRuns = recentHourlyRuns.filter(h => h.stopReason === 'auth-expired').length;
    const notLoggedInFailures = Object.entries(failedByReason)
        .filter(([reason]) => reason === 'not-logged-in')
        .reduce((sum, [, count]) => sum + count, 0);

    // 5. Determine health level
    let level = 'healthy';
    const issues = [];

    if (authExpiredRuns > 0 || notLoggedInFailures > 0) {
        level = 'critical';
        issues.push(`Auth 实际失效: ${authExpiredRuns} 次 auth-expired 停止, ${notLoggedInFailures} 次 not-logged-in 失败。请刷新 cookie`);
    }

    if (topFailureReason && topFailureReason[0] === 'follow-button-not-found' && topFailureReason[1] >= 3) {
        level = 'critical';
        issues.push(`DOM selector broken: "follow-button-not-found" occurred ${topFailureReason[1]} times in last ${HOURS_WINDOW}h`);
    } else if (failureRate > 0.8 && totalRecent >= 5) {
        level = 'critical';
        issues.push(`Failure rate ${(failureRate * 100).toFixed(0)}% (${failedRecent.length}/${totalRecent}) in last ${HOURS_WINDOW}h`);
    } else if (failureRate > 0.5 && totalRecent >= 3) {
        level = 'degraded';
        issues.push(`Failure rate ${(failureRate * 100).toFixed(0)}% (${failedRecent.length}/${totalRecent}) in last ${HOURS_WINDOW}h`);
    }

    if (queueSize === 0 && ingestion && ingestion.queueAdded > 0) {
        // Queue was filled but is now empty — might be normal if workers processed all,
        // but if totalFollowed is 0 while totalFailed equals queueAdded, it's a problem.
        if (totalFollowed === 0 && totalFailed > 0) {
            level = level === 'critical' ? 'critical' : 'degraded';
            issues.push(`Queue drained with 0 follows, ${totalFailed} failures (ingested ${ingestion.queueAdded})`);
        }
    }

    if (queueEmptyRuns >= 6 && (!ingestion || ingestion.queueAdded === 0)) {
        level = level === 'critical' ? 'critical' : 'degraded';
        issues.push(`Queue empty for ${queueEmptyRuns} consecutive runs, no new candidates ingested`);
    }

    return {
        level,
        issues,
        summary: {
            totalRecent,
            failedRecent: failedRecent.length,
            failureRate: Math.round(failureRate * 100),
            topFailureReason: topFailureReason ? { reason: topFailureReason[0], count: topFailureReason[1] } : null,
            queueSize,
            ingestionToday: ingestion
                ? { fetched: ingestion.totalFetched, queueAdded: ingestion.queueAdded }
                : null,
            hourlyRunsToday: recentHourlyRuns.length,
            totalAttempted,
            totalFollowed,
            totalFailed
        }
    };
}

function main() {
    const repoRoot = process.argv[2] || process.cwd();
    const result = analyzeHealth(repoRoot);

    const statusIcon = result.level === 'healthy' ? '✅' : result.level === 'degraded' ? '⚠️' : '❌';
    const statusText = result.level === 'healthy' ? '健康' : result.level === 'degraded' ? '降级' : '严重';

    console.log(`${statusIcon} Kuaishou Follow: ${statusText}`);

    if (result.issues.length > 0) {
        console.log('Issues:');
        for (const issue of result.issues) {
            console.log(`  - ${issue}`);
        }
    }

    const s = result.summary;
    console.log(`Summary: ${s.totalRecent} records, ${s.failedRecent} failed (${s.failureRate}%), queue=${s.queueSize}, followed=${s.totalFollowed}, failed=${s.totalFailed}`);

    process.exit(result.level === 'healthy' ? 0 : result.level === 'degraded' ? 1 : 2);
}

main();
