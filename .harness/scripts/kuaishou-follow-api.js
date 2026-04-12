import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export const OFFICIAL_VIDEO_MOUNT_ENDPOINT = 'https://open.kuaishou.com/openapi/mp/developer/plc/photo/query';
export const OFFICIAL_TOKEN_ENDPOINT = 'https://open.kuaishou.com/oauth2/access_token';
export const INTERNAL_BASE_URL = 'https://open.kuaishou.com';
export const CHINA_TIMEZONE = 'Asia/Shanghai';

export function formatDateInTimeZone(date, timeZone = CHINA_TIMEZONE) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find(item => item.type === 'year')?.value;
    const month = parts.find(item => item.type === 'month')?.value;
    const day = parts.find(item => item.type === 'day')?.value;

    return `${year}-${month}-${day}`;
}

export function getTimePartsInZone(date, timeZone = CHINA_TIMEZONE) {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false
    });
    const parts = formatter.formatToParts(date);
    return {
        year: parts.find(item => item.type === 'year')?.value,
        month: parts.find(item => item.type === 'month')?.value,
        day: parts.find(item => item.type === 'day')?.value,
        hour: Number(parts.find(item => item.type === 'hour')?.value || '0')
    };
}

export function buildPastDayRange({
    days = 1,
    now = new Date(),
    timeZone = CHINA_TIMEZONE
} = {}) {
    const effectiveDays = Number(days) > 0 ? Number(days) : 1;
    const parts = getTimePartsInZone(now, timeZone);
    const currentDayStartMs = Date.parse(`${parts.year}-${parts.month}-${parts.day}T00:00:00+08:00`);
    const latestAvailableOffset = parts.hour >= 12 ? 1 : 2;
    const latestAvailableStartMs = currentDayStartMs - (latestAvailableOffset * 24 * 60 * 60 * 1000);
    const startMs = latestAvailableStartMs - ((effectiveDays - 1) * 24 * 60 * 60 * 1000);
    const endMs = latestAvailableStartMs + (24 * 60 * 60 * 1000);
    const startDate = formatDateInTimeZone(new Date(startMs), timeZone);
    const endExclusiveDate = formatDateInTimeZone(new Date(endMs), timeZone);
    const lastDate = formatDateInTimeZone(new Date(endMs - (24 * 60 * 60 * 1000)), timeZone);

    return {
        days: effectiveDays,
        timeZone,
        startMs,
        endMs,
        startDate,
        endExclusiveDate,
        lastDate,
        latestAvailableOffset
    };
}

export function extractCookieHeader(authFile) {
    const authState = JSON.parse(readFileSync(authFile, 'utf-8'));
    const cookies = (authState.cookies || [])
        .filter(item => item.domain && item.domain.includes('kuaishou.com'))
        .map(item => `${item.name}=${item.value}`)
        .join('; ');

    if (!cookies) {
        throw new Error(`No kuaishou.com cookies found in ${authFile}`);
    }

    return cookies;
}

export function buildInternalUrls({
    baseUrl = INTERNAL_BASE_URL,
    range,
    page = 1
} = {}) {
    const detail = new URL('/rest/bi/plcDetailDataV2', baseUrl);
    detail.searchParams.set('page', String(page));
    detail.searchParams.set('start', String(range.startMs));
    detail.searchParams.set('end', String(range.endMs));

    const core = new URL('/rest/bi/plcCoreDataV2', baseUrl);
    core.searchParams.set('start', String(range.startMs));
    core.searchParams.set('end', String(range.endMs));

    return {
        detail: detail.toString(),
        core: core.toString()
    };
}

export function normalizeInternalDetailRecord(record = {}) {
    const videoLink = String(record.videoLink || '').trim();
    return {
        date: record._0 ? new Date(Number(record._0)).toISOString().slice(0, 10) : '',
        authorName: String(record.authorName || '').trim(),
        openId: String(record.openId || '').trim(),
        videoId: String(record.videoId || '').trim(),
        videoLink,
        videoUrl: videoLink ? `https://www.kuaishou.com/short-video/${videoLink}` : '',
        caption: String(record.caption || '').trim(),
        resourceBitPath: String(record.resourceBitPath || '').trim(),
        fansCnt: String(record.fansCnt || '').trim(),
        playCnt: String(record.playCnt || '').trim(),
        commentCnt: String(record.commentCnt || '').trim(),
        likeCnt: String(record.likeCnt || '').trim(),
        shareCnt: String(record.shareCnt || '').trim(),
        completePlayRate: String(record.completePlayRate || '').trim(),
        showCnt: String(record.showCnt || '').trim(),
        clickCnt: String(record.clickCnt || '').trim(),
        clickRate: String(record.clickRate || '').trim(),
        enterCnt: String(record.enterCnt || '').trim(),
        submitOrderNum: String(record.submitOrderNum || '').trim(),
        payOrderNum: String(record.payOrderNum || '').trim(),
        payOrderAmt: record.payOrderAmt ?? null,
        averageAmt: String(record.averageAmt || '').trim(),
        refundCnt: String(record.refundCnt || '').trim(),
        refundAmt: record.refundAmt ?? null,
        raw: record
    };
}

