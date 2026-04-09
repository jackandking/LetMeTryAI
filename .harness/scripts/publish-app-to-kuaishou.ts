#!/usr/bin/env tsx
/**
 * Publish App to Kuaishou Workflow - 一键发布应用到快手
 * 
 * 完整流程: 视频生成 → 上传到快手
 * 
 * Usage:
 *   tsx publish-app-to-kuaishou.ts <app-id> [options]
 * 
 * Examples:
 *   tsx publish-app-to-kuaishou.ts tank-systems-compare
 *   tsx publish-app-to-kuaishou.ts rockets-king --name "火箭大战"
 *   tsx publish-app-to-kuaishou.ts my-app --dry-run
 */

import { generateAppDemoVideo } from '../src/services/video-generator.js';
import { VideoPublisher } from '../src/services/video-publisher.js';
import { join, resolve } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

interface PublishOptions {
  appId: string;
  appName?: string;
  appUrl?: string;
  tags?: string[];
  dryRun?: boolean;
  outputDir?: string;
  skipVideoGen?: boolean;
  videoPath?: string;
}

interface PublishReport {
  success: boolean;
  appId: string;
  appName: string;
  timestamp: string;
  duration: number;
  steps: {
    videoGeneration?: {
      success: boolean;
      videoPath?: string;
      duration?: number;
      error?: string;
    };
    videoPublish?: {
      success: boolean;
      videoId?: string;
      shareUrl?: string;
      error?: string;
    };
  };
  summary: string;
}

function parseArgs(): PublishOptions {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0].startsWith('-')) {
    console.error('❌ Error: AppID is required\n');
    showHelp();
    process.exit(1);
  }
  
  const appId = args[0];
  const options: Partial<PublishOptions> = { appId };
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--name':
      case '-n':
        options.appName = nextArg;
        i++;
        break;
      case '--url':
      case '-u':
        options.appUrl = nextArg;
        i++;
        break;
      case '--tags':
        options.tags = nextArg?.split(',').map(t => t.trim()).filter(Boolean);
        i++;
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--output':
      case '-o':
        options.outputDir = nextArg;
        i++;
        break;
      case '--skip-video-gen':
        options.skipVideoGen = true;
        break;
      case '--video':
      case '-v':
        options.videoPath = nextArg;
        options.skipVideoGen = true;
        i++;
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  return options as PublishOptions;
}

function showHelp() {
  console.log(`
Publish App to Kuaishou - 一键发布应用到快手

Usage:
  tsx publish-app-to-kuaishou.ts <app-id> [options]

Required:
  <app-id>                应用 ID (如: tank-systems-compare)

Optional:
  -n, --name <name>       应用名称 (默认使用 app-id)
  -u, --url <url>         应用 URL (默认: https://letmetryai.cn/<app-id>/)
      --tags <tags>       话题标签 (逗号分隔, 默认: 投票,互动,热门)
      --dry-run           预览模式 (不实际发布)
  -o, --output <dir>      视频输出目录 (默认: .harness/output/videos/<app-id>)
      --skip-video-gen    跳过视频生成 (使用已有视频)
  -v, --video <path>      使用指定视频文件 (自动启用 --skip-video-gen)
  -h, --help              显示帮助

Examples:
  # 基础用法
  tsx publish-app-to-kuaishou.ts tank-systems-compare

  # 自定义名称和标签
  tsx publish-app-to-kuaishou.ts rockets-king -n "火箭大战" --tags "火箭,太空,投票"

  # 预览模式 (查看会做什么但不执行)
  tsx publish-app-to-kuaishou.ts my-app --dry-run

  # 使用已有视频
  tsx publish-app-to-kuaishou.ts my-app -v ./existing-video.mp4

Workflow:
  1. 生成应用演示视频 (录屏+配音)
  2. 上传视频到快手
  3. 返回发布报告 (视频ID/分享链接)

Requirements:
  - 快手登录 session (.runtime/kuaishou_auth.json)
  - Node.js dependencies installed
`);
}

function generateReport(options: PublishOptions, startTime: number, steps: PublishReport['steps']): PublishReport {
  const duration = Date.now() - startTime;
  const videoGenSuccess = steps.videoGeneration?.success ?? true; // Skip = true
  const publishSuccess = steps.videoPublish?.success ?? false;
  const allSuccess = videoGenSuccess && publishSuccess;
  
  return {
    success: allSuccess,
    appId: options.appId,
    appName: options.appName || options.appId,
    timestamp: new Date().toISOString(),
    duration,
    steps,
    summary: allSuccess 
      ? `✅ 发布成功! 视频ID: ${steps.videoPublish?.videoId}`
      : `❌ 发布失败: ${steps.videoGeneration?.error || steps.videoPublish?.error}`,
  };
}

