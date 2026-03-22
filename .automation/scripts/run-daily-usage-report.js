#!/usr/bin/env node
/**
 * 每日创作者采纳度报告 — Workflow 编排
 *
 * 读取快手每日抓取数据，生成以达人采纳度为核心的排名报告。
 * 核心问题：哪些 idea 最受短视频创作者欢迎？
 *
 * Usage:
 *   node .automation/scripts/run-daily-usage-report.js [YYYY-MM-DD]
 *
 * Environment Variables:
 *   KUAISHOU_EMAIL_TO=jackandking@163.com
 *   AGENTMAIL_API_KEY=xxx
 *   KUAISHOU_METRICS_DIR=  (override metrics location)
 *
 * Cron: 55 23 * * *
 */

import fs from 'fs';
import path from 'path';
import {
    resolveProjectRoot,
    resolveRuntimeDir,
    ensureDirectory,
} from './runtime-paths.js';
import {
    loadKuaishouReport,
    buildUsageReport,
    formatEmailBody,
} from './lib/usage-report-builder.js';

// ─── Config ────────────────────────────────────────────────────

const PROJECT_ROOT = resolveProjectRoot(import.meta.url);
const RUNTIME_DIR = resolveRuntimeDir(import.meta.url);

const CONFIG = {
    // Kuaishou daily JSON lives here (written by daily_kuaishou_report.js)
    kuaishouMetricsDir: process.env.KUAISHOU_METRICS_DIR
        || path.join(PROJECT_ROOT, 'metrics', 'kuaishou', 'daily'),
    outputDir: path.join(RUNTIME_DIR, 'exports', 'metrics', 'daily-usage'),
    emailTo: process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com',
    apiKey: process.env.AGENTMAIL_API_KEY
        || 'am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4',
};

// ─── Logger ────────────────────────────────────────────────────

function log(level, message) {
    const ts = new Date().toISOString();
    console.log(`[${ts}] [${level}] ${message}`);
}

// ─── Email ─────────────────────────────────────────────────────

async function sendEmail(subject, body) {
    // Try AgentMail
    try {
        log('INFO', 'Sending email via AgentMail...');
        const { AgentMailClient } = await import('agentmail');
        const client = new AgentMailClient({ apiKey: CONFIG.apiKey });

        const inboxesResp = await client.inboxes.list();
        const inboxes = inboxesResp.inboxes || inboxesResp.data || [];
        if (!inboxes.length) throw new Error('No inboxes found');
        const inbox = inboxes.find(i => String(i.inbox_id || i.id || '').includes('letmetry')) || inboxes[0];

        const inboxId = inbox.inboxId || inbox.inbox_id || inbox.id;
        await client.inboxes.messages.send(inboxId, {
            to: [CONFIG.emailTo],
            subject,
            text: body,
        });

        log('INFO', `Email sent to ${CONFIG.emailTo}`);
        return true;
    } catch (e) {
        log('WARN', `AgentMail failed: ${e.message}`);
    }

    // Fallback: write to file so the report isn't lost
    const draftPath = path.join(RUNTIME_DIR, 'state', 'email-drafts', 'usage-report-latest.txt');
    ensureDirectory(path.dirname(draftPath));
    fs.writeFileSync(draftPath, `Subject: ${subject}\nTo: ${CONFIG.emailTo}\n\n${body}`);
    log('WARN', `Email failed. Draft saved to ${draftPath}`);
    return false;
}

// ─── Main ──────────────────────────────────────────────────────

async function main() {
    const startTime = Date.now();
    const dateStr = process.argv[2] || new Date().toISOString().split('T')[0];

    log('INFO', '========================================');
    log('INFO', `Daily Usage Report — ${dateStr}`);
    log('INFO', '========================================');

    // 1. Load kuaishou data
    log('INFO', `Looking for kuaishou data in ${CONFIG.kuaishouMetricsDir}`);
    const ks = loadKuaishouReport(CONFIG.kuaishouMetricsDir, dateStr);

    if (!ks.data) {
        log('ERROR', 'No kuaishou report data found. Nothing to report.');
        process.exit(1);
    }

    log('INFO', `Using kuaishou report from ${ks.date} (${ks.filePath})`);

    // 2. Build report
    const report = buildUsageReport(ks.date, ks.data);
    log('INFO', `Summary: ${report.summary.tasksWithData} tasks with data, ` +
        `${report.summary.totalDaren} daren, ${report.summary.totalWorks} works`);

    // 3. Save JSON
    ensureDirectory(CONFIG.outputDir);
    const jsonPath = path.join(CONFIG.outputDir, `usage_${ks.date}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
    log('INFO', `JSON saved: ${jsonPath}`);

    // 4. Send email
    const subject = `[采纳度日报] ${ks.date} | ${report.summary.totalDaren} 达人 ${report.summary.totalWorks} 作品`;
    const body = formatEmailBody(report);
    await sendEmail(subject, body);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log('INFO', `Completed in ${duration}s`);
}

main().catch(err => {
    log('ERROR', `Fatal: ${err.message}`);
    process.exit(1);
});
