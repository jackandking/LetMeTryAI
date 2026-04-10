import { generateAndDownload } from './src/services/minimax-image.ts';
import { join } from 'path';

const outputDir = join(process.cwd(), '.local', 'minimax-images');

async function main() {
  // 生成第三张
  console.log('生成选项3...');
  const result3 = await generateAndDownload({
    prompt: '军事主题图标设计，机动优先快速机动，机动性强突击与迂回能力好，现代扁平化风格，深色背景，专业简洁，高清细节，坦克履带速度线快速移动机动系统，深绿色和橙色配色',
    aspectRatio: '3:2',
    quality: 'standard',
  }, join(outputDir, 'option-3.jpg'));
  
  console.log('选项3:', result3.success ? '✅ 成功' : `❌ 失败 ${result3.error}`);
  
  // 生成封面
  console.log('生成封面...');
  const coverResult = await generateAndDownload({
    prompt: '军事投票主题封面，坦克系统对比，主战坦克三大系统投票，现代军事风格，渐变深色背景，专业大气，坦克元素，高清设计，适合竖屏展示',
    aspectRatio: '9:16',
    quality: 'hd',
  }, join(outputDir, 'cover.jpg'));
  
  console.log('封面:', coverResult.success ? '✅ 成功' : `❌ 失败 ${coverResult.error}`);
}

main();
