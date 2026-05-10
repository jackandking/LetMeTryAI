#!/usr/bin/env node
import { runHourlyFollowWorker } from './kuaishou-follow-daily.js';
import { readFileSync, writeFileSync } from 'fs';

// Backup original queue
const queueFile = '/Users/weiping/prod/LetMeTryAI/.harness/.local/state/kuaishou-follow/pending-queue.json';
const originalQueue = readFileSync(queueFile, 'utf-8');

// Inject test queue
const testQueue = [{
    queueKey: 'test-candidate-1',
    videoUrl: 'https://www.kuaishou.com/short-video/3xqwt433bh3wjcq',
    authorOpenId: 'test123',
    authorName: 'Test User',
    profileId: 'nanrenbao',
    appId: 'test',
    attemptCount: 0,
    createdAt: '2026-05-10T00:00:00Z'
}];
writeFileSync(queueFile, JSON.stringify(testQueue), 'utf-8');

runHourlyFollowWorker({
    repoRoot: '/Users/weiping/prod/LetMeTryAI',
    env: {},
    headless: true,
    batchSize: 1,
    autoSendReport: false
}).then(result => {
    console.log('Result:', JSON.stringify(result, null, 2));
}).catch(err => {
    console.log('Error:', err.message);
}).finally(() => {
    // Restore original queue
    writeFileSync(queueFile, originalQueue, 'utf-8');
    console.log('Queue restored');
});
