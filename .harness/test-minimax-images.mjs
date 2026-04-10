/**
 * Test MiniMax image generation for tank app
 */

import { generateVoteOptionImages, generateCoverImage } from './src/services/minimax-image.ts';
import { join } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';

const OUTPUT_DIR = join(process.cwd(), '.local', 'minimax-images');
const APP_NAME = '坦克系统对比';

const OPTIONS = [
  { label: '火力优先（强打击）', caption: '火力强，摧毁目标能力突出' },
  { label: '装甲优先（防护强）', caption: '装甲与生存能力高' },
  { label: '机动优先（快速机动）', caption: '机动性强，突击与迂回能力好' },
];

async function main() {
  console.log('\n🎨 MiniMax 图片生成测试\n');
  console.log(`应用: ${APP_NAME}`);
  console.log(`输出: ${OUTPUT_DIR}\n`);
  
  mkdirSync(OUTPUT_DIR, { recursive: true });
  
  // 生成选项图片
  console.log('⏳ 生成选项图片...\n');
  const results = await generateVoteOptionImages(APP_NAME, OPTIONS, OUTPUT_DIR);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('✅ 生成结果');
  console.log('═══════════════════════════════════════════════════════════════');
  
  results.forEach((result, i) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} 选项 ${i + 1}: ${result.label}`);
    if (existsSync(result.path)) {
      const stats = statSync(result.path);
      console.log(`   文件: ${result.path}`);
      console.log(`   大小: ${(stats.size / 1024).toFixed(0)} KB`);
    }
  });
  
  // 生成封面
  console.log('\n⏳ 生成封面图片...');
  const coverPath = join(OUTPUT_DIR, 'cover.jpg');
  const coverResult = await generateCoverImage(
    APP_NAME,
    '主战坦克三大系统投票',
    coverPath
  );
  
  if (coverResult.success && existsSync(coverPath)) {
    const stats = statSync(coverPath);
    console.log(`✅ 封面生成完成`);
    console.log(`   文件: ${coverPath}`);
    console.log(`   大小: ${(stats.size / 1024).toFixed(0)} KB`);
  } else {
    console.log(`❌ 封面生成失败: ${coverResult.error}`);
  }
  
  console.log('\n✅ 全部完成！\n');
}

main().catch(err => {
  console.error('❌ 错误:', err.message);
  process.exit(1);
});
