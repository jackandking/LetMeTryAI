/**
 * Test Video Generator Service (full workflow)
 */

import { VideoGeneratorService } from './src/services/video-generator.ts';
import { join } from 'path';
import { mkdirSync, existsSync, statSync, readdirSync } from 'fs';

const TEST_APP = {
  appId: 'tank-systems-compare',
  appName: '坦克系统对比',
  appUrl: 'https://letmetryai.cn/tank-systems-compare/',
};

const OUTPUT_DIR = join(process.cwd(), '.local', 'videos-test');

async function testVideoGeneratorService() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 Testing Video Generator Service');
  console.log('═══════════════════════════════════════════════════════════════\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log(`📱 App: ${TEST_APP.appName}`);
  console.log(`🔗 URL: ${TEST_APP.appUrl}`);
  console.log(`📁 Output: ${OUTPUT_DIR}\n`);

  const service = new VideoGeneratorService();
  
  console.log('⏳ Generating video with metadata...\n');
  const startTime = Date.now();
  
  try {
    const result = await service.generate({
      appId: TEST_APP.appId,
      appName: TEST_APP.appName,
      appUrl: TEST_APP.appUrl,
      outputDir: OUTPUT_DIR,
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Generation Result');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Success: ${result.success}`);
    console.log(`Processing time: ${duration}s`);
    
    if (result.success) {
      console.log(`\n📹 Video Info:`);
      console.log(`  Path: ${result.videoPath}`);
      console.log(`  Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Duration: ${result.duration}ms`);
      
      console.log(`\n📝 Metadata:`);
      console.log(`  Title: ${result.title}`);
      console.log(`  Description: ${result.description.substring(0, 60)}...`);
      console.log(`  Tags: ${result.tags.join(', ')}`);
      
      // 验证文件存在
      if (result.videoPath && existsSync(result.videoPath)) {
        const stats = statSync(result.videoPath);
        console.log(`\n✅ File verified: ${(stats.size / 1024).toFixed(0)} KB`);
      }
      
      // 列出输出目录中的所有文件
      console.log(`\n📂 Output directory contents:`);
      const files = readdirSync(OUTPUT_DIR);
      files.forEach(f => {
        const s = statSync(join(OUTPUT_DIR, f));
        console.log(`  - ${f} (${(s.size / 1024).toFixed(0)} KB)`);
      });
      
      return result;
    } else {
      console.log(`\n❌ Generation failed:`);
      console.log(`  Error: ${result.error}`);
      throw new Error(result.error);
    }
  } catch (error) {
    console.error('\n❌ Service test failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n🚀 Video Generator Service Test\n');
  
  try {
    const result = await testVideoGeneratorService();
    
    console.log('\n\n✅ Video Generator Service test PASSED!');
    console.log('\nNext steps:');
    console.log('  1. Video file is ready at:', result.videoPath);
    console.log('  2. Can be published to Kuaishou using video.publish tool');
    console.log('  3. Title:', result.title);
    console.log('');
    
    process.exit(0);
  } catch (error) {
    console.error('\n\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
