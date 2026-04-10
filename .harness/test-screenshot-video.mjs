/**
 * Test video generation with real screenshots
 * 使用真实应用截图生成视频
 */

import { generateVideoFromScreenshot } from './src/services/video-screenshot.ts';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { spawn } from 'child_process';

const OUTPUT_DIR = join(process.cwd(), '.local', 'video-screenshot');
const EMAIL_TO = 'jackandking@163.com';

const TEST_APP = {
  appId: 'tank-systems-compare',
  appName: '坦克系统对比',
  appUrl: 'https://letmetryai.cn/tank-systems-compare/',
};

async function sendEmail(result) {
  console.log('\n📧 发送邮件...');
  
  const stats = statSync(result.videoPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  const content = result.content || {};
  const optionsText = content.options?.slice(0, 3).join(' / ') || '';
  
  const py = `
import subprocess
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

msg = MIMEMultipart()
msg['From'] = 'harness@letmetryai.cn'
msg['To'] = '${EMAIL_TO}'
msg['Subject'] = '🎬 ${TEST_APP.appName} - 真实截图视频'

body = '''视频已生成！

✅ 本次改进：
- 使用真实应用截图（375x812 retina）
- 从 HTML 自动提取内容
- AI 配音朗读标题和选项

📱 提取内容：
标题: ${content.title || 'N/A'}
问题: ${content.question || 'N/A'}
选项: ${optionsText}

文件大小: ${sizeMB} MB
'''
msg.attach(MIMEText(body, 'plain', 'utf-8'))

# Attach video
with open('${result.videoPath}', 'rb') as f:
    att = MIMEBase('application', 'octet-stream')
    att.set_payload(f.read())
encoders.encode_base64(att)
att.add_header('Content-Disposition', 'attachment; filename="${TEST_APP.appId}-video.mp4"')
msg.attach(att)

# Attach screenshot preview
with open('${result.screenshotPath}', 'rb') as f:
    att2 = MIMEBase('image', 'jpeg')
    att2.set_payload(f.read())
encoders.encode_base64(att2)
att2.add_header('Content-Disposition', 'attachment; filename="screenshot.jpg"')
msg.attach(att2)

subprocess.run(['/usr/sbin/sendmail', '-t'], input=msg.as_bytes())
print('邮件已发送')
`;
  
  return new Promise((resolve) => {
    spawn('python3', ['-c', py]).on('close', code => {
      console.log(code === 0 ? '✅ 邮件发送成功!' : '❌ 发送失败');
      resolve(code === 0);
    });
  });
}

async function main() {
  console.log('\n🎬 使用真实截图生成视频\n');
  console.log(`应用: ${TEST_APP.appName}`);
  console.log(`URL: ${TEST_APP.appUrl}`);
  console.log(`邮箱: ${EMAIL_TO}\n`);
  
  console.log('⏳ 开始生成（包含截图和提取内容）...\n');
  const startTime = Date.now();
  
  try {
    const result = await generateVideoFromScreenshot(
      TEST_APP.appId,
      TEST_APP.appName,
      TEST_APP.appUrl,
      OUTPUT_DIR
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ 生成结果');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`成功: ${result.success ? '✅' : '❌'}`);
    console.log(`耗时: ${elapsed}秒`);
    
    if (result.success) {
      console.log(`\n📱 提取内容:`);
      console.log(`  标题: ${result.content?.title || 'N/A'}`);
      console.log(`  问题: ${result.content?.question || 'N/A'}`);
      console.log(`  选项: ${result.content?.options?.length || 0}个`);
      result.content?.options?.slice(0, 3).forEach((opt, i) => {
        console.log(`    ${i + 1}. ${opt.substring(0, 40)}${opt.length > 40 ? '...' : ''}`);
      });
      
      console.log(`\n📁 生成文件:`);
      console.log(`  截图: ${result.screenshotPath}`);
      console.log(`  音频: ${result.audioPath}`);
      console.log(`  视频: ${result.videoPath}`);
      
      if (result.videoPath && existsSync(result.videoPath)) {
        const stats = statSync(result.videoPath);
        console.log(`\n📹 视频信息:`);
        console.log(`  时长: ${result.duration?.toFixed(1)}秒`);
        console.log(`  大小: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
      }
      
      // 发送邮件
      await sendEmail(result);
      
      console.log('\n✅ 全部完成！\n');
    } else {
      console.log(`\n❌ 错误: ${result.error}`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    process.exit(1);
  }
}

main();
