#!/usr/bin/env node
/**
 * Topic to Email - 从选题到邮件的完整工作流
 * 
 * 流程:
 * 1. AI 选题 (或使用指定主题)
 * 2. 生成应用脚手架
 * 3. 部署到 GitHub Pages
 * 4. 生成演示视频 (截图+AI图片+TTS+ffmpeg)
 * 5. 发送邮件 (带视频描述，方便手动发快手)
 */

import { join } from 'path';
import { mkdirSync, existsSync, writeFileSync, readFileSync, copyFileSync } from 'fs';
import { spawn } from 'child_process';

const OUTPUT_DIR = join(process.cwd(), '.local', 'workflow-output');
const EMAIL_TO = 'jackandking@163.com';
const PROJECT_ROOT = join(process.cwd(), '..');
const HISTORY_FILE = join(OUTPUT_DIR, 'topic-history.json');

mkdirSync(OUTPUT_DIR, { recursive: true });

// ========== 查重功能 ==========
import { readdirSync, statSync } from 'fs';

function loadAppsMetadata() {
  const apps = [];
  
  // 1. 从 apps-metadata.json 读取
  try {
    const metadataPath = join(PROJECT_ROOT, 'apps-metadata.json');
    if (existsSync(metadataPath)) {
      const data = JSON.parse(readFileSync(metadataPath, 'utf-8'));
      apps.push(...(data.apps || []));
    }
  } catch (e) {
    console.log('⚠️  无法读取 apps-metadata.json');
  }
  
  // 2. 扫描实际存在的目录（以防 apps-metadata.json 未更新）
  try {
    const entries = readdirSync(PROJECT_ROOT);
    for (const entry of entries) {
      // 排除隐藏目录和特定目录
      if (entry.startsWith('.') || 
          entry.startsWith('_') || 
          ['node_modules', '.git', '.harness', '.automation', '.runtime', '.agents', 'logs', 'images', 'icons', 'docs', 'tests'].includes(entry)) {
        continue;
      }
      
      const fullPath = join(PROJECT_ROOT, entry);
      try {
        const stat = statSync(fullPath);
        if (stat.isDirectory()) {
          // 检查是否包含 index.html（投票应用特征）
          if (existsSync(join(fullPath, 'index.html'))) {
            // 如果不在已有列表中，添加
            if (!apps.some(app => app.id === entry)) {
              apps.push({ id: entry, name: entry, source: 'filesystem' });
            }
          }
        }
      } catch (e) {}
    }
  } catch (e) {}
  
  return apps;
}

function loadTopicHistory() {
  try {
    if (existsSync(HISTORY_FILE)) {
      return JSON.parse(readFileSync(HISTORY_FILE, 'utf-8'));
    }
  } catch (e) {
    console.log('⚠️  无法读取话题历史');
  }
  return [];
}

function saveTopicHistory(history) {
  writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

function generateUniqueAppId(baseId, existingIds) {
  if (!existingIds.includes(baseId)) {
    return baseId;
  }
  
  // 添加序号后缀
  let counter = 2;
  let newId = `${baseId}-${counter}`;
  while (existingIds.includes(newId)) {
    counter++;
    newId = `${baseId}-${counter}`;
  }
  return newId;
}

function calculateSimilarity(str1, str2) {
  // 简单的字符串相似度计算（基于共同字符）
  const s1 = str1.toLowerCase().replace(/[^\w]/g, '');
  const s2 = str2.toLowerCase().replace(/[^\w]/g, '');
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const set1 = new Set(s1);
  const set2 = new Set(s2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  
  return intersection.size / union.size;
}

function isSimilarTopic(newTopic, existingTopics, threshold = 0.6) {
  for (const existing of existingTopics) {
    const nameSimilarity = calculateSimilarity(newTopic.appName, existing.appName);
    const questionSimilarity = calculateSimilarity(newTopic.question, existing.question);
    
    if (nameSimilarity > threshold || questionSimilarity > threshold) {
      return {
        isSimilar: true,
        similarTo: existing,
        similarity: Math.max(nameSimilarity, questionSimilarity),
      };
    }
  }
  return { isSimilar: false };
}

// ========== 配置 ==========
const PROFILE = {
  id: 'nanrenbao',
  name: '男人宝',
  description: '军事、科技、汽车等男性兴趣话题',
};

// ========== 工具函数 ==========
function getFfmpegPath() {
  const ffmpegStatic = join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg');
  return existsSync(ffmpegStatic) ? ffmpegStatic : 'ffmpeg';
}

async function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: options.silent ? ['ignore', 'pipe', 'pipe'] : 'inherit',
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });
    
    let stdout = '';
    let stderr = '';
    
    if (options.silent) {
      child.stdout?.on('data', (d) => stdout += d.toString());
      child.stderr?.on('data', (d) => stderr += d.toString());
    }
    
    child.on('close', (code) => {
      if (code !== 0 && !options.ignoreError) {
        reject(new Error(`Command failed: ${cmd} ${args.join(' ')}`));
      } else {
        resolve({ code, stdout, stderr });
      }
    });
  });
}

