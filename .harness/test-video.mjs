/**
 * Test script for video recording functionality
 */

import { VideoRecorder, generateVoteAppVideoConfig } from './src/tools/video-recorder.ts';
import { VideoGeneratorService } from './src/services/video-generator.ts';
import { join } from 'path';
import { mkdirSync } from 'fs';

const TEST_APP = {
  appId: 'tank-systems-compare',
  appName: '坦克系统对比',
  appUrl: 'https://letmetryai.cn/tank-systems-compare/',
};

const OUTPUT_DIR = join(process.cwd(), '.local', 'videos');

async function testVideoRecorder() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🎬 Testing Video Recorder');
  console.log('═══════════════════════════════════════════════════════════════\n');

  mkdirSync(OUTPUT_DIR, { recursive: true });

  const outputPath = join(OUTPUT_DIR, `${TEST_APP.appId}-test.mp4`);
  
  console.log(`📱 App: ${TEST_APP.appName}`);
  console.log(`🔗 URL: ${TEST_APP.appUrl}`);
  console.log(`📁 Output: ${outputPath}\n`);

  const recorder = new VideoRecorder();
  
  const config = generateVoteAppVideoConfig(
    TEST_APP.appUrl,
    outputPath,
    TEST_APP.appName
  );

  console.log('⏳ Starting recording...\n');
  const startTime = Date.now();
  
  try {
    const result = await recorder.record(config);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ Recording Result');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${duration}s`);
    
    if (result.success) {
      console.log(`Video path: ${result.videoPath}`);
      console.log(`Video size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log(`Error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('\n❌ Recording failed:', error.message);
    throw error;
  }
}

async function testVideoGeneratorService() {
  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('🎬 Testing Video Generator Service');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const service = new VideoGeneratorService();
  
  console.log(`📱 App: ${TEST_APP.appName}`);
  console.log(`🔗 URL: ${TEST_APP.appUrl}`);
  console.log(`📁 Output dir: ${OUTPUT_DIR}\n`);

  console.log('⏳ Generating video...\n');
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
    console.log(`Duration: ${duration}s`);
    console.log(`Title: ${result.title}`);
    console.log(`Description: ${result.description.substring(0, 50)}...`);
    console.log(`Tags: ${result.tags.join(', ')}`);
    
    if (result.success) {
      console.log(`Video path: ${result.videoPath}`);
      console.log(`Video size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
    } else {
      console.log(`Error: ${result.error}`);
    }
    
    return result;
  } catch (error) {
    console.error('\n❌ Generation failed:', error.message);
    throw error;
  }
}

async function main() {
  console.log('\n🚀 Video Recording Test Suite\n');
  
  try {
    // Test 1: Direct recorder
    // await testVideoRecorder();
    
    // Test 2: Generator service
    await testVideoGeneratorService();
    
    console.log('\n\n✅ All tests completed!\n');
    process.exit(0);
  } catch (error) {
    console.error('\n\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
