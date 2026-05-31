import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { ensureDirectory } from '../../scripts/runtime-paths.js';
import { resolveAgentLockDir } from './runtime-paths.js';

function stableSerialize(value) {
    if (Array.isArray(value)) {
        return `[${value.map(stableSerialize).join(',')}]`;
    }

    if (value && typeof value === 'object') {
        const entries = Object.keys(value)
            .sort()
            .map(key => `${JSON.stringify(key)}:${stableSerialize(value[key])}`);
        return `{${entries.join(',')}}`;
    }

    return JSON.stringify(value);
}

function normalizeString(value) {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function buildFingerprintFilePath(fromUrl, category, fingerprint) {
    const digest = crypto.createHash('sha1').update(fingerprint).digest('hex');
    return path.join(resolveAgentLockDir(fromUrl), 'idempotency', category, `${digest}.json`);
}

export function claimIdempotencyKey(fromUrl, category, fingerprint, metadata = {}) {
    const filePath = buildFingerprintFilePath(fromUrl, category, fingerprint);
    ensureDirectory(path.dirname(filePath));
    const payload = {
        fingerprint,
        claimedAt: new Date().toISOString(),
        metadata
    };

    try {
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), { encoding: 'utf-8', flag: 'wx' });
        return {
            claimed: true,
            filePath,
            record: payload
        };
    } catch (error) {
        if (error?.code !== 'EEXIST') {
            throw error;
        }
    }

    return {
        claimed: false,
        filePath,
        record: JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    };
}

export function buildDecisionFingerprint(envelope, options = {}) {
    return stableSerialize({
        type: options.type || envelope?.type || null,
        from: normalizeString(envelope?.from),
        to: normalizeString(options.to || envelope?.to),
        taskId: normalizeString(envelope?.taskId),
        action: normalizeString(options.action || envelope?.payload?.action),
        scopePaths: Array.isArray(envelope?.scopePaths)
            ? [...new Set(envelope.scopePaths
                .filter(value => typeof value === 'string' && value.trim())
                .map(value => value.trim()))].sort()
            : [],
        requestedTask: envelope?.payload?.requestedTask || null,
        proposedAction: normalizeString(envelope?.payload?.proposedAction),
        inReplyTo: normalizeString(envelope?.inReplyTo)
    });
}
