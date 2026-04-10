/**
 * Generate short video and send email
 * 生成短视频并发送邮件
 */

import { VideoRecorder } from './src/tools/video-recorder.ts';
import { VideoGeneratorService } from './src/services/video-generator.ts';
import { join } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';
import { spawn } from 'child_process';

const TEST_APP = {
  appId: 'tank-systems-compare',
  appName: '坦克系统对比',
  appUrl: 'https://letmetryai.cn/tank-systems-compare/',
};

const OUTPUT_DIR = join(process.cwd(), '.local', 'video-email');

// 邮箱配置
const EMAIL_TO = 'weiping@letmetryai.cn';  // 用户邮箱
const EMAIL_FROM = 'harness@letmetryai.cn';

async function generateShortVideo() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 生成短视频 (8秒)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = join(OUTPUT_DIR, 'demo-short.mp4');
  const recorder = new VideoRecorder();
  
  const result = await recorder.record({
    appUrl: TEST_APP.appUrl,
    outputPath: outputPath,
    mobile: true,
    quality: 'low',
    duration: 3000, // 额外等待3秒
    steps: [
      { type: 'wait', delay: 2000, description: '展示首页' },
      { type: 'vote', optionIndex: 0, delay: 1500, description: '点击投票' },
      { type: 'wait', delay: 2000, description: '展示结果' },
    ],
  });

  if (!result.success) {
    throw new Error(`Video generation failed: ${result.error}`);
  }

  console.log('✅ 视频生成成功!');
  console.log(`📁 文件: ${result.videoPath}`);
  console.log(`📊 大小: ${(result.size / 1024).toFixed(0)} KB`);
  
  return result.videoPath;
}

async function sendEmailWithVideo(videoPath) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📧 发送邮件');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const stats = statSync(videoPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  const subject = `🎬 视频生成测试 - ${TEST_APP.appName}`;
  
  const body = `
您好！

短视频已生成完成。

📱 应用信息:
   名称: ${TEST_APP.appName}
   URL: ${TEST_APP.appUrl}

📹 视频信息:
   文件: ${videoPath.split('/').pop()}
   大小: ${fileSizeMB} MB
   格式: WebM (可由浏览器播放)

视频文件已附加在邮件中。

---
LetMeTryAI Harness 自动生成
`;

  console.log(`收件人: ${EMAIL_TO}`);
  console.log(`主题: ${subject}`);
  console.log(`附件: ${videoPath} (${fileSizeMB} MB)`);
  
  // 使用 Python 邮件脚本发送
  return new Promise((resolve, reject) => {
    const pythonScript = join(process.cwd(), '..', '.automation', 'scripts', 'send_email.py');
    
    // 构建邮件内容
    const emailContent = {
      to: EMAIL_TO,
      from: EMAIL_FROM,
      subject: subject,
      body: body,
      attachment: videoPath,
    };

    // 使用 Node.js 直接发送（调用 Python 脚本）
    const pythonCmd = spawn('python3', [
      pythonScript,
      EMAIL_TO,
      subject,
      body,
    ], {
      env: {
        ...process.env,
        VIDEO_ATTACHMENT: videoPath,
      }
    });

    let stdout = '';
    let stderr = '';

    pythonCmd.stdout.on('data', (data) => { stdout += data.toString(); });
    pythonCmd.stderr.on('data', (data) => { stderr += data.toString(); });

    pythonCmd.on('close', (code) => {
      if (code !== 0) {
        console.log('邮件发送输出:', stdout);
        console.log('邮件发送错误:', stderr);
        // 即使邮件发送失败，也不影响整体流程
        resolve({ success: false, error: stderr });
      } else {
        console.log('✅ 邮件发送成功!');
        console.log(stdout);
        resolve({ success: true });
      }
    });
  });
}

async function sendSimpleNotification(videoPath) {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📧 发送邮件通知');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const stats = statSync(videoPath);
  const fileSizeMB = (stats.size / 1024 / 1024).toFixed(2);
  const filename = videoPath.split('/').pop();
  
  const subject = `🎬 视频生成完成 - ${TEST_APP.appName}`;
  
  const htmlBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .footer { margin-top: 20px; font-size: 12px; color: #999; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎬 视频生成完成</h2>
    </div>
    <div class="content">
      <p>您好！短视频已成功生成。</p>
      
      <div class="info-box">
        <p><span class="label">📱 应用名称:</span> <span class="value">${TEST_APP.appName}</span></p>
        <p><span class="label">🔗 应用链接:</span> <a href="${TEST_APP.appUrl}">${TEST_APP.appUrl}</a></p>
      </div>
      
      <div class="info-box">
        <p><span class="label">📹 视频文件:</span> <span class="value">${filename}</span></p>
        <p><span class="label">📊 文件大小:</span> <span class="value">${fileSizeMB} MB</span></p>
        <p><span class="label">📁 完整路径:</span> <code>${videoPath}</code></p>
      </div>
      
      <p>视频文件保存在服务器上，您可以通过 SSH/SFTP 下载。</p>
      
      <div class="footer">
        <p>---<br>
        LetMeTryAI Harness 自动生成<br>
        时间: ${new Date().toLocaleString('zh-CN')}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = `
视频生成完成!

应用: ${TEST_APP.appName}
URL: ${TEST_APP.appUrl}

视频: ${filename}
大小: ${fileSizeMB} MB
路径: ${videoPath}

---
LetMeTryAI Harness
${new Date().toLocaleString('zh-CN')}
`;

  console.log(`收件人: ${EMAIL_TO}`);
  console.log(`主题: ${subject}`);
  console.log(`视频: ${filename} (${fileSizeMB} MB)\n`);

  // 使用 sendmail 命令发送
  return new Promise((resolve, reject) => {
    const sendmail = spawn('/usr/sbin/sendmail', [EMAIL_TO], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';
    sendmail.stderr.on('data', (data) => { stderr += data.toString(); });

    // 构建邮件头
    const emailHeaders = `From: ${EMAIL_FROM}
To: ${EMAIL_TO}
Subject: ${subject}
Content-Type: text/html; charset=UTF-8
Content-Transfer-Encoding: 8bit

`;

    sendmail.stdin.write(emailHeaders + htmlBody);
    sendmail.stdin.end();

    sendmail.on('close', (code) => {
      if (code !== 0) {
        console.log('尝试使用纯文本格式...');
        // 尝试纯文本发送
        const sendmail2 = spawn('/usr/sbin/sendmail', [EMAIL_TO]);
        sendmail2.stdin.write(`From: ${EMAIL_FROM}\nTo: ${EMAIL_TO}\nSubject: ${subject}\n\n${textBody}`);
        sendmail2.stdin.end();
        sendmail2.on('close', (code2) => {
          if (code2 === 0) {
            console.log('✅ 邮件发送成功! (纯文本)');
            resolve({ success: true });
          } else {
            resolve({ success: false, error: stderr });
          }
        });
      } else {
        console.log('✅ 邮件发送成功!');
        resolve({ success: true });
      }
    });
  });
}

async function main() {
  console.log('\n🚀 视频生成 + 邮件发送测试\n');
  console.log(`目标邮箱: ${EMAIL_TO}\n`);
  
  let videoPath = null;
  
  try {
    // 步骤1: 生成短视频
    videoPath = await generateShortVideo();
    
    // 步骤2: 发送邮件通知
    const emailResult = await sendSimpleNotification(videoPath);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ 任务完成');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`视频: ${videoPath}`);
    console.log(`邮件: ${emailResult.success ? '已发送' : '发送失败'}`);
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 任务失败:', error.message);
    process.exit(1);
  }
}

main();
