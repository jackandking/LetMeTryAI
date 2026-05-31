import fs from 'fs';
import os from 'os';
import path from 'path';
import { formatAgentTeamStatus, getAgentTeamStatus } from './status.js';

function writeJson(filePath, payload) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
}

describe('agent-team status', () => {
    let tempDir;
    let repoDir;
    let runtimeDir;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-team-status-'));
        repoDir = path.join(tempDir, 'repo');
        runtimeDir = path.join(tempDir, 'runtime');
        fs.mkdirSync(path.join(repoDir, '.automation', 'config', 'agent-missions'), { recursive: true });
        fs.cpSync(path.resolve('.automation/config'), path.join(repoDir, '.automation', 'config'), { recursive: true });
        process.env.PROJECT_DIR = repoDir;
        process.env.LETMETRY_RUNTIME_DIR = runtimeDir;
    });

    afterEach(() => {
        delete process.env.PROJECT_DIR;
        delete process.env.LETMETRY_RUNTIME_DIR;
        fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('reports uninitialized runtime when directories are missing', () => {
        const status = getAgentTeamStatus({ fromUrl: import.meta.url });

        expect(status.configured).toBe(true);
        expect(status.initialized).toBe(false);
        expect(status.agentCount).toBe(5);
    });

    it('summarizes agent queues, approvals, workspaces, and events', () => {
        const baseDir = path.join(runtimeDir, 'agent-team');
        const now = new Date('2026-05-30T00:00:00.000Z');

        writeJson(path.join(baseDir, 'mailboxes', 'builder', 'inbox', '1.json'), { type: 'task.spawn' });
        writeJson(path.join(baseDir, 'mailboxes', 'builder', 'outbox', '1.json'), { type: 'decision.request' });
        writeJson(path.join(baseDir, 'heartbeats', 'builder.json'), { heartbeatAt: '2026-05-29T23:59:40.000Z' });
        writeJson(path.join(baseDir, 'heartbeats', 'manager.json'), { heartbeatAt: '2026-05-29T23:30:00.000Z' });
        writeJson(path.join(baseDir, 'approvals', 'boss', '1.json'), { status: 'pending' });
        writeJson(path.join(baseDir, 'approvals', 'manager', '1.json'), { status: 'approved' });
        writeJson(path.join(baseDir, 'workspaces', 'lease-1.json'), { status: 'active', workspaceId: 'lease-1' });
        writeJson(path.join(baseDir, 'events', '1.json'), { type: 'decision.approved', createdAt: '2026-05-29T23:59:59.000Z' });

        const status = getAgentTeamStatus({ fromUrl: import.meta.url, now: now.getTime() });
        const builder = status.agents.find(agent => agent.id === 'builder');
        const manager = status.agents.find(agent => agent.id === 'manager');

        expect(status.initialized).toBe(true);
        expect(status.pendingMessages).toBe(2);
        expect(status.approvals.boss.pending).toBe(1);
        expect(status.workspaces.active).toBe(1);
        expect(builder.inboxPending).toBe(1);
        expect(builder.outboxPending).toBe(1);
        expect(builder.heartbeat.status).toBe('ok');
        expect(manager.heartbeat.status).toBe('stale');
        expect(formatAgentTeamStatus(status)).toContain('boss approvals pending: 1');
    });
});
