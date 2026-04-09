/**
 * Scaffold Validation - Ensures generated apps have complete functionality
 */
import { logger } from '../utils/logger.js';

export interface ValidationRule {
  name: string;
  pattern: RegExp;
  critical: boolean;
  description: string;
}

// Core functionality that must be present in every voting app
export const CORE_VALIDATION_RULES: ValidationRule[] = [
  {
    name: 'data_read',
    pattern: /getConfig\s*\(/,
    critical: true,
    description: '数据读取功能 (getConfig) - 用于从后端获取投票数据',
  },
  {
    name: 'data_write',
    pattern: /updateConfig\s*\(/,
    critical: true,
    description: '数据写入功能 (updateConfig) - 用于保存投票结果',
  },
  {
    name: 'ad_integration',
    pattern: /ks\.navigateTo|showAd\s*\(/,
    critical: true,
    description: '广告集成功能 - 快手激励视频广告',
  },
  {
    name: 'result_display',
    pattern: /displayResults|showResult|createBarChart/,
    critical: true,
    description: '结果展示功能 - 包括柱状图和统计',
  },
  {
    name: 'url_handling',
    pattern: /finishedAd|checkUrlParameters/,
    critical: true,
    description: 'URL参数处理 - 广告回调状态处理',
  },
  {
    name: 'vote_processing',
    pattern: /processVote|attachRadioHandlers/,
    critical: true,
    description: '投票处理逻辑 - 选项选择和提交',
  },
  {
    name: 'navigation',
    pattern: /jumpToIndex/,
    critical: false,
    description: '返回主页功能 - 可选但建议',
  },
];

export interface ValidationResult {
  valid: boolean;
  passed: string[];
  failed: Array<{ name: string; description: string; critical: boolean }>;
  score: number; // 0-100
}

/**
 * Validates that generated code contains all required functionality
 */
export function validateCodeCompleteness(code: string, rules = CORE_VALIDATION_RULES): ValidationResult {
  const passed: string[] = [];
  const failed: Array<{ name: string; description: string; critical: boolean }> = [];
  
  for (const rule of rules) {
    if (rule.pattern.test(code)) {
      passed.push(rule.name);
      logger.debug(`Validation passed: ${rule.name}`);
    } else {
      failed.push({
        name: rule.name,
        description: rule.description,
        critical: rule.critical,
      });
      if (rule.critical) {
        logger.error(`Critical validation failed: ${rule.name} - ${rule.description}`);
      } else {
        logger.warn(`Validation failed: ${rule.name} - ${rule.description}`);
      }
    }
  }
  
  // Calculate score: critical failures = 0, non-critical = partial
  const criticalFailures = failed.filter(f => f.critical).length;
  const totalRules = rules.length;
  const score = criticalFailures > 0 
    ? 0 
    : Math.round((passed.length / totalRules) * 100);
  
  return {
    valid: criticalFailures === 0,
    passed,
    failed,
    score,
  };
}

/**
 * Validates HTML structure
 */
export function validateHtmlStructure(html: string): ValidationResult {
  const rules: ValidationRule[] = [
    {
      name: 'util_js',
      pattern: /src=".*util\.js"/,
      critical: true,
      description: 'util.js 引用 - 提供 getConfig/updateConfig',
    },
    {
      name: 'app_js',
      pattern: /src=".*app\.js"/,
      critical: true,
      description: 'app.js 引用 - 主应用逻辑',
    },
    {
      name: 'questionnaire_form',
      pattern: /id="questionnaire"/,
      critical: true,
      description: '投票表单结构',
    },
    {
      name: 'result_container',
      pattern: /id="result"/,
      critical: true,
      description: '结果展示容器',
    },
    {
      name: 'radio_inputs',
      pattern: /input\s+type="radio"/,
      critical: true,
      description: '单选按钮',
    },
  ];
  
  return validateCodeCompleteness(html, rules);
}

/**
 * Validates CSS completeness
 */
export function validateCssCompleteness(css: string): ValidationResult {
  const rules: ValidationRule[] = [
    {
      name: 'bar_chart',
      pattern: /\.bar-chart/,
      critical: true,
      description: '柱状图样式',
    },
    {
      name: 'option_cards',
      pattern: /\.option-card/,
      critical: true,
      description: '选项卡片样式',
    },
    {
      name: 'responsive',
      pattern: /@media/,
      critical: false,
      description: '响应式设计',
    },
  ];
  
  return validateCodeCompleteness(css, rules);
}

/**
 * Full scaffold validation
 */
export function validateScaffold(
  files: { 'index.html': string; 'app.js': string; 'styles.css': string },
  appId: string
): { valid: boolean; results: { js: ValidationResult; html: ValidationResult; css: ValidationResult } } {
  logger.info('Running scaffold validation', { appId });
  
  const jsResult = validateCodeCompleteness(files['app.js']);
  const htmlResult = validateHtmlStructure(files['index.html']);
  const cssResult = validateCssCompleteness(files['styles.css']);
  
  const allValid = jsResult.valid && htmlResult.valid && cssResult.valid;
  
  if (allValid) {
    logger.info('Scaffold validation passed', { 
      appId, 
      jsScore: jsResult.score,
      htmlScore: htmlResult.score,
      cssScore: cssResult.score,
    });
  } else {
    logger.error('Scaffold validation failed', {
      appId,
      jsFailed: jsResult.failed.map(f => f.name),
      htmlFailed: htmlResult.failed.map(f => f.name),
      cssFailed: cssResult.failed.map(f => f.name),
    });
  }
  
  return {
    valid: allValid,
    results: { js: jsResult, html: htmlResult, css: cssResult },
  };
}
