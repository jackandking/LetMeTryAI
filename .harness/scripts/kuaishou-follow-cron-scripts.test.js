import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('run-kuaishou-follow-ingest.sh runs daily-ingest and writes ingest log', () => {
    const script = readFileSync(resolve('scripts/run-kuaishou-follow-ingest.sh'), 'utf-8');

    assert.match(script, /npm run kuaishou:follow -- daily-ingest/);
    assert.match(script, /kuaishou-follow-ingest\.log/);
    assert.doesNotMatch(script, /npm run kuaishou:follow -- run-hourly/);
});

test('run-kuaishou-follow-worker.sh runs hourly worker and writes worker log', () => {
    const script = readFileSync(resolve('scripts/run-kuaishou-follow-worker.sh'), 'utf-8');

    assert.match(script, /npm run kuaishou:follow -- run-hourly/);
    assert.match(script, /kuaishou-follow-worker\.log/);
    assert.doesNotMatch(script, /npm run kuaishou:follow -- daily-ingest/);
});
