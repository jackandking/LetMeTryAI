/**
 * Video Recorder Tool - 录屏自动化工具
 *
 * 使用 Playwright 录制应用演示视频
 * - 打开应用页面
 * - 自动执行交互流程（投票演示）
 * - 录制屏幕生成视频文件
 */
import { chromium } from 'playwright';
import { promises as fs } from 'fs';
import { dirname } from 'path';
import { logger } from '../utils/logger.js';
const QUALITY_PRESETS = {
    low: { videoSize: { width: 720, height: 1280 } },
    medium: { videoSize: { width: 1080, height: 1920 } },
    high: { videoSize: { width: 1080, height: 1920 } },
};
/**
 * 视频录制工具类
 */
export class VideoRecorder {
    browser = null;
    context = null;
    page = null;
    /**
     * 录制应用演示视频
     */
    async record(config) {
        const startTime = Date.now();
        try {
            // 确保输出目录存在
            await fs.mkdir(dirname(config.outputPath), { recursive: true });
            // 启动浏览器
            await this.launchBrowser(config);
            // 执行交互步骤
            await this.executeSteps(config);
            // 关闭并保存视频
            const videoPath = await this.closeAndSave();
            // 获取视频信息
            const stats = await fs.stat(videoPath);
            const duration = Date.now() - startTime;
            logger.info(`Video recorded successfully`, {
                path: videoPath,
                size: `${(stats.size / 1024 / 1024).toFixed(2)}MB`,
                duration: `${(duration / 1000).toFixed(1)}s`,
            });
            return {
                success: true,
                videoPath,
                duration,
                size: stats.size,
            };
        }
        catch (error) {
            logger.error(`Video recording failed: ${error instanceof Error ? error.message : String(error)}`);
            await this.cleanup();
            return {
                success: false,
                duration: Date.now() - startTime,
                size: 0,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
    /**
     * 启动浏览器并准备录制
     */
    async launchBrowser(config) {
        const quality = QUALITY_PRESETS[config.quality || 'medium'];
        const viewport = config.viewport || (config.mobile
            ? { width: 375, height: 812 } // iPhone X 尺寸
            : { width: 1280, height: 720 });
        this.browser = await chromium.launch({
            headless: true,
        });
        this.context = await this.browser.newContext({
            viewport,
            deviceScaleFactor: config.mobile ? 3 : 1,
            recordVideo: {
                dir: dirname(config.outputPath),
                size: quality.videoSize,
            },
        });
        this.page = await this.context.newPage();
        // 打开应用页面
        logger.info(`Opening app URL: ${config.appUrl}`);
        await this.page.goto(config.appUrl, { waitUntil: 'networkidle' });
        // 等待页面完全加载
        await this.page.waitForTimeout(2000);
    }
    /**
     * 执行交互步骤
     */
    async executeSteps(config) {
        if (!this.page)
            throw new Error('Page not initialized');
        const steps = config.steps || this.generateDefaultSteps();
        for (const step of steps) {
            logger.debug(`Executing step: ${step.description || step.type}`);
            try {
                switch (step.type) {
                    case 'wait':
                        await this.page.waitForTimeout(step.delay || 1000);
                        break;
                    case 'click':
                        if (step.selector) {
                            await this.page.click(step.selector);
                            await this.page.waitForTimeout(step.delay || 500);
                        }
                        break;
                    case 'hover':
                        if (step.selector) {
                            await this.page.hover(step.selector);
                            await this.page.waitForTimeout(step.delay || 500);
                        }
                        break;
                    case 'scroll':
                        await this.page.evaluate(() => {
                            window.scrollBy(0, 300);
                        });
                        await this.page.waitForTimeout(step.delay || 500);
                        break;
                    case 'vote':
                        await this.executeVoteStep(step);
                        break;
                }
            }
            catch (error) {
                logger.warn(`Step failed: ${step.description || step.type}`, { error });
                // 继续执行下一步
            }
        }
        // 最后等待一段时间
        await this.page.waitForTimeout(config.duration || 3000);
    }
    /**
     * 执行投票步骤
     */
    async executeVoteStep(step) {
        if (!this.page)
            return;
        const optionIndex = step.optionIndex ?? 0;
        // 查找投票选项并点击
        const optionSelectors = [
            `.vote-option:nth-child(${optionIndex + 1})`,
            `.option-card:nth-child(${optionIndex + 1})`,
            `[data-option-index="${optionIndex}"]`,
            '.vote-option',
            '.option-card',
        ];
        for (const selector of optionSelectors) {
            try {
                const elements = await this.page.$$(selector);
                if (elements[optionIndex]) {
                    await elements[optionIndex].click();
                    logger.debug(`Voted on option ${optionIndex}`);
                    await this.page.waitForTimeout(step.delay || 1000);
                    return;
                }
            }
            catch {
                // 尝试下一个选择器
            }
        }
        // 如果找不到特定选项，点击第一个可用的
        const fallbackSelectors = ['.vote-option', '.option-card', '[class*="option"]'];
        for (const selector of fallbackSelectors) {
            try {
                await this.page.click(selector);
                await this.page.waitForTimeout(step.delay || 1000);
                return;
            }
            catch {
                // 继续尝试
            }
        }
    }
    /**
     * 生成默认的交互步骤（投票应用演示）
     */
    generateDefaultSteps() {
        return [
            { type: 'wait', delay: 2000, description: '展示首页' },
            { type: 'scroll', delay: 1000, description: '滚动查看选项' },
            { type: 'vote', optionIndex: 0, delay: 1500, description: '点击第一个选项投票' },
            { type: 'wait', delay: 2000, description: '展示投票结果' },
            { type: 'scroll', delay: 800, description: '滚动查看更多' },
            { type: 'vote', optionIndex: 1, delay: 1500, description: '点击第二个选项' },
            { type: 'wait', delay: 2000, description: '展示最终结果' },
        ];
    }
    /**
     * 关闭浏览器并保存视频
     */
    async closeAndSave() {
        if (!this.context)
            throw new Error('Context not initialized');
        const video = this.page?.video();
        if (!video)
            throw new Error('Video recording not available');
        // 关闭 context 会触发视频保存
        await this.context.close();
        const videoPath = await video.path();
        if (this.browser) {
            await this.browser.close();
        }
        this.browser = null;
        this.context = null;
        this.page = null;
        return videoPath;
    }
    /**
     * 清理资源
     */
    async cleanup() {
        try {
            if (this.context)
                await this.context.close();
            if (this.browser)
                await this.browser.close();
        }
        catch (error) {
            logger.warn('Cleanup error', { error });
        }
        this.browser = null;
        this.context = null;
        this.page = null;
    }
}
/**
 * 录制视频（便捷函数）
 */
export async function recordAppVideo(appUrl, outputPath, options) {
    const recorder = new VideoRecorder();
    return recorder.record({
        appUrl,
        outputPath,
        ...options,
    });
}
/**
 * 生成投票应用演示视频配置
 */
export function generateVoteAppVideoConfig(appUrl, outputPath, appName) {
    return {
        appUrl,
        outputPath,
        mobile: true,
        quality: 'medium',
        duration: 15000,
        steps: [
            { type: 'wait', delay: 2000, description: `展示 ${appName} 首页` },
            { type: 'scroll', delay: 800, description: '滚动查看投票选项' },
            { type: 'vote', optionIndex: 0, delay: 1500, description: '点击第一个选项投票' },
            { type: 'wait', delay: 2000, description: '展示投票结果动画' },
            { type: 'scroll', delay: 800, description: '滚动查看更多选项' },
            { type: 'vote', optionIndex: 1, delay: 1500, description: '点击第二个选项' },
            { type: 'wait', delay: 2000, description: '展示最终投票结果' },
            { type: 'scroll', delay: 800, description: '滚动到底部' },
            { type: 'wait', delay: 1500, description: '展示底部信息' },
        ],
    };
}
//# sourceMappingURL=video-recorder.js.map