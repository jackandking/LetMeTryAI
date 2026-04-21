#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import {
    HOT_TASK_PROMO_PATHS,
    buildHotTaskAppFromCandidate,
    formatMetricsSummary,
    loadLatestMetrics,
    loadProcessedTaskLog,
    recordPromotionRun,
    saveHotTaskSelection,
    selectPromotionCandidate,
    rankHotTaskCandidates
} from './hot-task-promo-workflow.js';
import { buildArtifactBaseName, buildEmailSubject } from './hot-task-video-config.js';

function parseArgs(argv) {
    const options = {
        metricsDir: null,
        recipient: null,
        forceAppId: null,
        force: false,
        dryRun: false,
        cooldownDays: 7
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        const next = argv[index + 1];

        if (arg === '--metrics-dir') {
            options.metricsDir = next;
            index += 1;
        } else if (arg === '--recipient') {
            options.recipient = next;
            index += 1;
        } else if (arg === '--force-app-id') {
            options.forceAppId = next;
            index += 1;
        } else if (arg === '--cooldown-days') {
            options.cooldownDays = Number(next || 0);
            index += 1;
        } else if (arg === '--force') {
            options.force = true;
        } else if (arg === '--dry-run') {
            options.dryRun = true;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    return options;
}

async function verifyMobileLayout(appUrl, appId) {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 360, height: 640 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    });
    const page = await context.newPage();
    await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);

    const layoutInfo = await page.evaluate(() => {
      const grid = document.querySelector('.options-grid');
      const meta = document.querySelector('meta[name="viewport"]');
      if (!grid) return { hasGrid: false, columnCount: 0, viewportMeta: meta ? meta.getAttribute('content') : null };
      const computed = window.getComputedStyle(grid);
      const columns = computed.gridTemplateColumns.split(' ').filter(Boolean);
      return {
        hasGrid: true,
        columnCount: columns.length,
        viewportMeta: meta ? meta.getAttribute('content') : null,
        gridTemplateColumns: computed.gridTemplateColumns,
      };
    });

    await browser.close();

    if (!layoutInfo.viewportMeta) {
      return { valid: false, reason: `Missing viewport meta tag. options-grid columns: ${layoutInfo.gridTemplateColumns}` };
    }

    if (layoutInfo.hasGrid && layoutInfo.columnCount > 1) {
      return { valid: false, reason: `Desktop layout detected on mobile viewport (${layoutInfo.columnCount} columns). options-grid: ${layoutInfo.gridTemplateColumns}` };
    }

    return { valid: true };
  } catch (error) {
    await browser.close();
    return { valid: false, reason: `Layout verification error: ${error.message}` };
  }
}

function runChecked(command, args, options, label) {
    const result = spawnSync(command, args, { encoding: 'utf8', ...options });
    if (result.status !== 0) {
        throw new Error(`${label} failed: ${(result.stderr || result.stdout || '').trim()}`);
    }
    return result;
}

function getArtifactPaths(app) {
    const artifactBaseName = buildArtifactBaseName(app);
    const workDir = path.join(HOT_TASK_PROMO_PATHS.repoRoot, '.harness', '.local', 'hot-task-video', app.appId);

    return {
        workDir,
        videoPath: path.join(workDir, `${artifactBaseName}.mp4`),
        emailBodyPath: path.join(workDir, `${artifactBaseName}-email-body.txt`),
        metadataPath: path.join(workDir, `${artifactBaseName}-metadata.json`)
    };
}

function printSelection(app, candidate, options) {
    const payload = {
        appId: app.appId,
        pageTitle: app.pageTitle,
        appUrl: app.appUrl,
        recipientEmail: app.recipientEmail,
        reportDate: candidate.reportDate,
        selectedBy: candidate.selectedBy,
        metricsSummary: formatMetricsSummary(candidate),
        options
    };

    console.log(JSON.stringify(payload, null, 2));
}

function loadHotTaskState() {
    try {
        return JSON.parse(readFileSync(HOT_TASK_PROMO_PATHS.hotTaskStateFile, 'utf8'));
    } catch {
        return null;
    }
}

