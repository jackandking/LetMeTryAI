import { getBrandProfile, listBrandProfiles } from '../scripts/profile-loader.js';

console.log(
    listBrandProfiles().map(profile => ({
        id: profile.id,
        name: profile.name,
        categories: profile.preferredCategories
    }))
);

console.log(getBrandProfile('nanrenbao'));
