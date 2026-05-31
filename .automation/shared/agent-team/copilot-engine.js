import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { resolveProjectRoot } from '../../scripts/runtime-paths.js';
import {
    ensureAgentTeamDirectories,
    resolveAgentContextDir,
    resolveAgentStateDir,
    resolveAgentTeamRuntimeDir
} from './runtime-paths.js';
import { getAgentTeamStatus } from './status.js';

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function loadMissionConfig(fromUrl, missionId) {
    const projectRoot = resolveProjectRoot(fromUrl);
    return readJson(path.join(projectRoot, '.automation', 'config', 'agent-missions', `${missionId}.json`));
}

function ensureSessionState(fromUrl, agentId) {
    const stateDir = resolveAgentStateDir(fromUrl);
    const statePath = path.join(stateDir, `${agentId}-copilot-session.json`);

    if (fs.existsSync(statePath)) {
        return { statePath, state: readJson(statePath) };
    }

    const state = {
        sessionId: crypto.randomUUID(),
        sessionName: agentId,
        createdAt: new Date().toISOString()
    };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
    return { statePath, state };
}

function renderList(title, items = []) {
    return [
        `## ${title}`,
        ...items.map(item => `- ${item}`)
    ].join('\n');
}

export function writeAgentCopilotContext(fromUrl, agentId = 'parent-revenue') {
    ensureAgentTeamDirectories(fromUrl, ['manager', 'scout', 'builder', 'review', 'parent-revenue']);

    const contextDir = resolveAgentContextDir(fromUrl);
    const runtimeDir = resolveAgentTeamRuntimeDir(fromUrl);
    const mission = loadMissionConfig(fromUrl, agentId);
    const status = getAgentTeamStatus({ fromUrl });
    const agentStatePath = path.join(resolveAgentStateDir(fromUrl), `${agentId}.json`);
    const agentState = fs.existsSync(agentStatePath) ? readJson(agentStatePath) : null;
    const { statePath, state } = ensureSessionState(fromUrl, agentId);
    const briefPath = path.join(contextDir, `${agentId}-brief.md`);
    const handoffPath = path.join(contextDir, `${agentId}-handoff.md`);

    const brief = [
        `# ${agentId} Copilot Brief`,
        '',
        `- **Role:** ${mission.role}`,
        `- **Objective:** ${mission.objective}`,
        `- **Target metric:** ${mission.targetMetric}`,
        `- **Runtime:** ${runtimeDir}`,
        `- **Stable Copilot session name:** ${state.sessionName}`,
        `- **Stable Copilot session id:** ${state.sessionId}`,
        '',
        renderList('Resources', mission.resources),
        '',
        renderList('Limitations', mission.limitations),
        '',
        renderList('Autonomous decisions', mission.autonomousDecisions),
        '',
        renderList('Manager approval decisions', mission.managerApprovalDecisions),
        '',
        renderList('Escalate to boss only when', mission.bossEscalationSignals),
        '',
        `## Manager reporting expectation`,
        mission.managerReportingExpectation,
        '',
        renderList('Operating loop', mission.operatingLoop),
        '',
        '## Shared context strategy',
        '- Reuse the same Copilot session id/name on relaunch.',
        '- Read the handoff file at startup before acting.',
        '- Treat repo instructions plus runtime handoff files as the durable shared context layer.',
        '- Use the agent-team state/mailboxes as the source of truth for task continuity.'
    ].join('\n');

    const handoff = [
        `# ${agentId} Copilot Handoff`,
        '',
        `- **Generated at:** ${new Date().toISOString()}`,
        `- **Runtime initialized:** ${status.initialized ? 'yes' : 'no'}`,
        `- **Pending messages:** ${status.pendingMessages}`,
        `- **Manager approvals pending:** ${status.approvals.manager.pending}`,
        `- **Boss approvals pending:** ${status.approvals.boss.pending}`,
        '',
        '## Current agent-team status',
        '```text',
        status.agents.map(agent =>
            `${agent.id} [${agent.mission}] inbox=${agent.inboxPending} outbox=${agent.outboxPending} heartbeat=${agent.heartbeat.status}`
        ).join('\n'),
        '```',
        '',
        '## Parent agent state snapshot',
        '```json',
        JSON.stringify(agentState || {}, null, 2),
        '```',
        '',
        '## Key runtime paths',
        `- Inbox: ${path.join(runtimeDir, 'mailboxes', agentId, 'inbox')}`,
        `- Outbox: ${path.join(runtimeDir, 'mailboxes', agentId, 'outbox')}`,
        `- State: ${agentStatePath}`,
        `- Approvals(manager): ${path.join(runtimeDir, 'approvals', 'manager')}`,
        `- Approvals(boss): ${path.join(runtimeDir, 'approvals', 'boss')}`,
        `- Events: ${path.join(runtimeDir, 'events')}`
    ].join('\n');

    fs.writeFileSync(briefPath, brief, 'utf-8');
    fs.writeFileSync(handoffPath, handoff, 'utf-8');

    return {
        briefPath,
        handoffPath,
        sessionStatePath: statePath,
        session: state
    };
}

export function buildParentRevenueStartupPrompt(context = {}) {
    const projectRoot = context.projectRoot || resolveProjectRoot(import.meta.url);
    return [
        'You are the parent-revenue AI agent for the LetMeTryAI repository.',
        'Your mission is to raise parent-tools average daily revenue above RMB 100.',
        `Work in repo: ${projectRoot}`,
        `First read: ${context.briefPath}`,
        `Then read: ${context.handoffPath}`,
        'Use the parent-revenue inbox/outbox/state under .automation/.local/agent-team/ as your shared coordination layer.',
        'Treat repo instructions, the mission brief, and the handoff file as the durable shared context across sessions.',
        'Self-drive by periodically checking the inbox, state, approvals, and recent events; then update state or propose the next highest-value reversible action.',
        'For routine work, stay within parent-tools only, avoid risky voting framing, and optimize revenue rather than vanity traffic.',
        'Seek manager approval for pricing, publish/stop-task, cron, deploy, or tracked repo edits. Escalate to boss only when business data changes materially enough to require founder judgment.',
        'Keep your responses and work focused on actionable parent-tools growth steps, and maintain continuity with prior state instead of restarting from scratch.'
    ].join(' ');
}

export function buildParentRevenueCopilotArgs(options = {}) {
    const fromUrl = options.fromUrl || import.meta.url;
    const projectRoot = options.projectRoot || resolveProjectRoot(fromUrl);
    const context = writeAgentCopilotContext(fromUrl, 'parent-revenue');
    const startupPrompt = options.startupPrompt || buildParentRevenueStartupPrompt({
        projectRoot,
        briefPath: context.briefPath,
        handoffPath: context.handoffPath
    });

    return {
        context,
        args: [
            '--experimental',
            '--autopilot',
            '--name',
            context.session.sessionName,
            '--session-id',
            context.session.sessionId,
            '--allow-all-tools',
            '--allow-all-paths',
            '--add-dir',
            projectRoot,
            '--add-dir',
            '/Users/weiping/ParentTools',
            '-C',
            projectRoot,
            '-i',
            startupPrompt
        ]
    };
}

export function startParentRevenueCopilot(options = {}) {
    const fromUrl = options.fromUrl || import.meta.url;
    const { args, context } = buildParentRevenueCopilotArgs({ ...options, fromUrl });
    const child = spawn('copilot', args, {
        cwd: resolveProjectRoot(fromUrl),
        stdio: 'inherit',
        env: {
            ...process.env,
            COPILOT_ALLOW_ALL: '1'
        }
    });

    return { child, args, context };
}

