#!/usr/bin/env node

import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createEnvelope } from '../shared/agent-team/protocol.js';
import { enqueueJson } from '../shared/agent-team/file-queue.js';
import { resolveAgentInboxDir } from '../shared/agent-team/runtime-paths.js';

const __filename = fileURLToPath(import.meta.url);

function readFlag(flagName, defaultValue = null) {
    const index = process.argv.indexOf(flagName);
    if (index < 0) {
        return defaultValue;
    }
    return process.argv[index + 1] ?? defaultValue;
}

function readRepeatedFlags(flagName) {
    const values = [];
    process.argv.forEach((argument, index) => {
        if (argument === flagName && process.argv[index + 1]) {
            values.push(process.argv[index + 1]);
        }
    });
    return values;
}

export function queueAgentMessage(options = {}) {
    const to = options.to || 'parent-revenue';
    const from = options.from || 'boss';
    const type = options.type || 'status.update';
    const message = options.message || '';
    const focusArea = options.focusArea || null;
    const proposedAction = options.proposedAction || null;
    const scopePaths = Array.isArray(options.scopePaths) ? options.scopePaths : [];
    const taskId = options.taskId || `interactive-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

    const payload = {
        summary: message,
        message,
        focusArea
    };

    if (proposedAction) {
        payload.proposedAction = proposedAction;
    }

    const envelope = createEnvelope({
        type,
        from,
        to,
        taskId,
        scopePaths,
        payload
    });

    return enqueueJson(resolveAgentInboxDir(import.meta.url, to), envelope, { prefix: type });
}

function printUsage() {
    console.log('Usage: node .automation/scripts/agent-send.js --to <agent-id> [--from boss] [--type status.update] [--message <text>] [--focus <focus-area>] [--action <proposed-action>] [--scope <path>]');
}

if (process.argv[1] === __filename) {
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
        printUsage();
        process.exit(0);
    }

    const messagePath = queueAgentMessage({
        to: readFlag('--to', 'parent-revenue'),
        from: readFlag('--from', 'boss'),
        type: readFlag('--type', 'status.update'),
        message: readFlag('--message', ''),
        focusArea: readFlag('--focus', null),
        proposedAction: readFlag('--action', null),
        scopePaths: readRepeatedFlags('--scope')
    });

    console.log(messagePath);
}

