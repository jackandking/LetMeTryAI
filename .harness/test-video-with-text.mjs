/**
 * Test video with text overlay using ffmpeg
 * 使用 ffmpeg 生成带文字标题的视频
 */

import { join } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';
import { spawn } from 'child_process';

const OUTPUT_DIR = join(process.cwd(), '.local', 'video-text');
const EMAIL_TO = 'jackandking@163.com';

// 获取 ffmpeg 路径
function getFfmpegPath() {
  const ffmpegStatic = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  return existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg';
}

async function generateAudio(text, outputPath) {
  console.log('🎵 生成音频...');
  
  return new Promise((resolve, reject) => {
    const aiffPath = outputPath.replace('.m4a', '.aiff');
    
    const child = spawn('say', [
      '-v', 'Ting-Ting',
      '-r', '180',
      '-o', aiffPath,
      text,
    ]);

    child.on('close', async (code) => {
      if (code !== 0) {
        reject(new Error('say failed'));
        return;
      }
      
      // Convert to m4a
      const convert = spawn('afconvert', [aiffPath, outputPath, '-f', 'm4af', '-d', 'aac']);
      convert.on('close', () => {
        // Cleanup aiff
        try { require('fs').unlinkSync(aiffPath); } catch {}
        
        // Get duration
        const info = spawn('afinfo', [outputPath]);
        let stdout = '';
        info.stdout.on('data', d => stdout += d);
        info.on('close', () => {
          const match = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
          resolve(parseFloat(match?.[1] || '10'));
        });
      });
    });
  });
}

async function createVideoWithText(audioPath, outputPath, duration) {
  console.log('🎬 合成视频 (带文字)...');
  
  const ffmpeg = getFfmpegPath();
  
  // 创建带渐变背景和文字的视频
  // 使用 drawtext 滤镜添加文字
  const drawtextFilter = `
    color=c=0x1a1a2e:s=1080x1920:d=${duration},
    
    drawtext=fontfile=/System/Library/Fonts/PingFang.ttc:
      text='坦克系统对比':
      fontcolor=white:
      fontsize=80:
      x=(w-text_w)/2:y=600:
      shadowcolor=black@0.5:
      shadowx=3:shadowy=3,
    
    drawtext=fontfile=/System/Library/Fonts/PingFang.ttc:
      text='主战坦克三大系统，你更看重哪一个？':
      fontcolor=#e94560:
      fontsize=40:
      x=(w-text_w)/2:y=700:
      shadowcolor=black@0.3:
      shadowx=2:shadowy=2,
    
    drawtext=fontfile=/System/Library/Fonts/PingFang.ttc:
      text='参与投票 · 说出你的选择':
      fontcolor=#aaaaaa:
      fontsize=32:
      x=(w-text_w)/2:y=1600
  `.replace(/\s+/g, ' ').trim();
  
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-f', 'lavfi', '-i', drawtextFilter,
      '-i', audioPath,
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      '-pix_fmt', 'yuv420p',
      outputPath,
    ];
    
    console.log(`  FFmpeg 命令: ${ffmpeg} ${args.join(' ').substring(0, 100)}...`);
    
    const child = spawn(ffmpeg, args);
    let stderr = '';
    child.stderr.on('data', d => stderr += d.toString());
    
    child.on('close', (code) => {
      if (code === 0 || existsSync(outputPath)) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed: ${stderr.slice(-200)}`));
      }
    });
  });
}

async function sendEmail(videoPath) {
  console.log('\n📧 发送邮件...');
  
  const stats = statSync(videoPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  const pythonScript = `
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import subprocess

msg = MIMEMultipart()
msg['From'] = 'harness@letmetryai.cn'
msg['To'] = '${EMAIL_TO}'
msg['Subject'] = '🎬 坦克系统对比 - AI配音视频 (带标题)'

body = '''
视频已生成完成！

本次更新：
- 添加了标题文字
- 1080x1920 竖屏格式
- AI 配音 (Ting-Ting 语音)

文件大小: ${sizeMB} MB
'''
msg.attach(MIMEText(body, 'plain', 'utf-8'))

# Attach video
with open('${videoPath}', 'rb') as f:
    att = MIMEBase('application', 'octet-stream')
    att.set_payload(f.read())
encoders.encode_base64(att)
att.add_header('Content-Disposition', 'attachment; filename="tank-systems-compare-with-text.mp4"')
msg.attach(att)

subprocess.run(['/usr/sbin/sendmail', '-t'], input=msg.as_bytes())
`;
  
  return new Promise((resolve) => {
    const child = spawn('python3', ['-c', pythonScript]);
    child.on('close', (code) => {
      console.log(code === 0 ? '✅ 邮件发送成功!' : '❌ 邮件发送失败');
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('\n🎬 生成带文字的视频\n');
  
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  const script = '欢迎参与坦克系统对比投票！今天我们来聊聊：主战坦克的三大系统，你更看重哪一个？是火力打击能力、装甲防护水平，还是机动灵活性能？快来投出你的一票！';
  
  const audioPath = join(OUTPUT_DIR, 'audio.m4a');
  const videoPath = join(OUTPUT_DIR, 'video-with-text.mp4');
  
  try {
    // 生成音频
    const duration = await generateAudio(script, audioPath);
    console.log(`✅ 音频生成完成，时长: ${duration.toFixed(1)}秒`);
    
    // 合成视频
    await createVideoWithText(audioPath, videoPath, duration + 1);
    console.log('✅ 视频合成完成');
    
    // 显示文件信息
    const stats = statSync(videoPath);
    console.log(`\n📁 视频文件: ${videoPath}`);
    console.log(`📊 文件大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
    // 发送邮件
    await sendEmail(videoPath);
    
    console.log('\n✅ 全部完成！\n');
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
