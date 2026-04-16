/**
 * Video Generator Service - 视频生成服务
 *
 * 为发布的应用自动生成演示视频
 * - 录屏演示应用功能
 * - 生成视频封面
 * - 上传到快手
 */
import { join } from 'path';
import { promises as fs } from 'fs';
import { VideoRecorder, generateVoteAppVideoConfig } from '../tools/video-recorder.js';
import { logger } from '../utils/logger.js';
/**
 * 视频生成服务
 */
export class VideoGeneratorService {
    recorder;
    constructor() {
        this.recorder = new VideoRecorder();
    }
    /**
     * 为应用生成演示视频
     */
    async generate(config) {
        const startTime = Date.now();
        logger.info(`Generating video for app: ${config.appId}`, {
            appName: config.appName,
            appUrl: config.appUrl,
        });
        try {
            // 确保输出目录存在
            await fs.mkdir(config.outputDir, { recursive: true });
            // 生成视频文件路径
            const videoPath = join(config.outputDir, `${config.appId}-demo.mp4`);
            // 录屏生成视频
            const recordResult = await this.recordVideo(config, videoPath);
            if (!recordResult.success || !recordResult.videoPath) {
                throw new Error(`Video recording failed: ${recordResult.error}`);
            }
            // 生成视频封面（从视频中提取一帧）
            const thumbnailPath = await this.generateThumbnail(recordResult.videoPath, config.outputDir, config.appId);
            // 生成视频元数据
            const metadata = this.generateMetadata(config);
            const duration = Date.now() - startTime;
            logger.info(`Video generation completed`, {
                videoPath: recordResult.videoPath,
                thumbnailPath,
                duration: `${(duration / 1000).toFixed(1)}s`,
            });
            return {
                success: true,
                videoPath: recordResult.videoPath,
                thumbnailPath,
                title: metadata.title,
                description: metadata.description,
                tags: metadata.tags,
                duration: recordResult.duration,
                size: recordResult.size,
            };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Video generation failed: ${errorMessage}`);
            return {
                success: false,
                title: config.title || this.generateDefaultTitle(config.appName),
                description: config.description || this.generateDefaultDescription(config.appName),
                tags: config.tags || this.generateDefaultTags(config.appName),
                duration: Date.now() - startTime,
                size: 0,
                error: errorMessage,
            };
        }
    }
    /**
     * 录制视频
     */
    async recordVideo(config, videoPath) {
        const videoConfig = generateVoteAppVideoConfig(config.appUrl, videoPath, config.appName);
        return this.recorder.record(videoConfig);
    }
    /**
     * 生成视频封面（使用 Playwright 截取第一帧）
     */
    async generateThumbnail(videoPath, outputDir, appId) {
        // 简化版本：封面生成将在后续版本中实现
        // 目前返回 undefined，快手会自动生成封面
        logger.debug('Thumbnail generation skipped (will use auto-generated)');
        return undefined;
    }
    /**
     * 生成视频元数据
     */
    generateMetadata(config) {
        return {
            title: config.title || this.generateDefaultTitle(config.appName),
            description: config.description || this.generateDefaultDescription(config.appName),
            tags: config.tags || this.generateDefaultTags(config.appName),
        };
    }
    /**
     * 生成默认标题
     */
    generateDefaultTitle(appName) {
        const templates = [
            `快来试试${appName}，投出你的一票！`,
            `${appName} - 你的选择很重要`,
            `发现有趣的${appName}，一起来投票`,
            `${appName} | 热门投票推荐`,
        ];
        return templates[Math.floor(Math.random() * templates.length)];
    }
    /**
     * 生成默认描述
     */
    generateDefaultDescription(appName) {
        return `🎉 发现有趣的${appName}！\n\n` +
            `👉 点击链接参与投票\n` +
            `💬 分享你的观点\n` +
            `🔥 看看大家的选择\n\n` +
            `#投票 #互动 #${appName}`;
    }
    /**
     * 生成默认标签
     */
    generateDefaultTags(appName) {
        return ['投票', '互动', '热门', appName, 'letmetryai'];
    }
}
/**
 * 便捷函数：生成应用演示视频
 */
export async function generateAppDemoVideo(appId, appName, appUrl, outputDir) {
    const service = new VideoGeneratorService();
    return service.generate({
        appId,
        appName,
        appUrl,
        outputDir,
    });
}
/**
 * 保存视频任务状态
 */
export async function saveVideoTask(task, tasksDir) {
    await fs.mkdir(tasksDir, { recursive: true });
    const taskPath = join(tasksDir, `${task.id}.json`);
    await fs.writeFile(taskPath, JSON.stringify(task, null, 2));
}
/**
 * 加载视频任务
 */
export async function loadVideoTask(taskId, tasksDir) {
    try {
        const taskPath = join(tasksDir, `${taskId}.json`);
        const content = await fs.readFile(taskPath, 'utf-8');
        return JSON.parse(content);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=video-generator.js.map