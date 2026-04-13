/**
 * Configuration management for Harness
 */
import { mkdirSync, existsSync, readdirSync, copyFileSync, statSync } from 'fs';
import { join } from 'path';
import type { HarnessConfig, HarnessMode, ProfileConfig } from '../types/index.js';

const PROJECT_ROOT = process.env.PROJECT_DIR || join(process.cwd(), '..');

// 方案 A: 完全独立的运行时目录
const HARNESS_RUNTIME_DIR = join(PROJECT_ROOT, '.harness', '.local');

export const PATHS = {
  projectRoot: PROJECT_ROOT,
  harnessRuntimeDir: HARNESS_RUNTIME_DIR,
  config: join(PROJECT_ROOT, '.harness', 'config'),
  state: join(HARNESS_RUNTIME_DIR, 'state'),
  logs: join(HARNESS_RUNTIME_DIR, 'logs'),
  tasks: join(HARNESS_RUNTIME_DIR, 'tasks'),
  auth: join(HARNESS_RUNTIME_DIR, 'auth'),  // 直接使用 harness 自身的 auth 目录
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
 * 确保认证目录存在
 * Harness 直接使用 .harness/.local/auth 作为认证文件目录
 */
function setupAuthDir(): void {
  const harnessAuthDir = PATHS.auth;
  
  if (!existsSync(harnessAuthDir)) {
    mkdirSync(harnessAuthDir, { recursive: true });
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
  
  // 确保认证目录存在
  setupAuthDir();
}
