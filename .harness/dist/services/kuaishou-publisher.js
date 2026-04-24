/**
 * Kuaishou Publisher - HTTP API implementation
 * Uses /rest/pc/creator/marketing/* endpoints (same as legacy)
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join, basename } from 'path';
import { PATHS } from '../config/index.js';
import { logger } from '../utils/logger.js';
// Profile → Source Task mapping
const PROFILE_SOURCE_TASKS = {
    nanrenbao: '165805',
    'elder-love': '183044',
    'parent-tools': '186229',
    womanai: '188816',
};
const BASE_URL = 'https://daren.kuaishou.com';
const DELAY_MS = { min: 300, max: 800 };
function getLatestReportPath() {
    const reportDir = join(PATHS.projectRoot, '.harness', '.local', 'exports', 'metrics', 'kuaishou', 'daily');
    if (!existsSync(reportDir)) {
        return null;
    }
    const files = readdirSync(reportDir)
        .filter(f => /^kuaishou_report_\d{4}-\d{2}-\d{2}\.json$/.test(f))
        .sort();
    return files.length > 0 ? join(reportDir, files[files.length - 1]) : null;
}
function isAlreadyPublished(appName) {
    const reportPath = getLatestReportPath();
    if (!reportPath) {
        logger.info('No historical report found for deduplication, continuing.');
        return false;
    }
    try {
        const data = JSON.parse(readFileSync(reportPath, 'utf-8'));
        const names = new Set((data.allTasks || []).map((t) => t.name).filter(Boolean));
        if (names.has(appName)) {
            logger.info(`${appName} already exists in latest report (${basename(reportPath)}), skipping publication.`);
            return true;
        }
    }
    catch (e) {
        logger.warn('Failed to read report for deduplication', { error: e.message });
    }
    return false;
}
function randomDelay() {
    const ms = DELAY_MS.min + Math.random() * (DELAY_MS.max - DELAY_MS.min);
    return new Promise(r => setTimeout(r, ms));
}
export class KuaishouPublisher {
    config;
    cookies = '';
    sourceTaskId;
    constructor(config) {
        this.config = config;
        this.sourceTaskId = PROFILE_SOURCE_TASKS[config.profileId] || '165805';
    }
    sanitizeAppName(name) {
        return name.replace(/[·\-]/g, ' ').replace(/\s+/g, ' ').trim();
    }
    async publish() {
        try {
            // 0. Deduplication (check original name first)
            if (isAlreadyPublished(this.config.appName)) {
                return { success: true };
            }
            this.config.appName = this.sanitizeAppName(this.config.appName);
            logger.info(`Sanitized appName: "${this.config.appName}"`);
            // 1. Extract cookies
            this.cookies = this.extractCookies();
            logger.info('Auth cookies loaded');
            // 2. Fetch template details
            const template = await this.fetchTemplateDetail();
            await randomDelay();
            // 3. Server-side text check
            await this.checkText(this.config.appName);
            await randomDelay();
            // 4. Check resource path
            const resourcePath = `pages/rewardedWebview/rewardedWebview?target=${this.config.appId}&showAd=true`;
            await this.checkResource(template.miniAppId, resourcePath);
            await randomDelay();
            // 5. Generate AI cover (or fall back to template cover)
            let coverUri = await this.generateAiCover(this.config.appName);
            if (!coverUri) {
                const templateCover = template.resourceInfos?.[0]?.resourceCover || '';
                const uriMatch = templateCover.match(/\/kos\/[^\s?]+/);
                coverUri = uriMatch ? uriMatch[0] : templateCover;
                logger.info(`Using template cover: ${coverUri}`);
            }
            await randomDelay();
            // 6. Build and submit payload
            const result = await this.createDistributionTask(template, resourcePath, coverUri);
            logger.info(`Task created successfully! Plan ID: ${result.distributionPlanId}`);
            return {
                success: true,
                planId: String(result.distributionPlanId),
            };
        }
        catch (error) {
            logger.error('Kuaishou publish failed', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }
    extractCookies() {
        const authFile = join(PATHS.auth, 'kuaishou_auth.json');
        try {
            const content = readFileSync(authFile, 'utf-8');
            const state = JSON.parse(content);
            const cookies = (state.cookies || [])
                .filter((c) => c.domain?.includes('kuaishou.com'))
                .map((c) => `${c.name}=${c.value}`)
                .join('; ');
            if (!cookies) {
                throw new Error('No kuaishou cookies found in auth file');
            }
            return cookies;
        }
        catch (e) {
            if (e.message.includes('ENOENT')) {
                throw new Error(`Auth file not found: ${authFile}`);
            }
            throw e;
        }
    }
    async apiPost(endpoint, body) {
        const url = `${BASE_URL}${endpoint}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cookie': this.cookies,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': `https://daren.kuaishou.com/distribution-plan-create/recreate/${this.sourceTaskId}`,
                'Origin': BASE_URL,
            },
            body: JSON.stringify(body),
        });
        const data = await res.json();
        if (data.result === 109)
            throw new Error('SESSION_EXPIRED');
        return data;
    }
    async apiGet(endpoint) {
        const url = `${BASE_URL}${endpoint}`;
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cookie': this.cookies,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Referer': `https://daren.kuaishou.com/distribution-plan-create/recreate/${this.sourceTaskId}`,
                'Origin': BASE_URL,
            },
        });
        const data = await res.json();
        if (data.result === 109)
            throw new Error('SESSION_EXPIRED');
        return data;
    }
    async fetchTemplateDetail() {
        logger.info(`Fetching template task detail (planId: ${this.sourceTaskId})...`);
        const resp = await this.apiPost('/rest/pc/creator/marketing/distribution/detail', {
            distributionPlanId: Number(this.sourceTaskId),
            detailType: 'Online',
        });
        if (resp.result !== 1)
            throw new Error(`Failed to fetch template: ${resp.message}`);
        return resp.data;
    }
    async checkText(text) {
        logger.info(`Checking text: "${text}"...`);
        const resp = await this.apiPost('/rest/pc/creator/marketing/common/textCheck', { text });
        if (resp.result !== 1)
            throw new Error(`textCheck API error: ${resp.message}`);
        if (!resp.data?.valid) {
            throw new Error(`Text rejected by Kuaishou: "${resp.data?.message}"`);
        }
        logger.info('Text check passed');
    }
    async checkResource(appId, appPath) {
        logger.info('Checking resource path...');
        const resp = await this.apiPost('/rest/pc/creator/marketing/distribution/resource/checkResource', {
            appId,
            appPath,
        });
        if (resp.result !== 1)
            throw new Error(`checkResource API error: ${resp.message}`);
        if (!resp.data?.result) {
            throw new Error('Resource path rejected by Kuaishou');
        }
        logger.info('Resource check passed');
    }
    async generateAiCover(resourceTitle) {
        logger.info('Generating AI cover image...');
        // Step 1: AI review
        const review = await this.apiGet('/rest/node/ai/review');
        if (review.result !== 1 || review.data?.result !== 1) {
            logger.warn(`AI review issue: ${review.data?.reason || 'unknown'}`);
        }
        await randomDelay();
        // Step 2: Generate AI image
        const imgResp = await this.apiGet('/rest/node/ai/img');
        if (imgResp.result !== 1 || !imgResp.data) {
            logger.warn('AI image generation failed, will use template cover');
            return null;
        }
        const cdnUrl = imgResp.data;
        logger.info(`AI image generated: ${cdnUrl}`);
        await randomDelay();
        // Step 3: Upload to permanent storage
        const uploadResp = await this.apiPost('/rest/pc/creator/marketing/common/uploadImage', { url: cdnUrl });
        if (uploadResp.result !== 1 || !uploadResp.data?.uri) {
            logger.warn('Image upload failed, will use template cover');
            return null;
        }
        logger.info(`Uploaded: ${uploadResp.data?.uri}`);
        return uploadResp.data?.uri;
    }
    async createDistributionTask(template, resourcePath, coverUri) {
        logger.info('Submitting distribution task...');
        const now = new Date();
        const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const fiveYearsMs = todayMs + 5 * 365 * 24 * 60 * 60 * 1000;
        const bidInfos = template.bidInfos?.map((b) => ({
            bidValueType: b.bidValueType,
            bidValue: b.bidValue,
            bidCondition: {
                key: b.bidCondition?.key,
                op: b.bidCondition?.op,
                value: b.bidCondition?.value,
            },
        }));
        const payload = {
            resourceSource: 1,
            miniAppId: template.miniAppId,
            indicators: template.indicatorValues || [1],
            bidType: 2,
            distributionMatchType: template.distributionMatchType || 1,
            payType: template.payType || 3,
            bidInfos,
            budget: null,
            classifications: template.classifications || [11, 8],
            effectiveTime: todayMs,
            lostTime: fiveYearsMs,
            introduce: template.introduce,
            settleDesc: template.settleDesc,
            agreement: template.agreement || { title: '', url: '' },
            attendLimit: template.attendLimit ?? -1,
            crowdInfo: { type: 1, channels: [], userIds: [], uploadFileName: '' },
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
                    resourcePath,
                    resourceTitle: this.config.appName,
                    uniqueId: 0,
                    aiSuggestion: '{"title":"","img":""}',
                    status: 1,
                }],
            distributionPlanTitle: this.config.appName,
            subResourceType: template.subResourceType || 2,
            miniAppResourceType: template.miniAppResourceType || 1,
            taskMountType: template.taskMountType || 1,
            examples: [],
        };
        const resp = await this.apiPost('/rest/pc/creator/marketing/distribution/create', payload);
        if (resp.result !== 1) {
            throw new Error(`Create failed: result=${resp.result}, message=${resp.message}`);
        }
        return resp.data;
    }
}
export async function publishToKuaishou(profileId, appId, appName, description) {
    const publisher = new KuaishouPublisher({ profileId, appId, appName, description });
    return publisher.publish();
}
//# sourceMappingURL=kuaishou-publisher.js.map