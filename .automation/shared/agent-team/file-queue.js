import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ensureDirectory, ensureParentDirectory } from '../../scripts/runtime-paths.js';

function createFileName(prefix = 'queue') {
    return `${Date.now()}-${prefix}-${crypto.randomBytes(4).toString('hex')}.json`;
}

export function writeJsonAtomic(filePath, payload) {
    ensureParentDirectory(filePath);
    const tempPath = `${filePath}.${process.pid}.${crypto.randomBytes(3).toString('hex')}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(payload, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return filePath;
}

export function readJsonFile(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

export function enqueueJson(queueDir, payload, options = {}) {
    ensureDirectory(queueDir);
    const prefix = typeof options.prefix === 'string' && options.prefix.trim() ? options.prefix.trim() : 'msg';
    const filePath = path.join(queueDir, createFileName(prefix));
    writeJsonAtomic(filePath, payload);
    return filePath;
}

export function listQueueFiles(queueDir) {
    if (!fs.existsSync(queueDir)) {
        return [];
    }

    return fs.readdirSync(queueDir)
        .filter(fileName => fileName.endsWith('.json'))
        .sort()
        .map(fileName => path.join(queueDir, fileName));
}

export function claimNextJson(queueDir, claimsDir, consumerId) {
    ensureDirectory(queueDir);
    ensureDirectory(claimsDir);

    for (const filePath of listQueueFiles(queueDir)) {
        const claimFileName = `${path.basename(filePath, '.json')}--${consumerId}.json`;
        const claimPath = path.join(claimsDir, claimFileName);

        try {
            fs.renameSync(filePath, claimPath);
            return claimPath;
        } catch (error) {
            if (error && error.code === 'ENOENT') {
                continue;
            }
            throw error;
        }
    }

    return null;
}

export function archiveClaimedJson(claimPath, archiveDir, archiveMetadata = {}) {
    ensureDirectory(archiveDir);
    const archivedPayload = {
        ...readJsonFile(claimPath),
        archive: {
            ...archiveMetadata,
            archivedAt: new Date().toISOString()
        }
    };
    const archivePath = path.join(archiveDir, path.basename(claimPath));
    writeJsonAtomic(archivePath, archivedPayload);
    fs.unlinkSync(claimPath);
    return archivePath;
}

