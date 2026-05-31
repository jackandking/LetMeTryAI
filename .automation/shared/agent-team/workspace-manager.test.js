import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { acquireWorkspaceLease, listWorkspaceLeases, releaseWorkspaceLease } from './workspace-manager.js';

function runGit(cwd, args) {
    const result = spawnSync('git', args, { cwd, encoding: 'utf-8' });
    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
    }
}

describe('agent-team workspace manager', () => {
    let tempDir;
    let repoDir;
    let runtimeDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-workspace-test-'));
        repoDir = path.join(tempDir, 'repo');
        runtimeDir = path.join(tempDir, 'runtime');
        fs.mkdirSync(repoDir, { recursive: true });
        fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
        fs.writeFileSync(path.join(repoDir, 'src', 'index.js'), 'export const value = 1;\n', 'utf-8');

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

    it('creates and releases a writable worktree lease', () => {
        const lease = acquireWorkspaceLease({
            fromUrl: import.meta.url,
            agentId: 'builder',
            taskId: 'task-1',
            scopePaths: ['src/index.js'],
            writable: true
        });

        expect(fs.existsSync(lease.workspacePath)).toBe(true);
        expect(listWorkspaceLeases(import.meta.url)).toHaveLength(1);

        const releasedLease = releaseWorkspaceLease({
            fromUrl: import.meta.url,
            workspaceId: lease.workspaceId
        });

        expect(releasedLease.status).toBe('released');
        expect(fs.existsSync(lease.workspacePath)).toBe(false);
    });

    it('blocks overlapping writable scopes', () => {
        const firstLease = acquireWorkspaceLease({
            fromUrl: import.meta.url,
            agentId: 'builder-a',
            taskId: 'task-a',
            scopePaths: ['src'],
            writable: true
        });

        expect(() => acquireWorkspaceLease({
            fromUrl: import.meta.url,
            agentId: 'builder-b',
            taskId: 'task-b',
            scopePaths: ['src/index.js'],
            writable: true
        })).toThrow(/Workspace conflict/);

        releaseWorkspaceLease({
            fromUrl: import.meta.url,
            workspaceId: firstLease.workspaceId
        });
    });
});

