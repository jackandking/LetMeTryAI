import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

describe('agent-team-status CLI', () => {
    let tempDir;
    let repoDir;
    let runtimeDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-team-status-cli-'));
        repoDir = path.join(tempDir, 'repo');
        runtimeDir = path.join(tempDir, 'runtime');
        fs.mkdirSync(path.join(repoDir, '.automation', 'config'), { recursive: true });
        fs.cpSync(path.resolve('.automation/config'), path.join(repoDir, '.automation', 'config'), { recursive: true });
    });

    afterEach(() => {
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('prints json output', () => {
        const result = spawnSync(
            'node',
            ['.automation/skills/agent-team-status/scripts/status.js', '--json'],
            {
                cwd: path.resolve('.'),
                encoding: 'utf-8',
                env: {
                    ...process.env,
                    PROJECT_DIR: repoDir,
                    LETMETRY_RUNTIME_DIR: runtimeDir
                }
            }
        );

        expect(result.status).toBe(0);
        expect(JSON.parse(result.stdout)).toMatchObject({
            configured: true,
            initialized: false
        });
    });
});
