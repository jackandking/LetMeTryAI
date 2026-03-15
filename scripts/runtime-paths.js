import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function normalizeDirectory(directoryPath) {
    return path.resolve(directoryPath);
}

export function resolveProjectRoot(fromUrl) {
    if (typeof process.env.PROJECT_DIR === 'string' && process.env.PROJECT_DIR.trim()) {
        return normalizeDirectory(process.env.PROJECT_DIR.trim());
    }

    if (typeof fromUrl === 'string' && fromUrl.startsWith('file:')) {
        return path.resolve(path.dirname(fileURLToPath(fromUrl)), '..');
    }

    throw new Error('resolveProjectRoot requires import.meta.url when PROJECT_DIR is not set');
}

export function resolveRuntimeDir(fromUrl) {
    if (typeof process.env.LETMETRY_RUNTIME_DIR === 'string' && process.env.LETMETRY_RUNTIME_DIR.trim()) {
        return normalizeDirectory(process.env.LETMETRY_RUNTIME_DIR.trim());
    }

    return path.join(resolveProjectRoot(fromUrl), '.runtime');
}

export function ensureDirectory(directoryPath) {
    fs.mkdirSync(directoryPath, { recursive: true });
    return directoryPath;
}

export function ensureParentDirectory(filePath) {
    return ensureDirectory(path.dirname(filePath));
}

export function resolveRuntimePath(fromUrl, ...segments) {
    return path.join(resolveRuntimeDir(fromUrl), ...segments);
}

export function resolveKuaishouAuthFile(fromUrl) {
    if (typeof process.env.KUAISHOU_AUTH_FILE === 'string' && process.env.KUAISHOU_AUTH_FILE.trim()) {
        return path.resolve(process.env.KUAISHOU_AUTH_FILE.trim());
    }

    return resolveRuntimePath(fromUrl, 'kuaishou_auth.json');
}

export function resolveEmailDraftLatestPath(fromUrl) {
    if (typeof process.env.EMAIL_DRAFT_PATH === 'string' && process.env.EMAIL_DRAFT_PATH.trim()) {
        return path.resolve(process.env.EMAIL_DRAFT_PATH.trim());
    }

    return resolveRuntimePath(fromUrl, 'email-drafts', 'latest.txt');
}

export function buildTimestampedEmailDraftPath(emailDraftLatestPath, date = new Date()) {
    const directory = path.dirname(emailDraftLatestPath);
    const extension = path.extname(emailDraftLatestPath) || '.txt';
    const timestamp = date.toISOString().replace(/[:.]/g, '-');
    return path.join(directory, `email-draft-${timestamp}${extension}`);
}
