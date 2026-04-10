/**
 * Create cover image using Playwright screenshot
 * 使用 Playwright 生成封面图片
 */

import { chromium } from 'playwright';
import { join } from 'path';
import { mkdirSync } from 'fs';

const OUTPUT_DIR = join(process.cwd(), '.local', 'video-text');
mkdirSync(OUTPUT_DIR, { recursive: true });

const HTML_TEMPLATE = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1080px;
      height: 1920px;
      background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      position: relative;
      overflow: hidden;
    }
    .circle-top {
      position: absolute;
      top: -150px;
      left: -150px;
      width: 500px;
      height: 500px;
      background: #e94560;
      border-radius: 50%;
      opacity: 0.8;
    }
    .circle-bottom {
      position: absolute;
      bottom: -200px;
      right: -200px;
      width: 600px;
      height: 600px;
      background: #0f3460;
      border-radius: 50%;
      opacity: 0.6;
    }
    .icon {
      width: 150px;
      height: 150px;
      border: 8px solid #e94560;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 60px;
    }
    .checkmark {
      width: 60px;
      height: 30px;
      border-bottom: 8px solid #e94560;
      border-right: 8px solid #e94560;
      transform: rotate(45deg) translate(-5px, -5px);
    }
    .title {
      font-size: 80px;
      font-weight: bold;
      color: white;
      text-shadow: 4px 4px 8px rgba(0,0,0,0.5);
      margin-bottom: 40px;
      text-align: center;
      padding: 0 60px;
    }
    .subtitle {
      font-size: 42px;
      color: #e94560;
      margin-bottom: 80px;
      text-align: center;
      padding: 0 80px;
      line-height: 1.5;
    }
    .options {
      display: flex;
      flex-direction: column;
      gap: 20px;
      margin-bottom: 100px;
    }
    .option {
      background: rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 25px 50px;
      font-size: 32px;
      color: white;
      text-align: center;
      border: 2px solid rgba(255,255,255,0.2);
    }
    .footer {
      position: absolute;
      bottom: 150px;
      font-size: 36px;
      color: #aaaaaa;
    }
    .brand {
      position: absolute;
      bottom: 60px;
      font-size: 28px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="circle-top"></div>
  <div class="circle-bottom"></div>
  <div class="icon"><div class="checkmark"></div></div>
  <div class="title">{{TITLE}}</div>
  <div class="subtitle">{{SUBTITLE}}</div>
  <div class="options">
    <div class="option">🔥 火力优先 - 强打击</div>
    <div class="option">🛡️ 装甲优先 - 防护强</div>
    <div class="option">⚡ 机动优先 - 快速机动</div>
  </div>
  <div class="footer">参与投票 · 说出你的选择</div>
  <div class="brand">LetMeTryAI</div>
</body>
</html>
`;

async function createCoverImage(title, subtitle, outputPath) {
  console.log('📸 生成封面图片...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  
  const html = HTML_TEMPLATE
    .replace('{{TITLE}}', title)
    .replace('{{SUBTITLE}}', subtitle);
  
  await page.setContent(html);
  await page.waitForTimeout(500);
  
  await page.screenshot({
    path: outputPath,
    type: 'jpeg',
    quality: 90,
  });
  
  await browser.close();
  console.log(`✅ 封面生成: ${outputPath}`);
  return outputPath;
}

async function main() {
  const outputPath = join(OUTPUT_DIR, 'cover.jpg');
  await createCoverImage(
    '坦克系统对比',
    '主战坦克三大系统，你更看重哪一个？',
    outputPath
  );
  console.log('\n完成！');
}

main().catch(console.error);
