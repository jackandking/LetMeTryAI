import { generateAndDownload } from './src/services/minimax-image.ts';
import { join } from 'path';

const outputDir = join(process.cwd(), '.local', 'minimax-images');

async function main() {
  const result = await generateAndDownload({
    prompt: '军事车辆速度性能图标，履带式车辆快速行驶，流线型设计，深蓝色科技感背景，现代科技风格，简洁扁平化设计，高清矢量风格',
    aspectRatio: '3:2',
    quality: 'standard',
  }, join(outputDir, 'option-3.jpg'));
  
  console.log(result.success ? '✅ 成功' : '❌ ' + result.error);
}

main();
