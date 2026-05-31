import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { runManagerOnce } from './agent-manager.js';
import { runWorkerOnce } from './agent-worker.js';
import { createEnvelope } from '../shared/agent-team/protocol.js';
import {
    resolveAgentApprovalDir,
    resolveAgentArchiveDir,
    resolveAgentEventDir,
    resolveAgentInboxDir,
    resolveAgentStateDir,
    resolveAgentWorkspaceLeaseDir
} from '../shared/agent-team/runtime-paths.js';
import { enqueueJson } from '../shared/agent-team/file-queue.js';

function runGit(cwd, args) {
    const result = spawnSync('git', args, { cwd, encoding: 'utf-8' });
    if (result.status !== 0) {
        throw new Error(result.stderr || result.stdout);
    }
}

function readDirectoryJson(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        return [];
    }

    return fs.readdirSync(directoryPath)
        .filter(fileName => fileName.endsWith('.json'))
        .sort()
        .map(fileName => JSON.parse(fs.readFileSync(path.join(directoryPath, fileName), 'utf-8')));
}

describe('agent-team vertical slice', () => {
    let tempDir;
    let repoDir;
    let runtimeDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-team-integration-'));
        repoDir = path.join(tempDir, 'repo');
        runtimeDir = path.join(tempDir, 'runtime');
        fs.mkdirSync(path.join(repoDir, '.automation', 'config', 'agent-missions'), { recursive: true });
        fs.mkdirSync(path.join(repoDir, '.automation', 'config'), { recursive: true });
        fs.mkdirSync(path.join(repoDir, 'src'), { recursive: true });
        fs.writeFileSync(path.join(repoDir, 'src', 'index.js'), 'export const ready = true;\n', 'utf-8');

        const sourceConfigDir = path.resolve('.automation/config');
        fs.cpSync(sourceConfigDir, path.join(repoDir, '.automation', 'config'), { recursive: true });

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

    it('routes a repo task through scout, builder, approval, review, and workspace release', () => {
        enqueueJson(resolveAgentInboxDir(import.meta.url, 'manager'), createEnvelope({
            type: 'task.start',
            from: 'boss',
            to: 'manager',
            taskId: 'task-1',
            scopePaths: ['src/index.js'],
            payload: {
                title: 'Update index.js',
                action: 'edit-repo'
            }
        }));

        runManagerOnce({ fromUrl: import.meta.url });
        runWorkerOnce({ fromUrl: import.meta.url, agentId: 'scout' });
        runManagerOnce({ fromUrl: import.meta.url });
        runWorkerOnce({ fromUrl: import.meta.url, agentId: 'builder' });
        runManagerOnce({ fromUrl: import.meta.url });
        runWorkerOnce({ fromUrl: import.meta.url, agentId: 'builder' });
        runManagerOnce({ fromUrl: import.meta.url });
        runWorkerOnce({ fromUrl: import.meta.url, agentId: 'review' });
        runManagerOnce({ fromUrl: import.meta.url });

        const managerApprovals = readDirectoryJson(resolveAgentApprovalDir(import.meta.url, 'manager'));
        const events = readDirectoryJson(resolveAgentEventDir(import.meta.url));
        const workspaceLeases = readDirectoryJson(resolveAgentWorkspaceLeaseDir(import.meta.url));

        expect(managerApprovals.some(entry => entry.action === 'edit-repo')).toBe(true);
        expect(events.some(entry => entry.type === 'workspace.released')).toBe(true);
        expect(workspaceLeases[0].status).toBe('released');
    });

    it('blocks external publish actions in the boss approval queue', () => {
        enqueueJson(resolveAgentInboxDir(import.meta.url, 'manager'), createEnvelope({
            type: 'decision.request',
            from: 'builder',
            to: 'manager',
            taskId: 'task-2',
            requiresDecision: 'boss',
            scopePaths: ['src/index.js'],
            payload: {
                action: 'publish',
                external: true
            }
        }));

        runManagerOnce({ fromUrl: import.meta.url });

        const bossApprovals = readDirectoryJson(resolveAgentApprovalDir(import.meta.url, 'boss'));
        const builderArchive = readDirectoryJson(resolveAgentArchiveDir(import.meta.url, 'manager'));

        expect(bossApprovals).toHaveLength(1);
        expect(bossApprovals[0].status).toBe('pending');
        expect(builderArchive.some(entry => entry.type === 'decision.request')).toBe(true);
    });

    it('registers and runs the parent revenue agent with manager-level publish approval', () => {
        enqueueJson(resolveAgentInboxDir(import.meta.url, 'manager'), createEnvelope({
            type: 'task.start',
            from: 'boss',
            to: 'manager',
            taskId: 'task-3',
            scopePaths: ['parent-tools/child-travel-map'],
            payload: {
                targetAgent: 'parent-revenue',
                title: 'Diagnose parent-tools revenue',
                focusArea: 'payment-conversion',
                proposedAction: 'publish'
            }
        }));

        runManagerOnce({ fromUrl: import.meta.url });
        runWorkerOnce({ fromUrl: import.meta.url, agentId: 'parent-revenue' });
        runManagerOnce({ fromUrl: import.meta.url });

        const managerApprovals = readDirectoryJson(resolveAgentApprovalDir(import.meta.url, 'manager'));
        const bossApprovals = readDirectoryJson(resolveAgentApprovalDir(import.meta.url, 'boss'));
        const agentStateDir = resolveAgentStateDir(import.meta.url);
        const parentState = JSON.parse(fs.readFileSync(path.join(agentStateDir, 'parent-revenue.json'), 'utf-8'));

        expect(managerApprovals.some(entry => entry.requestedBy === 'parent-revenue' && entry.action === 'publish')).toBe(true);
        expect(bossApprovals).toHaveLength(0);
        expect(parentState.targetMetric).toBe('parent-tools average daily revenue > RMB 100');
        expect(parentState.latestTask.payload.focusArea).toBe('payment-conversion');
    });

    it('dedupes repeated decision requests for the same parent revenue task', () => {
        const duplicateRequest = () => createEnvelope({
            type: 'decision.request',
            from: 'parent-revenue',
            to: 'manager',
            taskId: 'task-dup',
            requiresDecision: 'manager',
            scopePaths: ['parent-tools/child-travel-map'],
            payload: {
                action: 'publish',
                writable: true,
                sideEffect: true,
                tags: ['writes-repo']
            }
        });

        enqueueJson(resolveAgentInboxDir(import.meta.url, 'manager'), duplicateRequest());
        enqueueJson(resolveAgentInboxDir(import.meta.url, 'manager'), duplicateRequest());

        runManagerOnce({ fromUrl: import.meta.url });

        const managerApprovals = readDirectoryJson(resolveAgentApprovalDir(import.meta.url, 'manager'));
        const parentRevenueInbox = readDirectoryJson(resolveAgentInboxDir(import.meta.url, 'parent-revenue'));
        const events = readDirectoryJson(resolveAgentEventDir(import.meta.url));

        expect(managerApprovals.filter(entry => entry.taskId === 'task-dup' && entry.action === 'publish')).toHaveLength(1);
        expect(parentRevenueInbox.filter(entry => entry.type === 'decision.approved' && entry.taskId === 'task-dup')).toHaveLength(1);
        expect(events.some(entry => entry.type === 'decision.duplicate')).toBe(true);
    });
});
