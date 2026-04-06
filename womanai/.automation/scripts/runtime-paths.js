import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function normalizeDirectory(directoryPath) {
    return path.resolve(directoryPath);
}

export function resolveWomanaiRoot(fromUrl) {
    if (typeof process.env.WOMANAI_PROJECT_DIR === 'string' && process.env.WOMANAI_PROJECT_DIR.trim()) {
        return normalizeDirectory(process.env.WOMANAI_PROJECT_DIR.trim());
    }

    if (typeof fromUrl === 'string' && fromUrl.startsWith('file:')) {
        return path.resolve(path.dirname(fileURLToPath(fromUrl)), '../..');
    }

    throw new Error('resolveWomanaiRoot requires import.meta.url when WOMANAI_PROJECT_DIR is not set');
}

export function resolveAutomationRoot(fromUrl) {
    return path.join(resolveWomanaiRoot(fromUrl), '.automation');
}

export function resolveRuntimeDir(fromUrl) {
    if (
        typeof process.env.WOMANAI_AUTOMATION_RUNTIME_DIR === 'string' &&
        process.env.WOMANAI_AUTOMATION_RUNTIME_DIR.trim()
    ) {
        return normalizeDirectory(process.env.WOMANAI_AUTOMATION_RUNTIME_DIR.trim());
    }

    return path.join(resolveAutomationRoot(fromUrl), '.local');
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

export function resolveConfigPath(fromUrl, configFile = 'womanai-image-gen.config.json') {
    if (
        typeof process.env.WOMANAI_AUTOMATION_CONFIG_FILE === 'string' &&
        process.env.WOMANAI_AUTOMATION_CONFIG_FILE.trim()
    ) {
        return path.resolve(process.env.WOMANAI_AUTOMATION_CONFIG_FILE.trim());
    }

    return path.join(resolveAutomationRoot(fromUrl), 'config', configFile);
}

export function isExecutedDirectly(fromUrl) {
    if (typeof fromUrl !== 'string' || !fromUrl.startsWith('file:')) {
        return false;
    }

    if (!process.argv[1]) {
        return false;
    }

    return path.resolve(process.argv[1]) === fileURLToPath(fromUrl);
}

export function ensureRuntimeDirectories(fromUrl) {
    const runtimeDir = resolveRuntimeDir(fromUrl);
    const directories = ['logs', 'exports', 'tmp', 'generated'].map(name => ensureDirectory(path.join(runtimeDir, name)));
    return {
        runtimeDir,
        directories
    };
}
