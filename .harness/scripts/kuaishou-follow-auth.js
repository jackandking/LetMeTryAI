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

const MASTER_COOKIE_NAME = 'passToken';
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

/**
 * Check whether a stored login state can still start a browser session.
 *
 * Kuaishou writes several same-name cookies under different domains. The
 * short-lived web cookies (userId / webday7_st) are refreshed by the server
 * on the next page visit as long as the master passToken is valid, so one
 * expired copy must not fail the whole auth check. Only an expired or missing
 * master token is fatal. Same-name cookies are reduced to their latest copy.
 */
export function checkCookieExpiry(authFile) {
    const authState = readAuthStateFile(authFile);
    if (!authState || !Array.isArray(authState.cookies)) {
        return { expiresAt: null, ttlHours: 0, isExpired: true, isExpiringSoon: true, cookieName: '', reason: 'no-auth-file' };
    }

    const nowSec = Date.now() / 1000;
    const latestValid = new Map();
    let ignoredExpiredCopies = 0;
    let hasMasterCookie = false;

    for (const cookie of authState.cookies) {
        const name = String(cookie?.name || '').trim();
        if (!CRITICAL_COOKIE_NAMES.includes(name)) continue;
        if (name === MASTER_COOKIE_NAME) hasMasterCookie = true;

        const expires = Number(cookie.expires || 0);
        if (expires <= 0) continue; // session cookies carry no expiry
        if (expires < nowSec) {
            ignoredExpiredCopies++;
            continue;
        }

        const previous = latestValid.get(name);
        if (!previous || expires > previous.expires) {
            latestValid.set(name, { name, expires });
        }
    }

    // Master token exists but every copy expired: this is a real logout.
    if (hasMasterCookie && !latestValid.has(MASTER_COOKIE_NAME)) {
        return {
            expiresAt: null,
            ttlHours: 0,
            isExpired: true,
            isExpiringSoon: true,
            cookieName: MASTER_COOKIE_NAME,
            reason: 'master-token-expired',
            ignoredExpiredCopies
        };
    }

    const candidates = [...latestValid.values()];
    if (candidates.length === 0) {
        return {
            expiresAt: null,
            ttlHours: 0,
            isExpired: true,
            isExpiringSoon: true,
            cookieName: '',
            reason: ignoredExpiredCopies > 0 ? 'all-critical-cookies-expired' : 'no-critical-cookies',
            ignoredExpiredCopies
        };
    }

    const master = latestValid.get(MASTER_COOKIE_NAME);
    const chosen = master || candidates.sort((a, b) => a.expires - b.expires)[0];
    const ttlHours = Math.round((chosen.expires - nowSec) / 3600);

    return {
        expiresAt: new Date(chosen.expires * 1000).toISOString(),
        ttlHours,
        isExpired: ttlHours <= 0,
        isExpiringSoon: ttlHours > 0 && ttlHours < EXPIRY_SOON_HOURS,
        cookieName: chosen.name,
        reason: master ? 'master-token' : 'no-master-token',
        ignoredExpiredCopies
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
        const detail = expiry.expiresAt
            ? `${expiry.cookieName} expired at ${expiry.expiresAt}`
            : `${expiry.reason || 'auth state invalid'}`;
        throw new Error(
            `Kuaishou auth expired (${detail}).\n` +
            `Fix: cd .harness && npm run kuaishou:follow -- start --url https://www.kuaishou.com`
        );
    }

    return expiry;
}
