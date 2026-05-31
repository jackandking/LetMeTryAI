#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirectory } from './runtime-paths.js';
import {
    resolveAgentTeamConfigPath,
    resolveAgentMissionConfigDir,
    resolveAgentRegistryDir,
    resolveAgentInboxDir,
    resolveAgentOutboxDir,
    resolveAgentArchiveDir,
    resolveAgentApprovalDir,
    resolveAgentEventDir,
    resolveAgentHeartbeatDir,
    ensureAgentTeamDirectories
} from '../shared/agent-team/runtime-paths.js';
import {
    createApprovalRequest,
    createAgentRecord,
    createEnvelope,
    DECISION_LEVELS
} from '../shared/agent-team/protocol.js';
import { archiveClaimedJson, claimNextJson, enqueueJson, readJsonFile, writeJsonAtomic } from '../shared/agent-team/file-queue.js';
import { classifyDecision } from '../shared/agent-team/decision-policy.js';
import { buildDecisionFingerprint, claimIdempotencyKey } from '../shared/agent-team/idempotency.js';
import { releaseWorkspaceLease } from '../shared/agent-team/workspace-manager.js';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_FROM_URL = import.meta.url;

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function loadJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function resolveMissionConfig(fromUrl, missionId) {
    const missionPath = path.join(resolveAgentMissionConfigDir(fromUrl), `${missionId}.json`);
    return loadJson(missionPath);
}

export function loadAgentTeamConfig(options = {}) {
    const configPath = options.configPath || resolveAgentTeamConfigPath(options.fromUrl || DEFAULT_FROM_URL);
    return loadJson(configPath);
}

export function initializeAgentTeam(options = {}) {
    const fromUrl = options.fromUrl || DEFAULT_FROM_URL;
    const teamConfig = loadAgentTeamConfig({ ...options, fromUrl });
    const agentIds = teamConfig.agents.map(agent => agent.id);
    ensureAgentTeamDirectories(fromUrl, agentIds);

    const registryDir = resolveAgentRegistryDir(fromUrl);
    teamConfig.agents.forEach(agentConfig => {
        const missionConfig = resolveMissionConfig(fromUrl, agentConfig.mission);
        const record = createAgentRecord(agentConfig, missionConfig);
        writeJsonAtomic(path.join(registryDir, `${agentConfig.id}.json`), record);
    });

    return teamConfig;
}

function writeHeartbeat(fromUrl, agentId, extra = {}) {
    const heartbeatDir = resolveAgentHeartbeatDir(fromUrl);
    ensureDirectory(heartbeatDir);
    writeJsonAtomic(path.join(heartbeatDir, `${agentId}.json`), {
        agentId,
        heartbeatAt: new Date().toISOString(),
        ...extra
    });
}

function emitEvent(fromUrl, type, payload) {
    return enqueueJson(resolveAgentEventDir(fromUrl), {
        type,
        createdAt: new Date().toISOString(),
        payload
    }, { prefix: 'event' });
}

function routeEnvelope(fromUrl, envelope) {
    return enqueueJson(resolveAgentInboxDir(fromUrl, envelope.to), envelope, { prefix: envelope.type });
}

function handleDecisionRequest(fromUrl, teamConfig, envelope) {
    const classification = classifyDecision({
        action: envelope.payload?.action,
        tags: envelope.payload?.tags,
        external: envelope.payload?.external,
        sideEffect: envelope.payload?.sideEffect,
        writable: envelope.payload?.writable,
        requiresDecision: envelope.requiresDecision
    }, teamConfig.decisionPolicy, teamConfig.agentDecisionPolicies?.[envelope.from]);
    const fingerprint = buildDecisionFingerprint(envelope);
    const idempotencyClaim = claimIdempotencyKey(fromUrl, 'decision-request', fingerprint, {
        messageId: envelope.id,
        taskId: envelope.taskId,
        from: envelope.from,
        action: envelope.payload?.action || null,
        decisionLevel: classification.decisionLevel
    });

    if (!idempotencyClaim.claimed) {
        emitEvent(fromUrl, 'decision.duplicate', {
            messageId: envelope.id,
            taskId: envelope.taskId,
            from: envelope.from,
            action: envelope.payload?.action || null,
            decisionLevel: classification.decisionLevel,
            existingClaim: idempotencyClaim.record
        });
        return classification.decisionLevel;
    }

    const approvalRequest = createApprovalRequest(envelope, classification);

    if (classification.decisionLevel === DECISION_LEVELS.BOSS) {
        enqueueJson(resolveAgentApprovalDir(fromUrl, 'boss'), approvalRequest, { prefix: 'boss-approval' });
        routeEnvelope(fromUrl, createEnvelope({
            type: 'decision.blocked',
            from: teamConfig.managerId,
            to: envelope.from,
            taskId: envelope.taskId,
            inReplyTo: envelope.id,
            scopePaths: envelope.scopePaths,
            payload: {
                decisionLevel: classification.decisionLevel,
                reason: classification.reason,
                approvalRequestId: approvalRequest.id
            }
        }));
        emitEvent(fromUrl, 'decision.blocked', approvalRequest);
        return classification.decisionLevel;
    }

    const managerApproval = {
        ...approvalRequest,
        status: 'approved',
        approvedAt: new Date().toISOString(),
        approvedBy: teamConfig.managerId
    };
    enqueueJson(resolveAgentApprovalDir(fromUrl, 'manager'), managerApproval, { prefix: 'manager-approval' });
    routeEnvelope(fromUrl, createEnvelope({
        type: 'decision.approved',
        from: teamConfig.managerId,
        to: envelope.from,
        taskId: envelope.taskId,
        inReplyTo: envelope.id,
        scopePaths: envelope.scopePaths,
        payload: {
            action: envelope.payload?.action,
            writable: envelope.payload?.writable,
            baseRef: envelope.payload?.baseRef || teamConfig.defaultBaseRef || 'HEAD',
            requestedTask: envelope.payload?.requestedTask || null,
            approvalRequestId: approvalRequest.id,
            reason: classification.reason
        }
    }));
    emitEvent(fromUrl, 'decision.approved', managerApproval);
    return classification.decisionLevel;
}

