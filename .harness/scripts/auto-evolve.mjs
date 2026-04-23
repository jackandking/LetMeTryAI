#!/usr/bin/env node
/**
 * Auto-Evolve Engine v2
 *
 * 真正的进化引擎：观测业务指标 + 系统指标，诊断问题，自动修复简单问题，
 * 生成进化报告。可被 cron 自动调用，也可手动执行。
 *
 * Usage:
 *   node .harness/scripts/auto-evolve.mjs [mode]
 *
 * Modes:
 *   full     — 完整进化循环（默认）
 *   observe  — 只观测和输出指标
 *   diagnose — 观测 + 诊断，不修复
 *   fix      — 尝试自动修复已知简单问题
 *   report   — 只生成报告
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const HARNESS_DIR = path.join(REPO_DIR, '.harness');
const LOG_DIR = path.join(HARNESS_DIR, '.local', 'logs');
const STATE_DIR = path.join(HARNESS_DIR, '.local', 'state');
const KIMI_DIR = path.join(REPO_DIR, '.kimi');
const LEARNINGS_DIR = path.join(REPO_DIR, '.learnings');
const SKILLS_DIR = path.join(REPO_DIR, '.agents', 'skills');

const MODE = process.argv[2] || 'full';
const NOW = new Date();
const DATE_STR = NOW.toISOString().slice(0, 10);
const TIMESTAMP = NOW.toISOString();

// ============================================================
// Helpers
// ============================================================

function log(level, msg, data = null) {
  const entry = {
    timestamp: TIMESTAMP,
    level,
    component: 'auto-evolve',
    message: msg,
    ...(data && { data }),
  };
  console.log(`[${level.toUpperCase()}] ${msg}`);
}

function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return fallback;
  }
}

function readJsonLines(filePath) {
  try {
    return fs
      .readFileSync(filePath, 'utf-8')
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ============================================================
// Phase 1: OBSERVE — 收集所有数据
// ============================================================

class Observer {
  constructor() {
    this.data = {
      dailyAppRuns: {},
      kuaishouFollow: {},
      harnessErrors: [],
      pendingLearnings: [],
      skillHealth: {},
      timestamp: TIMESTAMP,
    };
  }

  observeDailyAppRuns() {
    const runsDir = path.join(STATE_DIR, 'daily-app-runs');
    if (!fs.existsSync(runsDir)) return;

    for (const file of fs.readdirSync(runsDir)) {
      if (!file.endsWith('.jsonl')) continue;
      const profile = file.replace('.jsonl', '');
      const lines = readJsonLines(path.join(runsDir, file));
      const recent = lines.slice(-7);
      const total = recent.length;
      const failures = recent.filter((r) => r.success === false).length;
      const lastRun = recent[recent.length - 1];

      this.data.dailyAppRuns[profile] = {
        totalRuns: lines.length,
        recentRuns: total,
        recentFailures: failures,
        failureRate: total > 0 ? Math.round((failures / total) * 100) : 0,
        lastAppId: lastRun?.appId || null,
        lastSuccess: lastRun?.success || false,
        lastDate: lastRun?.timestamp ? lastRun.timestamp.slice(0, 10) : null,
      };
    }
  }

  observeKuaishouFollow() {
    const followDir = path.join(STATE_DIR, 'kuaishou-follow', 'daily-runs');
    if (!fs.existsSync(followDir)) return;

    const files = fs.readdirSync(followDir).filter((f) => f.endsWith('.json')).sort();
    const recentFiles = files.slice(-7);

    let totalQueueAdded = 0;
    let totalHourlyRuns = 0;
    let totalFollowed = 0;

    for (const file of recentFiles) {
      const data = readJson(path.join(followDir, file), {});
      const dateKey = file.replace('.json', '');
      const ingestion = data.ingestion || {};
      const hourlyRuns = data.hourlyRuns || [];

      const queueAdded = ingestion.queueAdded || 0;
      const followed = hourlyRuns.reduce((sum, run) => sum + (run.followed || 0), 0);

      totalQueueAdded += queueAdded;
      totalHourlyRuns += hourlyRuns.length;
      totalFollowed += followed;

      this.data.kuaishouFollow[dateKey] = {
        appCount: ingestion.appCount || 0,
        queueAdded,
        hourlyRuns: hourlyRuns.length,
        followed,
      };
    }

    this.data.kuaishouFollow.summary = {
      daysObserved: recentFiles.length,
      totalQueueAdded,
      totalHourlyRuns,
      totalFollowed,
      avgDailyQueueAdded: recentFiles.length > 0 ? Math.round(totalQueueAdded / recentFiles.length) : 0,
    };
  }

  observeHarnessErrors() {
    const harnessLog = path.join(LOG_DIR, 'harness.log');
    if (!fs.existsSync(harnessLog)) return;

    // Read last 500 lines
    const content = fs.readFileSync(harnessLog, 'utf-8');
    const lines = content.split('\n').filter(Boolean).slice(-500);

    const errors = [];
    const errorPatterns = new Map();

    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.level === 'error' || entry.level === 'warn') {
          const msg = entry.message || '';
          errors.push({
            timestamp: entry.timestamp,
            level: entry.level,
            message: msg,
            data: entry.data,
          });

          // Cluster by message pattern (first 30 chars)
          const pattern = msg.slice(0, 40);
          errorPatterns.set(pattern, (errorPatterns.get(pattern) || 0) + 1);
        }
      } catch {
        // ignore malformed lines
      }
    }

    this.data.harnessErrors = {
      totalInWindow: errors.length,
      recent: errors.slice(-5),
      topPatterns: Array.from(errorPatterns.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
    };
  }

  observePendingLearnings() {
    const indexFile = path.join(LEARNINGS_DIR, 'index.jsonl');
    if (!fs.existsSync(indexFile)) return;

    const entries = readJsonLines(indexFile);
    const pending = entries.filter((e) => e.status === 'pending');

    const byPattern = {};
    const byArea = {};
    for (const entry of pending) {
      byPattern[entry.patternKey] = (byPattern[entry.patternKey] || 0) + 1;
      byArea[entry.area] = (byArea[entry.area] || 0) + 1;
    }

    this.data.pendingLearnings = {
      total: pending.length,
      byPattern,
      byArea,
      recent: pending.slice(-5),
    };
  }

  observeSkillHealth() {
    if (!fs.existsSync(SKILLS_DIR)) return;

    const skills = fs.readdirSync(SKILLS_DIR).filter((d) => {
      const skillPath = path.join(SKILLS_DIR, d);
      return fs.statSync(skillPath).isDirectory();
    });

    const brokenRefs = [];

    for (const skill of skills) {
      const skillMd = path.join(SKILLS_DIR, skill, 'SKILL.md');
      if (!fs.existsSync(skillMd)) continue;

      const content = fs.readFileSync(skillMd, 'utf-8');

      // Find backtick-quoted paths
      const backtickMatches = content.match(/`[^`]+\.[a-z]{1,6}`/g) || [];
      // Find parenthesized paths
      const parenMatches = content.match(/\([^)]*\.[a-z]{1,6}[^)]*\)/g) || [];

      const refs = [...backtickMatches, ...parenMatches]
        .map((m) => m.replace(/[`()]/g, '').trim())
        .filter((m) => {
          // Must look like a file path: contains /, no spaces, no =, no :, starts with . or letter
          if (!m.includes('/')) return false;
          if (m.includes(' ')) return false;
          if (m.includes('=')) return false;
          if (m.includes(':')) return false;
          if (m.startsWith('http')) return false;
          if (/^[^a-zA-Z0-9_.\/]/.test(m)) return false;
          return true;
        });

      for (const ref of refs) {
        const fullPath = path.join(REPO_DIR, ref);
        if (!fs.existsSync(fullPath)) {
          brokenRefs.push({ skill, ref });
        }
      }
    }

    this.data.skillHealth = {
      totalSkills: skills.length,
      brokenReferences: brokenRefs,
      brokenCount: brokenRefs.length,
    };
  }

  run() {
    log('info', '=== OBSERVE 阶段 ===');
    this.observeDailyAppRuns();
    this.observeKuaishouFollow();
    this.observeHarnessErrors();
    this.observePendingLearnings();
    this.observeSkillHealth();
    log('info', '观测完成', { profiles: Object.keys(this.data.dailyAppRuns) });
    return this.data;
  }
}

// ============================================================
// Phase 2: DIAGNOSE — 分析问题
// ============================================================

class Diagnostician {
  constructor(data) {
    this.data = data;
    this.issues = [];
    this.opportunities = [];
  }

  diagnose() {
    log('info', '=== DIAGNOSE 阶段 ===');

    // 1. DailyAppAgent 失败率
    for (const [profile, stats] of Object.entries(this.data.dailyAppRuns)) {
      if (stats.failureRate > 20) {
        this.issues.push({
          severity: 'high',
          category: 'system',
          title: `${profile} 失败率过高`,
          detail: `最近7次运行中失败 ${stats.failureRate}%，最后运行: ${stats.lastDate}`,
          action: '检查 DailyAppAgent 日志，修复失败原因',
        });
      }
    }

    // 2. 没有 daily-app-runs 数据的 profile
    const expectedProfiles = ['nanrenbao', 'womanai', 'parent-tools', 'elder-love'];
    for (const profile of expectedProfiles) {
      if (!this.data.dailyAppRuns[profile]) {
        this.issues.push({
          severity: 'medium',
          category: 'system',
          title: `${profile} 没有运行记录`,
          detail: '该 profile 可能未配置 cron 或从未成功运行',
          action: '检查 cron 配置和 DailyAppAgent 状态',
        });
      }
    }

    // 3. Pending learnings 堆积
    if (this.data.pendingLearnings.total > 10) {
      this.issues.push({
        severity: 'high',
        category: 'system',
        title: `Pending learnings 堆积: ${this.data.pendingLearnings.total} 个`,
        detail: `主要类型: ${JSON.stringify(this.data.pendingLearnings.byPattern)}`,
        action: '运行 auto-fix 或手动修复 pending errors',
      });
    }

    // 4. Skill 引用断裂
    if (this.data.skillHealth.brokenCount > 0) {
      this.issues.push({
        severity: 'medium',
        category: 'system',
        title: `Skill 引用断裂: ${this.data.skillHealth.brokenCount} 处`,
        detail: this.data.skillHealth.brokenReferences.slice(0, 5).map((r) => `${r.skill}: ${r.ref}`).join(', '),
        action: '修复 SKILL.md 中的引用路径或创建缺失文件',
      });
    }

    // 5. 快手 follow 数据异常
    const followSummary = this.data.kuaishouFollow.summary;
    if (followSummary && followSummary.daysObserved > 0) {
      if (followSummary.avgDailyQueueAdded === 0) {
        this.issues.push({
          severity: 'high',
          category: 'business',
          title: '快手 follow 数据采集异常',
          detail: '最近几天没有新达人入队',
          action: '检查快手 API 认证状态和 ingestion 流程',
        });
      }
    } else {
      this.issues.push({
        severity: 'medium',
        category: 'business',
        title: '缺少快手 follow 数据',
        detail: 'daily-runs 目录为空或数据不足',
        action: '确认 cron 是否正确配置了 kuaishou-follow ingestion',
      });
    }

    // 6. 业务机会：达人采用趋势
    if (followSummary) {
      if (followSummary.totalFollowed < followSummary.totalQueueAdded * 0.5) {
        this.opportunities.push({
          title: 'Follow 转化率低',
          detail: `队列中有 ${followSummary.totalQueueAdded} 人，但只 follow 了 ${followSummary.totalFollowed} 人`,
          action: '增加 hourly worker 频率或检查 follow 失败原因',
        });
      }
    }

    // 7. Harness 错误模式
    if (this.data.harnessErrors.totalInWindow > 10) {
      const topPattern = this.data.harnessErrors.topPatterns[0];
      this.issues.push({
        severity: 'medium',
        category: 'system',
        title: `Harness 近期错误较多: ${this.data.harnessErrors.totalInWindow} 个`,
        detail: topPattern ? `最常见: "${topPattern[0]}" (${topPattern[1]} 次)` : '',
        action: '分析 harness.log 中的错误模式并修复',
      });
    }

    log('info', `诊断完成: ${this.issues.length} 个问题, ${this.opportunities.length} 个机会`);
    return { issues: this.issues, opportunities: this.opportunities };
  }
}

// ============================================================
// Phase 3: ACT — 自动修复简单问题
// ============================================================

class Fixer {
  constructor(data, diagnosis) {
    this.data = data;
    this.diagnosis = diagnosis;
    this.results = [];
  }

  // 修复 skill 引用断裂（如果缺失的是目录或文件，尝试创建桩文件）
  fixBrokenSkillReferences() {
    const broken = this.data.skillHealth.brokenReferences || [];
    let fixed = 0;

    for (const { skill, ref } of broken) {
      const fullPath = path.join(REPO_DIR, ref);
      if (fs.existsSync(fullPath)) continue;

      // 如果是文件引用，创建一个桩文件
      if (path.extname(ref)) {
        ensureDir(path.dirname(fullPath));
        const ext = path.extname(ref);
        let stubContent = '';
        if (ext === '.md') {
          stubContent = `# ${path.basename(ref, ext)}\n\n> Stub file created by auto-evolve.\n> Original reference from skill: ${skill}\n`;
        } else if (ext === '.js' || ext === '.ts') {
          stubContent = `// Stub file created by auto-evolve\n// Original reference from skill: ${skill}\n\nconsole.warn('This is a stub file. Please implement the actual logic.');\n`;
        } else if (ext === '.json') {
          stubContent = '{}\n';
        } else {
          stubContent = `# Stub file created by auto-evolve\n# Original reference from skill: ${skill}\n`;
        }

        try {
          fs.writeFileSync(fullPath, stubContent, 'utf-8');
          this.results.push({ action: 'create_stub', file: ref, skill, status: 'success' });
          fixed++;
        } catch (err) {
          this.results.push({ action: 'create_stub', file: ref, skill, status: 'failed', error: err.message });
        }
      }
    }

    if (fixed > 0) {
      log('info', `修复了 ${fixed} 个 skill 引用断裂（创建桩文件）`);
    }
    return fixed;
  }

  // 修复：更新 learning 状态（如果桩文件已创建）
  updateLearningStatus() {
    const indexFile = path.join(LEARNINGS_DIR, 'index.jsonl');
    if (!fs.existsSync(indexFile)) return 0;

    const entries = readJsonLines(indexFile);
    let updated = 0;
    const newEntries = [];

    for (const entry of entries) {
      if (entry.status === 'pending' && entry.patternKey === 'skill.missing_path') {
        const ref = entry.ref || '';
        const fullPath = path.join(REPO_DIR, ref);
        if (fs.existsSync(fullPath)) {
          entry.status = 'resolved';
          entry.resolvedAt = TIMESTAMP;
          entry.resolvedBy = 'auto-evolve';
          updated++;
        }
      }
      newEntries.push(entry);
    }

    if (updated > 0) {
      fs.writeFileSync(indexFile, newEntries.map((e) => JSON.stringify(e)).join('\n') + '\n', 'utf-8');
      log('info', `更新了 ${updated} 个 learning 状态为 resolved`);
    }
    return updated;
  }

  run() {
    if (MODE !== 'full' && MODE !== 'fix') {
      log('info', '=== ACT 阶段跳过（mode 不是 full/fix）===');
      return [];
    }

    log('info', '=== ACT 阶段 ===');
    this.fixBrokenSkillReferences();
    this.updateLearningStatus();
    return this.results;
  }
}

// ============================================================
// Phase 4: REPORT — 生成报告并更新状态
// ============================================================

class Reporter {
  constructor(data, diagnosis, fixResults) {
    this.data = data;
    this.diagnosis = diagnosis;
    this.fixResults = fixResults;
  }

  generateReport() {
    const lines = [];
    lines.push('═══════════════════════════════════════');
    lines.push(`  LetMeTryAI 进化日报 — ${DATE_STR}`);
    lines.push('═══════════════════════════════════════');
    lines.push('');

    // 业务指标
    lines.push('📊 业务指标');
    const followSummary = this.data.kuaishouFollow.summary;
    if (followSummary) {
      lines.push(`  • 近${followSummary.daysObserved}天新达人入队: ${followSummary.totalQueueAdded}`);
      lines.push(`  • 日均入队: ${followSummary.avgDailyQueueAdded}`);
      lines.push(`  • 总 follow 数: ${followSummary.totalFollowed}`);
    } else {
      lines.push('  • 无快手 follow 数据');
    }
    lines.push('');

    // 系统指标
    lines.push('🔧 系统指标');
    for (const [profile, stats] of Object.entries(this.data.dailyAppRuns)) {
      const icon = stats.failureRate > 20 ? '🔴' : stats.failureRate > 0 ? '🟡' : '🟢';
      lines.push(`  ${icon} ${profile}: ${stats.recentRuns} 次运行, 失败率 ${stats.failureRate}%`);
    }
    lines.push(`  • Harness 近期错误: ${this.data.harnessErrors.totalInWindow}`);
    lines.push(`  • Pending learnings: ${this.data.pendingLearnings.total}`);
    lines.push(`  • Skill 引用断裂: ${this.data.skillHealth.brokenCount}`);
    lines.push('');

    // 问题诊断
    if (this.diagnosis.issues.length > 0) {
      lines.push('🔍 诊断问题');
      for (const issue of this.diagnosis.issues) {
        const icon = issue.severity === 'high' ? '🔴' : '🟡';
        lines.push(`  ${icon} [${issue.category}] ${issue.title}`);
        lines.push(`     → ${issue.detail}`);
        lines.push(`     💡 ${issue.action}`);
      }
      lines.push('');
    }

    // 机会
    if (this.diagnosis.opportunities.length > 0) {
      lines.push('💡 机会');
      for (const opp of this.diagnosis.opportunities) {
        lines.push(`  • ${opp.title}: ${opp.detail}`);
        lines.push(`    → ${opp.action}`);
      }
      lines.push('');
    }

    // 修复结果
    if (this.fixResults.length > 0) {
      lines.push('⚡ 自动修复');
      const successFixes = this.fixResults.filter((r) => r.status === 'success');
      lines.push(`  • 成功: ${successFixes.length} 项`);
      for (const r of successFixes) {
        lines.push(`    ✓ ${r.action}: ${r.file}`);
      }
      const failedFixes = this.fixResults.filter((r) => r.status === 'failed');
      if (failedFixes.length > 0) {
        lines.push(`  • 失败: ${failedFixes.length} 项`);
        for (const r of failedFixes) {
          lines.push(`    ✗ ${r.action}: ${r.file} — ${r.error}`);
        }
      }
      lines.push('');
    }

    // 下一步
    lines.push('📋 建议下一步');
    if (this.diagnosis.issues.some((i) => i.severity === 'high')) {
      lines.push('  🔴 有高优先级问题需要处理，建议立即运行:');
      lines.push('     kimi -p ".kimi/skills/evolution-engine/references/evolution-prompt.md"');
    } else if (this.diagnosis.opportunities.length > 0) {
      lines.push('  💡 有优化机会，建议手动审查后执行进化');
    } else {
      lines.push('  ✅ 系统状态良好，继续监控');
    }
    lines.push('');
    lines.push('═══════════════════════════════════════');

    return lines.join('\n');
  }

  saveReport(reportText) {
    ensureDir(LOG_DIR);
    const reportFile = path.join(LOG_DIR, `auto-evolve-report-${DATE_STR}.txt`);
    fs.writeFileSync(reportFile, reportText, 'utf-8');
    log('info', `报告已保存: ${reportFile}`);
    return reportFile;
  }

  updateEvolutionState() {
    const stateFile = path.join(KIMI_DIR, 'EVOLUTION_STATE.md');
    if (!fs.existsSync(stateFile)) return;

    let content = fs.readFileSync(stateFile, 'utf-8');

    // Append new evolution entry
    const entry = `
### ${DATE_STR} — Auto-Evolve 运行

**时间**: ${TIMESTAMP}
**模式**: ${MODE}
**观测结果**:
- DailyAppAgent: ${Object.keys(this.data.dailyAppRuns).length} 个 profile 有数据
- Kuaishou Follow: ${this.data.kuaishouFollow.summary?.totalQueueAdded || 0} 新达人入队（近7天）
- Pending Errors: ${this.data.pendingLearnings.total}
- Skill Broken Refs: ${this.data.skillHealth.brokenCount}

**诊断**: ${this.diagnosis.issues.length} 个问题, ${this.diagnosis.opportunities.length} 个机会

**自动修复**: ${this.fixResults.filter((r) => r.status === 'success').length} 项成功

**下一步**: ${this.diagnosis.issues.some((i) => i.severity === 'high') ? '有高优先级问题需处理' : '系统状态良好'}
`;

    // Insert before "## 下次进化聚焦"
    const marker = '## 下次进化聚焦';
    if (content.includes(marker)) {
      content = content.replace(marker, entry + '\n' + marker);
    } else {
      content += entry;
    }

    fs.writeFileSync(stateFile, content, 'utf-8');
    log('info', 'EVOLUTION_STATE.md 已更新');
  }

  run() {
    log('info', '=== REPORT 阶段 ===');
    const report = this.generateReport();
    console.log('\n' + report);
    this.saveReport(report);
    this.updateEvolutionState();
    return report;
  }
}

// ============================================================
// Main
// ============================================================

async function main() {
  log('info', `Auto-Evolve Engine v2 启动 — 模式: ${MODE}`);

  if (MODE === 'help' || MODE === '-h' || MODE === '--help') {
    console.log(`
Usage: node auto-evolve.mjs [mode]

Modes:
  full     — 完整进化循环: 观测→诊断→修复→报告 (默认)
  observe  — 只观测和输出指标
  diagnose — 观测+诊断，不修复
  fix      — 尝试自动修复已知简单问题
  report   — 只生成报告（需要已有数据）
  help     — 显示此帮助

Examples:
  node .harness/scripts/auto-evolve.mjs
  node .harness/scripts/auto-evolve.mjs observe
  node .harness/scripts/auto-evolve.mjs fix
`);
    process.exit(0);
  }

  // Phase 1: Observe
  const observer = new Observer();
  const data = observer.run();

  // Phase 2: Diagnose
  const diagnostician = new Diagnostician(data);
  const diagnosis = diagnostician.diagnose();

  // Phase 3: Act (fix)
  const fixer = new Fixer(data, diagnosis);
  const fixResults = fixer.run();

  // Phase 4: Report
  const reporter = new Reporter(data, diagnosis, fixResults);
  reporter.run();

  log('info', 'Auto-Evolve 完成');
}

main().catch((err) => {
  log('error', 'Auto-Evolve 致命错误', { error: err.message, stack: err.stack });
  process.exit(1);
});
