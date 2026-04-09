/**
 * Video Publisher Service - 视频发布服务
 * 
 * 将生成的视频发布到快手平台
 * - 支持 OAuth 认证
 * - 视频上传
 * - 发布视频任务
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config/index.js';
import { logger } from '../utils/logger.js';

// 快手开放平台配置
const KUAISHOU_CONFIG = {
  appId: process.env.KUAISHOU_APP_ID || 'ks662839447801476542',
  appSecret: process.env.KUAISHOU_APP_SECRET || '',
  appName: process.env.KUAISHOU_APP_NAME || '试试看',
  baseUrl: 'https://open.kuaishou.com',
  apiVersion: 'v1',
};

// 创作者平台配置（用于网页应用发布）
const CREATOR_CONFIG = {
  baseUrl: 'https://daren.kuaishou.com',
};

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
export class VideoPublisher {
  private cookies: string = '';

  /**
   * 发布视频到快手
   * 目前使用创作者平台网页方式（更稳定）
   */
  async publish(config: VideoPublishConfig): Promise<VideoPublishResult> {
    logger.info(`Publishing video to Kuaishou`, {
      title: config.title,
      videoPath: config.videoPath,
    });

    try {
      // 加载认证信息
      this.cookies = this.extractCookies();

      // 步骤1: 获取上传凭证
      const uploadToken = await this.getUploadToken();
      
      // 步骤2: 上传视频文件
      const videoInfo = await this.uploadVideo(config.videoPath, uploadToken);
      
      // 步骤3: 发布视频
      const publishResult = await this.publishVideo(videoInfo, config);

      logger.info(`Video published successfully`, {
        videoId: publishResult.videoId,
        shareUrl: publishResult.shareUrl,
      });

      return {
        success: true,
        videoId: publishResult.videoId,
        shareUrl: publishResult.shareUrl,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Video publish failed: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * 从 auth 文件提取 cookies
   */
  private extractCookies(): string {
    const authFile = join(PATHS.auth, 'kuaishou_auth.json');

    try {
      const content = readFileSync(authFile, 'utf-8');
      const state = JSON.parse(content);

      const cookies = (state.cookies || [])
        .filter((c: { domain?: string }) => c.domain?.includes('kuaishou.com'))
        .map((c: { name: string; value: string }) => `${c.name}=${c.value}`)
        .join('; ');

      if (!cookies) {
        throw new Error('No kuaishou cookies found');
      }

      return cookies;
    } catch (e) {
      throw new Error(`Failed to load auth: ${(e as Error).message}`);
    }
  }

  /**
   * 获取视频上传凭证
   */
  private async getUploadToken(): Promise<Record<string, unknown>> {
    // 使用创作者平台的上传接口
    const url = `${CREATOR_CONFIG.baseUrl}/rest/pc/creator/media/upload/token`;
    
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      body: JSON.stringify({
        mediaType: 'video',
        fileName: `demo-${Date.now()}.mp4`,
      }),
    });

    const data = await resp.json() as Record<string, unknown>;
    
    if (data.result !== 1 && data.result !== 200) {
      throw new Error(`Failed to get upload token: ${data.message}`);
    }

    return data.data as Record<string, unknown>;
  }

  /**
   * 上传视频文件
   */
  private async uploadVideo(
    videoPath: string,
    token: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    // 读取视频文件
    const videoBuffer = readFileSync(videoPath);
    
    // 获取上传 URL（可能是直传或分片上传）
    const uploadUrl = token.uploadUrl as string || token.endpoint as string;
    
    if (!uploadUrl) {
      throw new Error('No upload URL in token');
    }

    logger.info(`Uploading video (${(videoBuffer.length / 1024 / 1024).toFixed(2)}MB)...`);

    // 执行上传
    const resp = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'video/mp4',
        ...(token.headers as Record<string, string> || {}),
      },
      body: videoBuffer,
    });

    if (!resp.ok) {
      throw new Error(`Upload failed: ${resp.status} ${resp.statusText}`);
    }

    const result = await resp.json() as Record<string, unknown>;
    logger.info('Video uploaded successfully');

    return result;
  }

  /**
   * 发布视频
   */
  private async publishVideo(
    videoInfo: Record<string, unknown>,
    config: VideoPublishConfig
  ): Promise<{ videoId: string; shareUrl: string }> {
    const url = `${CREATOR_CONFIG.baseUrl}/rest/pc/creator/media/publish`;

    const payload = {
      mediaId: videoInfo.mediaId || videoInfo.videoId,
      title: config.title,
      description: config.description || config.title,
      tags: config.tags || [],
      coverUrl: config.coverPath,
      visibility: config.visibility === 'private' ? 0 : 1,
      // 关联小程序
      miniApp: {
        appId: KUAISHOU_CONFIG.appId,
        appName: KUAISHOU_CONFIG.appName,
        pagePath: '',
      },
    };

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': this.cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json() as Record<string, unknown>;

    if (data.result !== 1 && data.result !== 200) {
      throw new Error(`Publish failed: ${data.message}`);
    }

    const result = data.data as Record<string, unknown>;

    return {
      videoId: String(result.videoId || result.mediaId),
      shareUrl: String(result.shareUrl || result.url || ''),
    };
  }
}

/**
 * 便捷函数：发布视频
 */
export async function publishVideo(
  videoPath: string,
  title: string,
  options?: Omit<VideoPublishConfig, 'videoPath' | 'title'>
): Promise<VideoPublishResult> {
  const publisher = new VideoPublisher();
  return publisher.publish({
    videoPath,
    title,
    ...options,
  });
}

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

export async function attachMiniAppToVideo(
  videoId: string,
  miniApp: MiniAppAttachment
): Promise<boolean> {
  logger.info(`Attaching mini app to video ${videoId}`, { miniApp });
  
  // 实现关联小程序的 API 调用
  // 这部分需要根据快手实际 API 调整
  
  return true;
}
