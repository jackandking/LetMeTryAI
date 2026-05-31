import fs from 'fs';
import path from 'path';
import { resolveAgentTeamConfigPath, resolveAgentTeamRuntimeDir } from './runtime-paths.js';

function safeReadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function listJsonFiles(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        return [];
    }

    return fs.readdirSync(directoryPath)
        .filter(fileName => fileName.endsWith('.json'))
        .sort()
        .map(fileName => path.join(directoryPath, fileName));
}

function countPendingMessages(baseDir, agentId, mailboxName) {
    const mailboxDir = path.join(baseDir, 'mailboxes', agentId, mailboxName);
    return listJsonFiles(mailboxDir).length;
}

function countDirectoryEntries(directoryPath) {
    if (!fs.existsSync(directoryPath)) {
        return 0;
    }

    return fs.readdirSync(directoryPath)
        .filter(fileName => !fileName.startsWith('.'))
        .length;
}

function getHeartbeatStatus(baseDir, agentId, now, staleAfterMs) {
    const heartbeatPath = path.join(baseDir, 'heartbeats', `${agentId}.json`);
    if (!fs.existsSync(heartbeatPath)) {
        return {
            status: 'missing',
            heartbeatAt: null,
            ageMs: null
        };
    }

    const heartbeat = safeReadJson(heartbeatPath);
    const heartbeatAtMs = Date.parse(heartbeat.heartbeatAt);
    const ageMs = Number.isFinite(heartbeatAtMs) ? Math.max(0, now - heartbeatAtMs) : null;
    return {
        status: ageMs !== null && ageMs > staleAfterMs ? 'stale' : 'ok',
        heartbeatAt: heartbeat.heartbeatAt || null,
        ageMs
    };
}

function summarizeWorkspaces(baseDir) {
    const workspaceDir = path.join(baseDir, 'workspaces');
    const workspaceFiles = listJsonFiles(workspaceDir).map(safeReadJson);
    return {
        total: workspaceFiles.length,
        active: workspaceFiles.filter(entry => entry.status === 'active').length,
        released: workspaceFiles.filter(entry => entry.status === 'released').length,
        rejected: workspaceFiles.filter(entry => entry.status === 'rejected').length,
        entries: workspaceFiles
    };
}

function summarizeApprovals(baseDir, scope) {
    const approvalDir = path.join(baseDir, 'approvals', scope);
    const approvalFiles = listJsonFiles(approvalDir).map(safeReadJson);
    return {
        total: approvalFiles.length,
        pending: approvalFiles.filter(entry => entry.status === 'pending').length,
        approved: approvalFiles.filter(entry => entry.status === 'approved').length,
        rejected: approvalFiles.filter(entry => entry.status === 'rejected').length,
        entries: approvalFiles
    };
}

function summarizeEvents(baseDir) {
    const eventFiles = listJsonFiles(path.join(baseDir, 'events'));
    const latest = eventFiles.slice(-5).map(safeReadJson);
    return {
        total: eventFiles.length,
        latest
    };
}

function loadAgentTeamConfig(fromUrl) {
    const configPath = resolveAgentTeamConfigPath(fromUrl);
    if (!fs.existsSync(configPath)) {
        return null;
    }
    return safeReadJson(configPath);
}

export function getAgentTeamStatus(options = {}) {
    const fromUrl = options.fromUrl || import.meta.url;
    const now = options.now ?? Date.now();
    const staleAfterMs = options.staleAfterMs ?? 15 * 60 * 1000;
    const runtimeDir = resolveAgentTeamRuntimeDir(fromUrl);
    const config = loadAgentTeamConfig(fromUrl);
    const initialized = fs.existsSync(runtimeDir);

    if (!config) {
        return {
            initialized,
            configured: false,
            runtimeDir,
            agents: [],
            approvals: {},
            workspaces: { total: 0, active: 0, released: 0, rejected: 0, entries: [] },
            events: { total: 0, latest: [] }
        };
    }

    const agents = config.agents.map(agent => ({
        id: agent.id,
        mission: agent.mission,
        writable: Boolean(agent.writable),
        inboxPending: initialized ? countPendingMessages(runtimeDir, agent.id, 'inbox') : 0,
        outboxPending: initialized ? countPendingMessages(runtimeDir, agent.id, 'outbox') : 0,
        archiveEntries: initialized ? countDirectoryEntries(path.join(runtimeDir, 'mailboxes', agent.id, 'archive')) : 0,
        heartbeat: initialized
            ? getHeartbeatStatus(runtimeDir, agent.id, now, staleAfterMs)
            : { status: 'missing', heartbeatAt: null, ageMs: null }
    }));

    const approvals = {
        manager: initialized
            ? summarizeApprovals(runtimeDir, 'manager')
            : { total: 0, pending: 0, approved: 0, rejected: 0, entries: [] },
        boss: initialized
            ? summarizeApprovals(runtimeDir, 'boss')
            : { total: 0, pending: 0, approved: 0, rejected: 0, entries: [] }
    };

    const workspaces = initialized
        ? summarizeWorkspaces(runtimeDir)
        : { total: 0, active: 0, released: 0, rejected: 0, entries: [] };
    const events = initialized ? summarizeEvents(runtimeDir) : { total: 0, latest: [] };

    return {
        initialized,
        configured: true,
        runtimeDir,
        managerId: config.managerId,
        agentCount: agents.length,
        pendingMessages: agents.reduce((total, agent) => total + agent.inboxPending + agent.outboxPending, 0),
        approvals,
        workspaces,
        events,
        agents
    };
}

function formatHeartbeat(heartbeat) {
    if (heartbeat.status === 'missing') {
        return 'missing';
    }
    if (heartbeat.ageMs === null) {
        return heartbeat.status;
    }
    return `${heartbeat.status} (${Math.floor(heartbeat.ageMs / 1000)}s)`;
}

export function formatAgentTeamStatus(status) {
    if (!status.configured) {
        return [
            'Agent team status',
            `- runtime: ${status.runtimeDir}`,
            '- config: missing'
        ].join('\n');
    }

    const lines = [
        'Agent team status',
        `- runtime: ${status.runtimeDir}`,
        `- initialized: ${status.initialized ? 'yes' : 'no'}`,
        `- agents: ${status.agentCount}`,
        `- pending messages: ${status.pendingMessages}`,
        `- manager approvals pending: ${status.approvals.manager.pending}`,
        `- boss approvals pending: ${status.approvals.boss.pending}`,
        `- active workspaces: ${status.workspaces.active}`,
        '- agents detail:'
    ];

    status.agents.forEach(agent => {
        lines.push(
            `  - ${agent.id} [${agent.mission}] inbox=${agent.inboxPending} outbox=${agent.outboxPending} heartbeat=${formatHeartbeat(agent.heartbeat)}`
        );
    });

    if (status.events.latest.length > 0) {
        lines.push('- latest events:');
        status.events.latest.forEach(event => {
            lines.push(`  - ${event.type} @ ${event.createdAt}`);
        });
    }

    return lines.join('\n');
}

