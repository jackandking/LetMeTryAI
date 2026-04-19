#!/usr/bin/env node
/**
 * Auto-Monitor — Metrics baseline, regression detection, and auto-rollback
 *
 * Integrated into auto-run.sh's OBSERVE phase.
 *
 * Functions:
 * - snapshotBaseline(): save current N-day metrics before a promote
 * - checkRegression(): compare current metrics vs baseline after promote
 * - autoRollback(): revert the merge commit if regression detected
 *
 * Data source: PROD_DIR/.harness/.local/state/daily-app-runs/*.jsonl
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const STATE_DIR = path.join(REPO_DIR, '.automation', '.local', 'state');
const BASELINE_FILE = path.join(STATE_DIR, 'auto-monitor-baseline.json');
const MONITOR_LOG = path.join(REPO_DIR, '.automation', '.local', 'logs', 'auto-monitor.jsonl');

const PROFILES = ['nanrenbao', 'womanai', 'parent-tools', 'elder-love'];
const LOOKBACK_DAYS = 7;
const REGRESSION_THRESHOLD = 0.3; // 30% increase in failure rate = regression

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadRunData(profileId, days) {
  const filePath = path.join(PROD_DIR, '.harness', '.local', 'state', 'daily-app-runs', `${profileId}.jsonl`);
  if (!fs.existsSync(filePath)) return [];

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => { try { return JSON.parse(line); } catch { return null; } })
    .filter(Boolean)
    .filter(run => new Date(run.timestamp) >= cutoff);
}

function computeMetrics(runs) {
  if (runs.length === 0) return { count: 0, successRate: 0, avgDurationMs: 0, failureRate: 0 };

  const successes = runs.filter(r => r.success).length;
  const totalDuration = runs.reduce((sum, r) => sum + (r.durationMs || 0), 0);

  return {
    count: runs.length,
    successRate: successes / runs.length,
    failureRate: 1 - (successes / runs.length),
    avgDurationMs: Math.round(totalDuration / runs.length),
  };
}

function logEntry(entry) {
  ensureDir(path.dirname(MONITOR_LOG));
  fs.appendFileSync(MONITOR_LOG, JSON.stringify(entry) + '\n');
}

// --- Public API ---

export function snapshotBaseline() {
  ensureDir(STATE_DIR);

  const baseline = {
    timestamp: new Date().toISOString(),
    lookbackDays: LOOKBACK_DAYS,
    profiles: {},
  };

  for (const profile of PROFILES) {
    const runs = loadRunData(profile, LOOKBACK_DAYS);
    baseline.profiles[profile] = computeMetrics(runs);
  }

  fs.writeFileSync(BASELINE_FILE, JSON.stringify(baseline, null, 2));
  console.log(`[auto-monitor] Baseline saved (${LOOKBACK_DAYS}-day window)`);

  for (const [profile, metrics] of Object.entries(baseline.profiles)) {
    console.log(`  ${profile}: ${metrics.count} runs, ${(metrics.successRate * 100).toFixed(0)}% success`);
  }

  logEntry({ type: 'baseline', ...baseline });
  return baseline;
}

export function checkRegression() {
  if (!fs.existsSync(BASELINE_FILE)) {
    console.log('[auto-monitor] No baseline found — skipping regression check');
    return { regressed: false, reason: 'no_baseline' };
  }

  const baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf-8'));
  const results = { regressed: false, details: {} };

  for (const profile of PROFILES) {
    const baselineMetrics = baseline.profiles[profile];
    if (!baselineMetrics || baselineMetrics.count === 0) continue;

    const currentRuns = loadRunData(profile, LOOKBACK_DAYS);
    const currentMetrics = computeMetrics(currentRuns);

    const failureDelta = currentMetrics.failureRate - baselineMetrics.failureRate;

    results.details[profile] = {
      baseline: baselineMetrics,
      current: currentMetrics,
      failureDelta,
      regressed: failureDelta > REGRESSION_THRESHOLD,
    };

    if (failureDelta > REGRESSION_THRESHOLD) {
      results.regressed = true;
      console.log(`[auto-monitor] REGRESSION in ${profile}: failure rate ${(baselineMetrics.failureRate * 100).toFixed(0)}% → ${(currentMetrics.failureRate * 100).toFixed(0)}% (delta: +${(failureDelta * 100).toFixed(0)}%)`);
    } else {
      console.log(`[auto-monitor] ${profile}: OK (failure delta: ${(failureDelta * 100).toFixed(1)}%)`);
    }
  }

  logEntry({ type: 'regression_check', timestamp: new Date().toISOString(), ...results });
  return results;
}

export function autoRollback() {
  console.log('[auto-monitor] Initiating auto-rollback...');

  const repoDir = REPO_DIR;
  const prodDir = PROD_DIR;

  // Find the most recent auto-fix merge commit on main
  const logResult = spawnSync('git', [
    'log', '--oneline', '--grep=auto-fix:', '-n', '1', '--format=%H %s',
  ], { cwd: repoDir, encoding: 'utf-8' });

  if (logResult.status !== 0 || !logResult.stdout.trim()) {
    console.log('[auto-monitor] No auto-fix commit found to revert');
    logEntry({ type: 'rollback', success: false, reason: 'no_auto_fix_commit' });
    return false;
  }

  const [commitHash, ...messageParts] = logResult.stdout.trim().split(' ');
  const commitMessage = messageParts.join(' ');
  console.log(`[auto-monitor] Reverting commit: ${commitHash} (${commitMessage})`);

  // Revert
  const revertResult = spawnSync('git', ['revert', '--no-edit', commitHash], {
    cwd: repoDir, encoding: 'utf-8',
  });

  if (revertResult.status !== 0) {
    console.error(`[auto-monitor] Revert failed: ${revertResult.stderr}`);
    logEntry({ type: 'rollback', success: false, reason: 'revert_failed', error: revertResult.stderr });
    return false;
  }

  // Push revert
  const pushResult = spawnSync('git', ['push', 'origin', 'main'], {
    cwd: repoDir, encoding: 'utf-8',
  });

  if (pushResult.status !== 0) {
    console.error(`[auto-monitor] Push failed: ${pushResult.stderr}`);
    logEntry({ type: 'rollback', success: false, reason: 'push_failed', error: pushResult.stderr });
    return false;
  }

  // Update prod
  if (fs.existsSync(path.join(prodDir, '.git'))) {
    spawnSync('git', ['pull', 'origin', 'main'], { cwd: prodDir, encoding: 'utf-8' });
    console.log('[auto-monitor] Prod updated after rollback');
  }

  // Clear baseline to prevent re-triggering
  if (fs.existsSync(BASELINE_FILE)) {
    fs.unlinkSync(BASELINE_FILE);
  }

  console.log('[auto-monitor] Rollback complete');
  logEntry({
    type: 'rollback',
    success: true,
    revertedCommit: commitHash,
    revertedMessage: commitMessage,
    timestamp: new Date().toISOString(),
  });
  return true;
}

// --- CLI ---
const command = process.argv[2];
if (command === 'baseline') {
  snapshotBaseline();
} else if (command === 'check') {
  const result = checkRegression();
  if (result.regressed) {
    console.log('\n[auto-monitor] Regression detected! Run with "rollback" to revert.');
    process.exit(1);
  }
} else if (command === 'rollback') {
  autoRollback();
} else if (command === 'check-and-rollback') {
  const result = checkRegression();
  if (result.regressed) {
    autoRollback();
  }
} else if (command) {
  console.error(`Unknown command: ${command}`);
  console.error('Usage: auto-monitor.js [baseline|check|rollback|check-and-rollback]');
  process.exit(1);
}
