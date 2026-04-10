/**
 * Quick test for video recording functionality
 * 简化版本，缩短录制时间
 */

import { VideoRecorder } from './src/tools/video-recorder.ts';
import { join } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';

const TEST_APP = {
  appId: 'tank-systems-compare',
  appName: '坦克系统对比',
  appUrl: 'https://letmetryai.cn/tank-systems-compare/',
};

const OUTPUT_DIR = join(process.cwd(), '.local', 'videos');

async function testQuickRecording() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 Quick Video Recording Test (10 seconds)');
  console.log('═══════════════════════════════════════════════════════════════\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = join(OUTPUT_DIR, `${TEST_APP.appId}-quick.mp4`);
  
  console.log(`📱 App: ${TEST_APP.appName}`);
  console.log(`🔗 URL: ${TEST_APP.appUrl}`);
  console.log(`📁 Output: ${outputPath}\n`);

  const recorder = new VideoRecorder();
  
  const config = {
    appUrl: TEST_APP.appUrl,
    outputPath: outputPath,
    mobile: true,
    quality: 'low', // 低质量快速录制
    duration: 3000, // 只录制 3 秒演示
    steps: [
      { type: 'wait', delay: 2000, description: '展示首页' },
      { type: 'scroll', delay: 500, description: '滚动查看选项' },
      { type: 'vote', optionIndex: 0, delay: 1000, description: '点击投票' },
      { type: 'wait', delay: 2000, description: '展示结果' },
    ],
  };

  console.log('⏳ Starting recording (this will take ~15 seconds)...\n');
  const startTime = Date.now();
  
  try {
    const result = await recorder.record(config);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Recording Result');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Success: ${result.success}`);
    console.log(`Recording duration: ${duration}s`);
    
    if (result.success) {
      console.log(`Video path: ${result.videoPath}`);
      console.log(`Video size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
      
      // 验证文件
      if (existsSync(result.videoPath)) {
        const stats = statSync(result.videoPath);
        console.log(`File verified: ${stats.size} bytes`);
        
        // 列出所有生成的视频文件
        console.log('\n📂 Generated video files:');
        const { execSync } = await import('child_process');
        const files = execSync(`ls -lh "${OUTPUT_DIR}"`).toString();
        console.log(files);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('\n❌ Recording failed:', error.message);
    console.error(error.stack);
    throw error;
  }
}

async function main() {
  console.log('\n🚀 Quick Video Test\n');
  
  try {
    const result = await testQuickRecording();
    
    if (result.success) {
      console.log('\n\n✅ Video recording test PASSED!\n');
      process.exit(0);
    } else {
      console.log('\n\n❌ Video recording test FAILED!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n\n❌ Test error:', error);
    process.exit(1);
  }
}

main();
