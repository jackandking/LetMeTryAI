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
        expect(spec.authFile).toBe('.runtime/kuaishou_auth.json');
        expect(spec.deployedUrl).toBe('https://letmetryai.cn/spring-lipstick/');
        expect(spec.headless).toBe(true);
    });

    it('should use the elder-love template task when publishing elder-love', () => {
        const spec = normalizePublishSpec({
            appId: 'elder-love',
            profileId: 'elder-love',
            appName: '爱老人',
            description: '老人关怀和娱乐应用'
        });

        expect(spec.sourceTaskId).toBe('183044');
    });

    it('should use the parent-tools template task when publishing parent-tools', () => {
        const spec = normalizePublishSpec({
            appId: 'parent-tools',
            profileId: 'parent-tools',
            appName: '家长爱',
            description: '家长教育工具集'
        });

        expect(spec.sourceTaskId).toBe('186229');
    });

    it('should build the publish command from normalized input', () => {
        const command = buildPublishCommand({
            appId: 'spring-lipstick',
            appName: '春季显白色号',
            description: '投票选出春季最显白的热门色号'
        });

        expect(command).toContain('HEADLESS=true');
        expect(command).toContain("SOURCE_TASK_ID='165805'");
        expect(command).toContain('PUBLISH_WAIT_FOR_MANUAL_MS=0');
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
                expect.stringContaining('.runtime/kuaishou_auth.json')
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

    it('should include brand-specific template task id in dependencies', () => {
        const plan = buildPublishPlan({
            appId: 'elder-love',
            profileId: 'elder-love',
            appName: '爱老人',
            description: '老人关怀和娱乐应用'
        });

        expect(plan.dependencies.templateTaskId).toBe('183044');
        expect(plan.notes[0]).toContain('183044');
    });

    it('should include parent-tools template task id in dependencies', () => {
        const plan = buildPublishPlan({
            appId: 'parent-tools',
            profileId: 'parent-tools',
            appName: '家长爱',
            description: '家长教育工具集'
        });

        expect(plan.dependencies.templateTaskId).toBe('186229');
        expect(plan.notes[0]).toContain('186229');
    });
});
