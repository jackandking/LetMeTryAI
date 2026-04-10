/**
 * Final video generation with cover image
 * 使用封面图片 + 音频合成最终视频
 */

import { join } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';
import { spawn } from 'child_process';

const OUTPUT_DIR = join(process.cwd(), '.local', 'video-final');
const EMAIL_TO = 'jackandking@163.com';

mkdirSync(OUTPUT_DIR, { recursive: true });

function getFfmpegPath() {
  const ffmpegStatic = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  return existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg';
}

async function generateAudio(text, outputPath) {
  console.log('🎵 生成音频...');
  
  return new Promise((resolve, reject) => {
    const aiffPath = outputPath.replace('.m4a', '.aiff');
    
    const child = spawn('say', ['-v', 'Ting-Ting', '-r', '180', '-o', aiffPath, text]);
    
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error('say failed'));
        return;
      }
      
      const convert = spawn('afconvert', [aiffPath, outputPath, '-f', 'm4af', '-d', 'aac']);
      convert.on('close', () => {
        try { require('fs').unlinkSync(aiffPath); } catch {}
        
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

async function createVideo(imagePath, audioPath, outputPath, duration) {
  console.log('🎬 合成视频...');
  
  const ffmpeg = getFfmpegPath();
  
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-loop', '1', '-i', imagePath,
      '-i', audioPath,
      '-t', String(duration),
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
      '-c:v', 'libx264',
      '-preset', 'fast',
      '-crf', '23',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '128k',
      '-shortest',
      outputPath,
    ];
    
    const child = spawn(ffmpeg, args);
    let stderr = '';
    child.stderr.on('data', d => stderr += d.toString());
    
    child.on('close', (code) => {
      if (code === 0 || (existsSync(outputPath) && statSync(outputPath).size > 10000)) {
        resolve();
      } else {
        reject(new Error(`ffmpeg failed: ${stderr.slice(-300)}`));
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
msg['Subject'] = '🎬 坦克系统对比 - AI配音视频 (新版)'

body = '''
视频已更新！

✅ 本次改进：
- 添加了精美的封面图片
- 1080x1920 竖屏格式
- AI 配音 (Ting-Ting 语音)
- 显示投票选项

文件大小: ${sizeMB} MB

请查收附件中的视频文件。
'''
msg.attach(MIMEText(body, 'plain', 'utf-8'))

with open('${videoPath}', 'rb') as f:
    att = MIMEBase('application', 'octet-stream')
    att.set_payload(f.read())
encoders.encode_base64(att)
att.add_header('Content-Disposition', 'attachment; filename="tank-systems-demo.mp4"')
msg.attach(att)

subprocess.run(['/usr/sbin/sendmail', '-t'], input=msg.as_bytes())
print('邮件已发送')
`;
  
  return new Promise((resolve) => {
    spawn('python3', ['-c', pythonScript]).on('close', (code) => {
      console.log(code === 0 ? '✅ 邮件发送成功!' : '❌ 发送失败');
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('\n🎬 生成带封面的视频\n');
  
  // 1. 生成封面
  console.log('📸 生成封面...');
  const coverScript = `
import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page(viewport={'width': 1080, 'height': 1920})
        
        html = '''
<!DOCTYPE html>
<html>
<head>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  width: 1080px; height: 1920px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  font-family: -apple-system, "PingFang SC", sans-serif; position: relative;
}
.circle-top { position: absolute; top: -150px; left: -150px; width: 500px; height: 500px; background: #e94560; border-radius: 50%; opacity: 0.8; }
.circle-bottom { position: absolute; bottom: -200px; right: -200px; width: 600px; height: 600px; background: #0f3460; border-radius: 50%; opacity: 0.6; }
.icon { width: 150px; height: 150px; border: 8px solid #e94560; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 60px; }
.checkmark { width: 60px; height: 30px; border-bottom: 8px solid #e94560; border-right: 8px solid #e94560; transform: rotate(45deg) translate(-5px, -5px); }
.title { font-size: 80px; font-weight: bold; color: white; text-shadow: 4px 4px 8px rgba(0,0,0,0.5); margin-bottom: 40px; text-align: center; }
.subtitle { font-size: 42px; color: #e94560; margin-bottom: 80px; text-align: center; padding: 0 80px; line-height: 1.5; }
.option { background: rgba(255,255,255,0.1); border-radius: 20px; padding: 25px 50px; margin: 10px 0; font-size: 32px; color: white; text-align: center; border: 2px solid rgba(255,255,255,0.2); width: 700px; }
.footer { position: absolute; bottom: 150px; font-size: 36px; color: #aaaaaa; }
</style>
</head>
<body>
<div class="circle-top"></div><div class="circle-bottom"></div>
<div class="icon"><div class="checkmark"></div></div>
<div class="title">坦克系统对比</div>
<div class="subtitle">主战坦克三大系统，你更看重哪一个？</div>
<div class="option">🔥 火力优先 - 强打击</div>
<div class="option">🛡️ 装甲优先 - 防护强</div>
<div class="option">⚡ 机动优先 - 快速机动</div>
<div class="footer">参与投票 · 说出你的选择</div>
</body>
</html>
        '''
        await page.set_content(html)
        await page.wait_for_timeout(500)
        await page.screenshot(path='${OUTPUT_DIR}/cover.jpg', type='jpeg', quality=90)
        await browser.close()

asyncio.run(main())
`;
  
  const coverProcess = spawn('python3', ['-c', coverScript]);
  await new Promise((resolve) => coverProcess.on('close', resolve));
  
  if (!existsSync(join(OUTPUT_DIR, 'cover.jpg'))) {
    console.error('❌ 封面生成失败');
    process.exit(1);
  }
  console.log('✅ 封面生成完成\n');
  
  // 2. 生成音频
  const script = '欢迎参与坦克系统对比投票！今天我们来聊聊：主战坦克的三大系统，你更看重哪一个？是火力打击能力、装甲防护水平，还是机动灵活性能？快来投出你的一票，看看军迷们的选择！';
  const audioPath = join(OUTPUT_DIR, 'audio.m4a');
  const duration = await generateAudio(script, audioPath);
  console.log(`✅ 音频生成完成: ${duration.toFixed(1)}秒\n`);
  
  // 3. 合成视频
  const coverPath = join(OUTPUT_DIR, 'cover.jpg');
  const videoPath = join(OUTPUT_DIR, 'video.mp4');
  await createVideo(coverPath, audioPath, videoPath, duration + 0.5);
  
  const stats = statSync(videoPath);
  console.log(`✅ 视频合成完成`);
  console.log(`   文件: ${videoPath}`);
  console.log(`   大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`);
  
  // 4. 发送邮件
  await sendEmail(videoPath);
  
  console.log('\n✅ 全部完成！\n');
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
