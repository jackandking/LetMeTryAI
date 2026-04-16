/**
 * Video Generator using macOS `say` + `ffmpeg`
 *
 * 使用 macOS 自带工具生成配音视频:
 * 1. say - 语音合成 (TTS)
 * 2. ffmpeg - 图片+音频合成为竖屏视频 (1080x1920)
 */
export interface SayFfmpegVideoConfig {
    /** 应用 ID */
    appId: string;
    /** 应用名称 */
    appName: string;
    /** 应用 URL */
    appUrl: string;
    /** 输出目录 */
    outputDir: string;
    /** 配音文本 (默认自动生成) */
    script?: string;
    /** 背景图片路径 (默认使用应用封面) */
    backgroundImage?: string;
    /** 语音类型 */
    voice?: string;
    /** 语速 */
    rate?: number;
}
export interface SayFfmpegVideoResult {
    success: boolean;
    videoPath?: string;
    audioPath?: string;
    imagePath?: string;
    scriptPath?: string;
    duration?: number;
    error?: string;
}
/**
 * 视频生成服务 (say + ffmpeg)
 */
export declare function generateSayFfmpegVideo(config: SayFfmpegVideoConfig): Promise<SayFfmpegVideoResult>;
/**
 * 便捷函数
 */
export declare function generateVideoWithVoice(appId: string, appName: string, appUrl: string, outputDir: string, customScript?: string): Promise<SayFfmpegVideoResult>;
//# sourceMappingURL=video-say-ffmpeg.d.ts.map