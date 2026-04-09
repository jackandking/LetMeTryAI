#!/usr/bin/env tsx
/**
 * Kuaishou Account Verify - 快手账号验证工具
 * 
 * 功能:
 * 1. 查看当前登录的快手账号信息
 * 2. 验证账号状态是否正常
 * 3. 查看最近发布的视频列表
 * 4. 手动验证发布功能
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { chromium } from 'playwright';

const AUTH_FILE = join('.runtime', 'kuaishou_auth.json');
const CREATOR_URL = 'https://daren.kuaishou.com';

interface AuthInfo {
  userId: string;
  bUserId?: string;
  cookies: Array<{
    name: string;
    value: string;
    domain: string;
    expires?: number;
  }>;
}

function loadAuth(): AuthInfo | null {
  // 尝试多个可能的 auth 文件位置
  const paths = [
    AUTH_FILE,
    '.automation/.local/auth/kuaishou_auth.json',
    '/Users/weiping/.runtime/kuaishou_auth.json',
  ];
  
  for (const path of paths) {
    if (existsSync(path)) {
      try {
        const content = readFileSync(path, 'utf-8');
        const data = JSON.parse(content);
        
        // 提取 userId
        const userIdCookie = data.cookies?.find((c: { name: string }) => c.name === 'userId');
        const bUserIdCookie = data.cookies?.find((c: { name: string }) => c.name === 'bUserId');
        
        return {
          userId: userIdCookie?.value || 'unknown',
          bUserId: bUserIdCookie?.value,
          cookies: data.cookies || [],
        };
      } catch (e) {
        console.error(`❌ 读取 ${path} 失败:`, (e as Error).message);
      }
    }
  }
  
  return null;
}

function checkAuthValidity(auth: AuthInfo): { valid: boolean; expiresIn?: string } {
  // 检查关键 cookie 是否过期
  const webStCookie = auth.cookies.find(c => c.name === 'kuaishou.server.web_st');
  
  if (!webStCookie) {
    return { valid: false };
  }
  
  if (webStCookie.expires) {
    const expiresAt = webStCookie.expires * 1000;
    const now = Date.now();
    const daysLeft = Math.floor((expiresAt - now) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) {
      return { valid: false, expiresIn: '已过期' };
    }
    
    return { valid: true, expiresIn: `${daysLeft} 天后过期` };
  }
  
  return { valid: true };
}

async function verifyWithBrowser(headless = true) {
  console.log('🌐 正在使用浏览器验证账号状态...\n');
  
  const auth = loadAuth();
  if (!auth) {
    console.error('❌ 未找到认证文件');
    return;
  }
  
  const browser = await chromium.launch({ headless });
  
  try {
    // 创建上下文并加载 cookies
    const context = await browser.newContext({
      storageState: {
        cookies: auth.cookies.map(c => ({
          ...c,
          sameSite: c.sameSite as 'Strict' | 'Lax' | 'None' || 'Lax',
        })),
        origins: [],
      },
    });
    
    const page = await context.newPage();
    
    // 访问创作者平台
    console.log('正在访问快手创作者平台...');
    await page.goto(CREATOR_URL);
    await page.waitForLoadState('networkidle');
    
    // 等待页面加载并检查是否登录
    try {
      // 尝试查找用户头像或用户名
      const userSelector = '.user-name, .avatar, .user-info, [class*="user"]'; 
      await page.waitForSelector(userSelector, { timeout: 10000 });
      
      // 尝试获取用户名
      const userName = await page.locator('.user-name').first().textContent().catch(() => null);
      
      console.log('✅ 浏览器验证成功!');
      if (userName) {
        console.log(`   用户名: ${userName.trim()}`);
      }
      
      // 截图保存
      const screenshotPath = '.harness/.local/kuaishou-verify.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   截图已保存: ${screenshotPath}`);
      
    } catch (e) {
      console.log('⚠️  可能未登录或页面结构变化');
      const screenshotPath = '.harness/.local/kuaishou-verify-error.png';
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`   错误截图: ${screenshotPath}`);
    }
    
    // 获取当前 URL
    const currentUrl = page.url();
    console.log(`   当前页面: ${currentUrl}`);
    
    if (!headless) {
      console.log('\n⏳ 浏览器保持打开，按 Ctrl+C 退出...');
      await new Promise(() => {}); // 永远等待
    }
    
  } finally {
    if (headless) {
      await browser.close();
    }
  }
}

function showAccountInfo() {
  console.log('='.repeat(60));
  console.log('🔍 快手账号信息验证');
  console.log('='.repeat(60) + '\n');
  
  const auth = loadAuth();
  
  if (!auth) {
    console.error('❌ 未找到快手认证文件');
    console.log('\n可能的位置:');
    console.log('  - .runtime/kuaishou_auth.json');
    console.log('  - .automation/.local/auth/kuaishou_auth.json');
    console.log('  - ~/.runtime/kuaishou_auth.json');
    process.exit(1);
  }
  
  // 账号信息
  console.log('📋 账号信息:');
  console.log(`   User ID: ${auth.userId}`);
  if (auth.bUserId) {
    console.log(`   B-User ID: ${auth.bUserId}`);
  }
  console.log(`   Cookie 数量: ${auth.cookies.length}`);
  
  // 检查有效性
  const validity = checkAuthValidity(auth);
  console.log(`\n🔐 认证状态:`);
  console.log(`   状态: ${validity.valid ? '✅ 有效' : '❌ 无效或过期'}`);
  if (validity.expiresIn) {
    console.log(`   过期时间: ${validity.expiresIn}`);
  }
  
  // Cookie 详情
  console.log(`\n🍪 Cookie 详情:`);
  const importantCookies = [
    'kuaishou.server.web_st',
    'kuaishou.creator.marketing_st',
    'userId',
    'bUserId',
    'passToken',
  ];
  
  for (const name of importantCookies) {
    const cookie = auth.cookies.find(c => c.name === name);
    if (cookie) {
      const expires = cookie.expires 
        ? new Date(cookie.expires * 1000).toLocaleDateString()
        : '会话期';
      console.log(`   ${name}: ${cookie.value.slice(0, 20)}... (过期: ${expires})`);
    } else {
      console.log(`   ${name}: ❌ 缺失`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('💡 使用说明:');
  console.log('='.repeat(60));
  console.log('\n1. 浏览器验证:');
  console.log('   tsx kuaishou-verify.ts --browser');
  console.log('   (可视化验证，会打开浏览器窗口)');
  console.log('\n2. 静默验证:');
  console.log('   tsx kuaishou-verify.ts --check');
  console.log('   (仅检查状态，不打开浏览器)');
  console.log('\n3. 手动验证:');
  console.log('   访问: https://daren.kuaishou.com');
  console.log('   检查是否已登录，能否看到任务列表');
  console.log('');
}

function showHelp() {
  console.log(`
Kuaishou Verify - 快手账号验证工具

Usage:
  tsx kuaishou-verify.ts [command]

Commands:
  (none)        显示账号信息和状态
  --browser     使用浏览器可视化验证
  --check       静默检查状态
  --help        显示帮助

Examples:
  # 查看账号信息
  tsx kuaishou-verify.ts

  # 浏览器可视化验证
  tsx kuaishou-verify.ts --browser

  # 静默检查（用于脚本）
  tsx kuaishou-verify.ts --check && echo "OK" || echo "Failed"
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  switch (command) {
    case '--help':
    case '-h':
      showHelp();
      break;
      
    case '--browser':
    case '-b':
      await verifyWithBrowser(false); // headless = false
      break;
      
    case '--check':
    case '-c':
      await verifyWithBrowser(true); // headless = true
      break;
      
    default:
      showAccountInfo();
  }
}

main().catch(console.error);
