#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeAgentTeam, runManagerOnce } from './agent-manager.js';
import { runWorkerOnce } from './agent-worker.js';
import { createEnvelope } from '../shared/agent-team/protocol.js';
import { enqueueJson, writeJsonAtomic } from '../shared/agent-team/file-queue.js';
import { formatAgentTeamStatus, getAgentTeamStatus } from '../shared/agent-team/status.js';
import { resolveAgentInboxDir, resolveAgentStateDir } from '../shared/agent-team/runtime-paths.js';
import { buildParentRevenueCopilotArgs, writeAgentCopilotContext, startParentRevenueCopilot } from '../shared/agent-team/copilot-engine.js';

const __filename = fileURLToPath(import.meta.url);

function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

function readFlag(flagName, defaultValue = null) {
    const index = process.argv.indexOf(flagName);
    if (index < 0) {
        return defaultValue;
    }
    return process.argv[index + 1] ?? defaultValue;
}

function hasPendingMessage(agentId) {
    const inboxDir = resolveAgentInboxDir(import.meta.url, agentId);
    return fs.existsSync(inboxDir) && fs.readdirSync(inboxDir).some(fileName => fileName.endsWith('.json'));
}

export function ensureParentRevenueKickoff(options = {}) {
    const force = Boolean(options.force);
    const agentStateDir = resolveAgentStateDir(import.meta.url);
    const statePath = path.join(agentStateDir, 'parent-revenue.json');

    if (!force && (fs.existsSync(statePath) || hasPendingMessage('parent-revenue') || hasPendingMessage('manager'))) {
        return null;
    }

    return enqueueJson(resolveAgentInboxDir(import.meta.url, 'manager'), createEnvelope({
        type: 'task.start',
        from: 'boss',
        to: 'manager',
        taskId: 'parent-revenue-kickoff',
        scopePaths: ['parent-tools'],
        payload: {
            targetAgent: 'parent-revenue',
            title: 'Start parent-tools revenue loop',
            focusArea: 'daily-revenue',
            summary: 'Bootstrap the self-driven parent-tools revenue loop'
        }
    }), { prefix: 'kickoff' });
}

export function runParentRevenueTick() {
    initializeAgentTeam();
    runManagerOnce();
    runWorkerOnce({ agentId: 'parent-revenue' });
    runManagerOnce();
    return getAgentTeamStatus({ fromUrl: import.meta.url });
}

export async function runParentRevenueSessionLoop(options = {}) {
    const intervalMs = Number.isFinite(options.intervalMs) ? options.intervalMs : 5000;
    const signal = options.signal;

    while (!signal?.aborted) {
        runParentRevenueTick();
        await sleep(intervalMs);
    }
}

function recordSessionState(intervalMs) {
    const stateDir = resolveAgentStateDir(import.meta.url);
    writeJsonAtomic(path.join(stateDir, 'parent-revenue-session.json'), {
        startedAt: new Date().toISOString(),
        intervalMs,
        mode: process.stdin.isTTY ? 'interactive-copilot' : 'headless-copilot'
    });
}

function printUsage() {
    console.log('Usage: node .automation/scripts/start-parent-revenue-session.js [--interval-ms <ms>] [--no-kickoff] [--prepare-only]');
}

if (process.argv[1] === __filename) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    const intervalMs = Number.parseInt(readFlag('--interval-ms', '5000'), 10) || 5000;
    initializeAgentTeam();
    if (!process.argv.includes('--no-kickoff')) {
        ensureParentRevenueKickoff();
    }
    const initialStatus = runParentRevenueTick();
    recordSessionState(intervalMs);
    const context = writeAgentCopilotContext(import.meta.url, 'parent-revenue');

    if (process.argv.includes('--prepare-only')) {
        const status = formatAgentTeamStatus(initialStatus);
        console.log(JSON.stringify({
            briefPath: context.briefPath,
            handoffPath: context.handoffPath,
            sessionId: context.session.sessionId,
            sessionName: context.session.sessionName,
            status
        }, null, 2));
        process.exit(0);
    } else if (process.stdin.isTTY) {
        const controller = new AbortController();
        process.on('SIGINT', () => controller.abort());
        process.on('SIGTERM', () => controller.abort());
        const loopPromise = runParentRevenueSessionLoop({
            intervalMs,
            signal: controller.signal
        }).catch(error => {
            console.error(error);
            process.exitCode = 1;
        });
        const { child } = startParentRevenueCopilot({ fromUrl: import.meta.url });
        child.on('error', error => {
            controller.abort();
            console.error(error);
            process.exit(1);
        });
        child.on('exit', code => {
            controller.abort();
            Promise.resolve(loopPromise).finally(() => {
                process.exit(code ?? process.exitCode ?? 0);
            });
        });
    } else {
        const copilot = buildParentRevenueCopilotArgs({ fromUrl: import.meta.url });
        console.log(JSON.stringify({
            message: 'parent-revenue context prepared; launch Copilot in a TTY to interact',
            briefPath: copilot.context.briefPath,
            handoffPath: copilot.context.handoffPath,
            args: copilot.args
        }, null, 2));
        process.exit(0);
    }
}
