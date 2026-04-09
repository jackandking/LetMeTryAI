#!/usr/bin/env tsx
/**
 * Video Publish CLI - 视频发布到快手
 * 
 * Usage:
 *   tsx video-publish.ts --video <path> --title <title> [options]
 * 
 * Examples:
 *   tsx video-publish.ts --video ./demo.mp4 --title "坦克大战"
 *   tsx video-publish.ts --video ./demo.mp4 --title "投票活动" --tags "投票,互动,游戏" --app-id tank-battle
 */

import { VideoPublisher } from '../src/services/video-publisher.js';
import { resolve } from 'path';
import { existsSync } from 'fs';

interface PublishOptions {
  video: string;
  title: string;
  description?: string;
  tags?: string[];
  appId?: string;
  cover?: string;
  visibility?: 'public' | 'private';
}

function parseArgs(): PublishOptions {
  const args = process.argv.slice(2);
  const options: Partial<PublishOptions> = {};
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];
    
    switch (arg) {
      case '--video':
      case '-v':
        options.video = nextArg;
        i++;
        break;
      case '--title':
      case '-t':
        options.title = nextArg;
        i++;
        break;
      case '--description':
      case '-d':
        options.description = nextArg;
        i++;
        break;
      case '--tags':
        // Support comma-separated tags: --tags "tag1,tag2,tag3"
        options.tags = nextArg?.split(',').map(t => t.trim()).filter(Boolean);
        i++;
        break;
      case '--app-id':
      case '-a':
        options.appId = nextArg;
        i++;
        break;
      case '--cover':
      case '-c':
        options.cover = nextArg;
        i++;
        break;
      case '--private':
        options.visibility = 'private';
        break;
      case '--help':
      case '-h':
        showHelp();
        process.exit(0);
        break;
    }
  }
  
  // Validate required options
  if (!options.video || !options.title) {
    console.error('❌ Error: --video and --title are required\n');
    showHelp();
    process.exit(1);
  }
  
  return options as PublishOptions;
}

function showHelp() {
  console.log(`
Video Publish CLI - 发布视频到快手

Usage:
  tsx video-publish.ts --video <path> --title <title> [options]

Required:
  -v, --video <path>      视频文件路径
  -t, --title <title>     视频标题 (2-30字符)

Optional:
  -d, --description <text>  视频描述
      --tags <tags>         话题标签 (逗号分隔, 如: "投票,互动,游戏")
  -a, --app-id <id>         挂载的小程序 AppID
  -c, --cover <path>        封面图片路径
      --private             设为私密发布
  -h, --help                显示帮助

Examples:
  tsx video-publish.ts -v ./demo.mp4 -t "坦克大战"
  tsx video-publish.ts --video ./demo.mp4 --title "投票活动" --tags "投票,互动" --app-id tank-battle
  tsx video-publish.ts -v ./demo.mp4 -t "游戏推荐" -d "快来试试" --private

Notes:
  - 需要快手登录 session (.runtime/kuaishou_auth.json)
  - 视频格式: MP4, 竖屏 9:16 最佳
`);
}

async function main() {
  const options = parseArgs();
  
  // Resolve video path
  const videoPath = resolve(options.video);
  
  // Check video exists
  if (!existsSync(videoPath)) {
    console.error(`❌ Error: Video file not found: ${videoPath}`);
    process.exit(1);
  }
  
  // Check cover if provided
  let coverPath: string | undefined;
  if (options.cover) {
    coverPath = resolve(options.cover);
    if (!existsSync(coverPath)) {
      console.error(`❌ Error: Cover image not found: ${coverPath}`);
      process.exit(1);
    }
  }
  
  // Default description with app link if appId provided
  let description = options.description || options.title;
  if (options.appId && !options.description) {
    description = `${options.title}\n\n👉 点击链接参与投票\n🔥 看看大家的选择\n\n#投票 #互动`;
  }
  
  console.log('🎬 开始发布视频到快手...\n');
  console.log(`  视频: ${videoPath}`);
  console.log(`  标题: ${options.title}`);
  console.log(`  描述: ${description.slice(0, 50)}${description.length > 50 ? '...' : ''}`);
  if (options.tags?.length) {
    console.log(`  标签: ${options.tags.join(', ')}`);
  }
  if (options.appId) {
    console.log(`  挂载小程序: ${options.appId}`);
  }
  if (coverPath) {
    console.log(`  封面: ${coverPath}`);
  }
  console.log(`  可见性: ${options.visibility === 'private' ? '私密' : '公开'}\n`);
  
  const publisher = new VideoPublisher();
  
  try {
    const result = await publisher.publish({
      videoPath,
      title: options.title,
      description,
      tags: options.tags,
      coverPath,
      visibility: options.visibility,
    });
    
    if (result.success) {
      console.log('\n✅ 视频发布成功!');
      console.log(`   视频ID: ${result.videoId}`);
      console.log(`   分享链接: ${result.shareUrl || 'N/A'}`);
      process.exit(0);
    } else {
      console.error('\n❌ 发布失败:');
      console.error(`   ${result.error}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ 发生错误:');
    console.error(`   ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

main();
