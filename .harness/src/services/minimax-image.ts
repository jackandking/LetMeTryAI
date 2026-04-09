/**
 * MiniMax Image Generator Service
 * 使用 MiniMax image-01 API 生成图片
 */

import { join } from 'path';
import { promises as fs } from 'fs';
import { logger } from '../utils/logger.js';

const MINIMAX_API_URL = 'https://api.minimax.chat/v1/image_generation';
const API_KEY = process.env.MINIMAX_API_KEY || '';

// 宽高比映射
const ASPECT_RATIOS = {
  '1:1': '1:1',
  '16:9': '16:9',
  '4:3': '4:3',
  '3:2': '3:2',
  '2:3': '2:3',
  '3:4': '3:4',
  '9:16': '9:16',
  '21:9': '21:9',
} as const;

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
export async function generateImage(options: MiniMaxImageOptions): Promise<MiniMaxImageResult> {
  const { prompt, aspectRatio = '1:1', quality = 'standard' } = options;
  
  logger.info('Generating image with MiniMax', { 
    prompt: prompt.substring(0, 50), 
    aspectRatio, 
    quality 
  });
  
  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: 'image-01',
        prompt,
        aspect_ratio: ASPECT_RATIOS[aspectRatio] || '1:1',
        quality,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json() as Record<string, unknown>;
    
    if (data.base_resp && (data.base_resp as Record<string, unknown>).status_code !== 0) {
      const errorMsg = (data.base_resp as Record<string, unknown>).status_msg || 'Unknown error';
      throw new Error(`MiniMax error: ${errorMsg}`);
    }
    
    const imageUrl = (data.data as Record<string, unknown>)?.image_urls?.[0] as string;
    const imageId = data.id as string;
    
    logger.info('Image generated', { imageId, url: imageUrl?.substring(0, 50) });
    
    return {
      success: true,
      url: imageUrl,
      imageId,
    };
    
  } catch (error) {
    logger.error('Image generation failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 下载图片
 */
export async function downloadImage(url: string, outputPath: string): Promise<void> {
  logger.info('Downloading image', { url: url.substring(0, 50), outputPath });
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(outputPath, buffer);
  
  logger.info('Image downloaded', { path: outputPath, size: `${(buffer.length / 1024).toFixed(0)} KB` });
}

/**
 * 生成并下载图片
 */
export async function generateAndDownload(
  options: MiniMaxImageOptions,
  outputPath: string
): Promise<MiniMaxImageResult> {
  const result = await generateImage(options);
  
  if (!result.success || !result.url) {
    return result;
  }
  
  try {
    await downloadImage(result.url, outputPath);
    return {
      ...result,
      localPath: outputPath,
    };
  } catch (error) {
    return {
      success: false,
      url: result.url,
      error: `Download failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 为投票应用生成选项图片
 */
export async function generateVoteOptionImages(
  appName: string,
  options: Array<{ label: string; caption: string }>,
  outputDir: string
): Promise<Array<{ label: string; path: string; success: boolean }>> {
  logger.info('Generating vote option images', { appName, optionCount: options.length });
  
  const results = [];
  
  for (let i = 0; i < options.length; i++) {
    const { label, caption } = options[i];
    
    // 构建提示词
    const prompt = generateOptionPrompt(appName, label, caption);
    
    const outputPath = join(outputDir, `option-${i + 1}.jpg`);
    
    const result = await generateAndDownload({
      prompt,
      aspectRatio: '3:2',  // 横向图片
      quality: 'standard',
    }, outputPath);
    
    results.push({
      label,
      path: result.localPath || outputPath,
      success: result.success,
    });
    
    // 添加延迟避免频率限制
    if (i < options.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  return results;
}

/**
 * 生成选项图片的提示词
 */
function generateOptionPrompt(appName: string, label: string, caption: string): string {
  const basePrompt = `军事主题图标设计，${label}，${caption}，现代扁平化风格，深色背景，专业简洁，高清细节`;
  
  // 根据标签添加特定元素
  if (label.includes('火力') || label.includes('打击')) {
    return `${basePrompt}，坦克火炮，炮口火焰，火力打击，武器系统，暗红色和深灰色配色`;
  }
  if (label.includes('装甲') || label.includes('防护')) {
    return `${basePrompt}，坦克装甲，防护盾牌，坚固厚重，防御系统，深蓝色和银灰色配色`;
  }
  if (label.includes('机动') || label.includes('速度')) {
    return `${basePrompt}，坦克履带，速度线，快速移动，机动系统，深绿色和橙色配色`;
  }
  
  return basePrompt;
}

/**
 * 生成封面图片
 */
export async function generateCoverImage(
  title: string,
  subtitle: string,
  outputPath: string
): Promise<MiniMaxImageResult> {
  const prompt = `军事投票主题封面，${title}，${subtitle}，现代军事风格，渐变深色背景，专业大气，坦克元素，高清设计，适合竖屏展示`;
  
  return generateAndDownload({
    prompt,
    aspectRatio: '9:16',  // 竖屏
    quality: 'hd',
  }, outputPath);
}
