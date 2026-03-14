import { describe, expect, it } from '@jest/globals';

import {
    buildPublishChecklist,
    buildPublishCommand,
    buildPublishPlan,
    normalizePublishSpec
} from './.agents/skills/kuaishou-publisher/scripts/publisher.js';

describe('Kuaishou publisher skill', () => {
    it('should normalize publish specs with repository defaults', () => {
        const spec = normalizePublishSpec({
            appId: 'spring-lipstick',
            appName: '春季显白色号',
            description: '投票选出春季最显白的热门色号'
        });

        expect(spec.sourceTaskId).toBe('165805');
        expect(spec.authFile).toBe('kuaishou_auth.json');
        expect(spec.deployedUrl).toBe('https://letmetryai.cn/spring-lipstick/');
        expect(spec.headless).toBe(true);
    });

    it('should build the publish command from normalized input', () => {
        const command = buildPublishCommand({
            appId: 'spring-lipstick',
            appName: '春季显白色号',
            description: '投票选出春季最显白的热门色号'
        });

        expect(command).toContain('HEADLESS=true');
        expect(command).toContain("node 'scripts/publish-kuaishou-task.js'");
        expect(command).toContain("'spring-lipstick'");
        expect(command).toContain("'春季显白色号'");
    });

    it('should produce a deployment-first checklist', () => {
        const checklist = buildPublishChecklist({
            appId: 'spring-lipstick',
            appName: '春季显白色号',
            description: '投票选出春季最显白的热门色号'
        });

        expect(checklist[0]).toContain('https://letmetryai.cn/spring-lipstick/');
        expect(checklist).toEqual(
            expect.arrayContaining([
                expect.stringContaining('提交并推送'),
                expect.stringContaining('kuaishou_auth.json')
            ])
        );
    });

    it('should build a full publish plan with related skills', () => {
        const plan = buildPublishPlan({
            appId: 'spring-lipstick',
            appName: '春季显白色号',
            description: '投票选出春季最显白的热门色号',
            headless: false
        });

        expect(plan.command).toContain('HEADLESS=false');
        expect(plan.dependencies.relatedSkills).toEqual(
            expect.arrayContaining(['kuaishou-scraper', 'anti-blocking', 'web-scraper-playwright'])
        );
        expect(plan.notes[0]).toContain('165805');
    });
});
