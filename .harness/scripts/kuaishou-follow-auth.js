import { copyFileSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

export const PLATFORM_AUTH_FILENAME = 'kuaishou_auth.json';
export const WEB_AUTH_FILENAME = 'kuaishou_www_auth.json';
export const LOGIN_COOKIE_NAMES = [
    'kuaishou.server.web_st',
    'kuaishou.creator.marketing_st',
    'userId',
    'bUserId',
    'passToken'
];

export function inferKuaishouAuthScope(url = '') {
    try {
        const host = new URL(String(url || '')).host;
        if (host === 'www.kuaishou.com' || host === 'id.kuaishou.com') {
            return 'web';
        }
    } catch {
        // Fallback to platform auth for invalid or missing URLs.
    }

    return 'platform';
}

export function resolveKuaishouAuthFile(authDir, url = '') {
    const filename = inferKuaishouAuthScope(url) === 'web'
        ? WEB_AUTH_FILENAME
        : PLATFORM_AUTH_FILENAME;
    return join(authDir, filename);
}

export function readAuthStateFile(authFile) {
    if (!existsSync(authFile)) {
        return null;
    }

    return JSON.parse(readFileSync(authFile, 'utf-8'));
}

export function hasLoggedInKuaishouAuth(authState) {
    if (!authState || !Array.isArray(authState.cookies)) {
        return false;
    }

    const cookieNames = new Set(
        authState.cookies
            .map(cookie => String(cookie?.name || '').trim())
            .filter(Boolean)
    );

    return LOGIN_COOKIE_NAMES.some(name => cookieNames.has(name));
}

export function backupAuthStateFile(authFile) {
    if (!existsSync(authFile)) {
        return null;
    }

    const backupFile = `${authFile}.bak`;
    copyFileSync(authFile, backupFile);
    return backupFile;
}