// ========== 步骤 1: 选题 ==========
async function selectTopic() {
  console.log('\n📋 步骤 1: AI 选题\n');
  
  // 加载已有应用和历史
  const existingApps = loadAppsMetadata();
  const existingIds = existingApps.map(app => app.id);
  const topicHistory = loadTopicHistory();
  
  console.log(`📚 已有应用: ${existingApps.length} 个`);
  console.log(`📜 历史话题: ${topicHistory.length} 个`);
  
  // 使用 kimi 生成选题
  const prompt = `为"${PROFILE.name}"生成一个投票类话题。

要求：
- 话题类型：军事装备对比、科技产品PK、经典怀旧选择
- 标题：15-25字，吸引人点击
- 3个选项，每个选项有简短描述
- 适合生成投票小程序
- appId 使用 kebab-case 格式（如 tank-battle, jet-fighter-pk）
- 避免使用这些已存在的ID: ${existingIds.slice(-10).join(', ')}

输出格式：
{
  "appId": "英文ID(如tank-battle)",
  "appName": "标题",
  "question": "投票问题",
  "options": [
    {"name": "选项1", "desc": "简短描述"},
    {"name": "选项2", "desc": "简短描述"},
    {"name": "选项3", "desc": "简短描述"}
  ],
  "videoScript": "30秒视频解说文案，用于AI配音"
}`;

  console.log('🤖 正在调用 AI 生成选题...');
  
  let topic = null;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts && !topic) {
    attempts++;
    
    try {
      // 尝试使用 kimi CLI
      const { stdout } = await runCommand('kimi', ['--yolo', '-p', prompt], { 
        silent: true, 
        timeout: 60000 
      });
      
      // 解析 JSON
      const jsonMatch = stdout.match(/```json\s*([\s\S]*?)```/) || 
                        stdout.match(/{[\s\S]*}/);
      
      if (jsonMatch) {
        const candidate = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        
        // 检查相似度
        const similarity = isSimilarTopic(candidate, topicHistory);
        if (similarity.isSimilar) {
          console.log(`⚠️  话题与历史记录相似 (${(similarity.similarity * 100).toFixed(0)}%)，重新生成...`);
          continue;
        }
        
        // 确保 appId 唯一
        const uniqueId = generateUniqueAppId(candidate.appId, existingIds);
        if (uniqueId !== candidate.appId) {
          console.log(`⚠️  appId "${candidate.appId}" 已存在，使用 "${uniqueId}"`);
          candidate.appId = uniqueId;
        }
        
        topic = candidate;
        console.log('✅ 选题生成成功');
        console.log(`   ID: ${topic.appId}`);
        console.log(`   标题: ${topic.appName}`);
        console.log(`   问题: ${topic.question}`);
        console.log(`   选项: ${topic.options.map(o => o.name).join(' / ')}`);
        
        // 保存到历史
        topicHistory.push({
          appId: topic.appId,
          appName: topic.appName,
          question: topic.question,
          createdAt: new Date().toISOString(),
        });
        saveTopicHistory(topicHistory);
        
        return topic;
      }
    } catch (e) {
      console.log(`⚠️  AI 选题失败 (尝试 ${attempts}/${maxAttempts})`);
    }
  }
  
  // 使用带序号的默认话题
  const baseDefaultId = 'classic-fighters-pk';
  const uniqueDefaultId = generateUniqueAppId(baseDefaultId, existingIds);
  
  topic = {
    appId: uniqueDefaultId,
    appName: '经典战机大PK',
    question: '二战经典战机，你最喜欢哪一款？',
    options: [
      { name: 'P-51 野马', desc: '盟军全能战机' },
      { name: '喷火战斗机', desc: '不列颠守护者' },
      { name: '零式战机', desc: '太平洋传奇' },
    ],
    videoScript: '今天我们来聊聊二战经典战机！P-51野马，盟军的全能战士；喷火战斗机，不列颠的守护者；零式战机，太平洋上的传奇。三款经典战机，你最喜欢哪一款？快来投出你的一票！',
  };
  
  console.log('⚠️  使用默认话题');
  console.log(`   ID: ${topic.appId}`);
  
  // 保存到历史
  topicHistory.push({
    appId: topic.appId,
    appName: topic.appName,
    question: topic.question,
    createdAt: new Date().toISOString(),
  });
  saveTopicHistory(topicHistory);
  
  return topic;
}

