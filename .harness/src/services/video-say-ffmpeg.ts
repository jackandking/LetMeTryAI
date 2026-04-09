/**
 * Video Generator using macOS `say` + `ffmpeg`
 * 
 * 使用 macOS 自带工具生成配音视频:
 * 1. say - 语音合成 (TTS)
 * 2. ffmpeg - 图片+音频合成为竖屏视频 (1080x1920)
 */

import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs, existsSync, writeFileSync, chmodSync } from 'fs';
import { spawn } from 'child_process';
import { logger } from '../utils/logger.js';

// 获取 ffmpeg 路径
function getFfmpegPath(): string {
  // 尝试使用 ffmpeg-static
  const modulePath = fileURLToPath(import.meta.url);
  const projectRoot = dirname(dirname(dirname(modulePath)));
  const ffmpegStatic = join(projectRoot, 'node_modules', 'ffmpeg-static', 'ffmpeg');
  
  if (existsSync(ffmpegStatic)) {
    return ffmpegStatic;
  }
  
  // 回退到系统 ffmpeg
  return 'ffmpeg';
}

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

// 中文语音选项
const CHINESE_VOICES = [
  'Ting-Ting',      // 中文普通话 (女声)
  'Sin-ji',         // 粤语 (女声)
  'Ya-Ling',        // 中文台湾 (女声)
];

/**
 * 使用 say 生成音频
 */
async function generateAudio(
  text: string,
  outputPath: string,
  voice: string = 'Ting-Ting',
  rate: number = 180
): Promise<{ success: boolean; duration?: number; error?: string }> {
  return new Promise((resolve) => {
    logger.info(`Generating audio with say`, { voice, rate, text: text.substring(0, 50) });
    
    // say 命令生成 aiff 格式
    const aiffPath = outputPath.replace('.mp3', '.aiff').replace('.m4a', '.aiff');
    
    const child = spawn('say', [
      '-v', voice,
      '-r', String(rate),
      '-o', aiffPath,
      text,
    ]);

    let stderr = '';
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('close', async (code) => {
      if (code !== 0) {
        resolve({ success: false, error: `say failed: ${stderr}` });
        return;
      }

      // 转换为 m4a 格式 (更兼容)
      try {
        await convertAudio(aiffPath, outputPath);
        // 删除临时 aiff 文件
        await fs.unlink(aiffPath).catch(() => {});
        
        // 获取音频时长
        const duration = await getAudioDuration(outputPath);
        
        resolve({ success: true, duration });
      } catch (error) {
        resolve({ success: false, error: String(error) });
      }
    });
  });
}

/**
 * 转换音频格式 (使用 ffmpeg 或 afconvert)
 */
async function convertAudio(inputPath: string, outputPath: string): Promise<void> {
  // 优先使用 afconvert (macOS 自带)
  return new Promise((resolve, reject) => {
    const child = spawn('afconvert', [
      inputPath,
      outputPath,
      '-f', 'm4af',
      '-d', 'aac',
    ]);

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`afconvert failed with code ${code}`));
      }
    });
  });
}

/**
 * 获取音频时长
 */
async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('afinfo', [audioPath]);
    let stdout = '';
    
    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.on('close', () => {
      const match = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
      if (match) {
        resolve(parseFloat(match[1]));
      } else {
        resolve(10); // 默认 10 秒
      }
    });
  });
}

/**
 * 下载或获取应用封面图
 */
async function getBackgroundImage(
  appId: string,
  outputDir: string
): Promise<string | null> {
  // 尝试从应用目录获取封面图
  const possiblePaths = [
    join(process.cwd(), '..', appId, 'images', 'cover.jpg'),
    join(process.cwd(), '..', appId, 'images', 'cover.png'),
    join(process.cwd(), '..', appId, 'cover.jpg'),
    join(process.cwd(), '..', appId, 'cover.png'),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      // 复制到输出目录
      const destPath = join(outputDir, 'background.jpg');
      await fs.copyFile(path, destPath);
      logger.info(`Using background image`, { path: destPath });
      return destPath;
    }
  }

  // 如果没有封面图，返回 null (后续可以用纯色背景)
  return null;
}

/**
 * 使用 ffmpeg 合成视频
 */
async function composeVideo(
  imagePath: string | null,
  audioPath: string,
  outputPath: string,
  audioDuration: number
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const ffmpegPath = getFfmpegPath();
    
    logger.info(`Composing video with ffmpeg`, { 
      ffmpeg: ffmpegPath,
      image: imagePath || 'color background',
      audio: audioPath,
      output: outputPath,
      duration: audioDuration 
    });

    // 如果没有背景图，使用纯色背景
    const videoInput = imagePath 
      ? ['-loop', '1', '-i', imagePath, '-t', String(audioDuration + 1)]
      : ['-f', 'lavfi', '-i', `color=c=0x1a1a2e:s=1080x1920:d=${audioDuration + 1}`];

    const args = [
      '-y', // 覆盖输出文件
      ...videoInput,
      '-i', audioPath,
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:0x1a1a2e',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ];

    const child = spawn(ffmpegPath, args);
    
    let stderr = '';
    child.stderr.on('data', (data) => { 
      stderr += data.toString();
      // 只记录错误，不记录所有进度
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        // ffmpeg 可能返回非 0 但仍成功，检查文件是否存在
        if (existsSync(outputPath)) {
          const stats = fs.stat(outputPath);
          if (stats.size > 10000) {
            resolve({ success: true });
            return;
          }
        }
        resolve({ success: false, error: `ffmpeg failed: ${stderr.slice(-200)}` });
      }
    });
  });
}

