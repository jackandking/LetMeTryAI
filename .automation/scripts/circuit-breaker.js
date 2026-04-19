#!/usr/bin/env node
/**
 * Circuit Breaker
 *
 * Monitors recent cron execution health and pauses evolutionary cron jobs
 * if the stable layer (.harness) is failing too much.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const STATE_FILE = path.join(REPO_DIR, '.automation', '.local', 'state', 'CIRCUIT_BREAKER_ACTIVE');
const EMAIL_SCRIPT = path.join(REPO_DIR, '.automation', 'scripts', 'send_email.py');
const PYTHON_BIN = process.env.DAILY_PYTHON_BIN || '/usr/bin/python3';
const REPORT_TO = process.env.DAILY_REPORT_TO || 'jackandking@163.com';

const LOOKBACK_HOURS = 24;
const BRAND_FAILURE_THRESHOLD = 2; // same brand fails >=2 times
const TOTAL_FAILURE_THRESHOLD = 4; // overall >=4 failures

const HARNESS_LOG_DIR = path.join(PROD_DIR, '.harness', '.local', 'logs', 'daily-app-cron');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function findLogs(dir, pattern) {
  if (!fs.existsSync(dir)) return [];
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - LOOKBACK_HOURS);
  return fs.readdirSync(dir)
    .filter(f => f.match(pattern))
    .map(f => path.join(dir, f))
    .filter(p => fs.statSync(p).mtime >= cutoff);
}

function hasSuccess(logPath) {
  if (!fs.existsSync(logPath)) return false;
  const content = fs.readFileSync(logPath, 'utf-8');
  return /completed successfully/.test(content);
}

function sendAlert(reason) {
  const subject = `[CIRCUIT BREAKER] Automation paused - ${reason}`;
  const body = `Circuit breaker activated at ${new Date().toISOString()}\nReason: ${reason}\n\nEvolutionary cron jobs (auto-fix, prompt A/B) will be skipped until health recovers.\n\nState file: ${STATE_FILE}`;
  const draft = path.join(REPO_DIR, '.automation', '.local', 'state', 'circuit-breaker-alert.txt');
  fs.writeFileSync(draft, body, 'utf-8');
  if (fs.existsSync(EMAIL_SCRIPT)) {
    spawnSync(PYTHON_BIN, [EMAIL_SCRIPT, subject, REPORT_TO, draft], { cwd: REPO_DIR, encoding: 'utf-8' });
  }
}

function main() {
  ensureDir(path.dirname(STATE_FILE));

  const brands = ['nanrenbao', 'elder-love', 'parent-tools', 'womanai'];
  let totalFailures = 0;
  let brandConsecutiveFailures = 0;
  let failureReasons = [];

  for (const brand of brands) {
    const logs = findLogs(HARNESS_LOG_DIR, new RegExp(`^daily-run-${brand}-.*\\.log$`));
    // Sort descending by mtime
    logs.sort((a, b) => fs.statSync(b).mtime - fs.statSync(a).mtime);

    let failCount = 0;
    for (const log of logs.slice(0, 2)) {
      if (!hasSuccess(log)) failCount++;
    }

    if (failCount >= BRAND_FAILURE_THRESHOLD) {
      brandConsecutiveFailures++;
      failureReasons.push(`${brand}: ${failCount} consecutive failures`);
    }

    // Also count total recent failures
    const failedLogs = logs.filter(l => !hasSuccess(l));
    totalFailures += failedLogs.length;
  }

  const shouldTrip = brandConsecutiveFailures > 0 || totalFailures >= TOTAL_FAILURE_THRESHOLD;

  if (shouldTrip) {
    const reason = failureReasons.join('; ') || `total failures ${totalFailures}`;
    if (!fs.existsSync(STATE_FILE)) {
      fs.writeFileSync(STATE_FILE, `tripped_at=${new Date().toISOString()}\nreason=${reason}\n`, 'utf-8');
      console.log(`[circuit-breaker] ACTIVATED: ${reason}`);
      sendAlert(reason);
    } else {
      console.log(`[circuit-breaker] Already active. ${reason}`);
    }
  } else {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log('[circuit-breaker] CLEARED. Health restored.');
    } else {
      console.log('[circuit-breaker] OK. No action needed.');
    }
  }
}

main();
