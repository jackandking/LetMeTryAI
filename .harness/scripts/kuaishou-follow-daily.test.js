import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    buildFollowRuntimePaths,
    createFollowRecord,
    createPendingCandidate,
    ensureFollowRuntime,
    savePendingQueue
} from './kuaishou-follow-workflow.js';
import { planHourlyExecution, runDailyIngestion, runHourlyFollowWorker } from './kuaishou-follow-daily.js';

test('planHourlyExecution stops immediately when daily cap is exhausted', () => {
    const history = [
        createFollowRecord({
            creatorId: '1',
            status: 'followed',
            now: '2026-04-12T01:00:00.000Z'
        }),
        createFollowRecord({
            creatorId: '2',
            status: 'followed',
            now: '2026-04-12T01:01:00.000Z'
        })
    ];

    const plan = planHourlyExecution({
        queue: [],
        history,
        dateKey: '2026-04-12',
        batchSize: 10,
        dailyCap: 2,
        now: '2026-04-12T06:00:00.000Z'
    });

    assert.equal(plan.stopReason, 'daily-cap-reached');
    assert.equal(plan.remainingCap, 0);
    assert.equal(plan.selected.length, 0);
});

test('planHourlyExecution selects a round-robin hourly batch within remaining cap', () => {
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
            profileId: 'parent-tools',
            profileName: '家长爱',
            appId: 'ks-2',
            planDate: '2026-04-10',
            record: { openId: 'open-2', authorName: 'B1', videoUrl: 'https://www.kuaishou.com/short-video/b1' },
            now: '2026-04-12T05:00:01.000Z'
        }),
        createPendingCandidate({
            profileId: 'womanai',
            profileName: '女人爱',
            appId: 'ks-3',
            planDate: '2026-04-10',
            record: { openId: 'open-3', authorName: 'C1', videoUrl: 'https://www.kuaishou.com/short-video/c1' },
            now: '2026-04-12T05:00:02.000Z'
        })
    ];

    const history = [
        createFollowRecord({
            creatorId: 'done-1',
            status: 'followed',
            now: '2026-04-12T01:00:00.000Z'
        })
    ];

    const plan = planHourlyExecution({
        queue,
        history,
        dateKey: '2026-04-12',
        batchSize: 10,
        dailyCap: 3,
        now: '2026-04-12T06:00:00.000Z'
    });

    assert.equal(plan.stopReason, '');
    assert.equal(plan.remainingCap, 2);
    assert.deepEqual(plan.selected.map(item => item.profileId), ['elder-love', 'parent-tools']);
});

test('runDailyIngestion sends a report after every ingestion run', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-follow-ingest-'));

    try {
        const configFile = join(tempRoot, 'app-config.local.json');
        writeFileSync(configFile, '[]', 'utf-8');
        const calls = [];

        const summary = await runDailyIngestion({
            repoRoot: tempRoot,
            configFile,
            env: { KUAISHOU_FOLLOW_REPORT_TO: 'test@example.com' },
            now: new Date('2026-04-12T06:00:00.000Z'),
            sendReport: async args => {
                calls.push(args);
                return { sentAt: '2026-04-12T06:00:05.000Z' };
            }
        });

        assert.equal(summary.appCount, 0);
        assert.equal(calls.length, 1);
        assert.equal(calls[0].dateKey, '2026-04-12');
        assert.equal(calls[0].force, true);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('runHourlyFollowWorker sends a report after queue-empty runs', async () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-follow-hourly-'));

    try {
        const paths = buildFollowRuntimePaths(tempRoot);
        ensureFollowRuntime(paths);
        savePendingQueue(paths.queueFile, []);
        const calls = [];

        const summary = await runHourlyFollowWorker({
            repoRoot: tempRoot,
            env: { KUAISHOU_FOLLOW_REPORT_TO: 'test@example.com' },
            now: new Date('2026-04-12T06:00:00.000Z'),
            sendReport: async args => {
                calls.push(args);
                return { sentAt: '2026-04-12T06:00:05.000Z' };
            }
        });

        assert.equal(summary.stopReason, 'queue-empty');
        assert.equal(calls.length, 1);
        assert.equal(calls[0].dateKey, '2026-04-12');
        assert.equal(calls[0].force, true);
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});
