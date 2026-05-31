#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
    resolveAgentApprovalDir,
    resolveAgentEventDir,
    resolveAgentTeamRuntimeDir
} from '../shared/agent-team/runtime-paths.js';
import { enqueueJson } from '../shared/agent-team/file-queue.js';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_FROM_URL = import.meta.url;

export function getWatchTargets(fromUrl = DEFAULT_FROM_URL) {
    return [
        path.join(resolveAgentTeamRuntimeDir(fromUrl), 'mailboxes'),
        resolveAgentApprovalDir(fromUrl, 'manager'),
        resolveAgentApprovalDir(fromUrl, 'boss')
    ];
}

export function recordWatchEvent(fromUrl = DEFAULT_FROM_URL, payload = {}) {
    return enqueueJson(resolveAgentEventDir(fromUrl), {
        type: 'watch.fs-change',
        createdAt: new Date().toISOString(),
        payload
    }, { prefix: 'watch' });
}

export function startAgentWatch(options = {}) {
    const fromUrl = options.fromUrl || DEFAULT_FROM_URL;
    const watchers = getWatchTargets(fromUrl)
        .filter(targetPath => fs.existsSync(targetPath))
        .map(targetPath => fs.watch(targetPath, { recursive: true }, (eventType, fileName) => {
            recordWatchEvent(fromUrl, {
                eventType,
                fileName: typeof fileName === 'string' ? fileName : null,
                targetPath
            });
        }));

    return {
        stop() {
            watchers.forEach(watcher => watcher.close());
        }
    };
}

if (process.argv[1] === __filename) {
    const watcher = startAgentWatch();
    process.on('SIGINT', () => {
        watcher.stop();
        process.exit(0);
    });
}

