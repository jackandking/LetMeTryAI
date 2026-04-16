/**
 * MiniMax Image Generator Service
 * 使用 MiniMax image-01 API 生成图片
 */
declare const ASPECT_RATIOS: {
    readonly '1:1': "1:1";
    readonly '16:9': "16:9";
    readonly '4:3': "4:3";
    readonly '3:2': "3:2";
    readonly '2:3': "2:3";
    readonly '3:4': "3:4";
    readonly '9:16': "9:16";
    readonly '21:9': "21:9";
};
export interface MiniMaxImageOptions {
    prompt: string;
    aspectRatio?: keyof typeof ASPECT_RATIOS;
    quality?: 'standard' | 'hd';
}
export interface MiniMaxImageResult {
    success: boolean;
    url?: string;
    imageId?: string;
    localPath?: string;
    error?: string;
}
/**
 * 生成图片
 */
export declare function generateImage(options: MiniMaxImageOptions): Promise<MiniMaxImageResult>;
/**
 * 下载图片
 */
export declare function downloadImage(url: string, outputPath: string): Promise<void>;
/**
 * 生成并下载图片
 */
export declare function generateAndDownload(options: MiniMaxImageOptions, outputPath: string): Promise<MiniMaxImageResult>;
/**
 * 为投票应用生成选项图片
 */
export declare function generateVoteOptionImages(appName: string, options: Array<{
    label: string;
    caption: string;
}>, outputDir: string): Promise<Array<{
    label: string;
    path: string;
    success: boolean;
}>>;
/**
 * 生成封面图片
 */
export declare function generateCoverImage(title: string, subtitle: string, outputPath: string): Promise<MiniMaxImageResult>;
export {};
//# sourceMappingURL=minimax-image.d.ts.map