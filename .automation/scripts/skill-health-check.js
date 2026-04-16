#!/usr/bin/env node
/**
 * Skill Health Check
 *
 * Scans all .agents/skills/ ... /SKILL.md files for stale references.
 * Checks:
 * - Referenced file paths still exist
 * - Referenced scripts can execute --help (if applicable)
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

const PATH_PATTERNS = [
  // Match backtick-quoted paths that contain a slash
  /`((?:[^`\/]*\/)+[^`]*\.(?:js|ts|mjs|sh|py|json|md|yml|yaml))`/g,
  // Match parenthesized relative paths
  /\((\.[^)]+\.(?:js|ts|mjs|sh|py|json|md|yml|yaml))\)/g,
];

const SCRIPT_PATTERNS = [
  /npx tsx ([^\s\n]+)/g,
  /node ([^\s\n]+)/g,
  /bash ([^\s\n]+)/g,
  /python3? ([^\s\n]+)/g,
];

function extractPaths(content, skillDir) {
  const found = new Set();
  for (const regex of PATH_PATTERNS) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      let p = match[1] || match[0];
      if (p.startsWith('./')) p = path.join(skillDir, p);
      else if (!path.isAbsolute(p)) p = path.join(REPO_DIR, p);
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
      found.push(match[1].trim());
    }
  }
  return found;
}

function checkPath(p) {
  return fs.existsSync(p);
}

function checkScriptHelp(scriptPath) {
  const fullPath = path.isAbsolute(scriptPath) ? scriptPath : path.join(REPO_DIR, scriptPath);
  if (!fs.existsSync(fullPath)) return { ok: false, reason: 'file not found' };
  if (!fullPath.match(/\.(js|ts|mjs|py)$/)) return { ok: true };
  const result = spawnSync('node', [fullPath, '--help'], { encoding: 'utf-8', timeout: 5000 });
  if (result.status === 0 || result.stdout.includes('Usage')) return { ok: true };
  return { ok: false, reason: '--help failed or no usage info' };
}

function main() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('[skill-health] No skills directory found.');
    return;
  }

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
      const check = checkScriptHelp(s);
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

  if (fs.existsSync(EMAIL_SCRIPT)) {
    spawnSync(PYTHON_BIN, [EMAIL_SCRIPT, '[Skill Health] Monthly Scan', REPORT_TO, draftPath], {
      cwd: REPO_DIR,
      encoding: 'utf-8',
    });
  }
}

main();
