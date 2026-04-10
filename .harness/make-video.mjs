/**
 * Quick video generator with existing cover
 */

import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { spawn } from 'child_process';

const DIR = join(process.cwd(), '.local', 'video-final');
const EMAIL_TO = 'jackandking@163.com';

const ffmpeg = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');

async function generateAudio(text, outPath) {
  console.log('🎵 生成音频...');
  const aiff = outPath.replace('.m4a', '.aiff');
  
  await new Promise((resolve, reject) => {
    spawn('say', ['-v', 'Ting-Ting', '-r', '180', '-o', aiff, text])
      .on('close', code => code === 0 ? resolve() : reject(new Error('say failed')));
  });
  
  await new Promise(r => spawn('afconvert', [aiff, outPath, '-f', 'm4af', '-d', 'aac']).on('close', r));
  try { require('fs').unlinkSync(aiff); } catch {}
  
  let duration = 10;
  const info = spawn('afinfo', [outPath]);
  let stdout = '';
  info.stdout.on('data', d => stdout += d);
  await new Promise(r => info.on('close', r));
  const m = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
  if (m) duration = parseFloat(m[1]);
  
  return duration;
}

async function makeVideo(cover, audio, out, duration) {
  console.log('🎬 合成视频...');
  await new Promise((resolve, reject) => {
    const args = [
      '-y', '-loop', '1', '-i', cover, '-i', audio,
      '-t', String(duration + 0.5),
      '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p',
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '128k', '-shortest', out
    ];
    spawn(ffmpeg, args).on('close', code => {
      if (code === 0 || (existsSync(out) && statSync(out).size > 10000)) resolve();
      else reject(new Error('ffmpeg failed'));
    });
  });
}

async function sendEmail(videoPath) {
  console.log('\n📧 发送邮件...');
  const sizeMB = (statSync(videoPath).size / 1024 / 1024).toFixed(2);
  
  const py = `
import subprocess
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

msg = MIMEMultipart()
msg['From'] = 'harness@letmetryai.cn'
msg['To'] = '${EMAIL_TO}'
msg['Subject'] = '🎬 坦克系统对比 - 带封面视频'

body = '''视频已生成！

✅ 包含内容：
- 精美封面（标题+投票选项）
- AI 配音（中文女声）
- 1080x1920 竖屏格式

文件大小: ${sizeMB} MB
'''
msg.attach(MIMEText(body, 'plain', 'utf-8'))

with open('${videoPath}', 'rb') as f:
    att = MIMEBase('application', 'octet-stream')
    att.set_payload(f.read())
encoders.encode_base64(att)
att.add_header('Content-Disposition', 'attachment; filename="tank-demo.mp4"')
msg.attach(att)

subprocess.run(['/usr/sbin/sendmail', '-t'], input=msg.as_bytes())
`;
  spawn('python3', ['-c', py]).on('close', code => {
    console.log(code === 0 ? '✅ 邮件发送成功!' : '❌ 发送失败');
  });
}

async function main() {
  console.log('\n🎬 生成视频\n');
  
  const script = '欢迎参与坦克系统对比投票！今天我们来聊聊：主战坦克的三大系统，你更看重哪一个？是火力打击能力、装甲防护水平，还是机动灵活性能？快来投出你的一票！';
  
  const audio = join(DIR, 'audio.m4a');
  const duration = await generateAudio(script, audio);
  console.log(`✅ 音频: ${duration.toFixed(1)}秒`);
  
  const cover = join(DIR, 'cover.jpg');
  const video = join(DIR, 'video.mp4');
  await makeVideo(cover, audio, video, duration);
  
  const size = (statSync(video).size / 1024 / 1024).toFixed(2);
  console.log(`✅ 视频: ${size} MB`);
  
  await sendEmail(video);
  
  console.log('\n完成！\n');
}

main().catch(e => console.error('❌', e.message));
