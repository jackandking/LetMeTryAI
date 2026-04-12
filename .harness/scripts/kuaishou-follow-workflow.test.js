import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
    DEFAULT_DAILY_FOLLOW_CAP,
    DEFAULT_START_URL,
    appendDiscoveryRecord,
    appendFollowRecord,
    appendObservationEvent,
    appendHourlyRunState,
    buildObservationPaths,
    buildDailyEmailReport,
    buildFollowRuntimePaths,
    buildNextDayResumeAt,
    buildRoundRobinBatch,
    buildManualSession,
    computeDailyQuotaUsage,
    createDiscoveryRecord,
    createObservationEvent,
    createObservationSession,
    createFollowRecord,
    createPendingCandidate,
    ensureFollowRuntime,
    ensureObservationRuntime,
    filterRecordsByPlanId,
    formatPageInspectionReport,
    formatObservationReport,
    hasProcessedCreator,
    isFollowableVideoUrl,
    loadDailyRunState,
    loadPendingQueue,
    mergeCandidatesIntoQueue,
    pickUnprocessedCandidates,
    readDiscoveryHistory,
    readFollowHistory,
    savePendingQueue,
    saveSession,
    saveObservationSession,
    shouldSendEndOfDayReport,
    summarizeFollowRecords
} from './kuaishou-follow-workflow.js';

test('buildFollowRuntimePaths keeps state under .harness/.local/state', () => {
    const paths = buildFollowRuntimePaths('/repo');

    assert.equal(paths.baseDir, '/repo/.harness/.local/state/kuaishou-follow');
    assert.equal(paths.sessionsDir, '/repo/.harness/.local/state/kuaishou-follow/sessions');
    assert.equal(paths.exportsDir, '/repo/.harness/.local/state/kuaishou-follow/exports');
    assert.equal(paths.dailyRunsDir, '/repo/.harness/.local/state/kuaishou-follow/daily-runs');
    assert.equal(paths.reportsDir, '/repo/.harness/.local/state/kuaishou-follow/reports');
    assert.equal(paths.historyFile, '/repo/.harness/.local/state/kuaishou-follow/follow-history.jsonl');
    assert.equal(paths.discoveriesFile, '/repo/.harness/.local/state/kuaishou-follow/discoveries.jsonl');
});

test('buildManualSession preserves the default creator entry page', () => {
    const session = buildManualSession({
        planId: '257060',
        now: '2026-04-12T01:00:00.000Z'
    });

    assert.equal(session.planId, '257060');
    assert.equal(session.startUrl, DEFAULT_START_URL);
    assert.equal(session.sessionId, 'kuaishou-follow-20260412010000');
});

test('hasProcessedCreator de-duplicates by creator id or handle', () => {
    const history = [
        createFollowRecord({
            creatorId: '12345',
            handle: '@alpha',
            status: 'followed',
            now: '2026-04-12T01:00:00.000Z'
        })
    ];

    assert.equal(hasProcessedCreator(history, { creatorId: '12345' }), true);
    assert.equal(hasProcessedCreator(history, { handle: '@ALPHA' }), true);
    assert.equal(hasProcessedCreator(history, { creatorId: '99999', handle: '@beta' }), false);
});

test('pickUnprocessedCandidates skips already-followed creators and source URLs', () => {
    const history = [
        createFollowRecord({
            creatorId: 'open-id-1',
            displayName: 'Alpha',
            sourceUrl: 'https://www.kuaishou.com/short-video/a1',
            status: 'followed',
            now: '2026-04-12T01:00:00.000Z'
        })
    ];
    const selected = pickUnprocessedCandidates([
        {
            creatorId: 'open-id-1',
            displayName: 'Alpha',
            sourceUrl: 'https://www.kuaishou.com/short-video/a1'
        },
        {
            creatorId: 'open-id-2',
            displayName: 'Beta',
            sourceUrl: 'https://www.kuaishou.com/short-video/b2'
        },
        {
            creatorId: '',
            displayName: 'Gamma',
            sourceUrl: 'https://www.kuaishou.com/short-video/c3'
        }
    ], history, 2);

    assert.deepEqual(selected, [
        {
            creatorId: 'open-id-2',
            displayName: 'Beta',
            sourceUrl: 'https://www.kuaishou.com/short-video/b2'
        },
        {
            creatorId: '',
            displayName: 'Gamma',
            sourceUrl: 'https://www.kuaishou.com/short-video/c3'
        }
    ]);
});

