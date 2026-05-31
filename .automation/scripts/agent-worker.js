#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureDirectory } from './runtime-paths.js';
import {
    resolveAgentTeamConfigPath,
    resolveAgentMissionConfigDir,
    resolveAgentInboxDir,
    resolveAgentOutboxDir,
    resolveAgentArchiveDir,
    resolveAgentHeartbeatDir,
    resolveAgentStateDir
} from '../shared/agent-team/runtime-paths.js';
import { createEnvelope, DECISION_LEVELS } from '../shared/agent-team/protocol.js';
import { acquireWorkspaceLease } from '../shared/agent-team/workspace-manager.js';
import { archiveClaimedJson, claimNextJson, enqueueJson, readJsonFile, writeJsonAtomic } from '../shared/agent-team/file-queue.js';
import { initializeAgentTeam } from './agent-manager.js';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_FROM_URL = import.meta.url;

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function loadTeamContext(options = {}) {
    const fromUrl = options.fromUrl || DEFAULT_FROM_URL;
    const configPath = options.configPath || resolveAgentTeamConfigPath(fromUrl);
    const teamConfig = initializeAgentTeam({ ...options, fromUrl, configPath });
    const missionDir = resolveAgentMissionConfigDir(fromUrl);
    const missionConfigs = Object.fromEntries(teamConfig.agents.map(agent => {
        const missionPath = path.join(missionDir, `${agent.mission}.json`);
        return [agent.mission, JSON.parse(fs.readFileSync(missionPath, 'utf-8'))];
    }));

    return {
        fromUrl,
        teamConfig,
        configPath,
        missionDir,
        missionConfigs
    };
}

function writeHeartbeat(fromUrl, agentId) {
    const heartbeatDir = resolveAgentHeartbeatDir(fromUrl);
    ensureDirectory(heartbeatDir);
    writeJsonAtomic(path.join(heartbeatDir, `${agentId}.json`), {
        agentId,
        heartbeatAt: new Date().toISOString()
    });
}

function emitOutboxMessage(fromUrl, agentId, envelope) {
    return enqueueJson(resolveAgentOutboxDir(fromUrl, agentId), envelope, { prefix: envelope.type });
}

function writeAgentState(fromUrl, agentId, payload) {
    const stateDir = resolveAgentStateDir(fromUrl);
    ensureDirectory(stateDir);
    return writeJsonAtomic(path.join(stateDir, `${agentId}.json`), payload);
}

function createDecisionRequest(agentId, inboundMessage, action = 'edit-repo') {
    return createEnvelope({
        type: 'decision.request',
        from: agentId,
        to: 'manager',
        taskId: inboundMessage.taskId,
        inReplyTo: inboundMessage.id,
        requiresDecision: DECISION_LEVELS.MANAGER,
        scopePaths: inboundMessage.scopePaths,
        payload: {
            action,
            writable: true,
            sideEffect: true,
            tags: ['writes-repo'],
            requestedTask: inboundMessage.payload
        }
    });
}

function handleScoutMessage(context, agentConfig, inboundMessage) {
    if (inboundMessage.type !== 'task.start') {
        return 0;
    }

    emitOutboxMessage(context.fromUrl, agentConfig.id, createEnvelope({
        type: 'task.spawn',
        from: agentConfig.id,
        to: 'manager',
        taskId: inboundMessage.taskId,
        inReplyTo: inboundMessage.id,
        scopePaths: inboundMessage.scopePaths,
        payload: {
            targetAgent: 'builder',
            action: inboundMessage.payload?.action || 'edit-repo',
            title: inboundMessage.payload?.title || 'scouted-task',
            requestedOutcome: inboundMessage.payload?.requestedOutcome || 'Prepare repo change'
        }
    }));
    return 1;
}

function handleBuilderMessage(context, agentConfig, inboundMessage) {
    if (inboundMessage.type === 'task.spawn') {
        emitOutboxMessage(context.fromUrl, agentConfig.id, createDecisionRequest(
            agentConfig.id,
            inboundMessage,
            inboundMessage.payload?.action || 'edit-repo'
        ));
        return 1;
    }

    if (inboundMessage.type === 'decision.approved') {
        const lease = acquireWorkspaceLease({
            fromUrl: context.fromUrl,
            agentId: agentConfig.id,
            taskId: inboundMessage.taskId,
            scopePaths: inboundMessage.scopePaths,
            writable: true,
            baseRef: inboundMessage.payload?.baseRef || context.teamConfig.defaultBaseRef || 'HEAD'
        });
        emitOutboxMessage(context.fromUrl, agentConfig.id, createEnvelope({
            type: 'review.request',
            from: agentConfig.id,
            to: 'manager',
            taskId: inboundMessage.taskId,
            inReplyTo: inboundMessage.id,
            scopePaths: inboundMessage.scopePaths,
            payload: {
                targetAgent: 'review',
                workspaceId: lease.workspaceId,
                workspacePath: lease.workspacePath,
                action: inboundMessage.payload?.action || 'edit-repo',
                requestedTask: inboundMessage.payload?.requestedTask || null
            }
        }));
        return 1;
    }

    return 0;
}

function handleReviewMessage(context, agentConfig, inboundMessage) {
    if (inboundMessage.type !== 'review.request') {
        return 0;
    }

    emitOutboxMessage(context.fromUrl, agentConfig.id, createEnvelope({
        type: 'review.result',
        from: agentConfig.id,
        to: 'manager',
        taskId: inboundMessage.taskId,
        inReplyTo: inboundMessage.id,
        scopePaths: inboundMessage.scopePaths,
        payload: {
            approved: true,
            workspaceId: inboundMessage.payload?.workspaceId || null,
            workspacePath: inboundMessage.payload?.workspacePath || null,
            summary: `Reviewed ${inboundMessage.payload?.action || 'task'}`
        }
    }));
    return 1;
}

