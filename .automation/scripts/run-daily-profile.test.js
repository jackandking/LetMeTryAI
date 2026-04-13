import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('run-daily-profile.sh', () => {
    const scriptPath = path.resolve('.automation/scripts/run-daily-profile.sh');
    let tempDir;

    beforeEach(() => {
        tempDir = mkdtempSync(path.join(os.tmpdir(), 'run-daily-profile-test-'));
    });

    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });

    it('runs the legacy daily profile pipeline directly', () => {
        const fakeGit = path.join(tempDir, 'git');
        const fakeNode = path.join(tempDir, 'node');
        const fakeCopilot = path.join(tempDir, 'copilot');

        writeFileSync(
            fakeGit,
            '#!/bin/sh\n' +
                'case "$1" in\n' +
                '  pull)\n' +
                '    echo "FAKE_GIT pull $*"\n' +
                '    ;;\n' +
                '  log)\n' +
                '    exit 0\n' +
                '    ;;\n' +
                '  status)\n' +
                '    exit 0\n' +
                '    ;;\n' +
                '  *)\n' +
                '    echo "FAKE_GIT $*"\n' +
                '    ;;\n' +
                'esac\n',
            'utf8'
        );
        writeFileSync(fakeNode, '#!/bin/sh\necho "FAKE_NODE $*"\n', 'utf8');
        writeFileSync(fakeCopilot, '#!/bin/sh\necho "FAKE_COPILOT $*"\n', 'utf8');
        chmodSync(fakeGit, 0o755);
        chmodSync(fakeNode, 0o755);
        chmodSync(fakeCopilot, 0o755);

        const result = spawnSync('bash', [scriptPath, 'nanrenbao'], {
            encoding: 'utf8',
            env: {
                ...process.env,
                PROJECT_DIR_OVERRIDE: tempDir,
                PATH: `${tempDir}:${process.env.PATH}`,
                COPILOT_BIN: fakeCopilot,
                DAILY_ALLOW_DIRTY_WORKTREE: 'true'
            }
        });

        expect(result.status).toBe(0);
        expect(result.stdout).toContain('[run-daily-profile] profile=nanrenbao model=gpt-5-mini');
        expect(result.stdout).toContain(`log_dir=${path.join(tempDir, '.automation', '.local', 'logs', 'daily-orchestrator', 'nanrenbao')}`);
        expect(result.stdout).toContain('FAKE_GIT pull pull --ff-only');
        expect(result.stdout).toContain('FAKE_NODE .automation/scripts/daily-orchestrator.js');
        expect(result.stdout).not.toContain('delegating to harness workflow');
        expect(result.stderr).toBe('');
    });
});
