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

// Cookies that carry the actual session identity. Ordered by criticality:
// passToken is the master token (21-day TTL) — kuaishou auto-renews shorter-lived
// cookies (webday7_st, userId) as long as passToken is valid.
const CRITICAL_COOKIE_NAMES = [
    'passToken',
    'userId',
    'kuaishou.server.web_st',
    'kuaishou.server.webday7_st',
    'kuaishou.creator.marketing_st'
];

const EXPIRY_SOON_HOURS = 72;

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

export function checkCookieExpiry(authFile) {
    const authState = readAuthStateFile(authFile);
    if (!authState || !Array.isArray(authState.cookies)) {
        return { expiresAt: null, ttlHours: 0, isExpired: true, isExpiringSoon: true, cookieName: '', reason: 'no-auth-file' };
    }

    const nowSec = Date.now() / 1000;
    let earliest = { expires: Infinity, name: '' };

    for (const cookie of authState.cookies) {
        const name = String(cookie?.name || '').trim();
        if (!CRITICAL_COOKIE_NAMES.includes(name)) continue;
        const expires = Number(cookie.expires || 0);
        if (expires <= 0) continue;
        if (expires < earliest.expires) {
            earliest = { expires, name };
        }
    }

    if (earliest.expires === Infinity) {
        return { expiresAt: null, ttlHours: 0, isExpired: true, isExpiringSoon: true, cookieName: '', reason: 'no-critical-cookies' };
    }

    const ttlHours = Math.round((earliest.expires - nowSec) / 3600);
    const expiresAt = new Date(earliest.expires * 1000).toISOString();

    return {
        expiresAt,
        ttlHours,
        isExpired: ttlHours <= 0,
        isExpiringSoon: ttlHours > 0 && ttlHours < EXPIRY_SOON_HOURS,
        cookieName: earliest.name,
        reason: ''
    };
}

/**
 * Assert that the auth file has valid, non-expired cookies.
 * Throws a descriptive error if auth is missing or expired.
 */
export function assertAuthValid(authFile) {
    const authState = readAuthStateFile(authFile);
    if (!authState || !Array.isArray(authState.cookies) || authState.cookies.length === 0) {
        throw new Error(
            `Kuaishou auth file is missing or empty: ${authFile}\n` +
            `Fix: cd .harness && npm run kuaishou:follow -- start --url https://www.kuaishou.com`
        );
    }

    const cookieNames = new Set(
        authState.cookies.map(c => String(c?.name || '').trim()).filter(Boolean)
    );
    const hasLoginCookie = LOGIN_COOKIE_NAMES.some(name => cookieNames.has(name));
    if (!hasLoginCookie) {
        throw new Error(
            `Kuaishou auth file is missing login cookies: ${authFile}\n` +
            `Fix: cd .harness && npm run kuaishou:follow -- start --url https://www.kuaishou.com`
        );
    }

    const expiry = checkCookieExpiry(authFile);
    if (expiry.isExpired) {
        throw new Error(
            `Kuaishou auth expired (${expiry.cookieName} expired at ${expiry.expiresAt}).\n` +
            `Fix: cd .harness && npm run kuaishou:follow -- start --url https://www.kuaishou.com`
        );
    }

    return expiry;
}
