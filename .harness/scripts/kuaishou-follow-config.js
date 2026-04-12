import { existsSync, readFileSync } from 'fs';

export const KNOWN_FOLLOW_PROFILES = {
    'elder-love': {
        profileId: 'elder-love',
        profileName: '爱老人'
    },
    'parent-tools': {
        profileId: 'parent-tools',
        profileName: '家长爱'
    },
    nanrenbao: {
        profileId: 'nanrenbao',
        profileName: '男人宝'
    },
    womanai: {
        profileId: 'womanai',
        profileName: '女人爱'
    }
};

export function parseFollowAppConfigPayload(payload, env = process.env) {
    if (!Array.isArray(payload)) {
        throw new Error('Kuaishou follow app config must be an array');
    }

    return payload
        .filter(entry => entry && typeof entry === 'object' && entry.enabled !== false)
        .map(entry => {
            const profileId = String(entry.profileId || '').trim();
            const knownProfile = KNOWN_FOLLOW_PROFILES[profileId] || null;
            if (!profileId) {
                throw new Error('Each follow app config entry requires profileId');
            }

            const appId = String(entry.appId || '').trim();
            if (!appId) {
                throw new Error(`Follow app config for ${profileId} is missing appId`);
            }

            const appSecret = String(
                entry.appSecret
                || (entry.appSecretEnv ? env[String(entry.appSecretEnv).trim()] : '')
                || ''
            ).trim();
            if (!appSecret) {
                throw new Error(`Follow app config for ${profileId} is missing appSecret`);
            }

            return {
                profileId,
                profileName: String(entry.profileName || knownProfile?.profileName || profileId).trim(),
                appId,
                appSecret
            };
        });
}

export function loadFollowAppConfigs({
    configFile = '',
    env = process.env
} = {}) {
    const envPayload = String(env.KUAISHOU_FOLLOW_APPS || '').trim();
    if (envPayload) {
        return parseFollowAppConfigPayload(JSON.parse(envPayload), env);
    }

    if (!configFile || !existsSync(configFile)) {
        throw new Error(
            `No follow app config found. Set KUAISHOU_FOLLOW_APPS or create ${configFile || '<config-file>'}`
        );
    }

    const filePayload = JSON.parse(readFileSync(configFile, 'utf-8'));
    return parseFollowAppConfigPayload(filePayload, env);
}
