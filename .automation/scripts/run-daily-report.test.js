import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('run-daily-report.sh', () => {
    const scriptPath = path.resolve('.automation/scripts/run-daily-report.sh');
    let tempDir;

    beforeEach(() => {
        tempDir = mkdtempSync(path.join(os.tmpdir(), 'run-daily-report-test-'));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('logs git and node steps through the wrapper', () => {
        const fakeGit = path.join(tempDir, 'git');
        const fakeNode = path.join(tempDir, 'node');
        const fakeReport = path.join(tempDir, 'daily_kuaishou_report.js');

        writeFileSync(fakeGit, '#!/bin/sh\necho "FAKE_GIT $*"\n', 'utf8');
        writeFileSync(fakeNode, '#!/bin/sh\necho "FAKE_NODE $*"\n', 'utf8');
        writeFileSync(fakeReport, 'console.log("unused");\n', 'utf8');
        chmodSync(fakeGit, 0o755);
        chmodSync(fakeNode, 0o755);

        const result = spawnSync('bash', [scriptPath], {
            encoding: 'utf8',
            env: {
                ...process.env,
                PROJECT_DIR_OVERRIDE: tempDir,
                DAILY_GIT_BIN: fakeGit,
                DAILY_NODE_BIN: fakeNode,
                DAILY_REPORT_SCRIPT: fakeReport,
                KUAISHOU_EMAIL_TO: 'ops@example.com'
            }
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('[run-daily-report] running git pull --ff-only');
        expect(result.stdout).toContain('FAKE_GIT pull --ff-only');
        expect(result.stdout).toContain('[run-daily-report] running daily_kuaishou_report.js');
        expect(result.stdout).toContain(`FAKE_NODE ${fakeReport}`);
        expect(result.stdout).toContain('email_to=ops@example.com');
        expect(result.stderr).toBe('');
    });
});
