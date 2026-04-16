#!/usr/bin/env node

import { spawnSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import {
    HOT_TASK_PROMO_PATHS,
    buildHotTaskAppFromCandidate,
    formatMetricsSummary,
    loadLatestMetrics,
    loadProcessedTaskLog,
    recordPromotionRun,
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

function main() {
    const options = parseArgs(process.argv.slice(2));
    const latestMetrics = loadLatestMetrics(options.metricsDir);
    const candidates = rankHotTaskCandidates(latestMetrics);
    const records = loadProcessedTaskLog();
    const candidate = selectPromotionCandidate(candidates, records, {
        force: options.force,
        forceAppId: options.forceAppId,
        cooldownDays: options.cooldownDays
    });
    const appOverrides = options.recipient ? { recipientEmail: options.recipient } : {};
    const app = buildHotTaskAppFromCandidate(candidate, appOverrides);
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

main();
