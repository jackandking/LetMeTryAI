import test from 'node:test';
import assert from 'node:assert/strict';

import { createFollowRecord, createPendingCandidate } from './kuaishou-follow-workflow.js';
import { planHourlyExecution } from './kuaishou-follow-daily.js';

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
