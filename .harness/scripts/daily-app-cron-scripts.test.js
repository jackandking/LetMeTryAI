import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('run-daily-app-cron.sh runs harness daily app profile workflow and writes analysis paths', () => {
    const script = readFileSync(resolve('scripts/run-daily-app-cron.sh'), 'utf-8');

    assert.match(script, /run-daily-app-profile\.ts/);
    assert.match(script, /daily-app-runs/);
    assert.match(script, /HARNESS_MODE="\$\{HARNESS_MODE:-production\}"/);
    assert.match(script, /daily-app-cron/);
});

test('setup-cron.sh switches 7-10 jobs to harness runner and harness logs', () => {
    const script = readFileSync(resolve('../.automation/scripts/setup-cron.sh'), 'utf-8');

    assert.match(script, /PROFILE_RUNNER="\$PROJECT_DIR\/\.harness\/scripts\/run-daily-app-cron\.sh"/);
    assert.match(script, /HARNESS_MODE=production HARNESS_CRON_LOG_FILE=/);
    assert.match(script, /HARNESS_LOCAL_DIR="\$PROJECT_DIR\/\.harness\/\.local"/);
    assert.match(script, /HARNESS_LOCAL_DIR\/logs\/daily-app-cron/);
    assert.match(script, /HARNESS_LOCAL_DIR\/state\/daily-app-runs/);
    assert.doesNotMatch(script, /0 7 \* \* \* cd "\$PROJECT_DIR" && "\$PROFILE_RUNNER" nanrenbao >> "\$NANRENBAO_LOG_FILE" 2>&1/);
});
