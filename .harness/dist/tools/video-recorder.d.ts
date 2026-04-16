/**
 * Video Recorder Tool - 录屏自动化工具
 *
 * 使用 Playwright 录制应用演示视频
 * - 打开应用页面
 * - 自动执行交互流程（投票演示）
 * - 录制屏幕生成视频文件
 */
export interface VideoRecorderConfig {
    /** 应用 URL */
    appUrl: string;
    /** 输出视频路径 */
    outputPath: string;
    /** 视频尺寸 */
    viewport?: {
        width: number;
        height: number;
    };
    /** 录制时长 (毫秒) */
    duration?: number;
    /** 是否模拟移动端 */
    mobile?: boolean;
    /** 交互步骤 */
    steps?: InteractionStep[];
    /** 视频质量 */
    quality?: 'low' | 'medium' | 'high';
}
export interface InteractionStep {
    /** 步骤类型 */
    type: 'click' | 'scroll' | 'wait' | 'type' | 'hover' | 'vote';
    /** 选择器 */
    selector?: string;
    /** 等待时间 (毫秒) */
    delay?: number;
    /** 文本输入内容 */
    text?: string;
    /** 描述（用于日志） */
    description?: string;
    /** 投票选项索引 (用于 vote 类型) */
    optionIndex?: number;
}
export interface VideoRecorderResult {
    success: boolean;
    videoPath?: string;
    duration: number;
    size: number;
    error?: string;
}
/**
 * 视频录制工具类
 */
export declare class VideoRecorder {
    private browser;
    private context;
    private page;
    /**
     * 录制应用演示视频
     */
    record(config: VideoRecorderConfig): Promise<VideoRecorderResult>;
    /**
     * 启动浏览器并准备录制
     */
    private launchBrowser;
    /**
     * 执行交互步骤
     */
    private executeSteps;
    /**
     * 执行投票步骤
     */
    private executeVoteStep;
    /**
     * 生成默认的交互步骤（投票应用演示）
     */
    private generateDefaultSteps;
    /**
     * 关闭浏览器并保存视频
     */
    private closeAndSave;
    /**
     * 清理资源
     */
    private cleanup;
}
/**
 * 录制视频（便捷函数）
 */
export declare function recordAppVideo(appUrl: string, outputPath: string, options?: Omit<VideoRecorderConfig, 'appUrl' | 'outputPath'>): Promise<VideoRecorderResult>;
/**
 * 生成投票应用演示视频配置
 */
export declare function generateVoteAppVideoConfig(appUrl: string, outputPath: string, appName: string): VideoRecorderConfig;
//# sourceMappingURL=video-recorder.d.ts.map