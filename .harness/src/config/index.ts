/**
 * Configuration management for Harness
 */
import { mkdirSync, existsSync, symlinkSync, readdirSync, copyFileSync } from 'fs';
import { join } from 'path';
import type { HarnessConfig, HarnessMode, ProfileConfig } from '../types/index.js';

const PROJECT_ROOT = process.env.PROJECT_DIR || join(process.cwd(), '..');

// 方案 A: 完全独立的运行时目录
const HARNESS_RUNTIME_DIR = join(PROJECT_ROOT, '.harness', '.local');
// 认证文件共享来源（legacy 系统）
const LEGACY_AUTH_DIR = join(PROJECT_ROOT, '.automation', '.local', 'auth');

export const PATHS = {
  projectRoot: PROJECT_ROOT,
  harnessRuntimeDir: HARNESS_RUNTIME_DIR,
  legacyAuthDir: LEGACY_AUTH_DIR,
  config: join(PROJECT_ROOT, '.harness', 'config'),
  state: join(HARNESS_RUNTIME_DIR, 'state'),
  logs: join(HARNESS_RUNTIME_DIR, 'logs'),
  tasks: join(HARNESS_RUNTIME_DIR, 'tasks'),
  auth: join(HARNESS_RUNTIME_DIR, 'auth'),  // 独立 auth 目录，通过软链接共享
} as const;

export function getHarnessMode(): HarnessMode {
  const mode = process.env.HARNESS_MODE as HarnessMode;
  if (mode && ['shadow', 'canary', 'production', 'legacy'].includes(mode)) {
    return mode;
  }
  return 'shadow'; // default to shadow for safety
}

export function loadHarnessConfig(): HarnessConfig {
  // Default config
  const defaultConfig: HarnessConfig = {
    mode: getHarnessMode(),
    shadowMode: {
      compareWithLegacy: true,
      logDifferences: true,
      alertThreshold: 0.8,
    },
    canaryProfiles: ['test-profile'],
  };

  return defaultConfig;
}

export function loadProfileConfig(profileId: string): ProfileConfig {
  // Built-in profile configs
  const profiles: Record<string, ProfileConfig> = {
    nanrenbao: {
      id: 'nanrenbao',
      name: '男人宝',
      preferredCategories: ['军事', '科技', '汽车', '体育', '历史', '游戏'],
      topicGuidelines: {
        doMore: ['军事装备对比', '科技数码评测', '汽车机械解析'],
        avoid: ['过度情感内容', '生活琐事'],
      },
      constraints: {
        categoryRotation: {
          sports: { maxPerWeek: 2, cooldownDays: 3 },
          military: { maxPerWeek: 2, cooldownDays: 3 },
        },
        forbiddenKeywords: ['最', '第一', '顶级', '史上最强'],
        budget: {
          maxCopilotCalls: 3,
          maxTokensPerRun: 100000,
        },
      },
    },
    womanai: {
      id: 'womanai',
      name: '女人爱',
      preferredCategories: ['美妆', '时尚', '明星', '情感', '生活方式'],
      topicGuidelines: {
        doMore: ['美妆护肤技巧', '时尚穿搭指南', '明星话题讨论'],
        avoid: ['过度商业化内容'],
      },
      constraints: {
        categoryRotation: {
          beauty: { maxPerWeek: 2, cooldownDays: 3 },
          fashion: { maxPerWeek: 2, cooldownDays: 3 },
        },
        forbiddenKeywords: ['最', '第一', '顶级'],
        budget: {
          maxCopilotCalls: 3,
          maxTokensPerRun: 100000,
        },
      },
    },
    'parent-tools': {
      id: 'parent-tools',
      name: '家长爱',
      preferredCategories: ['教育', '家庭生活', '实用工具', '亲子沟通'],
      topicGuidelines: {
        doMore: ['教育方法分享', '实用育儿工具', '家庭活动建议'],
        avoid: ['过度焦虑内容', '医疗建议'],
      },
      constraints: {
        categoryRotation: {
          education: { maxPerWeek: 2, cooldownDays: 3 },
        },
        forbiddenKeywords: ['最', '第一', '必须'],
        budget: {
          maxCopilotCalls: 3,
          maxTokensPerRun: 100000,
        },
      },
    },
    'elder-love': {
      id: 'elder-love',
      name: '爱老人',
      preferredCategories: ['健康养生', '怀旧回忆', '家庭生活', '实用生活'],
      topicGuidelines: {
        doMore: ['健康养生知识', '怀旧经典内容', '实用生活技巧'],
        avoid: ['医疗建议', '过度悲伤内容'],
      },
      constraints: {
        categoryRotation: {
          health: { maxPerWeek: 2, cooldownDays: 3 },
        },
        forbiddenKeywords: ['最', '第一', '包治'],
        budget: {
          maxCopilotCalls: 3,
          maxTokensPerRun: 100000,
        },
      },
    },
  };

  const profile = profiles[profileId];
  if (!profile) {
    throw new Error(`Unknown profile: ${profileId}`);
  }

  return profile;
}

/**
 * 设置认证文件共享
 * 方案 A: 软链接方式 - harness 独立运行时，共享 legacy 认证
 */
function setupAuthSymlink(): void {
  const harnessAuthDir = PATHS.auth;
  const legacyAuthDir = PATHS.legacyAuthDir;
  
  // 确保 harness auth 目录存在
  if (!existsSync(harnessAuthDir)) {
    mkdirSync(harnessAuthDir, { recursive: true });
  }
  
  // 如果 legacy auth 存在，创建软链接或复制文件
  if (existsSync(legacyAuthDir)) {
    try {
      const files = readdirSync(legacyAuthDir);
      for (const file of files) {
        const sourceFile = join(legacyAuthDir, file);
        const targetFile = join(harnessAuthDir, file);
        
        // 如果目标已存在，跳过
        if (existsSync(targetFile)) continue;
        
        // 尝试创建软链接（首选）
        try {
          symlinkSync(sourceFile, targetFile);
          console.log(`[Config] Linked auth file: ${file}`);
        } catch (e) {
          // 软链接失败则复制文件（Windows 可能需要管理员权限）
          copyFileSync(sourceFile, targetFile);
          console.log(`[Config] Copied auth file: ${file}`);
        }
      }
    } catch (e) {
      console.warn('[Config] Failed to setup auth sharing:', (e as Error).message);
    }
  }
}

export function ensureDirectories(): void {
  // 创建 harness 独立运行时目录
  const harnessDirs = [
    PATHS.harnessRuntimeDir,
    PATHS.state,
    PATHS.logs,
    PATHS.tasks,
    PATHS.auth,
  ];
  
  harnessDirs.forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });
  
  // 设置认证文件共享
  setupAuthSymlink();
}
