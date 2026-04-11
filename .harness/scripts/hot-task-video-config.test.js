import {
    buildArtifactBaseName,
    buildEmailSubject,
    buildHotTaskApp,
    buildEmailBody,
    buildNarrationLines,
    buildOverlayLines,
    DEFAULT_HOT_TASK_APP,
    HOT_TASK_APP,
    VIDEO_CAPTURE
} from './hot-task-video-config.js';

describe('hot-task-video-config', () => {
    it('buildNarrationLines should include the hot task title and star plan guidance', () => {
        const lines = buildNarrationLines();

        expect(lines).toHaveLength(5);
        expect(lines.join(' ')).toContain(HOT_TASK_APP.pageTitle);
        expect(lines.join(' ')).toContain('广告效果');
        expect(lines.join(' ')).toContain('90');
        expect(lines.join(' ')).toContain('开放式问题');
        expect(lines.join(' ')).toContain('按本视频的主题');
    });

    it('buildOverlayLines should expose url and search hint', () => {
        const lines = buildOverlayLines();

        expect(lines[0]).toContain('左下角链接');
        expect(lines[1]).toContain('本视频主题');
        expect(lines[2]).toContain('90%');
    });

    it('buildEmailBody should contain the clickable url and upload guidance', () => {
        const body = buildEmailBody();

        expect(body).toContain(HOT_TASK_APP.appUrl);
        expect(body).toContain('真实线上页面');
        expect(body).toContain('WebView');
        expect(body).toContain('90%');
    });

    it('keeps viewport and recording canvas aligned', () => {
        expect(VIDEO_CAPTURE.viewportWidth).toBe(VIDEO_CAPTURE.recordWidth);
        expect(VIDEO_CAPTURE.viewportHeight).toBe(VIDEO_CAPTURE.recordHeight);
        expect(VIDEO_CAPTURE.outputWidth / VIDEO_CAPTURE.outputHeight).toBe(
            VIDEO_CAPTURE.viewportWidth / VIDEO_CAPTURE.viewportHeight
        );
        expect(VIDEO_CAPTURE.userAgent).toContain('KUAISHOU');
    });

    it('buildArtifactBaseName should generate a distinguishable video filename prefix', () => {
        expect(buildArtifactBaseName()).toBe('parent-chat-teen-kuaishou-hot-task-video');
        expect(buildArtifactBaseName()).not.toBe('promo');
    });

    it('buildHotTaskApp should allow reusable overrides without mutating defaults', () => {
        const overridden = buildHotTaskApp({
            appId: 'poxi-xiangchu-toupiao',
            pageTitle: '婆媳相处投票',
            appUrl: 'https://letmetryai.cn/poxi-xiangchu-toupiao/',
            recipientEmail: 'ops@example.com'
        });

        expect(overridden).toEqual(expect.objectContaining({
            appId: 'poxi-xiangchu-toupiao',
            pageTitle: '婆媳相处投票',
            recipientEmail: 'ops@example.com'
        }));
        expect(DEFAULT_HOT_TASK_APP.appId).toBe('parent-chat-teen');
    });

    it('buildEmailSubject should include the target page title', () => {
        expect(buildEmailSubject()).toBe(`热门任务视频 - ${HOT_TASK_APP.pageTitle}`);
    });
});
