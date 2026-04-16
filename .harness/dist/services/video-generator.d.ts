/**
 * Video Generator Service - 视频生成服务
 *
 * 为发布的应用自动生成演示视频
 * - 录屏演示应用功能
 * - 生成视频封面
 * - 上传到快手
 */
export interface VideoGenerationConfig {
    /** 应用 ID */
    appId: string;
    /** 应用名称 */
    appName: string;
    /** 应用 URL */
    appUrl: string;
    /** 输出目录 */
    outputDir: string;
    /** 视频标题 */
    title?: string;
    /** 视频描述 */
    description?: string;
    /** 话题标签 */
    tags?: string[];
}
export interface VideoGenerationResult {
    success: boolean;
    videoPath?: string;
    thumbnailPath?: string;
    title: string;
    description: string;
    tags: string[];
    duration: number;
    size: number;
    error?: string;
}
/**
 * 视频生成服务
 */
export declare class VideoGeneratorService {
    private recorder;
    constructor();
    /**
     * 为应用生成演示视频
     */
    generate(config: VideoGenerationConfig): Promise<VideoGenerationResult>;
    /**
     * 录制视频
     */
    private recordVideo;
    /**
     * 生成视频封面（使用 Playwright 截取第一帧）
     */
    private generateThumbnail;
    /**
     * 生成视频元数据
     */
    private generateMetadata;
    /**
     * 生成默认标题
     */
    private generateDefaultTitle;
    /**
     * 生成默认描述
     */
    private generateDefaultDescription;
    /**
     * 生成默认标签
     */
    private generateDefaultTags;
}
/**
 * 便捷函数：生成应用演示视频
 */
export declare function generateAppDemoVideo(appId: string, appName: string, appUrl: string, outputDir: string): Promise<VideoGenerationResult>;
/**
 * 视频任务信息（用于持久化）
 */
export interface VideoTask {
    id: string;
    appId: string;
    appName: string;
    status: 'pending' | 'recording' | 'generating' | 'uploading' | 'completed' | 'failed';
    videoPath?: string;
    thumbnailPath?: string;
    kuaishouVideoId?: string;
    kuaishouShareUrl?: string;
    error?: string;
    createdAt: string;
    updatedAt: string;
}
/**
 * 保存视频任务状态
 */
export declare function saveVideoTask(task: VideoTask, tasksDir: string): Promise<void>;
/**
 * 加载视频任务
 */
export declare function loadVideoTask(taskId: string, tasksDir: string): Promise<VideoTask | null>;
//# sourceMappingURL=video-generator.d.ts.map