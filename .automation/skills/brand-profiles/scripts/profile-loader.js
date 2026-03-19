import { elderLoveProfile } from '../profiles/elder-love.js';
import { nanrenbaoProfile } from '../profiles/nanrenbao.js';
import { parentToolsProfile } from '../profiles/parent-tools.js';
import { womanaiProfile } from '../profiles/womanai.js';

export const BRAND_PROFILES = {
    'elder-love': elderLoveProfile,
    nanrenbao: nanrenbaoProfile,
    'parent-tools': parentToolsProfile,
    womanai: womanaiProfile
};

/**
 * Return all available brand profiles.
 *
 * @returns {object[]} All brand profiles.
 */
export function listBrandProfiles() {
    return Object.values(BRAND_PROFILES);
}

/**
 * Load one profile by its app/brand id.
 *
 * @param {string} profileId App or brand id.
 * @returns {object} Matching brand profile.
 */
export function getBrandProfile(profileId) {
    if (typeof profileId !== 'string' || !BRAND_PROFILES[profileId]) {
        throw new Error(`Unknown brand profile: ${profileId}`);
    }

    return BRAND_PROFILES[profileId];
}