function printReport(report: PublishReport) {
  console.log('\n' + '='.repeat(60));
  console.log('📊 发布报告');
  console.log('='.repeat(60));
  console.log(`应用ID: ${report.appId}`);
  console.log(`应用名: ${report.appName}`);
  console.log(`时间: ${new Date(report.timestamp).toLocaleString()}`);
  console.log(`耗时: ${(report.duration / 1000).toFixed(1)}s`);
  console.log('');
  
  if (report.steps.videoGeneration) {
    const vg = report.steps.videoGeneration;
    console.log('🎬 视频生成:');
    console.log(`   状态: ${vg.success ? '✅ 成功' : '❌ 失败'}`);
    if (vg.videoPath) console.log(`   路径: ${vg.videoPath}`);
    if (vg.duration) console.log(`   时长: ${vg.duration.toFixed(1)}s`);
    if (vg.error) console.log(`   错误: ${vg.error}`);
    console.log('');
  }
  
  if (report.steps.videoPublish) {
    const vp = report.steps.videoPublish;
    console.log('📤 视频发布:');
    console.log(`   状态: ${vp.success ? '✅ 成功' : '❌ 失败'}`);
    if (vp.videoId) console.log(`   视频ID: ${vp.videoId}`);
    if (vp.shareUrl) console.log(`   分享链接: ${vp.shareUrl}`);
    if (vp.error) console.log(`   错误: ${vp.error}`);
    console.log('');
  }
  
  console.log('📋 总结:');
  console.log(`   ${report.summary}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const startTime = Date.now();
  const options = parseArgs();
  
  // Set defaults
  const appName = options.appName || options.appId;
  const appUrl = options.appUrl || `https://letmetryai.cn/${options.appId}/`;
  const outputDir = options.outputDir || join('.harness/output/videos', options.appId);
  const tags = options.tags || ['投票', '互动', '热门'];
  
  console.log('\n🚀 开始一键发布到快手\n');
  console.log('配置信息:');
  console.log(`  应用ID: ${options.appId}`);
  console.log(`  应用名: ${appName}`);
  console.log(`  应用URL: ${appUrl}`);
  console.log(`  标签: ${tags.join(', ')}`);
  if (options.dryRun) console.log('  ⚠️  预览模式 (dry-run)');
  if (options.skipVideoGen) console.log('  ⚠️  跳过视频生成');
  console.log('');
  
  if (options.dryRun) {
    console.log('📋 预览模式 - 将要执行的操作:');
    console.log('  1. 生成演示视频');
    console.log(`     输出目录: ${resolve(outputDir)}`);
    console.log('  2. 发布到快手');
    console.log(`     标题: ${appName}`);
    console.log(`     标签: ${tags.join(', ')}`);
    console.log('\n✅ 预览完成 (无实际操作)');
    process.exit(0);
  }
  
  const steps: PublishReport['steps'] = {};
  
  // Step 1: Video Generation
  let videoPath = options.videoPath;
  
  if (!options.skipVideoGen) {
    console.log('🎬 Step 1: 生成演示视频...\n');
    
    try {
      const videoResult = await generateAppDemoVideo(
        options.appId,
        appName,
        appUrl,
        outputDir
      );
      
      steps.videoGeneration = {
        success: videoResult.success,
        videoPath: videoResult.videoPath,
        duration: videoResult.duration,
        error: videoResult.error,
      };
      
      if (!videoResult.success || !videoResult.videoPath) {
        console.error('❌ 视频生成失败:', videoResult.error);
        const report = generateReport(options, startTime, steps);
        printReport(report);
        process.exit(1);
      }
      
      videoPath = videoResult.videoPath;
      console.log('✅ 视频生成完成');
      console.log(`   路径: ${videoPath}`);
      console.log(`   大小: ${(videoResult.size / 1024 / 1024).toFixed(2)}MB`);
      console.log('');
      
    } catch (error) {
      console.error('❌ 视频生成出错:', error);
      steps.videoGeneration = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
      const report = generateReport(options, startTime, steps);
      printReport(report);
      process.exit(1);
    }
  } else {
    console.log('⏩ Step 1: 跳过视频生成\n');
    if (videoPath) {
      console.log(`   使用指定视频: ${videoPath}`);
    } else {
      console.error('❌ 错误: 跳过视频生成时需要提供 --video 参数');
      process.exit(1);
    }
  }
  
  // Verify video exists
  if (!existsSync(videoPath!)) {
    console.error(`❌ 错误: 视频文件不存在: ${videoPath}`);
    process.exit(1);
  }
  
  // Step 2: Publish to Kuaishou
  console.log('📤 Step 2: 发布到快手...\n');
  
  try {
    const publisher = new VideoPublisher();
    const publishResult = await publisher.publish({
      videoPath: videoPath!,
      title: appName,
      description: `🎉 ${appName}\n\n👉 点击链接参与投票\n🔥 看看大家的选择\n\n#${tags.join(' #')}`,
      tags,
    });
    
    steps.videoPublish = {
      success: publishResult.success,
      videoId: publishResult.videoId,
      shareUrl: publishResult.shareUrl,
      error: publishResult.error || undefined,
    };
    
    if (!publishResult.success) {
      console.error('❌ 发布失败:', publishResult.error);
      const report = generateReport(options, startTime, steps);
      printReport(report);
      process.exit(1);
    }
    
    console.log('✅ 发布成功!');
    console.log(`   视频ID: ${publishResult.videoId}`);
    console.log(`   分享链接: ${publishResult.shareUrl || 'N/A'}`);
    console.log('');
    
  } catch (error) {
    console.error('❌ 发布出错:', error);
    steps.videoPublish = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    const report = generateReport(options, startTime, steps);
    printReport(report);
    process.exit(1);
  }
  
  // Generate and print report
  const report = generateReport(options, startTime, steps);
  printReport(report);
  
  // Save report to file
  const reportDir = join('.harness/.local/reports');
  mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `${options.appId}-${Date.now()}.json`);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`📄 报告已保存: ${reportPath}\n`);
  
  process.exit(report.success ? 0 : 1);
}

main();