test('summarizeFollowRecords supports scoped plan summaries', () => {
    const records = [
        createFollowRecord({ creatorId: '1', planId: 'A', status: 'followed', now: '2026-04-12T01:00:00.000Z' }),
        createFollowRecord({ creatorId: '2', planId: 'A', status: 'skipped', now: '2026-04-12T01:01:00.000Z' }),
        createFollowRecord({ creatorId: '3', planId: 'B', status: 'failed', now: '2026-04-12T01:02:00.000Z' })
    ];

    const scoped = filterRecordsByPlanId(records, 'A');
    const summary = summarizeFollowRecords(scoped);

    assert.deepEqual(summary, {
        total: 2,
        uniqueCreators: 2,
        followed: 1,
        alreadyFollowed: 0,
        skipped: 1,
        failed: 0
    });
});

test('isFollowableVideoUrl only accepts public short-video URLs', () => {
    assert.equal(isFollowableVideoUrl('https://www.kuaishou.com/short-video/abc123'), true);
    assert.equal(isFollowableVideoUrl('https://www.kuaishou.com/profile/abc123'), false);
    assert.equal(isFollowableVideoUrl(''), false);
});

test('createPendingCandidate creates a stable queue record', () => {
    const candidate = createPendingCandidate({
        profileId: 'elder-love',
        profileName: '爱老人',
        appId: 'ks-app',
        planDate: '2026-04-10',
        record: {
            openId: 'OPEN-1',
            authorName: '作者A',
            videoId: 'video-1',
            videoUrl: 'https://www.kuaishou.com/short-video/abc123',
            playCnt: '12',
            clickCnt: '3'
        },
        now: '2026-04-12T05:00:00.000Z'
    });

    assert.equal(candidate.queueKey, 'id:open-1');
    assert.equal(candidate.authorName, '作者A');
    assert.equal(candidate.videoUrl, 'https://www.kuaishou.com/short-video/abc123');
    assert.equal(candidate.attemptCount, 0);
});

test('mergeCandidatesIntoQueue skips processed creators and upgrades to better candidates', () => {
    const history = [
        createFollowRecord({
            creatorId: 'open-1',
            status: 'followed',
            now: '2026-04-12T01:00:00.000Z'
        })
    ];
    const existingQueue = [
        createPendingCandidate({
            profileId: 'elder-love',
            profileName: '爱老人',
            appId: 'ks-app',
            planDate: '2026-04-10',
            record: {
                openId: 'open-2',
                authorName: '作者B',
                videoId: 'video-2',
                videoUrl: 'https://www.kuaishou.com/short-video/old2',
                playCnt: '10'
            },
            now: '2026-04-12T05:00:00.000Z'
        })
    ];
    const incoming = [
        createPendingCandidate({
            profileId: 'elder-love',
            profileName: '爱老人',
            appId: 'ks-app',
            planDate: '2026-04-10',
            record: {
                openId: 'open-1',
                authorName: '已处理',
                videoId: 'video-1',
                videoUrl: 'https://www.kuaishou.com/short-video/skip1'
            },
            now: '2026-04-12T05:01:00.000Z'
        }),
        createPendingCandidate({
            profileId: 'parent-tools',
            profileName: '家长爱',
            appId: 'ks-app-2',
            planDate: '2026-04-11',
            record: {
                openId: 'open-2',
                authorName: '作者B',
                videoId: 'video-2b',
                videoUrl: 'https://www.kuaishou.com/short-video/new2',
                playCnt: '999'
            },
            now: '2026-04-12T05:02:00.000Z'
        }),
        createPendingCandidate({
            profileId: 'parent-tools',
            profileName: '家长爱',
            appId: 'ks-app-3',
            planDate: '2026-04-11',
            record: {
                openId: 'open-3',
                authorName: '作者C',
                videoId: 'video-3',
                videoUrl: 'https://www.kuaishou.com/short-video/new3'
            },
            now: '2026-04-12T05:03:00.000Z'
        })
    ];

    const result = mergeCandidatesIntoQueue(existingQueue, incoming, history);
    assert.equal(result.added, 1);
    assert.equal(result.replaced, 1);
    assert.equal(result.skipped, 1);
    assert.equal(result.queue.length, 2);
    assert.equal(result.queue[0].videoUrl, 'https://www.kuaishou.com/short-video/new2');
});

