import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildInternalUrls,
    buildOfficialRequestAttempts,
    buildOfficialQueryUrl,
    buildPastDayRange,
    deriveShortVideoUrlFromOfficialMediaUrl,
    normalizeInternalDetailPayload,
    normalizeOfficialPayload,
    shouldContinueOfficialPagination
} from './kuaishou-follow-api.js';

test('buildPastDayRange returns an Asia/Shanghai aligned day window', () => {
    const range = buildPastDayRange({
        days: 1,
        now: new Date('2026-04-12T02:00:00.000Z')
    });

    assert.equal(range.days, 1);
    assert.equal(range.timeZone, 'Asia/Shanghai');
    assert.equal(range.startMs < range.endMs, true);
    assert.equal(range.startDate, '2026-04-10');
    assert.equal(range.lastDate, '2026-04-10');
    assert.equal(range.latestAvailableOffset, 2);
});

test('buildInternalUrls uses the computed timestamp window', () => {
    const urls = buildInternalUrls({
        range: {
            startMs: 1000,
            endMs: 2000
        }
    });

    assert.match(urls.detail, /plcDetailDataV2/);
    assert.match(urls.detail, /start=1000/);
    assert.match(urls.detail, /end=2000/);
    assert.match(urls.core, /plcCoreDataV2/);
});

test('normalizeInternalDetailPayload maps page data into stable fields', () => {
    const result = normalizeInternalDetailPayload({
        data: {
            curPageData: [
                {
                    _0: '1775750400000',
                    authorName: '晴天娃娃 默',
                    openId: 'open-1',
                    videoId: 'video-1',
                    videoLink: '3xwrfhxamzi57wi',
                    caption: '标题',
                    playCnt: '1'
                }
            ]
        }
    });

    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].authorName, '晴天娃娃 默');
    assert.equal(result.records[0].videoUrl, 'https://www.kuaishou.com/short-video/3xwrfhxamzi57wi');
});

test('normalizeOfficialPayload tolerates multiple possible list shapes', () => {
    const result = normalizeOfficialPayload({
        result: 1,
        data: {
            records: {
                total: 1,
                plcPhotoDetailList: [
                    {
                        uploadDt: '2026-04-10',
                        authorName: '作者A',
                        openId: 'open-2',
                        photoId: 'video-2',
                        photoUrl: 'https://www.kuaishou.com/short-video/abc123',
                        plcMntpath: '/pages/home/index',
                        displayPlayCnt: 12,
                        plcClickCnt: 2
                    }
                ]
            },
            next_cursor: '9302550'
        }
    });

    assert.equal(result.records.length, 1);
    assert.equal(result.records[0].authorName, '作者A');
    assert.equal(result.records[0].videoUrl, 'https://www.kuaishou.com/short-video/abc123');
    assert.equal(result.nextCursor, '9302550');
    assert.equal(result.total, 1);
});

test('deriveShortVideoUrlFromOfficialMediaUrl extracts slug from clientCacheKey', () => {
    const url = deriveShortVideoUrlFromOfficialMediaUrl(
        'https://tymov2.a.kwimgs.com/upic/2026/04/11/10/demo.mp4?clientCacheKey=3x33g9ix88bjzuy_b.mp4&tt=b'
    );

    assert.equal(url, 'https://www.kuaishou.com/short-video/3x33g9ix88bjzuy');
});

test('buildOfficialRequestAttempts prepares snake and camel GET fallbacks', () => {
    const attempts = buildOfficialRequestAttempts({
        accessToken: 'token',
        appId: 'ks-app',
        cursor: '1000'
    });

    assert.equal(attempts.length, 2);
    assert.equal(attempts[0].method, 'GET');
    assert.equal(attempts[1].method, 'GET');
    assert.match(attempts[0].url, /access_token=token/);
    assert.match(attempts[0].url, /app_id=ks-app/);
    assert.match(attempts[0].url, /cursor=1000/);
    assert.match(attempts[1].url, /accessToken=token/);
});

test('buildOfficialQueryUrl supports the documented snake_case params', () => {
    const url = buildOfficialQueryUrl({
        accessToken: 'token',
        appId: 'ks-app'
    });

    assert.match(url, /plc\/photo\/query/);
    assert.match(url, /access_token=token/);
    assert.match(url, /app_id=ks-app/);
    assert.match(url, /page_size=500/);
});

test('shouldContinueOfficialPagination follows next_cursor until exhausted', () => {
    assert.equal(shouldContinueOfficialPagination([
        { date: '2026-04-10' },
        { date: '2026-04-10' }
    ], '9302550'), true);

    assert.equal(shouldContinueOfficialPagination([
        { date: '2026-04-09' }
    ], '0'), false);
});
