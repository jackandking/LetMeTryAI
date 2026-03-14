import { describe, expect, it } from '@jest/globals';

import { getBrandProfile } from './.agents/skills/brand-profiles/scripts/profile-loader.js';
import { buildTopicBrief } from './.agents/skills/topic-selector/scripts/topic-selector.js';
import {
    buildScaffoldPlan,
    createMetadataEntry,
    createQuestionConfig,
    renderOptionMarkup
} from './.agents/skills/voting-app-scaffold/scripts/scaffold.js';

describe('Voting app scaffold skill', () => {
    it('should create a fighter-jets-style question config', () => {
        const config = createQuestionConfig({
            appId: 'spring-lipstick',
            title: '春季口红新色大 PK',
            question: '你会把这一票投给哪个显白色号？',
            options: [
                { value: 'rose', label: '玫瑰豆沙' },
                { value: 'berry', label: '莓果红棕' }
            ]
        });

        expect(config.storageKey).toBe('spring_lipstick_v1.data');
        expect(config.options).toEqual([
            { value: 'rose', label: '玫瑰豆沙' },
            { value: 'berry', label: '莓果红棕' }
        ]);
    });

    it('should render option markup with local images', () => {
        const markup = renderOptionMarkup(
            [
                { value: 'rose', label: '玫瑰豆沙', image: 'rose.jpg' },
                { value: 'berry', label: '莓果红棕', image: 'berry.jpg' }
            ],
            'lipstick'
        );

        expect(markup).toContain('name="lipstick"');
        expect(markup).toContain('images/rose.jpg');
        expect(markup).toContain('<span>莓果红棕</span>');
    });

    it('should build metadata entries for new apps', () => {
        const metadata = createMetadataEntry({
            appId: 'parent-choice',
            appName: '家长爱选择题',
            description: '家长群都在投票的教育选择题',
            category: '教育',
            coverImage: 'parent-choice/images/cover.jpg',
            tags: ['教育', '家长']
        });

        expect(metadata.directory).toBe('parent-choice');
        expect(metadata.image).toBe('parent-choice/images/cover.jpg');
        expect(metadata.tags).toEqual(expect.arrayContaining(['投票', '教育', '家长']));
    });

    it('should build a full scaffold plan from brand and topic input', () => {
        const profile = getBrandProfile('womanai');
        const brief = buildTopicBrief(
            {
                title: '春季口红新色大 PK',
                category: '美妆',
                format: '投票',
                keywords: ['口红', '显白', '种草']
            },
            profile
        );

        const plan = buildScaffoldPlan({
            appId: 'spring-lipstick',
            appName: '春季显白色号',
            category: '娱乐',
            topicBrief: brief,
            brandProfile: profile,
            options: [
                { value: 'milk-tea', label: '奶茶裸调', image: 'milk-tea.jpg' },
                { value: 'rose', label: '玫瑰豆沙', image: 'rose.jpg' }
            ],
            tags: ['美妆', '春季'],
            inputName: 'lipstick'
        });

        expect(plan.templateDir).toBe('fighter-jets');
        expect(plan.profileId).toBe('womanai');
        expect(plan.files.appJsQuestionConfig).toContain('storageKey: "spring_lipstick_v1.data"');
        expect(plan.files.indexOptionsMarkup).toContain('name="lipstick"');
        expect(plan.metadataEntry.tags).toEqual(expect.arrayContaining(['投票', '美妆', '春季']));
        expect(plan.checklist.length).toBeGreaterThan(3);
    });
});