function handleParentRevenueMessage(context, agentConfig, inboundMessage) {
    const missionConfig = context.missionConfigs[agentConfig.mission] || {};
    const statePayload = {
        agentId: agentConfig.id,
        mission: agentConfig.mission,
        updatedAt: new Date().toISOString(),
        objective: missionConfig.objective || null,
        targetMetric: missionConfig.targetMetric || null,
        resources: missionConfig.resources || [],
        limitations: missionConfig.limitations || [],
        autonomousDecisions: missionConfig.autonomousDecisions || [],
        managerApprovalDecisions: missionConfig.managerApprovalDecisions || [],
        bossEscalationSignals: missionConfig.bossEscalationSignals || [],
        managerReportingExpectation: missionConfig.managerReportingExpectation || null,
        latestTask: {
            type: inboundMessage.type,
            taskId: inboundMessage.taskId || null,
            payload: inboundMessage.payload || {}
        }
    };

    if (inboundMessage.type === 'task.start' || inboundMessage.type === 'status.update') {
        writeAgentState(context.fromUrl, agentConfig.id, statePayload);
        emitOutboxMessage(context.fromUrl, agentConfig.id, createEnvelope({
            type: 'status.update',
            from: agentConfig.id,
            to: 'manager',
            taskId: inboundMessage.taskId,
            inReplyTo: inboundMessage.id,
            scopePaths: inboundMessage.scopePaths,
            payload: {
                summary: `Parent revenue objective: ${missionConfig.targetMetric || 'increase daily revenue'}`,
                objective: missionConfig.objective || null,
                nextLoop: missionConfig.operatingLoop || [],
                latestFocus: inboundMessage.payload?.focusArea || null
            }
        }));

        if (typeof inboundMessage.payload?.proposedAction === 'string' && inboundMessage.payload.proposedAction.trim()) {
            emitOutboxMessage(context.fromUrl, agentConfig.id, createDecisionRequest(
                agentConfig.id,
                inboundMessage,
                inboundMessage.payload.proposedAction.trim()
            ));
        }
        return 1;
    }

    if (inboundMessage.type === 'decision.approved') {
        writeAgentState(context.fromUrl, agentConfig.id, {
            ...statePayload,
            latestApprovedAction: inboundMessage.payload?.action || null
        });
        emitOutboxMessage(context.fromUrl, agentConfig.id, createEnvelope({
            type: 'status.update',
            from: agentConfig.id,
            to: 'manager',
            taskId: inboundMessage.taskId,
            inReplyTo: inboundMessage.id,
            scopePaths: inboundMessage.scopePaths,
            payload: {
                summary: `Parent revenue action approved: ${inboundMessage.payload?.action || 'unspecified'}`,
                approvedAction: inboundMessage.payload?.action || null
            }
        }));
        return 1;
    }

    return 0;
}

function handleInboundMessage(context, agentConfig, inboundMessage) {
    switch (agentConfig.mission) {
    case 'scout':
        return handleScoutMessage(context, agentConfig, inboundMessage);
    case 'builder':
        return handleBuilderMessage(context, agentConfig, inboundMessage);
    case 'review':
        return handleReviewMessage(context, agentConfig, inboundMessage);
    case 'parent-revenue':
        return handleParentRevenueMessage(context, agentConfig, inboundMessage);
    default:
        return 0;
    }
}

export function runWorkerOnce(options = {}) {
    const context = loadTeamContext(options);
    const agentId = options.agentId;
    const agentConfig = context.teamConfig.agents.find(agent => agent.id === agentId);

    if (!agentConfig) {
        throw new Error(`Unknown agent: ${agentId}`);
    }

    writeHeartbeat(context.fromUrl, agentId);

    let processedCount = 0;
    const inboxDir = resolveAgentInboxDir(context.fromUrl, agentId);
    const archiveDir = resolveAgentArchiveDir(context.fromUrl, agentId);
    const claimsDir = path.join(archiveDir, 'claims');

    while (true) {
        const claimPath = claimNextJson(inboxDir, claimsDir, `${agentId}-inbox`);
        if (!claimPath) {
            break;
        }

        const inboundMessage = readJsonFile(claimPath);
        processedCount += handleInboundMessage(context, agentConfig, inboundMessage);
        archiveClaimedJson(claimPath, archiveDir, { handledBy: agentId });
    }

    return { agentId, processedCount };
}

export async function runWorkerLoop(options = {}) {
    const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 5000;
    const signal = options.signal;

    while (!signal?.aborted) {
        runWorkerOnce(options);
        await sleep(intervalMs);
    }
}

function printUsage() {
    console.log('Usage: node .automation/scripts/agent-worker.js <run-once|run-loop> --agent <agent-id> [--interval-ms <ms>]');
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
    const agentFlagIndex = process.argv.indexOf('--agent');
    const agentId = agentFlagIndex >= 0 ? process.argv[agentFlagIndex + 1] : null;

    if (command === 'run-once' && agentId) {
        const result = runWorkerOnce({ agentId });
        console.log(JSON.stringify(result, null, 2));
    } else if (command === 'run-loop' && agentId) {
        const controller = new AbortController();
        process.on('SIGINT', () => controller.abort());
        process.on('SIGTERM', () => controller.abort());
        runWorkerLoop({ agentId, intervalMs: parseIntervalMs(), signal: controller.signal })
            .catch(error => {
                console.error(error);
                process.exitCode = 1;
            });
    } else {
        printUsage();
        process.exitCode = 1;
    }
}
