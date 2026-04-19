#!/usr/bin/env node
/**
 * Analyze Prompt Experiments
 *
 * Reads prompt-experiments.jsonl and topic-performance.jsonl,
 * computes average score per variant, and suggests a winner.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const EXPERIMENT_FILE = path.join(PROD_DIR, '.automation', '.local', 'state', 'prompt-experiments.jsonl');
const PERF_FILE = path.join(PROD_DIR, '.automation', '.local', 'state', 'topic-performance.jsonl');
const EMAIL_SCRIPT = path.join(REPO_DIR, '.automation', 'scripts', 'send_email.py');
const PYTHON_BIN = process.env.DAILY_PYTHON_BIN || '/usr/bin/python3';
const REPORT_TO = process.env.DAILY_REPORT_TO || 'jackandking@163.com';

function loadJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return fs.readFileSync(filePath, 'utf-8')
    .split('\n')
    .filter(Boolean)
    .map(line => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);
}

function main() {
  const experiments = loadJsonl(EXPERIMENT_FILE);
  const performance = loadJsonl(PERF_FILE);

  if (experiments.length === 0) {
    console.log('[analyze] No experiment data yet.');
    return;
  }

  // Map date+profileId -> variant
  const experimentMap = new Map();
  for (const e of experiments) {
    const key = `${e.date}|${e.profileId}`;
    experimentMap.set(key, e.variant);
  }

  const scores = { control: [], variant: [] };
  for (const p of performance) {
    const key = `${p.date}|${p.profileId}`;
    const variant = experimentMap.get(key);
    if (variant && scores[variant]) {
      scores[variant].push(p.score);
    }
  }

  const avg = (arr) => arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 'N/A';

  const report = [
    'Prompt Experiment Analysis',
    `Generated: ${new Date().toISOString()}`,
    '',
    `Control:  ${scores.control.length} tasks, avg score = ${avg(scores.control)}`,
    `Variant:  ${scores.variant.length} tasks, avg score = ${avg(scores.variant)}`,
    '',
    scores.variant.length >= 5
      ? (parseFloat(avg(scores.variant)) > parseFloat(avg(scores.control)) ? 'Suggestion: variant is outperforming control.' : 'Suggestion: control is still better.')
      : 'Need more data (at least 5 variant tasks) for a reliable comparison.',
  ].join('\n');

  console.log(report);

  const draftPath = path.join(REPO_DIR, '.automation', '.local', 'state', 'prompt-experiment-report.txt');
  fs.writeFileSync(draftPath, report, 'utf-8');

  if (fs.existsSync(EMAIL_SCRIPT)) {
    spawnSync(PYTHON_BIN, [EMAIL_SCRIPT, '[Prompt Experiment] Weekly Analysis', REPORT_TO, draftPath], {
      cwd: REPO_DIR,
      encoding: 'utf-8',
    });
    console.log('[analyze] Report email sent.');
  }
}

main();
