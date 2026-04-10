/**
 * Test screenshot with local file
 */

import { generateScreenshotVideo } from './src/services/video-screenshot.ts';
import { join } from 'path';
import { existsSync, statSync } from 'fs';
import { spawn } from 'child_process';

const OUTPUT_DIR = join(process.cwd(), '.local', 'video-screenshot');
const EMAIL_TO = 'jackandking@163.com';

// 使用本地文件路径
const LOCAL_URL = 'file:///Users/weiping/LetMeTryAI/tank-systems-compare/index.html';

async function sendEmail(result) {
  console.log('\n📧 发送邮件...');
  
  const stats = statSync(result.videoPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
  
  const content = result.content || {};
  
  const py = `
import subprocess
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

msg = MIMEMultipart()
msg['From'] = 'harness@letmetryai.cn'
msg['To'] = '${EMAIL_TO}'
msg['Subject'] = '🎬 坦克系统对比 - 截图视频（修复图片版）'

body = '''视频已生成！本次修复了图片显示问题。

✅ 改进内容：
- 应用图片已正确复制
- 截图中包含真实的 SVG 图片
- 使用本地文件路径加载

📱 提取内容：
标题: ${content.title || 'N/A'}
问题: ${content.question || 'N/A'}

文件大小: ${sizeMB} MB
'''
msg.attach(MIMEText(body, 'plain', 'utf-8'))

# Attach video
with open('${result.videoPath}', 'rb') as f:
    att = MIMEBase('application', 'octet-stream')
    att.set_payload(f.read())
encoders.encode_base64(att)
att.add_header('Content-Disposition', 'attachment; filename="tank-screenshot-video.mp4"')
msg.attach(att)

# Attach screenshot
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
  console.log('\n🎬 本地截图测试\n');
  console.log(`使用本地文件: ${LOCAL_URL}`);
  console.log(`邮箱: ${EMAIL_TO}\n`);
  
  try {
    const result = await generateScreenshotVideo({
      appId: 'tank-systems-compare',
      appName: '坦克系统对比',
      appUrl: LOCAL_URL,
      outputDir: OUTPUT_DIR,
      viewport: { width: 375, height: 812 },
    });
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ 生成结果');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`成功: ${result.success ? '✅' : '❌'}`);
    
    if (result.success) {
      console.log(`\n📱 提取内容:`);
      console.log(`  标题: ${result.content?.title || 'N/A'}`);
      console.log(`  问题: ${result.content?.question || 'N/A'}`);
      
      console.log(`\n📁 生成文件:`);
      console.log(`  截图: ${result.screenshotPath}`);
      console.log(`  视频: ${result.videoPath}`);
      
      const stats = statSync(result.videoPath);
      console.log(`\n📹 视频: ${(stats.size / 1024 / 1024).toFixed(2)} MB, ${result.duration?.toFixed(1)}秒`);
      
      await sendEmail(result);
      console.log('\n✅ 完成！\n');
    } else {
      console.log(`\n❌ 错误: ${result.error}`);
    }
    
  } catch (error) {
    console.error('\n❌ 错误:', error.message);
  }
}

main();
