/**
 * Test say + ffmpeg video generation
 * 使用 macOS say + ffmpeg 生成配音视频
 */

import { generateSayFfmpegVideo } from './src/services/video-say-ffmpeg.ts';
import { join } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';
import { spawn } from 'child_process';

const TEST_APP = {
  appId: 'tank-systems-compare',
  appName: '坦克系统对比',
  appUrl: 'https://letmetryai.cn/tank-systems-compare/',
};

const OUTPUT_DIR = join(process.cwd(), '.local', 'say-ffmpeg');

// 收件人邮箱
const EMAIL_TO = 'jackandking@163.com';
const EMAIL_FROM = 'harness@letmetryai.cn';

async function generateVideo() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 使用 say + ffmpeg 生成视频');
  console.log('═══════════════════════════════════════════════════════════════\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`📱 应用: ${TEST_APP.appName}`);
  console.log(`📁 输出: ${OUTPUT_DIR}\n`);

  // 自定义配音脚本
  const customScript = `欢迎参与${TEST_APP.appName}投票！今天我们来聊聊：主战坦克的三大系统，你更看重哪一个？是火力打击能力、装甲防护水平，还是机动灵活性能？快来投出你的一票，看看军迷们的选择！`;

  console.log('📝 配音脚本:');
  console.log(`   ${customScript}\n`);

  console.log('⏳ 开始生成...\n');
  const startTime = Date.now();

  const result = await generateSayFfmpegVideo({
    appId: TEST_APP.appId,
    appName: TEST_APP.appName,
    appUrl: TEST_APP.appUrl,
    outputDir: OUTPUT_DIR,
    script: customScript,
    voice: 'Ting-Ting',  // 中文女声
    rate: 180,           // 语速
  });

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ 生成结果');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`成功: ${result.success ? '✅' : '❌'}`);
  console.log(`耗时: ${duration}秒`);
  
  if (result.duration) {
    console.log(`音频时长: ${result.duration.toFixed(1)}秒`);
  }

  if (result.videoPath && existsSync(result.videoPath)) {
    const stats = statSync(result.videoPath);
    console.log(`\n📹 视频:`);
    console.log(`   路径: ${result.videoPath}`);
    console.log(`   大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
  }

  if (result.audioPath && existsSync(result.audioPath)) {
    const stats = statSync(result.audioPath);
    console.log(`\n🎵 音频:`);
    console.log(`   路径: ${result.audioPath}`);
    console.log(`   大小: ${(stats.size / 1024).toFixed(0)} KB`);
  }

  if (result.imagePath) {
    console.log(`\n🖼️  背景图: ${result.imagePath}`);
  }

  if (result.scriptPath) {
    console.log(`\n📝 脚本文件: ${result.scriptPath}`);
  }

  if (result.error) {
    console.log(`\n⚠️  警告: ${result.error}`);
  }

  return result;
}

async function sendEmailWithVideo(result) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📧 发送邮件');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const files = [];
  
  if (result.videoPath && existsSync(result.videoPath)) {
    files.push(result.videoPath);
  }
  if (result.audioPath && existsSync(result.audioPath)) {
    files.push(result.audioPath);
  }

  if (files.length === 0) {
    console.log('❌ 没有可发送的文件');
    return false;
  }

  const subject = `🎬 ${TEST_APP.appName} - AI配音视频`;
  
  // 构建邮件内容
  let body = `您好！\n\n`;
  body += `AI配音视频已生成完成。\n\n`;
  body += `应用: ${TEST_APP.appName}\n`;
  body += `链接: ${TEST_APP.appUrl}\n\n`;
  
  if (result.videoPath && existsSync(result.videoPath)) {
    const stats = statSync(result.videoPath);
    body += `视频: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`;
  }
  
  if (result.audioPath && existsSync(result.audioPath)) {
    const stats = statSync(result.audioPath);
    body += `音频: ${(stats.size / 1024).toFixed(0)} KB\n`;
  }
  
  if (result.duration) {
    body += `时长: ${result.duration.toFixed(1)}秒\n`;
  }
  
  body += `\n文件已作为附件发送。\n\n`;
  body += `---\nLetMeTryAI Harness\n`;

  console.log(`收件人: ${EMAIL_TO}`);
  console.log(`主题: ${subject}`);
  console.log(`附件: ${files.length}个文件\n`);

  // 使用 Python 发送带附件的邮件
  return new Promise((resolve) => {
    const pythonScript = `
import sys
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import subprocess

msg = MIMEMultipart()
msg['From'] = '${EMAIL_FROM}'
msg['To'] = '${EMAIL_TO}'
msg['Subject'] = '${subject}'

body = '''${body}'''
msg.attach(MIMEText(body, 'plain', 'utf-8'))

# Attach files
files = ${JSON.stringify(files)}
for filepath in files:
    if os.path.exists(filepath):
        filename = os.path.basename(filepath)
        with open(filepath, 'rb') as f:
            attachment = MIMEBase('application', 'octet-stream')
            attachment.set_payload(f.read())
        encoders.encode_base64(attachment)
        attachment.add_header('Content-Disposition', f'attachment; filename="{filename}"')
        msg.attach(attachment)
        print(f'Attached: {filename}')

# Send
result = subprocess.run(['/usr/sbin/sendmail', '-t'], input=msg.as_bytes())
sys.exit(result.returncode)
`;
    const child = spawn('python3', ['-c', pythonScript]);
    
    child.stdout.on('data', (data) => console.log(data.toString()));
    child.stderr.on('data', (data) => console.error(data.toString()));
    
    child.on('close', (code) => {
      if (code === 0) {
        console.log('✅ 邮件发送成功!');
        resolve(true);
      } else {
        console.log('❌ 邮件发送失败');
        resolve(false);
      }
    });
  });
}

async function main() {
  console.log('\n🚀 Say + FFmpeg 视频生成测试\n');
  console.log(`📧 收件人: ${EMAIL_TO}\n`);

  try {
    // 生成视频
    const result = await generateVideo();
    
    // 发送邮件
    if (result.success) {
      await sendEmailWithVideo(result);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ 任务完成');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
  } catch (error) {
    console.error('\n❌ 任务失败:', error.message);
    process.exit(1);
  }
}

main();
