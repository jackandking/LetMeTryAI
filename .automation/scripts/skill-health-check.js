#!/usr/bin/env node
/**
 * Skill Health Check
 *
 * Scans all .agents/skills/ ... /SKILL.md files for stale references.
 * Checks:
 * - Referenced file paths still exist
 * - Referenced scripts can execute --help (if applicable)
 *
 * Outputs:
 * - .automation/.local/state/skill-health-report.txt
 * - .learnings/ entries for each issue (so self-improvement can see them)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const SKILLS_DIR = path.join(REPO_DIR, '.agents', 'skills');
const EMAIL_SCRIPT = path.join(REPO_DIR, '.automation', 'scripts', 'send_email.py');
const PYTHON_BIN = process.env.DAILY_PYTHON_BIN || '/usr/bin/python3';
const REPORT_TO = process.env.DAILY_REPORT_TO || 'jackandking@163.com';

const LEARNINGS_DIR = path.join(REPO_DIR, '.learnings');
const INDEX_FILE = path.join(LEARNINGS_DIR, 'index.jsonl');

const PATH_PATTERNS = [
  // Match backtick-quoted paths that contain a slash
  /`((?:[^`\/]*\/)+[^`]*\.(?:js|ts|mjs|sh|py|md|yml|yaml))`/g,
  // Match parenthesized relative paths
  /\((\.[^)]+\.(?:js|ts|mjs|sh|py|md|yml|yaml))\)/g,
];

const SCRIPT_PATTERNS = [
  /npx tsx ([^\s\n]+)/g,
  /node ([^\s\n]+)/g,
  /bash ([^\s\n]+)/g,
  /python3? ([^\s\n]+)/g,
];

const PATTERN_KEY_MAP = {
  missing_path: 'skill.missing_path',
  broken_script: 'skill.broken_script',
};

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

function isAlreadyLogged(indexEntries, skill, type, ref) {
  return indexEntries.some(e =>
    e.type === 'error' &&
    e.status === 'pending' &&
    e.skill === skill &&
    e.patternKey === PATTERN_KEY_MAP[type] &&
    e.ref === ref
  );
}

function generateLearningFile(id, patternKey, issue) {
  const date = new Date().toISOString();
  const summary = issue.type === 'missing_path'
    ? `SKILL.md references a file that does not exist: \`${issue.ref}\``
    : `SKILL.md references a script that cannot run: \`${issue.ref}\` (${issue.reason})`;

  return `## [${id}] ${patternKey}

**Logged**: ${date}
**Priority**: medium
**Status**: pending
**Area**: skills
**Pattern-Key**: ${patternKey}

### Summary
${summary}

### Details
Skill: \`${issue.skill}\`
Issue type: \`${issue.type}\`
Reference: \`${issue.ref}\`
Detected at: ${date}

### Context
\`\`\`
- ${issue.skill}: ${issue.type} -> ${issue.ref}${issue.reason ? ` (${issue.reason})` : ''}
\`\`\`

### Suggested Action
Review the SKILL.md for \`${issue.skill}\` and either:
1. Fix the broken reference path, or
2. Remove the stale reference if the file/script is no longer needed.

### Metadata
- Source: skill-health-check
- Related Files: .agents/skills/${issue.skill}/SKILL.md
- Tags: skill-health, ${issue.type}, ${issue.skill}
`;
}

function writeLearning(issue, indexEntries) {
  const patternKey = PATTERN_KEY_MAP[issue.type];
  if (!patternKey) return null;

  if (isAlreadyLogged(indexEntries, issue.skill, issue.type, issue.ref)) {
    console.log(`[skill-health] Skipping ${issue.skill}/${issue.type}/${issue.ref} (already logged)`);
    return null;
  }

  const id = getNextId();
  const now = new Date();
  const yearDir = path.join(LEARNINGS_DIR, now.getFullYear().toString());
  const monthDir = path.join(yearDir, String(now.getMonth() + 1).padStart(2, '0'));
  ensureDir(monthDir);

  const fileName = `${id}-${patternKey}.md`;
  const filePath = path.join(monthDir, fileName);
  const body = generateLearningFile(id, patternKey, issue);

  fs.writeFileSync(filePath, body, 'utf-8');

  const indexLine = JSON.stringify({
    id,
    type: 'error',
    date: now.toISOString().split('T')[0],
    file: filePath,
    sourceFile: `skill-health-check (${issue.skill})`,
    status: 'pending',
    area: 'skills',
    patternKey,
    priority: 'medium',
    skill: issue.skill,
    ref: issue.ref,
  });
  fs.appendFileSync(INDEX_FILE, indexLine + '\n', 'utf-8');

  console.log(`[skill-health] Created learning: ${filePath}`);
  return { id, filePath, patternKey };
}

function extractPaths(content, skillDir) {
  const found = new Set();
  for (const regex of PATH_PATTERNS) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      let p = match[1] || match[0];
      // In SKILL.md context, all relative paths are resolved against the skill directory.
      // Absolute paths are kept as-is. Repo-root relative paths must use explicit prefix.
      if (!path.isAbsolute(p)) {
        p = path.join(skillDir, p);
      }
      found.add(path.normalize(p));
    }
  }
  return Array.from(found);
}

function extractScripts(content) {
  const found = [];
  for (const regex of SCRIPT_PATTERNS) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const script = match[1].trim();
      // Skip false positives: single words without path separators or file extensions
      // (e.g., "loop" matched from "# Main bash loop" comment)
      if (!script.includes('/') && !script.includes('.')) continue;
      found.push(script);
    }
  }
  return found;
}

function checkPath(p) {
  return fs.existsSync(p);
}

function checkScriptHelp(scriptPath, skillDir) {
  // In SKILL.md context, script references are relative to the skill directory.
  let fullPath = path.isAbsolute(scriptPath) ? scriptPath : path.join(skillDir, scriptPath);
  if (!fs.existsSync(fullPath) && !path.isAbsolute(scriptPath)) {
    // Fallback: check relative to repo root for legacy references
    fullPath = path.join(REPO_DIR, scriptPath);
  }
  if (!fs.existsSync(fullPath)) return { ok: false, reason: 'file not found' };
  if (!fullPath.match(/\.(js|mjs|py)$/)) return { ok: true };
  const result = spawnSync('node', [fullPath, '--help'], { encoding: 'utf-8', timeout: 5000 });
  if (result.status === 0 || result.stdout.includes('Usage')) return { ok: true };
  return { ok: false, reason: '--help failed or no usage info' };
}

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('[skill-health] No skills directory found.');
    return;
  }

  ensureDir(LEARNINGS_DIR);
  const indexEntries = loadIndex();

  const skills = fs.readdirSync(SKILLS_DIR).filter(d => {
    const p = path.join(SKILLS_DIR, d);
    return fs.statSync(p).isDirectory() && fs.existsSync(path.join(p, 'SKILL.md'));
  });

  const issues = [];

  for (const skill of skills) {
    const skillDir = path.join(SKILLS_DIR, skill);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const content = fs.readFileSync(skillFile, 'utf-8');

    const paths = extractPaths(content, skillDir);
    for (const p of paths) {
      if (!checkPath(p)) {
        issues.push({ skill, type: 'missing_path', ref: path.relative(REPO_DIR, p) });
      }
    }

    const scripts = extractScripts(content);
    for (const s of scripts) {
      const check = checkScriptHelp(s, skillDir);
      if (!check.ok) {
        issues.push({ skill, type: 'broken_script', ref: s, reason: check.reason });
      }
    }
  }

  const lines = [
    'Skill Health Check Report',
    `Date: ${new Date().toISOString()}`,
    `Scanned: ${skills.length} skill(s)`,
    `Issues: ${issues.length}`,
    '',
    ...issues.map(i => `- ${i.skill}: ${i.type} -> ${i.ref}${i.reason ? ` (${i.reason})` : ''}`),
  ];

  const report = lines.join('\n');
  console.log(report);

  const draftPath = path.join(REPO_DIR, '.automation', '.local', 'state', 'skill-health-report.txt');
  fs.writeFileSync(draftPath, report, 'utf-8');

  // Write each issue as a learning entry so self-improvement can see it
  let learningCount = 0;
  for (const issue of issues) {
    const result = writeLearning(issue, indexEntries);
    if (result) {
      indexEntries.push({
        id: result.id,
        type: 'error',
        status: 'pending',
        file: result.filePath,
        sourceFile: `skill-health-check (${issue.skill})`,
        patternKey: result.patternKey,
        skill: issue.skill,
        ref: issue.ref,
      });
      learningCount++;
    }
  }
  console.log(`[skill-health] Created ${learningCount} new learning entry(ies).`);

  if (fs.existsSync(EMAIL_SCRIPT)) {
    spawnSync(PYTHON_BIN, [EMAIL_SCRIPT, '[Skill Health] Monthly Scan', REPORT_TO, draftPath], {
      cwd: REPO_DIR,
      encoding: 'utf-8',
    });
  }
}

main();
