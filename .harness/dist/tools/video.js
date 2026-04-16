/**
 * Video Tools - 视频生成和发布工具
 *
 * 集成到 Tool Registry 的视频相关工具
 */
import { VideoGeneratorService } from '../services/video-generator.js';
import { VideoPublisher } from '../services/video-publisher.js';
import { logger } from '../utils/logger.js';
/**
 * 视频生成工具
 */
export const videoGenerateTool = {
    name: 'video.generate',
    description: 'Generate demo video for an app using screen recording',
    schema: {
        type: 'object',
        properties: {
            appId: { type: 'string' },
            appName: { type: 'string' },
            appUrl: { type: 'string' },
            outputDir: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
        },
        required: ['appId', 'appName', 'appUrl', 'outputDir'],
    },
    async execute(args) {
        const { appId, appName, appUrl, outputDir, title, description, tags, } = args;
        const startTime = Date.now();
        try {
            const service = new VideoGeneratorService();
            const result = await service.generate({
                appId,
                appName,
                appUrl,
                outputDir,
                title,
                description,
                tags,
            });
            return {
                success: result.success,
                data: result,
                metadata: {
                    duration: Date.now() - startTime,
                    retries: 0,
                },
            };
        }
        catch (error) {
            logger.error(`Video generation tool failed: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error : new Error(String(error)),
                metadata: {
                    duration: Date.now() - startTime,
                    retries: 0,
                },
            };
        }
    },
};
/**
 * 视频发布工具
 */
export const videoPublishTool = {
    name: 'video.publish',
    description: 'Publish video to Kuaishou platform',
    schema: {
        type: 'object',
        properties: {
            videoPath: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
            coverPath: { type: 'string' },
            visibility: { type: 'string', enum: ['public', 'private'] },
        },
        required: ['videoPath', 'title'],
    },
    async execute(args) {
        const { videoPath, title, description, tags, coverPath, visibility, } = args;
        const startTime = Date.now();
        try {
            const publisher = new VideoPublisher();
            const result = await publisher.publish({
                videoPath,
                title,
                description,
                tags,
                coverPath,
                visibility,
            });
            return {
                success: result.success,
                data: result,
                metadata: {
                    duration: Date.now() - startTime,
                    retries: 0,
                },
            };
        }
        catch (error) {
            logger.error(`Video publish tool failed: ${error instanceof Error ? error.message : String(error)}`);
            return {
                success: false,
                data: null,
                error: error instanceof Error ? error : new Error(String(error)),
                metadata: {
                    duration: Date.now() - startTime,
                    retries: 0,
                },
            };
        }
    },
};
/**
 * 完整的视频工作流工具（生成 + 发布）
 */
export const videoWorkflowTool = {
    name: 'video.workflow',
    description: 'Generate and publish video in one workflow',
    schema: {
        type: 'object',
        properties: {
            appId: { type: 'string' },
            appName: { type: 'string' },
            appUrl: { type: 'string' },
            outputDir: { type: 'string' },
            publish: { type: 'boolean' },
        },
        required: ['appId', 'appName', 'appUrl', 'outputDir'],
    },
    async execute(args) {
        const { appId, appName, appUrl, outputDir, publish = true, } = args;
        const startTime = Date.now();
        const steps = [];
        try {
            // 步骤1: 生成视频
            steps.push('generating');
            const generator = new VideoGeneratorService();
            const genResult = await generator.generate({
                appId,
                appName,
                appUrl,
                outputDir,
            });
            if (!genResult.success || !genResult.videoPath) {
                throw new Error(`Video generation failed: ${genResult.error}`);
            }
            // 步骤2: 发布视频（可选）
            let publishResult = null;
            if (publish) {
                steps.push('publishing');
                const publisher = new VideoPublisher();
                publishResult = await publisher.publish({
                    videoPath: genResult.videoPath,
                    title: genResult.title,
                    description: genResult.description,
                    tags: genResult.tags,
                    coverPath: genResult.thumbnailPath,
                });
                if (!publishResult.success) {
                    logger.warn('Video publish failed, but generation succeeded', {
                        error: publishResult.error,
                    });
                }
            }
            return {
                success: true,
                data: {
                    generation: genResult,
                    publish: publishResult,
                    steps,
                },
                metadata: {
                    duration: Date.now() - startTime,
                    retries: 0,
                },
            };
        }
        catch (error) {
            logger.error(`Video workflow failed: ${error instanceof Error ? error.message : String(error)}, steps: ${steps.join(',')}`);
            return {
                success: false,
                data: { steps },
                error: error instanceof Error ? error : new Error(String(error)),
                metadata: {
                    duration: Date.now() - startTime,
                    retries: 0,
                },
            };
        }
    },
};
//# sourceMappingURL=video.js.map