// ========== MiniMax 图片生成 ==========
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY || '';
const MINIMAX_API_URL = 'https://api.minimax.chat/v1/image_generation';

async function generateMiniMaxImage(prompt, outputPath) {
  if (!MINIMAX_API_KEY) {
    console.log('⚠️  未设置 MINIMAX_API_KEY，跳过图片生成');
    return false;
  }
  
  try {
    const response = await fetch(MINIMAX_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'image-01',
        prompt,
        aspect_ratio: '1:1',
        quality: 'standard',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`MiniMax API error: ${response.status}`);
    }
    
    const data = await response.json();
    const imageUrl = data.data?.image_urls?.[0];
    
    if (!imageUrl) {
      throw new Error('No image URL in response');
    }
    
    // 下载图片
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    writeFileSync(outputPath, imageBuffer);
    
    return true;
  } catch (error) {
    console.log(`⚠️  图片生成失败: ${error.message}`);
    return false;
  }
}

function generateImagePrompt(option, topic) {
  // 根据选项内容生成合适的图片提示词
  const basePrompt = `A dramatic, cinematic photo of ${option.name}, ${option.desc}. `;
  const stylePrompt = 'Professional photography, dramatic lighting, high quality, detailed, 4K.';
  
  // 根据话题类型调整风格
  if (topic.appId.includes('tank') || topic.appId.includes('fighter') || topic.appId.includes('jet')) {
    return basePrompt + 'Military style, powerful composition, realistic rendering. ' + stylePrompt;
  }
  if (topic.appId.includes('car') || topic.appId.includes('auto')) {
    return basePrompt + 'Automotive photography, sleek design, studio lighting. ' + stylePrompt;
  }
  if (topic.appId.includes('ship') || topic.appId.includes('boat')) {
    return basePrompt + 'Maritime scene, ocean background, majestic. ' + stylePrompt;
  }
  
  return basePrompt + stylePrompt;
}

// ========== 步骤 2: 生成应用 ==========
async function generateApp(topic) {
  console.log('\n📦 步骤 2: 生成应用\n');
  
  const appDir = join(process.cwd(), '..', topic.appId);
  mkdirSync(appDir, { recursive: true });
  
  // 读取模板
  const templateDir = join(process.cwd(), '..', 'fighter-jets');
  const templateFiles = ['index.html', 'app.js', 'styles.css'];
  
  for (const file of templateFiles) {
    const templatePath = join(templateDir, file);
    if (!existsSync(templatePath)) continue;
    
    let content = readFileSync(templatePath, 'utf-8');
    
    // 替换内容
    content = content
      .replace(/fighter-jets/g, topic.appId)
      .replace(/现代战斗机巅峰对决/g, topic.appName)
      .replace(/ question: .+,/g, ` question: "${topic.question}",`)
      .replace(/现代战斗机巅峰对决/g, topic.appName);
    
    // 替换选项
    if (file === 'app.js') {
      const optionsJson = JSON.stringify(topic.options.map((o, i) => ({
        id: `option-${i + 1}`,
        name: o.name,
        desc: o.desc,
        image: `images/option${i + 1}.jpg`,
      })), null, 2);
      
      content = content.replace(/options:\s*\[[\s\S]*?\]/, `options: ${optionsJson}`);
    }
    
    writeFileSync(join(appDir, file), content);
  }
  
  // 处理图片
  const imagesDir = join(appDir, 'images');
  mkdirSync(imagesDir, { recursive: true });
  
  console.log('🎨 处理图片...');
  
  let generatedCount = 0;
  let copiedCount = 0;
  
  for (let i = 1; i <= 3; i++) {
    const sourceImg = join(templateDir, 'images', `option${i}.jpg`);
    const destImg = join(imagesDir, `option${i}.jpg`);
    const option = topic.options[i - 1];
    
    // 优先使用 MiniMax 生成图片
    if (MINIMAX_API_KEY && option) {
      const prompt = generateImagePrompt(option, topic);
      console.log(`   生成图片 ${i}: ${option.name}`);
      
      const success = await generateMiniMaxImage(prompt, destImg);
      if (success) {
        generatedCount++;
        continue;
      }
    }
    
    // 如果生成失败或没有 API key，复制模板图片
    if (existsSync(sourceImg)) {
      copyFileSync(sourceImg, destImg);
      copiedCount++;
    } else {
      console.log(`   ⚠️  图片 ${i} 缺失`);
    }
  }
  
  console.log('✅ 应用生成完成');
  console.log(`   目录: ${appDir}`);
  console.log(`   图片: ${generatedCount} 生成, ${copiedCount} 复制`);
  
  return appDir;
}

