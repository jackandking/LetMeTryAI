import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { ensureParentRevenueKickoff, runParentRevenueTick } from './start-parent-revenue-session.js';
import { resolveAgentContextDir, resolveAgentStateDir } from '../shared/agent-team/runtime-paths.js';

function runGit(cwd, args) {
    const result = spawnSync('git', args, { cwd, encoding: 'utf-8' });
    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
    }
}

describe('start-parent-revenue-session', () => {
    let tempDir;
    let repoDir;
    let runtimeDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parent-revenue-session-'));
        repoDir = path.join(tempDir, 'repo');
        runtimeDir = path.join(tempDir, 'runtime');
        fs.mkdirSync(path.join(repoDir, '.automation', 'config', 'agent-missions'), { recursive: true });
        fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
        fs.writeFileSync(path.join(repoDir, 'src', 'index.js'), 'export const ready = true;\n', 'utf-8');
        fs.cpSync(path.resolve('.automation/config'), path.join(repoDir, '.automation', 'config'), { recursive: true });

        runGit(repoDir, ['init']);
        runGit(repoDir, ['config', 'user.name', 'Test User']);
        runGit(repoDir, ['config', 'user.email', 'test@example.com']);
        runGit(repoDir, ['add', '.']);
        runGit(repoDir, ['commit', '-m', 'init']);

        process.env.PROJECT_DIR = repoDir;
        process.env.LETMETRY_RUNTIME_DIR = runtimeDir;
    });

    afterEach(() => {
        delete process.env.PROJECT_DIR;
        delete process.env.LETMETRY_RUNTIME_DIR;
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('bootstraps and advances the parent-revenue loop', () => {
        const kickoffPath = ensureParentRevenueKickoff();

        expect(kickoffPath).toBeTruthy();

        const status = runParentRevenueTick();
        const statePath = path.join(resolveAgentStateDir(import.meta.url), 'parent-revenue.json');
        const state = JSON.parse(fs.readFileSync(statePath, 'utf-8'));

        expect(status.agents.some(agent => agent.id === 'parent-revenue')).toBe(true);
        expect(state.targetMetric).toBe('parent-tools average daily revenue > RMB 100');
        expect(state.latestTask.taskId).toBe('parent-revenue-kickoff');
    });

    it('prepares copilot context in non-tty mode', () => {
        const result = spawnSync(
            'node',
            ['.automation/scripts/start-parent-revenue-session.js', '--prepare-only'],
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

        const parsed = JSON.parse(result.stdout);
        const contextDir = resolveAgentContextDir(import.meta.url);

        expect(parsed.sessionName).toBe('parent-revenue');
        expect(fs.existsSync(path.join(contextDir, 'parent-revenue-brief.md'))).toBe(true);
        expect(fs.existsSync(path.join(contextDir, 'parent-revenue-handoff.md'))).toBe(true);
    });
});
