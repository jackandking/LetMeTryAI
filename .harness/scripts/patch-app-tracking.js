#!/usr/bin/env node
/**
 * Patch old app.js files to add event tracking (logEvent).
 *
 * Usage:
 *   node .harness/scripts/patch-app-tracking.js [--dry-run]
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_DIR = resolve(__dirname, '..', '..');
const dryRun = process.argv.includes('--dry-run');

const TRACKING_BLOCK = `
const EVENT_ENDPOINT = 'https://letmetry.cloud/api/track';
const pageStartTime = Date.now();

function logEvent(event, data = {}) {
    const payload = {
        event,
        appId: questionConfig.storageKey.replace(/\\.data$/, ''),
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        ...data
    };
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(payload));
    } else if (typeof fetch !== 'undefined') {
        fetch(EVENT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => {});
    }
}
`;

const SETUP_EVENT_TRACKING_FN = `
function setupEventTracking() {
    const urlParams = new URLSearchParams(window.location.search);
    logEvent('page_load', { showAd: urlParams.get('showAd') === 'true' });
    const finishedAd = urlParams.get('finishedAd');
    if (finishedAd === 'true') {
        logEvent('rewarded_ad_complete');
    } else if (finishedAd === 'false') {
        logEvent('rewarded_ad_skip');
    }
    window.addEventListener('beforeunload', () => {
        logEvent('page_exit', { durationMs: Date.now() - pageStartTime });
    });
}
`;

let patched = 0;
let skipped = 0;
let errors = 0;

const dirs = readdirSync(PROJECT_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('node_modules'))
    .map(d => d.name);

for (const dir of dirs) {
    const appFile = join(PROJECT_DIR, dir, 'app.js');
    if (!existsSync(appFile)) continue;

    let code = readFileSync(appFile, 'utf-8');

    if (code.includes('EVENT_ENDPOINT')) {
        skipped++;
        continue;
    }

    if (!code.includes('questionConfig') || !code.includes('processVote')) {
        continue;
    }

    const original = code;

    // 1. Insert tracking block after `let voteData = {};`
    const voteDataMatch = code.match(/^let voteData\s*=\s*\{\};?\s*$/m);
    if (!voteDataMatch) {
        console.log(`  SKIP ${dir}: no 'let voteData' found`);
        continue;
    }
    const insertPos = code.indexOf(voteDataMatch[0]) + voteDataMatch[0].length;
    code = code.slice(0, insertPos) + '\n' + TRACKING_BLOCK + code.slice(insertPos);

    // 2. Add setupEventTracking() call in initializeApp
    code = code.replace(
        /(function initializeApp\(\)\s*\{[\s\S]*?)(checkUrlParameters\(\);)/,
        '$1$2\n        setupEventTracking();'
    );

    // 3. Insert setupEventTracking function before checkUrlParameters
    code = code.replace(
        /(\nfunction checkUrlParameters)/,
        SETUP_EVENT_TRACKING_FN + '\n$1'
    );

    // 4. Add logEvent in processVote
    code = code.replace(
        /(function processVote\(selectedLabel\)\s*\{)/,
        '$1\n    logEvent(\'vote_complete\', { option: selectedLabel });'
    );

    // 5. Add logEvent in showAd
    code = code.replace(
        /(function showAd\(\)\s*\{)/,
        '$1\n    logEvent(\'rewarded_ad_trigger\');'
    );

    if (code === original) {
        console.log(`  SKIP ${dir}: no changes after transform`);
        continue;
    }

    if (dryRun) {
        console.log(`  DRY-RUN ${dir}: would patch`);
    } else {
        writeFileSync(appFile, code, 'utf-8');
        console.log(`  PATCHED ${dir}`);
    }
    patched++;
}

console.log(`\nDone: ${patched} patched, ${skipped} already had tracking, ${errors} errors`);
if (dryRun) console.log('(dry-run mode — no files changed)');