function routeByPolicy(fromUrl, teamConfig, envelope) {
    if (envelope.type === 'decision.request') {
        return handleDecisionRequest(fromUrl, teamConfig, envelope);
    }

    if (envelope.type === 'review.result' && envelope.payload?.workspaceId) {
        releaseWorkspaceLease({
            fromUrl,
            workspaceId: envelope.payload.workspaceId,
            status: envelope.payload.approved === false ? 'rejected' : 'released'
        });
        emitEvent(fromUrl, 'workspace.released', envelope.payload);
        return 'workspace-released';
    }

    const explicitTarget = envelope.to && envelope.to !== teamConfig.managerId ? envelope.to : null;
    const routedTarget = explicitTarget || envelope.payload?.targetAgent || teamConfig.routing?.[envelope.type];

    if (routedTarget) {
        routeEnvelope(fromUrl, {
            ...envelope,
            to: routedTarget
        });
        emitEvent(fromUrl, 'message.routed', { messageId: envelope.id, to: routedTarget, type: envelope.type });
        return routedTarget;
    }

    emitEvent(fromUrl, 'message.recorded', { messageId: envelope.id, type: envelope.type });
    return 'recorded';
}

function processQueue(fromUrl, teamConfig, queueDir, archiveDir, consumerId) {
    let processedCount = 0;
    const claimsDir = path.join(archiveDir, 'claims');

    while (true) {
        const claimPath = claimNextJson(queueDir, claimsDir, consumerId);
        if (!claimPath) {
            break;
        }

        const envelope = readJsonFile(claimPath);
        routeByPolicy(fromUrl, teamConfig, envelope);
        archiveClaimedJson(claimPath, archiveDir, { handledBy: consumerId });
        processedCount += 1;
    }

    return processedCount;
}

export function runManagerOnce(options = {}) {
    const fromUrl = options.fromUrl || DEFAULT_FROM_URL;
    const teamConfig = initializeAgentTeam({ ...options, fromUrl });
    const managerId = teamConfig.managerId;
    writeHeartbeat(fromUrl, managerId, { mode: 'run-once' });

    let processedCount = 0;
    processedCount += processQueue(
        fromUrl,
        teamConfig,
        resolveAgentInboxDir(fromUrl, managerId),
        resolveAgentArchiveDir(fromUrl, managerId),
        `${managerId}-inbox`
    );

    teamConfig.agents
        .filter(agent => agent.id !== managerId)
        .forEach(agent => {
            processedCount += processQueue(
                fromUrl,
                teamConfig,
                resolveAgentOutboxDir(fromUrl, agent.id),
                resolveAgentArchiveDir(fromUrl, agent.id),
                `${managerId}-${agent.id}-outbox`
            );
        });

    return { processedCount, teamConfig };
}

export async function runManagerLoop(options = {}) {
    const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 5000;
    const signal = options.signal;

    while (!signal?.aborted) {
        runManagerOnce(options);
        await sleep(intervalMs);
    }
}

function printUsage() {
    console.log('Usage: node .automation/scripts/agent-manager.js <init|run-once|run-loop> [--interval-ms <ms>]');
}

function parseIntervalMs() {
    const flagIndex = process.argv.indexOf('--interval-ms');
    if (flagIndex < 0) {
        return 5000;
    }
    const value = Number.parseInt(process.argv[flagIndex + 1], 10);
    return Number.isFinite(value) && value > 0 ? value : 5000;
}

if (process.argv[1] === __filename) {
    const command = process.argv[2];

    if (command === 'init') {
        initializeAgentTeam();
    } else if (command === 'run-once') {
        const result = runManagerOnce();
        console.log(JSON.stringify(result, null, 2));
    } else if (command === 'run-loop') {
        const controller = new AbortController();
        process.on('SIGINT', () => controller.abort());
        process.on('SIGTERM', () => controller.abort());
        runManagerLoop({ intervalMs: parseIntervalMs(), signal: controller.signal })
            .catch(error => {
                console.error(error);
                process.exitCode = 1;
            });
    } else {
        printUsage();
        process.exitCode = 1;
    }
}
