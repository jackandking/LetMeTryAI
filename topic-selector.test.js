import { describe, expect, it } from '@jest/globals';

import { getBrandProfile, listBrandProfiles } from './.agents/skills/brand-profiles/scripts/profile-loader.js';
import {
    buildTopicBrief,
    rankTopicCandidates,
    scoreTopicCandidate
} from './.agents/skills/topic-selector/scripts/topic-selector.js';

describe('Topic selector skills', () => {
    it('should expose the initial brand profiles', () => {
        const profiles = listBrandProfiles();

        expect(Array.isArray(profiles)).toBe(true);
        expect(profiles.map(profile => profile.id)).toEqual(
            expect.arrayContaining(['nanrenbao', 'womanai', 'elder-love', 'parent-tools'])
        );
    });

    it('should load brand profiles by id', () => {
        const profile = getBrandProfile('womanai');

        expect(profile.name).toBe('女人爱');
        expect(profile.preferredCategories).toContain('美妆');
    });

    it('should prefer womanai topics that match beauty signals', () => {
        const profile = getBrandProfile('womanai');
        const ranked = rankTopicCandidates(
            [
                {
                    title: '春季口红新色大 PK',
                    category: '美妆',
                    format: '投票',
                    keywords: ['口红', '显白', '种草'],
                    signals: ['美妆', '时尚', '对比强'],
                    qualities: ['适合投票', '轻松']
                },
                {
                    title: '新一代主战坦克火力排行',
                    category: '军事',
                    format: '投票',
                    keywords: ['坦克'],
                    signals: ['硬核科技', '对比强'],
                    qualities: ['适合投票']
                }
            ],
            profile,
            { limit: 2 }
        );

        expect(ranked[0].candidate.title).toBe('春季口红新色大 PK');
        expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('should reject topics that hit hard blocks', () => {
        const profile = getBrandProfile('parent-tools');
        const result = scoreTopicCandidate(
            {
                title: '家长群都在讨论的赌博套路',
                category: '工具',
                format: '投票',
                keywords: ['赌博'],
                signals: ['实用'],
                qualities: ['可执行']
            },
            profile
        );

        expect(result.accepted).toBe(false);
        expect(result.score).toBeLessThan(0);
    });

    it('should build a downstream topic brief', () => {
        const profile = getBrandProfile('elder-love');
        const brief = buildTopicBrief(
            {
                title: '退休后最想重拾的兴趣爱好',
                category: '怀旧',
                format: '投票',
                keywords: ['兴趣', '怀旧']
            },
            profile
        );

        expect(brief.profileId).toBe('elder-love');
        expect(brief.title).toContain('退休后最想重拾的兴趣爱好');
        expect(brief.question).toContain('退休后最想重拾的兴趣爱好');
    });
});
