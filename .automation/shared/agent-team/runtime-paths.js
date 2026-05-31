import path from 'path';
import {
    ensureDirectory,
    resolveProjectRoot,
    resolveRuntimePath
} from '../../scripts/runtime-paths.js';

export function resolveAgentTeamRuntimeDir(fromUrl) {
    return resolveRuntimePath(fromUrl, 'agent-team');
}

export function resolveAgentTeamPath(fromUrl, ...segments) {
    return path.join(resolveAgentTeamRuntimeDir(fromUrl), ...segments);
}

export function resolveAgentRegistryDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'registry', 'agents');
}

export function resolveAgentMailboxDir(fromUrl, agentId) {
    return resolveAgentTeamPath(fromUrl, 'mailboxes', agentId);
}

export function resolveAgentInboxDir(fromUrl, agentId) {
    return path.join(resolveAgentMailboxDir(fromUrl, agentId), 'inbox');
}

export function resolveAgentOutboxDir(fromUrl, agentId) {
    return path.join(resolveAgentMailboxDir(fromUrl, agentId), 'outbox');
}

export function resolveAgentArchiveDir(fromUrl, agentId) {
    return path.join(resolveAgentMailboxDir(fromUrl, agentId), 'archive');
}

export function resolveAgentStateDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'state');
}

export function resolveAgentContextDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'context');
}

export function resolveAgentHeartbeatDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'heartbeats');
}

export function resolveAgentApprovalDir(fromUrl, scope) {
    return resolveAgentTeamPath(fromUrl, 'approvals', scope);
}

export function resolveAgentEventDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'events');
}

export function resolveAgentLockDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'locks');
}

export function resolveAgentLogDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'logs');
}

export function resolveAgentWorkspaceLeaseDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'workspaces');
}

export function resolveAgentWorkspaceRootDir(fromUrl) {
    return resolveAgentTeamPath(fromUrl, 'workspace-roots');
}

export function resolveAgentTeamConfigPath(fromUrl) {
    return path.join(resolveProjectRoot(fromUrl), '.automation', 'config', 'agent-team.json');
}

export function resolveAgentMissionConfigDir(fromUrl) {
    return path.join(resolveProjectRoot(fromUrl), '.automation', 'config', 'agent-missions');
}

export function ensureAgentTeamDirectories(fromUrl, agentIds = []) {
    const sharedDirectories = [
        resolveAgentRegistryDir(fromUrl),
        resolveAgentStateDir(fromUrl),
        resolveAgentContextDir(fromUrl),
        resolveAgentHeartbeatDir(fromUrl),
        resolveAgentApprovalDir(fromUrl, 'manager'),
        resolveAgentApprovalDir(fromUrl, 'boss'),
        resolveAgentEventDir(fromUrl),
        resolveAgentLockDir(fromUrl),
        resolveAgentLogDir(fromUrl),
        resolveAgentWorkspaceLeaseDir(fromUrl),
        resolveAgentWorkspaceRootDir(fromUrl)
    ];

    sharedDirectories.forEach(ensureDirectory);

    agentIds.forEach(agentId => {
        ensureDirectory(resolveAgentInboxDir(fromUrl, agentId));
        ensureDirectory(resolveAgentOutboxDir(fromUrl, agentId));
        ensureDirectory(resolveAgentArchiveDir(fromUrl, agentId));
    });
}
