import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
    loadFollowAppConfigs,
    parseFollowAppConfigPayload
} from './kuaishou-follow-config.js';

test('parseFollowAppConfigPayload resolves appSecret from environment variables', () => {
    const configs = parseFollowAppConfigPayload([
        {
            profileId: 'elder-love',
            appId: 'ks-elder',
            appSecretEnv: 'ELDER_SECRET'
        }
    ], {
        ELDER_SECRET: 'secret-1'
    });

    assert.deepEqual(configs, [
        {
            profileId: 'elder-love',
            profileName: '爱老人',
            appId: 'ks-elder',
            appSecret: 'secret-1'
        }
    ]);
});

test('loadFollowAppConfigs reads JSON array from config file', () => {
    const tempRoot = mkdtempSync(join(tmpdir(), 'kuaishou-follow-config-'));

    try {
        const configFile = join(tempRoot, 'app-config.local.json');
        writeFileSync(configFile, JSON.stringify([
            {
                profileId: 'parent-tools',
                appId: 'ks-parent',
                appSecret: 'secret-2'
            }
        ], null, 2), 'utf-8');

        const configs = loadFollowAppConfigs({
            configFile,
            env: {}
        });

        assert.equal(configs.length, 1);
        assert.equal(configs[0].profileName, '家长爱');
        assert.equal(configs[0].appSecret, 'secret-2');
    } finally {
        rmSync(tempRoot, { recursive: true, force: true });
    }
});

test('loadFollowAppConfigs prefers env JSON when present', () => {
    const configs = loadFollowAppConfigs({
        configFile: '/non-existent.json',
        env: {
            KUAISHOU_FOLLOW_APPS: JSON.stringify([
                {
                    profileId: 'womanai',
                    appId: 'ks-woman',
                    appSecret: 'secret-3'
                }
            ])
        }
    });

    assert.equal(configs.length, 1);
    assert.equal(configs[0].profileId, 'womanai');
    assert.equal(configs[0].profileName, '女人爱');
});