export function normalizeInternalDetailPayload(payload = {}) {
    const records = Array.isArray(payload?.data?.curPageData)
        ? payload.data.curPageData.map(normalizeInternalDetailRecord)
        : [];

    return {
        records,
        pagination: payload?.data?.pagination || null,
        raw: payload
    };
}

function extractOfficialRows(payload = {}) {
    const candidates = [
        payload?.data?.records?.plcPhotoDetailList,
        payload?.data?.list,
        payload?.data?.records,
        payload?.data?.data,
        payload?.data?.curPageData,
        payload?.list,
        payload?.records,
        payload?.data
    ];

    return candidates.find(value => Array.isArray(value)) || [];
}

export function deriveShortVideoUrlFromOfficialMediaUrl(mediaUrl = '') {
    const normalized = String(mediaUrl || '').trim();
    if (!normalized) {
        return '';
    }

    if (normalized.startsWith('https://www.kuaishou.com/short-video/')) {
        return normalized;
    }

    try {
        const parsed = new URL(normalized);
        const clientCacheKey = parsed.searchParams.get('clientCacheKey') || '';
        const match = clientCacheKey.match(/^([a-z0-9]+)_b\.mp4$/i);
        if (match) {
            return `https://www.kuaishou.com/short-video/${match[1]}`;
        }
    } catch {
        // Fall back to empty result when the media URL is not parseable.
    }

    return '';
}

export function normalizeOfficialPayload(payload = {}) {
    const rows = extractOfficialRows(payload);
    const records = rows.map(item => ({
        authorName: String(item.authorName || item.nickname || item.userName || '').trim(),
        openId: String(item.openId || item.authorOpenId || item.userOpenId || '').trim(),
        videoId: String(item.videoId || item.photoId || '').trim(),
        videoLink: String(item.videoLink || item.shortVideoId || item.photoUrl || '').trim(),
        videoUrl: item.videoUrl
            ? String(item.videoUrl).trim()
            : (
                item.photoUrl
                    ? (
                        deriveShortVideoUrlFromOfficialMediaUrl(item.photoUrl)
                        || String(item.photoUrl).trim()
                    )
                    : (
                        item.videoLink || item.shortVideoId
                            ? `https://www.kuaishou.com/short-video/${String(item.videoLink || item.shortVideoId).trim()}`
                            : ''
                    )
            ),
        date: String(item.uploadDt || item.date || '').trim(),
        caption: String(item.caption || item.photoTitle || item.title || '').trim(),
        resourceBitPath: String(item.resourceBitPath || item.plcMntpath || '').trim(),
        fansCnt: String(item.fansCnt || item.accuDisplayFansUserNum || '').trim(),
        playCnt: String(item.playCnt || item.displayPlayCnt || item.playCount || '').trim(),
        commentCnt: String(item.commentCnt || item.displayCommentCnt || '').trim(),
        likeCnt: String(item.likeCnt || item.displayLikeCnt || '').trim(),
        shareCnt: String(item.shareCnt || item.shareSuccessCnt || '').trim(),
        completePlayRate: String(item.completePlayRate || item.completePlayRatio || '').trim(),
        showCnt: String(item.showCnt || item.plcShowCnt || '').trim(),
        clickCnt: String(item.clickCnt || item.plcClickCnt || item.clickCount || '').trim(),
        clickRate: String(item.clickRate || '').trim(),
        enterCnt: String(item.enterCnt || item.plcClickEnterCnt || item.enterCount || '').trim(),
        submitOrderNum: String(item.submitOrderNum || '').trim(),
        payOrderNum: String(item.payOrderNum || '').trim(),
        payOrderAmt: item.payOrderAmt ?? null,
        averageAmt: String(item.averageAmt || item.avgPrice || '').trim(),
        refundCnt: String(item.refundCnt || item.refundOrderCnt || '').trim(),
        refundAmt: item.refundAmt ?? null,
        raw: item
    }));

    return {
        records,
        nextCursor: String(payload?.data?.next_cursor || '').trim(),
        total: Number(payload?.data?.records?.total || rows.length || 0),
        raw: payload
    };
}

export function buildOfficialQueryUrl({
    accessToken,
    appId,
    pageSize = 500,
    cursor = '0',
    endpoint = OFFICIAL_VIDEO_MOUNT_ENDPOINT,
    casing = 'snake'
} = {}) {
    const url = new URL(endpoint);
    if (casing === 'camel') {
        url.searchParams.set('accessToken', String(accessToken || '').trim());
        url.searchParams.set('appId', String(appId || '').trim());
        url.searchParams.set('pageSize', String(pageSize));
    } else {
        url.searchParams.set('access_token', String(accessToken || '').trim());
        url.searchParams.set('app_id', String(appId || '').trim());
        url.searchParams.set('page_size', String(pageSize));
    }
    url.searchParams.set('cursor', String(cursor || '0'));
    return url.toString();
}

