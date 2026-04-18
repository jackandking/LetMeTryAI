#!/usr/bin/env node
/**
 * Log Scanner to Learning
 *
 * Scans recent cron logs for errors and generates .learnings/ entries.
 * READ-ONLY for source files; only writes to .learnings/ and its index.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const LEARNINGS_DIR = path.join(REPO_DIR, '.learnings');
const INDEX_FILE = path.join(LEARNINGS_DIR, 'index.jsonl');
const SCAN_DIRS = [
  path.join(PROD_DIR, '.automation', '.local', 'logs'),
  path.join(PROD_DIR, '.harness', '.local', 'logs')
];

// Patterns: regex -> patternKey
const ERROR_PATTERNS = [
  { regex: /SESSION_EXPIRED|session expired/i, key: 'auth.session_expire' },
  { regex: /ffmpeg failed|ffmpeg error/i, key: 'video.ffmpeg_error' },
  { regex: /Error: .*timeout|timed out/i, key: 'infra.timeout' },
  { regex: /network error|ECONNREFUSED|ENOTFOUND/i, key: 'infra.network' },
  { regex: /MySQL.*error|mysql.*fail/i, key: 'db.mysql_error' },
  { regex: /FAIL|FAILED/i, key: 'runtime.failure' },
  { regex: /ERROR|Exception|exception/i, key: 'runtime.error' }
];

const LOOKBACK_HOURS = 24;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function getNextId() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `ERR-${dateStr}`;

  let maxSeq = 0;
  if (fs.existsSync(INDEX_FILE)) {
    const lines = fs.readFileSync(INDEX_FILE, 'utf-8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.id && entry.id.startsWith(prefix)) {
          const seq = parseInt(entry.id.split('-')[2], 10);
          if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
        }
      } catch {}
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(3, '0')}`;
}

function loadIndex() {
  if (!fs.existsSync(INDEX_FILE)) return [];
  return fs.readFileSync(INDEX_FILE, 'utf-8').split('\n').filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);
}

function isAlreadyLogged(indexEntries, filePath, patternKey) {
  const basename = path.basename(filePath);
  return indexEntries.some(e =>
    e.type === 'error' &&
    e.status === 'pending' &&
    e.sourceFile === basename &&
    e.patternKey === patternKey
  );
}

function findRecentLogs() {
  const files = [];
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - LOOKBACK_HOURS);

  for (const dir of SCAN_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const walk = (current) => {
      for (const entry of fs.readdirSync(current)) {
        const full = path.join(current, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          walk(full);
        } else if (stat.isFile() && stat.mtime >= cutoff && entry.endsWith('.log')) {
          files.push(full);
        }
      }
    };
    walk(dir);
  }
  return files;
}

function extractContext(logPath, regex) {
  const content = fs.readFileSync(logPath, 'utf-8');
  const lines = content.split('\n');
  const matches = [];
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      const start = Math.max(0, i - 2);
      const end = Math.min(lines.length, i + 3);
      matches.push(lines.slice(start, end).join('\n'));
    }
  }
  return matches;
}

function generateLearningFile(id, patternKey, logFile, contexts) {
  const date = new Date().toISOString();
  const basename = path.basename(logFile);
  const summary = contexts[0]?.split('\n').pop() || 'Error detected in log file.';

  return `## [${id}] ${patternKey}

**Logged**: ${date}
**Priority**: medium
**Status**: pending
**Area**: auto-detected
**Pattern-Key**: ${patternKey}

### Summary
${summary}

### Details
Log file: \`${basename}\`
Detected at: ${date}

### Context
\`\`\`
${contexts.slice(0, 3).join('\n---\n')}
\`\`\`

### Suggested Action
Review the log file and determine if this is a known recurring issue or a new failure pattern.

### Metadata
- Source: log-scanner-to-learning
- Related Files: ${basename}
- Tags: auto-detected, cron, ${patternKey}
`;
}

async function main() {
  const killSwitch = path.join(REPO_DIR, '.automation', '.local', 'state', 'SELF_EVOLUTION_DISABLED');
  if (fs.existsSync(killSwitch)) {
    console.log('[log-scanner] Kill switch active. Exiting.');
    process.exit(0);
  }

  ensureDir(LEARNINGS_DIR);
  ensureDir(path.join(LEARNINGS_DIR, new Date().getFullYear().toString()));

  const logs = findRecentLogs();
  console.log(`[log-scanner] Found ${logs.length} log file(s) in last ${LOOKBACK_HOURS}h`);

  const indexEntries = loadIndex();
  let created = 0;

  for (const logFile of logs) {
    const content = fs.readFileSync(logFile, 'utf-8');
    for (const { regex, key } of ERROR_PATTERNS) {
      if (!regex.test(content)) continue;
      if (isAlreadyLogged(indexEntries, logFile, key)) {
        console.log(`[log-scanner] Skipping ${path.basename(logFile)} pattern=${key} (already logged)`);
        continue;
      }

      const contexts = extractContext(logFile, regex);
      if (contexts.length === 0) continue;

      const basename = path.basename(logFile);
      const id = getNextId();
      const now = new Date();
      const yearDir = path.join(LEARNINGS_DIR, now.getFullYear().toString());
      const monthDir = path.join(yearDir, String(now.getMonth() + 1).padStart(2, '0'));
      ensureDir(monthDir);

      const fileName = `${id}-${key}.md`;
      const filePath = path.join(monthDir, fileName);
      const body = generateLearningFile(id, key, logFile, contexts);

      fs.writeFileSync(filePath, body, 'utf-8');

      const indexLine = JSON.stringify({
        id,
        type: 'error',
        date: now.toISOString().split('T')[0],
        file: filePath,
        sourceFile: basename,
        status: 'pending',
        area: 'auto-detected',
        patternKey: key,
        priority: 'medium'
      });
      fs.appendFileSync(INDEX_FILE, indexLine + '\n', 'utf-8');

      console.log(`[log-scanner] Created learning: ${filePath}`);
      created++;

      // Re-load index to avoid duplicates in same run
      indexEntries.push({ id, type: 'error', status: 'pending', file: filePath, sourceFile: basename, patternKey: key });
    }
  }

  console.log(`[log-scanner] Done. Created ${created} new learning entry(ies).`);
}

main().catch(err => {
  console.error('[log-scanner] Fatal error:', err);
  process.exit(1);
});
