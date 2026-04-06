import { describe, expect, it } from '@jest/globals';
import {
    APPROVED_STATUS,
    DEFAULT_CANDIDATE_STATUS,
    attachTagsToImages,
    buildCreateGeneratedImagesTableSql,
    buildGeneratedImageInsertStatement,
    buildGenerationPlan,
    buildReviewUpdateStatement,
    computeTagScores,
    scoreDirections
} from './womanai-image-pipeline.js';

describe('womanai image pipeline helpers', () => {
    const images = [
        { id: 1, image_url: 'https://example.com/a.jpg', view_count: 120 },
        { id: 2, image_url: 'https://example.com/b.jpg', view_count: 80 },
        { id: 3, image_url: 'https://example.com/c.jpg', view_count: 30 }
    ];

    const manualTagRules = [
        { imageId: 1, tags: ['清纯', '长直发', '室内自然光', '淡妆', '近景头像'] },
        { imageUrlContains: '/b.jpg', tags: ['知性', '通勤', '咖啡馆', '精致妆', '半身'] }
    ];

    const directionTemplates = [
        {
            key: 'pure-longhair-indoor',
            label: '清纯长发室内感',
            requiredTags: ['清纯', '长直发', '室内自然光'],
            optionalTags: ['淡妆', '近景头像'],
            promptFragments: ['亲和力强'],
            variants: [{ key: 'close-up', promptFragments: ['浅景深'] }]
        },
        {
            key: 'smart-commute-cafe',
            label: '知性通勤咖啡馆感',
            requiredTags: ['知性', '通勤', '咖啡馆'],
            optionalTags: ['精致妆', '半身'],
            promptFragments: ['高级简洁'],
            variants: [{ key: 'window-light', promptFragments: ['窗边自然光'] }]
        }
    ];

    it('should attach configured tags to hot images', () => {
        const tagged = attachTagsToImages(images, manualTagRules);
        expect(tagged[0].tags).toEqual(['清纯', '长直发', '室内自然光', '淡妆', '近景头像']);
        expect(tagged[1].tags).toEqual(['知性', '通勤', '咖啡馆', '精致妆', '半身']);
        expect(tagged[2].tags).toEqual([]);
    });

    it('should compute tag scores from view counts', () => {
        const tagged = attachTagsToImages(images, manualTagRules);
        const tagScores = computeTagScores(tagged);
        expect(tagScores[0]).toEqual({ tag: '清纯', score: 120 });
        expect(tagScores.find(item => item.tag === '知性')).toEqual({ tag: '知性', score: 80 });
    });

    it('should score directions and build prompt plans', () => {
        const tagged = attachTagsToImages(images, manualTagRules);
        const ranked = scoreDirections(tagged, directionTemplates);

        expect(ranked[0].key).toBe('pure-longhair-indoor');
        expect(ranked[0].sourceImageIds).toEqual([1]);
        expect(ranked[0].sourceViewCountSum).toBe(120);

        const plan = buildGenerationPlan({
            rankedDirections: ranked,
            dailyVolume: 3,
            promptFoundation: {
                baseFragments: ['年轻男性写真', '真实摄影风格']
            }
        });

        expect(plan).toHaveLength(3);
        expect(plan[0].promptText).toContain('年轻男性写真');
        expect(plan[0].promptText).toContain('清纯');
        expect(plan[1].promptText).toContain('知性');
    });

    it('should build candidate table and review statements', () => {
        const ddl = buildCreateGeneratedImagesTableSql('womanai_generated_images');
        expect(ddl).toContain('CREATE TABLE IF NOT EXISTS womanai_generated_images');
        expect(ddl).toContain(`DEFAULT '${DEFAULT_CANDIDATE_STATUS}'`);

        const insert = buildGeneratedImageInsertStatement('womanai_generated_images', {
            directionKey: 'pure-longhair-indoor',
            directionLabel: '清纯长发室内感',
            promptText: '年轻男性写真，清纯，长直发',
            imageUrl: 'https://example.com/generated.jpg',
            provider: 'minimax',
            providerImageId: 'img-1',
            sourceImageIds: [1],
            sourceViewCountSum: 120
        });
        expect(insert.sql).toContain('INSERT INTO womanai_generated_images');
        expect(insert.params[8]).toBe(DEFAULT_CANDIDATE_STATUS);

        const review = buildReviewUpdateStatement('womanai_generated_images', {
            candidateId: 7,
            status: APPROVED_STATUS,
            reviewNote: 'Looks good',
            approvedImageId: 22
        });
        expect(review.sql).toContain('approved_image_id = ?');
        expect(review.params).toEqual([APPROVED_STATUS, 'Looks good', 22, 7]);
    });
});
