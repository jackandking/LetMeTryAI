/**
 * Video Publisher Service - 视频发布服务
 *
 * 将生成的视频发布到快手平台
 * - 支持 OAuth 认证
 * - 视频上传
 * - 发布视频任务
 */
export interface VideoPublishConfig {
    /** 视频文件路径 */
    videoPath: string;
    /** 视频标题 */
    title: string;
    /** 视频描述 */
    description?: string;
    /** 话题标签 */
    tags?: string[];
    /** 封面图片路径 */
    coverPath?: string;
    /** 可见性: public/private */
    visibility?: 'public' | 'private';
}
export interface VideoPublishResult {
    success: boolean;
    videoId?: string;
    shareUrl?: string;
    error?: string | null;
}
/**
 * 视频发布器
 * 支持两种发布方式:
 * 1. 快手开放平台 API (需要 access_token)
 * 2. 创作者平台网页发布 (模拟浏览器行为)
 */
export declare class VideoPublisher {
    private cookies;
    /**
     * 发布视频到快手
     * 目前使用创作者平台网页方式（更稳定）
     */
    publish(config: VideoPublishConfig): Promise<VideoPublishResult>;
    /**
     * 从 auth 文件提取 cookies
     */
    private extractCookies;
    /**
     * 获取视频上传凭证
     */
    private getUploadToken;
    /**
     * 上传视频文件
     */
    private uploadVideo;
    /**
     * 发布视频
     */
    private publishVideo;
}
/**
 * 便捷函数：发布视频
 */
export declare function publishVideo(videoPath: string, title: string, options?: Omit<VideoPublishConfig, 'videoPath' | 'title'>): Promise<VideoPublishResult>;
/**
 * 关联小程序到视频
 * 在发布视频时挂载小程序链接
 */
export interface MiniAppAttachment {
    appId: string;
    appName: string;
    pagePath: string;
    title?: string;
    description?: string;
}
export declare function attachMiniAppToVideo(videoId: string, miniApp: MiniAppAttachment): Promise<boolean>;
//# sourceMappingURL=video-publisher.d.ts.map