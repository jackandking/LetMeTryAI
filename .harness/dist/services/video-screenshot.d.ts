/**
 * Video Generator using Real Screenshots
 *
 * 使用真实应用截图生成视频:
 * 1. 截取手机版投票页面 (375x812 retina)
 * 2. 从 HTML 提取标题、问题、选项
 * 3. 合成带配音的视频
 */
export interface ScreenshotVideoConfig {
    appId: string;
    appName: string;
    appUrl: string;
    outputDir: string;
    viewport?: {
        width: number;
        height: number;
    };
}
export interface AppContent {
    title: string;
    question: string;
    options: string[];
}
export interface ScreenshotVideoResult {
    success: boolean;
    videoPath?: string;
    screenshotPath?: string;
    audioPath?: string;
    content?: AppContent;
    duration?: number;
    error?: string;
}
/**
 * 主函数：生成带截图的视频
 */
export declare function generateScreenshotVideo(config: ScreenshotVideoConfig): Promise<ScreenshotVideoResult>;
/**
 * 便捷函数
 */
export declare function generateVideoFromScreenshot(appId: string, appName: string, appUrl: string, outputDir: string): Promise<ScreenshotVideoResult>;
//# sourceMappingURL=video-screenshot.d.ts.map