export function buildOfficialRequestAttempts({
    accessToken,
    appId,
    pageSize = 500,
    cursor = '0',
    endpoint = OFFICIAL_VIDEO_MOUNT_ENDPOINT
} = {}) {
    return [
        {
            label: 'official-get-snake',
            method: 'GET',
            url: buildOfficialQueryUrl({
                accessToken,
                appId,
                pageSize,
                cursor,
                endpoint,
                casing: 'snake'
            })
        },
        {
            label: 'official-get-camel',
            method: 'GET',
            url: buildOfficialQueryUrl({
                accessToken,
                appId,
                pageSize,
                cursor,
                endpoint,
                casing: 'camel'
            })
        }
    ];
}

export function isRecordWithinRange(record, range) {
    const date = String(record?.date || '').trim();
    if (!date) {
        return false;
    }
    return date >= range.startDate && date <= range.lastDate;
}

export function shouldContinueOfficialPagination(records, nextCursor) {
    return Array.isArray(records) && records.length > 0 && String(nextCursor || '0') !== '0';
}

export async function requestOfficialAccessToken({
    appId,
    appSecret,
    fetchImpl = fetch
} = {}) {
    const url = new URL(OFFICIAL_TOKEN_ENDPOINT);
    url.searchParams.set('app_id', String(appId || '').trim());
    url.searchParams.set('app_secret', String(appSecret || '').trim());
    url.searchParams.set('grant_type', 'client_credentials');

    const response = await fetchImpl(url.toString(), {
        method: 'GET'
    });

    const payload = await response.json();
    if (!response.ok || payload?.result !== 1 || !payload?.access_token) {
        throw new Error(`Failed to get access token: ${JSON.stringify(payload)}`);
    }

    return payload;
}

export async function fetchInternalPastDayData({
    appId,
    authFile,
    range,
    fetchImpl = fetch
} = {}) {
    const cookie = extractCookieHeader(authFile);
    const urls = buildInternalUrls({ range });
    const headers = {
        'Accept': 'application/json, text/plain, */*',
        'Cookie': cookie,
        'Referer': `https://open.kuaishou.com/project/data-operation-data?appId=${String(appId || '').trim()}`,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36'
    };

    const [detailResponse, coreResponse] = await Promise.all([
        fetchImpl(urls.detail, { headers }),
        fetchImpl(urls.core, { headers })
    ]);
    const detailPayload = await detailResponse.json();
    const corePayload = await coreResponse.json();

    if (!detailResponse.ok || detailPayload?.result !== 1) {
        throw new Error(`Internal detail request failed: ${JSON.stringify(detailPayload)}`);
    }
    if (!coreResponse.ok || corePayload?.result !== 1) {
        throw new Error(`Internal core request failed: ${JSON.stringify(corePayload)}`);
    }

    const normalized = normalizeInternalDetailPayload(detailPayload);
    return {
        strategy: 'browser',
        detailUrl: urls.detail,
        coreUrl: urls.core,
        records: normalized.records,
        coreData: corePayload?.data || null,
        raw: {
            detail: detailPayload,
            core: corePayload
        }
    };
}

export async function fetchOfficialPastDayData({
    appId,
    appSecret,
    range,
    endpoint = OFFICIAL_VIDEO_MOUNT_ENDPOINT,
    pageSize = 500,
    maxPages = 20,
    fetchImpl = fetch
} = {}) {
    const tokenPayload = await requestOfficialAccessToken({
        appId,
        appSecret,
        fetchImpl
    });
    const failures = [];
    const collected = [];
    const rawPages = [];
    let cursor = '0';
    let successAttempt = '';

    for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
        const attempts = buildOfficialRequestAttempts({
            accessToken: tokenPayload.access_token,
            appId,
            pageSize,
            cursor,
            endpoint
        });
        let pagePayload = null;
        let pageNormalized = null;
        let pageSucceeded = false;

        for (const attempt of attempts) {
            const response = await fetchImpl(attempt.url, {
                method: attempt.method,
                headers: attempt.headers,
                body: attempt.body
            });

            let payload = null;
            const responseText = await response.text();
            try {
                payload = JSON.parse(responseText);
            } catch {
                payload = { rawText: responseText };
            }

            if (response.ok && payload?.result === 1) {
                pageNormalized = normalizeOfficialPayload(payload);
                pagePayload = payload;
                pageSucceeded = true;
                successAttempt = attempt.label;
                break;
            }

            failures.push({
                label: attempt.label,
                status: response.status,
                payload
            });
        }

        if (!pageSucceeded) {
            throw new Error(`Official API attempts failed: ${JSON.stringify(failures)}`);
        }

        rawPages.push(pagePayload);
        const matched = pageNormalized.records.filter(record => isRecordWithinRange(record, range));
        collected.push(...matched);

        const nextCursor = pageNormalized.nextCursor || '0';
        const keepPaging = shouldContinueOfficialPagination(pageNormalized.records, nextCursor);
        if (!keepPaging) {
            break;
        }
        cursor = nextCursor;
    }

    return {
        strategy: 'official',
        endpoint,
        accessTokenExpiresIn: tokenPayload.expires_in,
        records: collected,
        raw: rawPages,
        successAttempt
    };
}

export function writeExportFile(exportsDir, filename, payload) {
    const filePath = join(exportsDir, filename);
    writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
    return filePath;
}
