import { describe, expect, it } from '@jest/globals';

import { buildLaunchWorkflow } from './.agents/skills/idea-to-launch/workflows/launch.js';

describe('Idea to launch orchestration skill', () => {
    it('should build an end-to-end launch workflow', () => {
        const workflow = buildLaunchWorkflow({
            profileId: 'womanai',
            topicCandidates: [
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
            appId: 'spring-lipstick',
            appName: '春季显白色号',
            category: '娱乐',
            options: [
                { value: 'milk-tea', label: '奶茶裸调', image: 'milk-tea.jpg' },
                { value: 'rose', label: '玫瑰豆沙', image: 'rose.jpg' }
            ]
        });

        expect(workflow.summary.profileId).toBe('womanai');
        expect(workflow.summary.selectedTopic).toBe('春季口红新色大 PK');
        expect(workflow.scaffoldPlan.metadataEntry.id).toBe('spring-lipstick');
        expect(workflow.publishPlan.command).toContain("'spring-lipstick'");
        expect(workflow.reportPlan.relatedSkill).toBe('report-sender');
        expect(workflow.steps.map(step => step.skill)).toEqual([
            'topic-selector',
            'voting-app-scaffold',
            'manual-check',
            'kuaishou-publisher',
            'report-sender'
        ]);
    });

    it('should fail when no topic candidates are provided', () => {
        expect(() =>
            buildLaunchWorkflow({
                profileId: 'nanrenbao',
                topicCandidates: [],
                appId: 'empty-case',
                appName: '空案例',
                category: '娱乐',
                options: []
            })
        ).toThrow('topicCandidates are required');
    });
});