/**
 * 生成 ffmpeg 合成脚本 (备用方案)
 */
function generateFfmpegScript(
  imagePath: string | null,
  audioPath: string,
  outputPath: string,
  scriptPath: string
): void {
  const videoInput = imagePath 
    ? `-loop 1 -i "${imagePath}"`
    : `-f lavfi -i "color=c=0x1a1a2e:s=1080x1920"`;

  const script = `#!/bin/bash
# FFmpeg video composition script
# Generated automatically

echo "Composing video..."

ffmpeg -y \\
  ${videoInput} \\
  -i "${audioPath}" \\
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:0x1a1a2e,format=yuv420p" \\
  -c:v libx264 \\
  -preset medium \\
  -crf 23 \\
  -c:a aac \\
  -b:a 128k \\
  -shortest \\
  "${outputPath}"

echo "Video saved to: ${outputPath}"
`;

  writeFileSync(scriptPath, script, 'utf-8');
  chmodSync(scriptPath, 0o755);
}

/**
 * 生成配音脚本
 */
function generateScript(appName: string, question: string, options: string[]): string {
  const optionTexts = options.map((opt, i) => `${i + 1}号，${opt}`).join('；');
  
  return `欢迎参与${appName}投票！今天的问题是：${question}选项有：${optionTexts}。快来投出你宝贵的一票，看看大家的选择！`;
}

/**
 * 视频生成服务 (say + ffmpeg)
 */
export async function generateSayFfmpegVideo(
  config: SayFfmpegVideoConfig
): Promise<SayFfmpegVideoResult> {
  const startTime = Date.now();
  
  try {
    await fs.mkdir(config.outputDir, { recursive: true });

    // 1. 生成配音文本
    const script = config.script || generateScript(
      config.appName,
      '主战坦克：火力、装甲、机动哪个影响实际表现？',
      ['火力优先（强打击）', '装甲优先（防护强）', '机动优先（快速机动）']
    );

    // 保存脚本文本
    const scriptPath = join(config.outputDir, `${config.appId}-script.txt`);
    await fs.writeFile(scriptPath, script, 'utf-8');

    logger.info(`Generated script`, { script: script.substring(0, 80) });

    // 2. 生成音频
    const audioPath = join(config.outputDir, `${config.appId}-audio.m4a`);
    const audioResult = await generateAudio(
      script,
      audioPath,
      config.voice,
      config.rate
    );

    if (!audioResult.success) {
      throw new Error(`Audio generation failed: ${audioResult.error}`);
    }

    logger.info(`Audio generated`, { duration: audioResult.duration, path: audioPath });

    // 3. 获取背景图片
    const imagePath = config.backgroundImage || await getBackgroundImage(config.appId, config.outputDir);

    // 4. 检查 ffmpeg 是否可用
    const ffmpegPath = getFfmpegPath();
    const ffmpegAvailable = ffmpegPath !== 'ffmpeg' || await new Promise<boolean>((resolve) => {
      const check = spawn('which', ['ffmpeg']);
      check.on('close', (code) => resolve(code === 0));
    });

    if (ffmpegAvailable && audioResult.duration) {
      // 使用 ffmpeg 合成视频
      const videoPath = join(config.outputDir, `${config.appId}-video.mp4`);
      const composeResult = await composeVideo(
        imagePath,
        audioPath,
        videoPath,
        audioResult.duration
      );

      if (composeResult.success) {
        const stats = await fs.stat(videoPath);
        logger.info(`Video composed successfully`, { 
          path: videoPath, 
          size: `${(stats.size / 1024 / 1024).toFixed(2)} MB` 
        });

        return {
          success: true,
          videoPath,
          audioPath,
          imagePath: imagePath || undefined,
          scriptPath,
          duration: audioResult.duration,
        };
      } else {
        throw new Error(`Video composition failed: ${composeResult.error}`);
      }
    } else {
      // ffmpeg 不可用，生成脚本
      const videoPath = join(config.outputDir, `${config.appId}-video.mp4`);
      const ffmpegScriptPath = join(config.outputDir, 'compose-video.sh');
      generateFfmpegScript(imagePath, audioPath, videoPath, ffmpegScriptPath);

      logger.warn(`ffmpeg not available, generated script`, { script: ffmpegScriptPath });

      return {
        success: true, // 部分成功
        audioPath,
        imagePath: imagePath || undefined,
        scriptPath,
        duration: audioResult.duration,
        error: 'ffmpeg not available, manual composition required',
      };
    }

  } catch (error) {
    logger.error('Video generation failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 便捷函数
 */
export async function generateVideoWithVoice(
  appId: string,
  appName: string,
  appUrl: string,
  outputDir: string,
  customScript?: string
): Promise<SayFfmpegVideoResult> {
  return generateSayFfmpegVideo({
    appId,
    appName,
    appUrl,
    outputDir,
    script: customScript,
  });
}
