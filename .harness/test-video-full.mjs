/**
 * Full video workflow test
 * 测试完整的视频生成 + 元数据功能
 */

import { VideoGeneratorService } from './src/services/video-generator.ts';
import { VideoRecorder } from './src/tools/video-recorder.ts';
import { join } from 'path';
import { mkdirSync, existsSync, statSync, readdirSync } from 'fs';

const TEST_APP = {
  appId: 'tank-systems-compare',
  appName: '坦克系统对比',
  appUrl: 'https://letmetryai.cn/tank-systems-compare/',
};

const OUTPUT_DIR = join(process.cwd(), '.local', 'videos-final');

async function testDirectRecorder() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 Test 1: Direct VideoRecorder');
  console.log('═══════════════════════════════════════════════════════════════\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = join(OUTPUT_DIR, 'test-video.mp4');
  const recorder = new VideoRecorder();
  
  const result = await recorder.record({
    appUrl: TEST_APP.appUrl,
    outputPath: outputPath,
    mobile: true,
    quality: 'low',
    duration: 2000, // 只录制2秒
    steps: [
      { type: 'wait', delay: 1500, description: '展示首页' },
      { type: 'vote', optionIndex: 0, delay: 1000, description: '点击投票' },
    ],
  });

  console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  if (result.success) {
    console.log(`Video: ${result.videoPath}`);
    console.log(`Size: ${(result.size / 1024).toFixed(0)} KB`);
  } else {
    console.log(`Error: ${result.error}`);
  }
  
  return result.success;
}

async function testGeneratorService() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🎬 Test 2: VideoGeneratorService');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const service = new VideoGeneratorService();
  
  // 修改默认步骤，缩短录制时间
  const result = await service.generate({
    appId: TEST_APP.appId,
    appName: TEST_APP.appName,
    appUrl: TEST_APP.appUrl,
    outputDir: OUTPUT_DIR,
    title: '【测试】' + TEST_APP.appName,
    tags: ['测试', '投票', '录屏'],
  });

  console.log(`Result: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
  console.log(`\n📹 Video Info:`);
  console.log(`  Path: ${result.videoPath || 'N/A'}`);
  console.log(`  Size: ${result.size ? (result.size / 1024).toFixed(0) + ' KB' : 'N/A'}`);
  
  console.log(`\n📝 Metadata:`);
  console.log(`  Title: ${result.title}`);
  console.log(`  Description: ${result.description.substring(0, 50)}...`);
  console.log(`  Tags: ${result.tags.join(', ')}`);
  
  return result.success;
}

async function listOutputFiles() {
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📂 Output Files');
  console.log('═══════════════════════════════════════════════════════════════\n');
  
  const files = readdirSync(OUTPUT_DIR);
  console.log(`Directory: ${OUTPUT_DIR}`);
  console.log(`Files: ${files.length}\n`);
  
  files.forEach(f => {
    const s = statSync(join(OUTPUT_DIR, f));
    console.log(`  ${f.padEnd(50)} ${(s.size / 1024).toFixed(0).padStart(6)} KB`);
  });
}

async function main() {
  console.log('\n🚀 Full Video Workflow Test\n');
  
  const results = {
    directRecorder: false,
    generatorService: false,
  };
  
  try {
    results.directRecorder = await testDirectRecorder();
  } catch (error) {
    console.error('Direct recorder test failed:', error.message);
  }
  
  try {
    results.generatorService = await testGeneratorService();
  } catch (error) {
    console.error('Generator service test failed:', error.message);
  }
  
  await listOutputFiles();
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 Test Summary');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(`Direct VideoRecorder:    ${results.directRecorder ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`VideoGeneratorService:   ${results.generatorService ? '✅ PASS' : '❌ FAIL'}`);
  
  const allPassed = results.directRecorder && results.generatorService;
  console.log(`\nOverall: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  console.log('');
  
  process.exit(allPassed ? 0 : 1);
}

main();
