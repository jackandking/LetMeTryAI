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
            'validation-script',
            'manual-check',
            'kuaishou-publisher',
            'report-sender'
        ]);
        expect(workflow.steps[2].output.command).toBe('node scripts/validate-voting-app.js spring-lipstick');
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

    it('should use the elder-love publish template for elder-love workflows', () => {
        const workflow = buildLaunchWorkflow({
            profileId: 'elder-love',
            topicCandidates: [
                {
                    title: '你最喜欢的经典电视剧',
                    category: '怀旧',
                    format: '投票',
                    keywords: ['经典老剧', '回忆'],
                    signals: ['怀旧', '易理解', '可转发'],
                    qualities: ['易理解', '实用']
                },
                {
                    title: '极限运动最刺激的一项',
                    category: '娱乐',
                    format: '投票',
                    keywords: ['极限挑战'],
                    signals: ['高刺激'],
                    qualities: ['适合投票']
                }
            ],
            appId: 'elder-love',
            appName: '爱老人',
            category: '生活',
            options: [
                { value: 'journey-west', label: '西游记', image: 'journey-west.jpg' },
                { value: 'dream-red', label: '红楼梦', image: 'dream-red.jpg' }
            ]
        });

        expect(workflow.summary.profileId).toBe('elder-love');
        expect(workflow.publishPlan.spec.sourceTaskId).toBe('183044');
    });

    it('should use the parent-tools publish template for parent-tools workflows', () => {
        const workflow = buildLaunchWorkflow({
            profileId: 'parent-tools',
            topicCandidates: [
                {
                    title: '孩子写作业更适合先做哪一科',
                    category: '教育',
                    format: '投票',
                    keywords: ['写作业', '学习习惯'],
                    signals: ['家长关注', '实用', '家庭教育'],
                    qualities: ['易理解', '可执行']
                },
                {
                    title: '最刺激的极限运动挑战',
                    category: '娱乐',
                    format: '投票',
                    keywords: ['挑战'],
                    signals: ['高刺激'],
                    qualities: ['适合投票']
                }
            ],
            appId: 'parent-homework-choice',
            appName: '作业顺序投票',
            category: '教育',
            options: [
                { value: 'math-first', label: '先数学', image: 'math-first.jpg' },
                { value: 'language-first', label: '先语文', image: 'language-first.jpg' }
            ]
        });

        expect(workflow.summary.profileId).toBe('parent-tools');
        expect(workflow.publishPlan.spec.sourceTaskId).toBe('186229');
    });
});