// ========== 步骤 3: Git 部署 ==========
async function deployApp(appDir, topic) {
  console.log('\n🚀 步骤 3: 部署应用\n');
  
  const projectRoot = join(process.cwd(), '..');
  
  // Git add
  console.log('📤 提交到 Git...');
  await runCommand('git', ['add', topic.appId], { cwd: projectRoot });
  
  // Git commit
  try {
    await runCommand('git', ['commit', '-m', `Add app: ${topic.appName}`], { 
      cwd: projectRoot,
      ignoreError: true,
    });
  } catch (e) {
    console.log('⚠️  无变更或提交失败，继续...');
  }
  
  // Git push
  await runCommand('git', ['push'], { cwd: projectRoot });
  
  const deployedUrl = `https://letmetryai.cn/${topic.appId}/`;
  console.log('✅ 部署完成');
  console.log(`   URL: ${deployedUrl}`);
  
  return deployedUrl;
}

// ========== 步骤 4: 生成视频 ==========
async function generateVideo(topic, deployedUrl, appDir) {
  console.log('\n🎬 步骤 4: 生成视频\n');
  
  // 等待 GitHub Pages 部署
  console.log('⏳ 等待 GitHub Pages 部署...');
  console.log(`   检查: ${deployedUrl}`);
  
  let retries = 30;
  let isLive = false;
  while (retries > 0) {
    try {
      const { code } = await runCommand('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', deployedUrl], { 
        silent: true, 
        ignoreError: true 
      });
      if (code === 0) {
        isLive = true;
        console.log('✅ 应用已上线');
        break;
      }
    } catch (e) {}
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 2000));
    retries--;
  }
  
  if (!isLive) {
    console.log('\n⚠️  等待超时，使用本地文件生成视频');
  }
  
  // 使用 Playwright 截图 (Node.js 版本)
  console.log('📸 截取应用页面...');
  
  const url = isLive ? deployedUrl : `file://${appDir}/index.html`;
  
  const screenshotScript = `
import { chromium } from 'playwright';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  await page.goto('${url}', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '${OUTPUT_DIR}/screenshot.png', fullPage: true });
  await browser.close();
  console.log('截图完成');
})();
`;
  
  writeFileSync(join(OUTPUT_DIR, 'screenshot.mjs'), screenshotScript);
  await runCommand('node', [join(OUTPUT_DIR, 'screenshot.mjs')], { silent: true });
  
  // 生成音频 (macOS say)
  console.log('🎵 生成 AI 配音...');
  const audioPath = join(OUTPUT_DIR, 'audio.m4a');
  const aiffPath = audioPath.replace('.m4a', '.aiff');
  
  await runCommand('say', ['-v', 'Ting-Ting', '-r', '180', '-o', aiffPath, topic.videoScript]);
  await runCommand('afconvert', [aiffPath, audioPath, '-f', 'm4af', '-d', 'aac']);
  
  // 获取音频时长
  const { stdout } = await runCommand('afinfo', [audioPath], { silent: true });
  const durationMatch = stdout.match(/estimated duration:\s*([\d.]+)\s*sec/);
  const duration = parseFloat(durationMatch?.[1] || '15');
  
  console.log(`✅ 音频生成完成: ${duration.toFixed(1)}秒`);
  
  // 合成视频
  console.log('🎞️  合成视频...');
  const videoPath = join(OUTPUT_DIR, `${topic.appId}-demo.mp4`);
  const ffmpeg = getFfmpegPath();
  
  await runCommand(ffmpeg, [
    '-y',
    '-loop', '1', '-i', join(OUTPUT_DIR, 'screenshot.png'),
    '-i', audioPath,
    '-t', String(duration + 1),
    '-vf', 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black',
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k', '-shortest',
    videoPath,
  ], { silent: true });
  
  const stats = existsSync(videoPath) ? { size: (readFileSync(videoPath).length / 1024 / 1024).toFixed(2) } : { size: 0 };
  
  console.log('✅ 视频生成完成');
  console.log(`   文件: ${videoPath}`);
  console.log(`   大小: ${stats.size} MB`);
  
  return { videoPath, duration, size: stats.size };
}

