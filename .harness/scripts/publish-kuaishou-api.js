#!/usr/bin/env node
/**
 * Publish a Kuaishou distribution task via pure HTTP API.
 * No browser/Playwright needed — just cookies from a prior login session.
 *
 * Usage:
 *   node .harness/scripts/publish-kuaishou-api.js <appId> <appName> [description]
 *
 * Environment:
 *   SOURCE_TASK_ID   — template task to clone settings from (default: per-profile)
 *   PROFILE_ID       — brand profile (nanrenbao|womanai|parent-tools|elder-love)
 *   KUAISHOU_AUTH_FILE — path to Playwright storageState JSON
 *
 * Examples:
 *   PROFILE_ID=nanrenbao node .harness/scripts/publish-kuaishou-api.js \
 *     rockets-king "火箭之王" "哪款火箭更强？来投票！"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    resolveKuaishouAuthFile,
    resolveRuntimeDir,
    ensureDirectory
} from './lib/runtime-paths.js';
import { validateTaskName } from './publish-kuaishou-task-utils.js';

// ─── Profile → Source Task mapping ───
const PROFILE_SOURCE_TASKS = {
    nanrenbao: '165805',
    'elder-love': '183044',
    'parent-tools': '186229',
    womanai: '188816'
};

// ─── Config ───
const PROFILE_ID = process.env.PROFILE_ID || 'nanrenbao';
const SOURCE_TASK_ID = process.env.SOURCE_TASK_ID || PROFILE_SOURCE_TASKS[PROFILE_ID] || '165805';
const AUTH_FILE = resolveKuaishouAuthFile(import.meta.url);
const BASE_URL = 'https://daren.kuaishou.com';
const DELAY_MS = { min: 300, max: 800 };

function log(level, msg) {
    console.log(`[publish-api][${new Date().toISOString()}][${level}] ${msg}`);
}

function randomDelay() {
    const ms = DELAY_MS.min + Math.random() * (DELAY_MS.max - DELAY_MS.min);
    return new Promise(r => setTimeout(r, ms));
}

// ─── Cookie extraction ───

function extractCookieHeader() {
    if (!fs.existsSync(AUTH_FILE)) {
        log('ERROR', `Auth file not found: ${AUTH_FILE}`);
        log('ERROR', 'Run: node .harness/scripts/ks-api-poc.js --sniff');
        process.exit(1);
    }
    const state = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8'));
    const cookies = (state.cookies || [])
        .filter(c => c.domain?.includes('kuaishou.com'))
        .map(c => `${c.name}=${c.value}`)
        .join('; ');
    if (!cookies) {
        log('ERROR', 'No kuaishou cookies in auth file.');
        process.exit(1);
    }
    return cookies;
}

// ─── HTTP helpers ───

async function apiPost(endpoint, body, cookies) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://daren.kuaishou.com/distribution-plan-create/recreate/' + SOURCE_TASK_ID,
            'Origin': BASE_URL
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (data.result === 109) throw new Error('SESSION_EXPIRED');
    return data;
}

async function apiGet(endpoint, cookies) {
    const url = `${BASE_URL}${endpoint}`;
    const res = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Cookie': cookies,
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
            'Referer': 'https://daren.kuaishou.com/distribution-plan-create/recreate/' + SOURCE_TASK_ID,
            'Origin': BASE_URL
        }
    });
    const data = await res.json();
    if (data.result === 109) throw new Error('SESSION_EXPIRED');
    return data;
}

// ─── API steps ───

async function fetchTemplateDetail(cookies) {
    log('INFO', `Fetching template task detail (planId: ${SOURCE_TASK_ID})...`);
    const resp = await apiPost('/rest/pc/creator/marketing/distribution/detail', {
        distributionPlanId: Number(SOURCE_TASK_ID),
        detailType: 'Online'
    }, cookies);

    if (resp.result !== 1) throw new Error(`Failed to fetch template: ${resp.message}`);
    return resp.data;
}

async function checkText(text, cookies) {
    log('INFO', `Checking text: "${text}"...`);
    const resp = await apiPost('/rest/pc/creator/marketing/common/textCheck', { text }, cookies);
    if (resp.result !== 1) throw new Error(`textCheck API error: ${resp.message}`);
    if (!resp.data.valid) throw new Error(`Text rejected by Kuaishou: "${resp.data.message}"`);
    log('INFO', '  ✅ Text check passed');
}

async function checkResource(appId, appPath, cookies) {
    log('INFO', `Checking resource path...`);
    const resp = await apiPost('/rest/pc/creator/marketing/distribution/resource/checkResource', {
        appId,
        appPath
    }, cookies);
    if (resp.result !== 1) throw new Error(`checkResource API error: ${resp.message}`);
    if (!resp.data.result) throw new Error('Resource path rejected by Kuaishou');
    log('INFO', '  ✅ Resource check passed');
}

async function generateAiCover(resourceTitle, cookies) {
    log('INFO', 'Generating AI cover image...');

    // Step 1: AI review
    const review = await apiGet('/rest/node/ai/review', cookies);
    if (review.result !== 1 || review.data?.result !== 1) {
        log('WARN', `AI review issue: ${review.data?.reason || 'unknown'}`);
    }

    await randomDelay();

    // Step 2: Generate AI image
    const imgResp = await apiGet('/rest/node/ai/img', cookies);
    if (imgResp.result !== 1 || !imgResp.data) {
        log('WARN', 'AI image generation failed, will use template cover');
        return null;
    }
    const cdnUrl = imgResp.data;
    log('INFO', `  AI image generated: ${cdnUrl}`);

    await randomDelay();

    // Step 3: Upload to permanent storage
    const uploadResp = await apiPost('/rest/pc/creator/marketing/common/uploadImage', {
        url: cdnUrl
    }, cookies);
    if (uploadResp.result !== 1 || !uploadResp.data?.uri) {
        log('WARN', 'Image upload failed, will use template cover');
        return null;
    }
    log('INFO', `  ✅ Uploaded: ${uploadResp.data.uri}`);
    return uploadResp.data.uri;
}

async function createDistributionTask(payload, cookies) {
    log('INFO', 'Submitting distribution task...');
    const resp = await apiPost('/rest/pc/creator/marketing/distribution/create', payload, cookies);
    if (resp.result !== 1) {
        throw new Error(`Create failed: result=${resp.result}, message=${resp.message}`);
    }
    return resp.data;
}

// ─── Main ───

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.error('Usage: node .harness/scripts/publish-kuaishou-api.js <appId> <appName> [description]');
        console.error('Environment: PROFILE_ID=nanrenbao|womanai|parent-tools|elder-love');
        process.exit(1);
    }

    const [appId, appName, appDesc] = args;

    log('INFO', '═══════════════════════════════════════');
    log('INFO', ' Kuaishou API Publisher (no browser)');
    log('INFO', '═══════════════════════════════════════');
    log('INFO', `App: ${appId}`);
    log('INFO', `Name: ${appName}`);
    log('INFO', `Profile: ${PROFILE_ID}`);
    log('INFO', `Template: ${SOURCE_TASK_ID}`);

    // 1. Local validation
    const nameCheck = validateTaskName(appName);
    if (!nameCheck.valid) {
        log('ERROR', nameCheck.message);
        process.exit(1);
    }

    // 2. Extract cookies
    const cookies = extractCookieHeader();
    log('INFO', 'Auth cookies loaded');

    try {
        // 3. Fetch template details
        const template = await fetchTemplateDetail(cookies);
        await randomDelay();

        // 4. Server-side text check
        await checkText(appName, cookies);
        await randomDelay();

        // 5. Build resource path and check it
        const resourcePath = `pages/rewardedWebview/rewardedWebview?target=${appId}&showAd=true`;
        await checkResource(template.miniAppId, resourcePath, cookies);
        await randomDelay();

        // 6. Generate AI cover (or fall back to template cover)
        let coverUri = await generateAiCover(appName, cookies);
        if (!coverUri) {
            // Extract URI from template cover URL
            const templateCover = template.resourceInfos?.[0]?.resourceCover || '';
            const uriMatch = templateCover.match(/\/kos\/[^\s?]+/);
            coverUri = uriMatch ? uriMatch[0] : templateCover;
            log('INFO', `Using template cover: ${coverUri}`);
        }
        await randomDelay();

        // 7. Build create payload
        const now = new Date();
        const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const fiveYearsMs = todayMs + 5 * 365 * 24 * 60 * 60 * 1000;

        const payload = {
            resourceSource: 1,                              // 小程序
            miniAppId: template.miniAppId,                   // e.g. ks655273748878573030
            indicators: template.indicatorValues || [1],
            bidType: 2,
            distributionMatchType: template.distributionMatchType || 1,
            payType: template.payType || 3,
            bidInfos: template.bidInfos.map(b => ({
                bidValueType: b.bidValueType,
                bidValue: b.bidValue,
                bidCondition: {
                    key: b.bidCondition.key,
                    op: b.bidCondition.op,
                    value: b.bidCondition.value
                }
            })),
            budget: null,
            classifications: template.classifications || [11, 8],
            effectiveTime: todayMs,
            lostTime: fiveYearsMs,
            introduce: template.introduce,
            settleDesc: template.settleDesc,
            agreement: template.agreement || { title: '', url: '' },
            attendLimit: template.attendLimit ?? -1,
            crowdInfo: {
                type: 1,
                channels: [],
                userIds: [],
                uploadFileName: ''
            },
            minFansCount: template.minFansCount ?? -1,
            maxFansCount: template.maxFansCount ?? -1,
            autoAppendSwitch: template.autoAppendSwitch || 0,
            onceAppendAmount: 0,
            appendAmountRatio: '',
            appendAmountCeiling: 0,
            resourceInfos: [{
                resourceLink: '',
                resourceCover: coverUri,
                resourceId: 1,
                resourcePath: resourcePath,
                resourceTitle: appName,
                uniqueId: 0,
                aiSuggestion: '{"title":"","img":""}',
                status: 1
            }],
            distributionPlanTitle: appName,
            subResourceType: template.subResourceType || 2,
            miniAppResourceType: template.miniAppResourceType || 1,
            taskMountType: template.taskMountType || 1,
            examples: []
        };

        // 8. Submit!
        const result = await createDistributionTask(payload, cookies);

        log('INFO', '');
        log('INFO', '═══════════════════════════════════════');
        log('INFO', ` ✅ Task created successfully!`);
        log('INFO', `    Plan ID: ${result.distributionPlanId}`);
        log('INFO', `    Status: ${result.status} (进入审核)`);
        log('INFO', '═══════════════════════════════════════');

        // Output machine-readable result for pipeline integration
        const output = {
            success: true,
            distributionPlanId: result.distributionPlanId,
            appId,
            appName,
            profileId: PROFILE_ID,
            sourceTaskId: SOURCE_TASK_ID,
            resourcePath
        };
        console.log(JSON.stringify(output));

    } catch (error) {
        if (error.message === 'SESSION_EXPIRED') {
            log('ERROR', 'Session expired! Re-login: node .harness/scripts/ks-api-poc.js --sniff');
        } else {
            log('ERROR', error.message);
        }
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

export { fetchTemplateDetail, checkText, checkResource, generateAiCover, createDistributionTask };