test('pending queue can be saved and reloaded', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-queue-'));

    try {
        const paths = buildFollowRuntimePaths(tempRoot);
        ensureFollowRuntime(paths);
        const queue = [
            createPendingCandidate({
                profileId: 'elder-love',
                profileName: '爱老人',
                appId: 'ks-app',
                planDate: '2026-04-10',
                record: {
                    openId: 'open-1',
                    authorName: '作者A',
                    videoId: 'video-1',
                    videoUrl: 'https://www.kuaishou.com/short-video/abc123'
                },
                now: '2026-04-12T05:00:00.000Z'
            })
        ];

        savePendingQueue(paths.queueFile, queue);
        const reloaded = loadPendingQueue(paths.queueFile);
        assert.equal(reloaded.length, 1);
        assert.equal(reloaded[0].queueKey, 'id:open-1');
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('buildRoundRobinBatch alternates profiles while selecting candidates', () => {
    const queue = [
        createPendingCandidate({
            profileId: 'elder-love',
            profileName: '爱老人',
            appId: 'ks-1',
            planDate: '2026-04-10',
            record: { openId: 'open-1', authorName: 'A1', videoUrl: 'https://www.kuaishou.com/short-video/a1' },
            now: '2026-04-12T05:00:00.000Z'
        }),
        createPendingCandidate({
            profileId: 'elder-love',
            profileName: '爱老人',
            appId: 'ks-1',
            planDate: '2026-04-10',
            record: { openId: 'open-2', authorName: 'A2', videoUrl: 'https://www.kuaishou.com/short-video/a2' },
            now: '2026-04-12T05:00:01.000Z'
        }),
        createPendingCandidate({
            profileId: 'parent-tools',
            profileName: '家长爱',
            appId: 'ks-2',
            planDate: '2026-04-10',
            record: { openId: 'open-3', authorName: 'B1', videoUrl: 'https://www.kuaishou.com/short-video/b1' },
            now: '2026-04-12T05:00:02.000Z'
        }),
        createPendingCandidate({
            profileId: 'womanai',
            profileName: '女人爱',
            appId: 'ks-3',
            planDate: '2026-04-10',
            record: { openId: 'open-4', authorName: 'C1', videoUrl: 'https://www.kuaishou.com/short-video/c1' },
            now: '2026-04-12T05:00:03.000Z'
        })
    ];

    const selected = buildRoundRobinBatch(queue, {
        limit: 4,
        now: '2026-04-12T06:00:00.000Z'
    });
    assert.deepEqual(selected.map(item => item.profileId), ['elder-love', 'parent-tools', 'womanai', 'elder-love']);
});

test('daily run state stores hourly runs and end-of-day report summary', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-day-state-'));

    try {
        const paths = buildFollowRuntimePaths(tempRoot);
        ensureFollowRuntime(paths);

        appendHourlyRunState(paths.dailyRunsDir, '2026-04-12', {
            startedAt: '2026-04-12T06:00:00.000Z',
            attempted: 3,
            followed: 2,
            alreadyFollowed: 1,
            failed: 0,
            stopReason: 'queue-empty'
        });

        const dayState = loadDailyRunState(paths.dailyRunsDir, '2026-04-12');
        assert.equal(dayState.hourlyRuns.length, 1);
        assert.equal(dayState.hourlyRuns[0].attempted, 3);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('computeDailyQuotaUsage counts followed records for the target date only', () => {
    const records = [
        createFollowRecord({ creatorId: '1', status: 'followed', now: '2026-04-12T01:00:00.000Z' }),
        createFollowRecord({ creatorId: '2', status: 'already-followed', now: '2026-04-12T01:01:00.000Z' }),
        createFollowRecord({ creatorId: '3', status: 'followed', now: '2026-04-11T01:00:00.000Z' })
    ];

    assert.equal(computeDailyQuotaUsage(records, '2026-04-12'), 1);
});

test('shouldSendEndOfDayReport returns true when queue is empty or cap reached', () => {
    const history = Array.from({ length: DEFAULT_DAILY_FOLLOW_CAP }, (_, index) => {
        return createFollowRecord({
            creatorId: String(index),
            status: 'followed',
            now: `2026-04-12T01:${String(index % 60).padStart(2, '0')}:00.000Z`
        });
    });
    const sendOnCap = shouldSendEndOfDayReport({ report: null, hourlyRuns: [] }, {
        queue: [{ queueKey: 'pending-1', deferUntil: '2026-04-13T14:00:00.000+08:00' }],
        dateKey: '2026-04-12',
        history,
        dailyCap: DEFAULT_DAILY_FOLLOW_CAP
    });
    const sendOnEmptyQueue = shouldSendEndOfDayReport({ report: null, hourlyRuns: [] }, {
        queue: [],
        dateKey: '2026-04-12',
        history: [],
        dailyCap: DEFAULT_DAILY_FOLLOW_CAP
    });

    assert.equal(sendOnCap, true);
    assert.equal(sendOnEmptyQueue, true);
});

test('buildDailyEmailReport formats a readable end-of-day summary', () => {
    const history = [
        createFollowRecord({ creatorId: '1', status: 'followed', now: '2026-04-12T01:00:00.000Z' }),
        createFollowRecord({ creatorId: '2', status: 'already-followed', now: '2026-04-12T01:01:00.000Z' }),
        createFollowRecord({ creatorId: '3', status: 'failed', now: '2026-04-12T01:02:00.000Z' })
    ];
    const report = buildDailyEmailReport({
        dateKey: '2026-04-12',
        dayState: {
            ingestion: {
                appCount: 4,
                totalFetched: 30,
                eligibleCandidates: 12,
                queueAdded: 10,
                skippedMissingVideoUrl: 2
            },
            hourlyRuns: [
                {
                    startedAt: '2026-04-12T06:00:00.000Z',
                    attempted: 3,
                    followed: 1,
                    alreadyFollowed: 1,
                    failed: 1,
                    stopReason: 'queue-empty'
                }
            ]
        },
        queue: [],
        history,
        dailyCap: 100
    });

    assert.match(report.subject, /2026-04-12/);
    assert.match(report.body, /Followed: 1/);
    assert.match(report.body, /Hourly runs: 1/);
    assert.equal(report.summary.historySummary.alreadyFollowed, 1);
});

test('buildNextDayResumeAt defers to the next report hour', () => {
    const resumeAt = buildNextDayResumeAt('2026-04-12T05:00:00.000Z', 14);
    assert.equal(resumeAt, '2026-04-13T14:00:00.000+08:00');
});

test('saveSession and appendFollowRecord persist reusable manual workflow state', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-follow-'));

    try {
        const paths = buildFollowRuntimePaths(tempRoot);
        ensureFollowRuntime(paths);

        const session = buildManualSession({
            planId: '257060',
            now: '2026-04-12T01:00:00.000Z'
        });
        const sessionFile = saveSession(paths, session);

        appendFollowRecord(paths.historyFile, createFollowRecord({
            sessionId: session.sessionId,
            planId: session.planId,
            creatorId: '12345',
            handle: '@alpha',
            status: 'followed',
            now: '2026-04-12T01:03:00.000Z'
        }));

        const latestSession = JSON.parse(readFileSync(paths.latestSessionFile, 'utf-8'));
        const history = readFollowHistory(paths.historyFile);

        assert.equal(latestSession.sessionId, session.sessionId);
        assert.equal(sessionFile.endsWith(`${session.sessionId}.json`), true);
        assert.equal(history.length, 1);
        assert.equal(history[0].creatorKey, 'id:12345');
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('discovery records persist verified page findings for later API automation', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-discovery-'));

    try {
        const paths = buildFollowRuntimePaths(tempRoot);
        ensureFollowRuntime(paths);

        appendDiscoveryRecord(paths.discoveriesFile, createDiscoveryRecord({
            kind: 'data-operation-page',
            url: 'https://open.kuaishou.com/project/data-operation-data?appId=ks696932044951748651',
            title: '历史数据明细已跑通',
            summary: '页面已能看到作者openID、视频链接、作者昵称与下载数据按钮。',
            timeRange: '昨日',
            fields: ['作者openID', '视频链接', '作者昵称'],
            sample: {
                authorName: '晴天娃娃 默',
                openId: 'f1b4334804641ec514bf5724f002d67f',
                videoUrl: 'https://www.kuaishou.com/short-video/3xwrfhxamzi57wi'
            },
            now: '2026-04-12T02:15:00.000Z'
        }));

        const discoveries = readDiscoveryHistory(paths.discoveriesFile);
        assert.equal(discoveries.length, 1);
        assert.equal(discoveries[0].kind, 'data-operation-page');
        assert.equal(discoveries[0].timeRange, '昨日');
        assert.deepEqual(discoveries[0].fields, ['作者openID', '视频链接', '作者昵称']);
        assert.equal(discoveries[0].sample.authorName, '晴天娃娃 默');
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('formatPageInspectionReport keeps the key console diagnostics readable', () => {
    const report = formatPageInspectionReport({
        requestedUrl: 'https://open.kuaishou.com/console',
        url: 'https://open.kuaishou.com/console',
        title: '快手开放平台',
        screenshotPath: '.harness/.local/logs/inspect.png',
        text: '当前未入驻平台，请立即完成入驻'
    });

    assert.match(report, /Requested URL: https:\/\/open\.kuaishou\.com\/console/);
    assert.match(report, /Title: 快手开放平台/);
    assert.match(report, /当前未入驻平台，请立即完成入驻/);
});

test('observation helpers persist observer sessions and events under .harness state', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-observe-'));

    try {
        const paths = buildObservationPaths(tempRoot);
        ensureObservationRuntime(paths);

        const session = createObservationSession({
            startUrl: 'https://open.kuaishou.com/console',
            debugPort: 9444,
            now: '2026-04-12T01:00:00.000Z'
        });
        const sessionFile = saveObservationSession(paths, session);

        appendObservationEvent(paths.eventsFile, createObservationEvent({
            sessionId: session.observerSessionId,
            type: 'click',
            url: 'https://open.kuaishou.com/console',
            targetText: '小程序',
            targetSelector: 'button:nth-child(1)',
            now: '2026-04-12T01:01:00.000Z'
        }));

        const latest = JSON.parse(readFileSync(paths.latestFile, 'utf-8'));
        const eventLines = readFileSync(paths.eventsFile, 'utf-8').trim().split('\n');
        const report = formatObservationReport({
            session,
            eventsFile: paths.eventsFile,
            browserProfileDir: paths.browserProfileDir,
            screenshotDir: paths.screenshotsDir
        });

        assert.equal(latest.observerSessionId, session.observerSessionId);
        assert.equal(sessionFile.endsWith(`${session.observerSessionId}.json`), true);
        assert.equal(eventLines.length, 1);
        assert.match(report, /Debug Port: 9444/);
        assert.match(report, /Events:/);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('createObservationEvent keeps optional metadata for network and follow diagnostics', () => {
    const event = createObservationEvent({
        sessionId: 'kuaishou-observe-20260412010000',
        type: 'network-response',
        url: 'https://www.kuaishou.com/graphql',
        targetText: 'POST fetch',
        value: '403',
        metadata: {
            pageUrl: 'https://www.kuaishou.com/short-video/abc',
            loginVisible: false
        },
        now: '2026-04-12T01:02:00.000Z'
    });

    assert.deepEqual(event.metadata, {
        pageUrl: 'https://www.kuaishou.com/short-video/abc',
        loginVisible: 'false'
    });
});
