import {
    buildHotTaskAppFromCandidate,
    formatMetricsSummary,
    hasSuccessfulPromotion,
    rankHotTaskCandidates,
    selectPromotionCandidate
} from './hot-task-promo-workflow.js';

describe('hot-task-promo-workflow', () => {
    const sampleReport = {
        allTasks: [
            {
                planId: 257060,
                name: '青春期聊天技巧',
                source: '小程序',
                stats: {
                    darenCount: 314,
                    workCount: 348,
                    totalExposure: 82946
                }
            },
            {
                planId: 246797,
                name: '婆媳相处投票',
                source: '小程序',
                stats: {
                    darenCount: 14,
                    workCount: 16,
                    totalExposure: 135176
                }
            }
        ]
    };
    const sampleDelta = {
        delta: {
            allDeltas: [
                {
                    planId: 246797,
                    name: '婆媳相处投票',
                    source: '小程序',
                    daren: 14,
                    works: 16,
                    exposure: 135176,
                    deltaDaren: 1,
                    deltaWorks: 1,
                    deltaExposure: 34272,
                    isNew: false
                },
                {
                    planId: 257060,
                    name: '青春期聊天技巧',
                    source: '小程序',
                    daren: 314,
                    works: 348,
                    exposure: 82946,
                    deltaDaren: 10,
                    deltaWorks: 10,
                    deltaExposure: 3072,
                    isNew: false
                }
            ]
        }
    };

    it('ranks hottest tasks with delta-first ordering', () => {
        const ranked = rankHotTaskCandidates({
            report: sampleReport,
            delta: sampleDelta,
            reportDate: '2026-04-10'
        });

        expect(ranked[0].name).toBe('青春期聊天技巧');
        expect(ranked[0].metadata.id).toBe('parent-chat-teen');
        expect(ranked[1].name).toBe('婆媳相处投票');
    });

    it('skips successfully processed tasks and selects the next candidate', () => {
        const ranked = rankHotTaskCandidates({
            report: sampleReport,
            delta: sampleDelta,
            reportDate: '2026-04-10'
        });
        const selected = selectPromotionCandidate(ranked, [
            {
                appId: 'parent-chat-teen',
                reportDate: '2026-04-10',
                status: 'sent',
                processedAt: '2026-04-11T00:00:00.000Z'
            }
        ]);

        expect(selected.metadata.id).toBe('poxi-xiangchu-toupiao');
    });

    it('respects cooldown unless force mode is enabled', () => {
        const record = {
            appId: 'parent-chat-teen',
            reportDate: '2026-04-08',
            status: 'sent',
            processedAt: '2026-04-10T00:00:00.000Z'
        };

        expect(hasSuccessfulPromotion(record, {
            appId: 'parent-chat-teen',
            reportDate: '2026-04-10',
            cooldownDays: 3,
            now: new Date('2026-04-11T00:00:00.000Z')
        })).toBe(true);

        const ranked = rankHotTaskCandidates({
            report: sampleReport,
            delta: sampleDelta,
            reportDate: '2026-04-10'
        });
        const forced = selectPromotionCandidate(ranked, [record], {
            force: true,
            forceAppId: 'parent-chat-teen',
            cooldownDays: 3,
            now: new Date('2026-04-11T00:00:00.000Z')
        });

        expect(forced.metadata.id).toBe('parent-chat-teen');
    });

    it('builds a renderable app payload and metrics summary', () => {
        const ranked = rankHotTaskCandidates({
            report: sampleReport,
            delta: sampleDelta,
            reportDate: '2026-04-10'
        });
        const app = buildHotTaskAppFromCandidate(ranked[0], {
            recipientEmail: 'ops@example.com'
        });

        expect(app).toEqual(expect.objectContaining({
            appId: 'parent-chat-teen',
            pageTitle: '青春期聊天技巧',
            appUrl: 'https://letmetryai.cn/parent-chat-teen/',
            recipientEmail: 'ops@example.com'
        }));
        expect(formatMetricsSummary(ranked[0])).toEqual(expect.objectContaining({
            deltaDaren: 10,
            deltaWorks: 10,
            deltaExposure: 3072
        }));
    });
});