function isToday(dateString) {
    if (!dateString) return false;
    const d = new Date(dateString);
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const latestMetrics = loadLatestMetrics(options.metricsDir);
    const candidates = rankHotTaskCandidates(latestMetrics);
    const records = loadProcessedTaskLog();

    let candidate = null;
    const hotTaskState = loadHotTaskState();

    if (hotTaskState && isToday(hotTaskState.savedAt) && !options.forceAppId && !options.force) {
        candidate = candidates.find(c => c.metadata?.id === hotTaskState.appId);
        if (candidate) {
            console.log(`[run-hot-task-promo] Reusing hot-task selection from image-gen: ${hotTaskState.appId}`);
        }
    }

    if (!candidate) {
        candidate = selectPromotionCandidate(candidates, records, {
            force: options.force,
            forceAppId: options.forceAppId,
            cooldownDays: options.cooldownDays
        });
    }

    const appOverrides = options.recipient ? { recipientEmail: options.recipient } : {};
    const app = buildHotTaskAppFromCandidate(candidate, appOverrides);

    // Check if app has new-format HTML (option-card) and images exist
    const appIndexPath = path.join(HOT_TASK_PROMO_PATHS.repoRoot, app.appId, 'index.html');
    const appHtml = existsSync(appIndexPath) ? readFileSync(appIndexPath, 'utf8') : '';
    let skipReason = null;

    if (!appHtml.includes('option-card')) {
        skipReason = 'old HTML format (no option-card)';
    } else {
        // Check images referenced in HTML actually exist on disk
        const imgRefs = [...appHtml.matchAll(/src="(images\/[^"]+)"/g)].map(m => m[1]);
        const appDirPath = path.join(HOT_TASK_PROMO_PATHS.repoRoot, app.appId);
        const missing = imgRefs.filter(ref => !existsSync(path.join(appDirPath, ref)));
        if (missing.length > 0) {
            skipReason = `${missing.length} image(s) missing: ${missing.join(', ')}`;
        }
    }

    if (skipReason) {
        console.log(`[run-hot-task-promo] Skipping ${app.appId}: ${skipReason}`);
        const alertTo = options.recipient || process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com';
        const alertFile = path.join(HOT_TASK_PROMO_PATHS.repoRoot, '.harness', '.local', 'logs', 'hot-task-promo-skip.txt');
        const alertBody = `[hot-task-promo] Skipped ${app.appId}: ${skipReason}\nTime: ${new Date().toISOString()}`;
        try {
            writeFileSync(alertFile, alertBody, 'utf8');
            const sendScript = path.join(HOT_TASK_PROMO_PATHS.repoRoot, '.harness', 'scripts', 'send-email.py');
            if (existsSync(sendScript)) {
                spawnSync('python3', [sendScript, `[Hot Task Promo] Skipped - ${skipReason.slice(0, 40)}`, alertTo, alertFile],
                    { cwd: HOT_TASK_PROMO_PATHS.repoRoot });
            }
        } catch {}
        return;
    }

    // Verify mobile layout before generating video
    console.log(`[run-hot-task-promo] Verifying mobile layout for ${app.appId}...`);
    const layoutCheck = await verifyMobileLayout(app.appUrl, app.appId);
    if (!layoutCheck.valid) {
        const failReason = layoutCheck.reason;
        console.log(`[run-hot-task-promo] BLOCKED ${app.appId}: ${failReason}`);
        const alertTo = options.recipient || process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com';
        const alertFile = path.join(HOT_TASK_PROMO_PATHS.repoRoot, '.harness', '.local', 'logs', 'hot-task-promo-blocked.txt');
        const alertBody = `[hot-task-promo] BLOCKED ${app.appId}: ${failReason}\nTime: ${new Date().toISOString()}\nURL: ${app.appUrl}`;
        try {
            writeFileSync(alertFile, alertBody, 'utf8');
            const sendScript = path.join(HOT_TASK_PROMO_PATHS.repoRoot, '.harness', 'scripts', 'send-email.py');
            if (existsSync(sendScript)) {
                spawnSync('python3', [sendScript, `[Hot Task Promo] BLOCKED - Mobile layout broken`, alertTo, alertFile],
                    { cwd: HOT_TASK_PROMO_PATHS.repoRoot });
            }
        } catch {}
        return;
    }
    console.log(`[run-hot-task-promo] Mobile layout OK for ${app.appId}`);

    saveHotTaskSelection(candidate.metadata);
    const artifactPaths = getArtifactPaths(app);

    if (options.dryRun) {
        printSelection(app, candidate, options);
        return;
    }

    const renderResult = runChecked(
        'node',
        ['.harness/scripts/make-hot-task-video.mjs'],
        {
            cwd: HOT_TASK_PROMO_PATHS.repoRoot,
            env: {
                ...process.env,
                HOT_TASK_APP_JSON: JSON.stringify(app)
            }
        },
        'render hot-task promo video'
    );

    process.stdout.write(renderResult.stdout || '');

    const emailResult = runChecked(
        'python3',
        [
            '.harness/scripts/send-hot-task-video.py',
            buildEmailSubject(app),
            app.recipientEmail,
            artifactPaths.emailBodyPath,
            artifactPaths.videoPath
        ],
        {
            cwd: HOT_TASK_PROMO_PATHS.repoRoot
        },
        'send hot-task promo email'
    );

    process.stdout.write(emailResult.stdout || '');

    const metadata = JSON.parse(readFileSync(artifactPaths.metadataPath, 'utf8'));
    recordPromotionRun({
        reportDate: candidate.reportDate,
        appId: app.appId,
        pageTitle: app.pageTitle,
        appUrl: app.appUrl,
        recipientEmail: app.recipientEmail,
        selectedBy: candidate.selectedBy,
        metricsSummary: formatMetricsSummary(candidate),
        videoPath: artifactPaths.videoPath,
        metadataPath: artifactPaths.metadataPath,
        outputPaths: metadata.outputPaths,
        status: 'sent',
        processedAt: new Date().toISOString()
    });

    console.log(`processedLog=${HOT_TASK_PROMO_PATHS.processedLog}`);
}

main().catch(err => {
  console.error('[run-hot-task-promo] Fatal error:', err);
  process.exit(1);
});
