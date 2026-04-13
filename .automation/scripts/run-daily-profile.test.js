import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('run-daily-profile.sh', () => {
    const scriptPath = path.resolve('.automation/scripts/run-daily-profile.sh');
    let tempDir;

    beforeEach(() => {
        tempDir = mkdtempSync(path.join(os.tmpdir(), 'run-daily-profile-test-'));
        mkdirSync(path.join(tempDir, '.harness', '.local', 'logs', 'daily-app-cron'), {
            recursive: true
        });
        mkdirSync(path.join(tempDir, '.harness', '.local', 'state', 'daily-app-runs'), {
            recursive: true
        });
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('delegates to harness runner by default and exposes analysis log paths', () => {
        const fakeRunner = path.join(tempDir, 'fake-harness-runner.sh');

        writeFileSync(
            fakeRunner,
            '#!/bin/sh\n' +
                'echo "FAKE_HARNESS profile=$1"\n' +
                'echo "FAKE_HARNESS mode=$HARNESS_MODE"\n' +
                'echo "FAKE_HARNESS log=$HARNESS_CRON_LOG_FILE"\n',
            'utf8'
        );
        chmodSync(fakeRunner, 0o755);

        const result = spawnSync('bash', [scriptPath, 'nanrenbao'], {
            encoding: 'utf8',
            env: {
                ...process.env,
                PROJECT_DIR_OVERRIDE: tempDir,
                HARNESS_PROFILE_RUNNER: fakeRunner
            }
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('[run-daily-profile] delegating to harness workflow');
        expect(result.stdout).toContain(`harness_runner=${fakeRunner}`);
        expect(result.stdout).toContain(
            `harness_log=${path.join(tempDir, '.harness', '.local', 'logs', 'daily-app-cron', 'nanrenbao.log')}`
        );
        expect(result.stdout).toContain(
            `harness_summary=${path.join(tempDir, '.harness', '.local', 'state', 'daily-app-runs', 'nanrenbao.jsonl')}`
        );
        expect(result.stdout).toContain('FAKE_HARNESS profile=nanrenbao');
        expect(result.stdout).toContain('FAKE_HARNESS mode=production');
        expect(result.stdout).toContain(
            `FAKE_HARNESS log=${path.join(tempDir, '.harness', '.local', 'logs', 'daily-app-cron', 'nanrenbao.log')}`
        );
        expect(result.stderr).toBe('');
    });
});
