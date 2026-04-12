import test from 'node:test';
import assert from 'node:assert/strict';

import {
    PLATFORM_AUTH_FILENAME,
    WEB_AUTH_FILENAME,
    hasLoggedInKuaishouAuth,
    inferKuaishouAuthScope,
    resolveKuaishouAuthFile
} from './kuaishou-follow-auth.js';

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
