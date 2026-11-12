import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
    PLATFORM_AUTH_FILENAME,
    WEB_AUTH_FILENAME,
    assertAuthValid,
    checkCookieExpiry,
    hasLoggedInKuaishouAuth,
    inferKuaishouAuthScope,
    resolveKuaishouAuthFile
} from './kuaishou-follow-auth.js';

const DAY = 24 * 60 * 60;
const nowSec = () => Math.floor(Date.now() / 1000);

function writeAuth(t, cookies) {
    const dir = mkdtempSync(join(tmpdir(), 'ks-auth-test-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const file = join(dir, 'auth.json');
    writeFileSync(file, JSON.stringify({ cookies, origins: [] }));
    return file;
}

test('checkCookieExpiry ignores expired short-lived copies when passToken is valid', (t) => {
    const n = nowSec();
    const file = writeAuth(t, [
        { name: 'userId', domain: '.kuaishou.com', expires: n - 10 * DAY, value: 'old' },
        { name: 'userId', domain: 'id.kuaishou.com', expires: n + 30 * DAY, value: 'new' },
        { name: 'kuaishou.server.webday7_st', domain: 'www.kuaishou.com', expires: n - 10 * DAY, value: 'old' },
        { name: 'passToken', domain: 'id.kuaishou.com', expires: n + 20 * DAY, value: 'master' }
    ]);
    const result = checkCookieExpiry(file);
    assert.equal(result.isExpired, false);
    assert.equal(result.cookieName, 'passToken');
    assert.equal(result.reason, 'master-token');
    assert.equal(result.ignoredExpiredCopies, 2);
    assert.doesNotThrow(() => assertAuthValid(file));
});

test('checkCookieExpiry treats an expired passToken as fatal', (t) => {
    const n = nowSec();
    const file = writeAuth(t, [
        { name: 'passToken', domain: 'id.kuaishou.com', expires: n - 3600, value: 'old' },
        { name: 'userId', domain: '.kuaishou.com', expires: n + 30 * DAY, value: 'fresh' }
    ]);
    const result = checkCookieExpiry(file);
    assert.equal(result.isExpired, true);
    assert.equal(result.reason, 'master-token-expired');
    assert.throws(() => assertAuthValid(file), /master-token-expired/);
});

test('checkCookieExpiry flags expiring-soon master token', (t) => {
    const file = writeAuth(t, [
        { name: 'passToken', expires: nowSec() + 48 * 60 * 60, value: 'master' }
    ]);
    const result = checkCookieExpiry(file);
    assert.equal(result.isExpired, false);
    assert.equal(result.isExpiringSoon, true);
});

test('checkCookieExpiry distinguishes missing cookies from all-expired cookies', (t) => {
    const none = writeAuth(t, [{ name: 'kpf', expires: nowSec() + DAY, value: 'x' }]);
    assert.equal(checkCookieExpiry(none).reason, 'no-critical-cookies');

    const allExpired = writeAuth(t, [
        { name: 'userId', expires: nowSec() - 100, value: 'x' },
        { name: 'kuaishou.server.webday7_st', expires: nowSec() - 100, value: 'y' }
    ]);
    assert.equal(checkCookieExpiry(allExpired).reason, 'all-critical-cookies-expired');
    assert.equal(checkCookieExpiry(allExpired).isExpired, true);
});

test('checkCookieExpiry reports a missing auth file', () => {
    const result = checkCookieExpiry('/tmp/ks-auth-does-not-exist-12345.json');
    assert.equal(result.reason, 'no-auth-file');
    assert.equal(result.isExpired, true);
});

test('inferKuaishouAuthScope separates website and platform login realms', () => {
    assert.equal(inferKuaishouAuthScope('https://www.kuaishou.com/short-video/abc'), 'web');
    assert.equal(inferKuaishouAuthScope('https://id.kuaishou.com/pass/kuaishou/login/mobileCode'), 'web');
    assert.equal(inferKuaishouAuthScope('https://open.kuaishou.com/console'), 'platform');
    assert.equal(inferKuaishouAuthScope('https://daren.kuaishou.com/distribution-plan-list'), 'platform');
});

test('resolveKuaishouAuthFile uses separate files for web and platform auth', () => {
    assert.equal(
        resolveKuaishouAuthFile('/tmp/auth', 'https://www.kuaishou.com/short-video/abc'),
        `/tmp/auth/${WEB_AUTH_FILENAME}`
    );
    assert.equal(
        resolveKuaishouAuthFile('/tmp/auth', 'https://open.kuaishou.com/console'),
        `/tmp/auth/${PLATFORM_AUTH_FILENAME}`
    );
});

test('hasLoggedInKuaishouAuth only accepts states with real login cookies', () => {
    assert.equal(hasLoggedInKuaishouAuth({
        cookies: [
            { name: 'kpf', value: '1' },
            { name: 'kwscode', value: '2' }
        ]
    }), false);

    assert.equal(hasLoggedInKuaishouAuth({
        cookies: [
            { name: 'kpf', value: '1' },
            { name: 'kuaishou.server.web_st', value: 'token' }
        ]
    }), true);
});