// ========== 步骤 5: 发送邮件 ==========
async function sendEmail(topic, deployedUrl, videoInfo) {
  console.log('\n📧 步骤 5: 发送邮件\n');
  
  // 生成快手发布文案
  const kuaishouTitle = topic.appName;
  const kuaishouDesc = `🎉 ${topic.question}

👉 点击链接参与投票
💬 分享你的观点  
🔥 看看大家的选择

${deployedUrl}

#投票 #互动 #${topic.appName}`;
  
  const kuaishouTags = ['投票', '互动', '热门', topic.appId];
  
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
msg['Subject'] = '🎬 ' + '''${topic.appName}''' + ' - 演示视频'

body = '''
🎉 新应用发布成功！

━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 应用信息
━━━━━━━━━━━━━━━━━━━━━━━━━━
名称: ${topic.appName}
链接: ${deployedUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 快手发布文案 (直接复制使用)
━━━━━━━━━━━━━━━━━━━━━━━━━━

【标题】
${kuaishouTitle}

【描述】
${kuaishouDesc}

【标签】
${kuaishouTags.join(' #')}

━━━━━━━━━━━━━━━━━━━━━━━━━━
📎 附件
━━━━━━━━━━━━━━━━━━━━━━━━━━
视频文件: ${topic.appId}-demo.mp4
时长: ${videoInfo.duration.toFixed(1)}秒
大小: ${videoInfo.size} MB

━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 发布步骤
━━━━━━━━━━━━━━━━━━━━━━━━━━
1. 下载附件视频
2. 打开快手 APP → 发布视频
3. 复制上方【描述】内容
4. 添加标签: ${kuaishouTags.join(' ')}
5. 挂载小程序: ${topic.appId}
6. 发布！

视频已就绪，请查收附件！
'''

msg.attach(MIMEText(body, 'plain', 'utf-8'))

# 附件
with open('${videoInfo.videoPath}', 'rb') as f:
    att = MIMEBase('application', 'octet-stream')
    att.set_payload(f.read())
encoders.encode_base64(att)
att.add_header('Content-Disposition', 'attachment; filename="${topic.appId}-demo.mp4"')
msg.attach(att)

subprocess.run(['/usr/sbin/sendmail', '-t'], input=msg.as_bytes())
print('邮件已发送')
`;
  
  writeFileSync(join(OUTPUT_DIR, 'send_email.py'), pythonScript);
  await runCommand('python3', [join(OUTPUT_DIR, 'send_email.py')], { silent: true });
  
  console.log('✅ 邮件发送成功');
  console.log(`   收件人: ${EMAIL_TO}`);
  console.log(`   包含: 视频文件 + 快手发布文案`);
  
  // 保存文案到文件
  const copyPath = join(OUTPUT_DIR, `${topic.appId}-kuaishou.txt`);
  writeFileSync(copyPath, `标题: ${kuaishouTitle}\n\n描述:\n${kuaishouDesc}\n\n标签: #${kuaishouTags.join(' #')}`);
  
  console.log(`   文案备份: ${copyPath}`);
}

// ========== 主流程 ==========
async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Topic to Email - 完整工作流');
  console.log('='.repeat(60));
  console.log(`时间: ${new Date().toLocaleString()}`);
  console.log(`品牌: ${PROFILE.name}`);
  console.log(`收件人: ${EMAIL_TO}`);
  console.log('='.repeat(60));
  
  const startTime = Date.now();
  
  try {
    // 步骤 1: 选题
    const topic = await selectTopic();
    
    // 步骤 2: 生成应用
    const appDir = await generateApp(topic);
    
    // 步骤 3: 部署
    const deployedUrl = await deployApp(appDir, topic);
    
    // 步骤 4: 生成视频
    const videoInfo = await generateVideo(topic, deployedUrl, appDir);
    
    // 步骤 5: 发送邮件
    await sendEmail(topic, deployedUrl, videoInfo);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ 工作流完成！');
    console.log('='.repeat(60));
    console.log(`总耗时: ${duration}秒`);
    console.log(`应用: ${topic.appName}`);
    console.log(`链接: ${deployedUrl}`);
    console.log(`视频: ${videoInfo.videoPath}`);
    console.log('');
    console.log('📧 请查收邮件获取视频和快手发布文案');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ 工作流失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
