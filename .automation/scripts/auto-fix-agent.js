#!/usr/bin/env node
/**
 * Auto-Fix Agent
 *
 * A simple, safe, closed-loop auto-healing agent.
 *
 * Workflow:
 * 1. Reads .learnings/rules-pending/ proposals
 * 2. Matches known pattern-key -> fix template
 * 3. Creates a temp git worktree
 * 4. Applies the fix
 * 5. Runs tests
 * 6. If tests pass: commits to branch `auto-fix/YYYYMMDD-<pattern>` and pushes
 * 7. Sends email report with branch name and merge command
 * 8. Marks the learning entry as resolved (or leaves for human to resolve after merge)
 *
 * Safety guards:
 * - Only runs 02:00-06:00
 * - Max 3 attempts per week
 * - Only modifies whitelisted file patterns
 * - Only uses known fix templates
 * - All changes happen in isolated worktree first
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const LEARNINGS_DIR = path.join(REPO_DIR, '.learnings');
const RULES_PENDING_DIR = path.join(LEARNINGS_DIR, 'rules-pending');
const PATCHES_DIR = path.join(LEARNINGS_DIR, 'auto-fix-patches');
const AUDIT_LOG = path.join(REPO_DIR, '.automation', '.local', 'logs', 'auto-fix-audit.jsonl');
const EMAIL_SCRIPT = path.join(REPO_DIR, '.automation', 'scripts', 'send_email.py');
const PYTHON_BIN = process.env.DAILY_PYTHON_BIN || '/usr/bin/python3';
const REPORT_TO = process.env.DAILY_REPORT_TO || 'jackandking@163.com';

const MAX_ATTEMPTS_PER_WEEK = parseInt(process.env.AUTO_FIX_MAX_ATTEMPTS_PER_WEEK || '3', 10);
const ALLOWED_HOURS = process.env.AUTO_FIX_SKIP_TIME_CHECK
  ? Array.from({ length: 24 }, (_, i) => i) // allow any hour when called by auto-run
  : [2, 3, 4, 5]; // 02:00 - 05:59 for standalone runs
const WHITELISTED_EXTENSIONS = ['.sh', '.js', '.mjs', '.ts', '.md', '.json', '.yml', '.yaml'];
const WHITELISTED_DIRS = ['.automation/', '.harness/', 'scripts/', 'config/', 'docs/'];
const MAX_DIFF_LINES = 50;
const ALLOW_FILE_DELETION = false;
const FORBID_PATTERNS = [/password/i, /secret/i, /apiKey/i, /cookie/i];
const AUTO_FIX_MERGE_MODE = process.env.AUTO_FIX_MERGE_MODE || 'manual';
const SAFE_AUTO_MERGE_PATTERNS = (process.env.SAFE_AUTO_MERGE_PATTERNS || '').split(',').filter(Boolean);

// ---------------------------------------------------------------------------
// Fix Templates Registry
// ---------------------------------------------------------------------------

const FIXERS = {
  'harden.log_redirection': {
    description: 'Remove duplicate log redirection in cron setup scripts',
    findFiles: (repoDir) => {
      const candidates = [
        path.join(repoDir, '.automation/scripts/add-refine-cron.sh'),
      ];
      return candidates.filter((f) => fs.existsSync(f));
    },
    apply: (repoDir) => {
      const file = path.join(repoDir, '.automation/scripts/add-refine-cron.sh');
      if (!fs.existsSync(file)) return { patched: false, reason: 'File not found' };
      let content = fs.readFileSync(file, 'utf-8');
      const before = content;
      // Remove redirection for refine-vote-apps.sh cron command
      content = content.replace(
        /CRON_CMD="(\$CRON_TIME cd \\"\$PROJECT_DIR\\" && \\"\$REFINE_SCRIPT\\") >> \\"\$LOG_FILE\\" 2>&1"/,
        'CRON_CMD="$CRON_TIME cd \\"$PROJECT_DIR\\" && \\"$REFINE_SCRIPT\\""'
      );
      if (content === before) {
        return { patched: false, reason: 'No duplicate redirection found' };
      }
      fs.writeFileSync(file, content, 'utf-8');
      return { patched: true, files: [file] };
    },
    testCommand: { cwd: '.', cmd: 'npm', args: ['test'] },
  },

  'harness.path_isolation': {
    description: 'Redirect .harness logs away from .automation/.local/',
    findFiles: (repoDir) => {
      const candidates = [
        path.join(repoDir, '.harness/scripts'),
        path.join(repoDir, '.harness/verify.mjs'),
        path.join(repoDir, '.harness/README.md'),
      ];
      const files = [];
      for (const c of candidates) {
        if (!fs.existsSync(c)) continue;
        if (fs.statSync(c).isDirectory()) {
          files.push(
            ...fs.readdirSync(c)
              .filter((f) => f.endsWith('.sh'))
              .map((f) => path.join(c, f))
          );
        } else {
          files.push(c);
        }
      }
      return files;
    },
    apply: (repoDir) => {
      const files = FIXERS['harness.path_isolation'].findFiles(repoDir);
      const patchedFiles = [];
      for (const file of files) {
        let content = fs.readFileSync(file, 'utf-8');
        const before = content;
        // Replace hardcoded .automation/.local/logs/ and .automation/.local/harness/ references
        content = content.replace(/\.automation\/\.local\/logs\//g, '.harness/.local/logs/');
        content = content.replace(/\.automation\/\.local\/harness\//g, '.harness/.local/');
        if (content !== before) {
          fs.writeFileSync(file, content, 'utf-8');
          patchedFiles.push(file);
        }
      }
      if (patchedFiles.length === 0) {
        return { patched: false, reason: 'No hardcoded .automation/.local/ references found' };
      }
      return { patched: true, files: patchedFiles };
    },
    testCommand: { cwd: '.harness', cmd: 'npm', args: ['test'] },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function logAudit(entry) {
  const line = JSON.stringify(entry) + '\n';
  fs.appendFileSync(AUDIT_LOG, line, 'utf-8');
}

function getAttemptsThisWeek() {
  if (!fs.existsSync(AUDIT_LOG)) return 0;
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const lines = fs.readFileSync(AUDIT_LOG, 'utf-8').split('\n').filter(Boolean);
  let count = 0;
  for (const line of lines) {
    try {
      const entry = JSON.parse(line);
      const ts = new Date(entry.timestamp);
      if (ts >= startOfWeek) count += 1;
    } catch {
      // ignore
    }
  }
  return count;
}

function runProcess(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function git(args, cwd) {
  const result = runProcess('git', args, cwd);
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function validateFileWhitelist(filePath, repoDir) {
  const rel = path.relative(repoDir, filePath);
  const ext = path.extname(filePath);
  if (!WHITELISTED_EXTENSIONS.includes(ext)) {
    return { ok: false, reason: `Extension ${ext} not in whitelist` };
  }
  const inAllowedDir = WHITELISTED_DIRS.some((d) => rel.startsWith(d));
  if (!inAllowedDir) {
    return { ok: false, reason: `Path ${rel} not in allowed directories` };
  }
  return { ok: true };
}

function withTempWorktree(repoDir, fn) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'letmetry-auto-fix-'));
  const worktreeDir = path.join(tmpDir, 'worktree');
  git(['worktree', 'add', '--detach', worktreeDir, 'HEAD'], repoDir);
  try {
    // Symlink node_modules to allow tests to run
    const symlinks = [
      { src: path.join(repoDir, 'node_modules'), dst: path.join(worktreeDir, 'node_modules') },
      { src: path.join(repoDir, '.harness', 'node_modules'), dst: path.join(worktreeDir, '.harness', 'node_modules') },
    ];
    for (const { src, dst } of symlinks) {
      if (fs.existsSync(src) && !fs.existsSync(dst)) {
        fs.symlinkSync(src, dst);
      }
    }
    return fn(worktreeDir);
  } finally {
    git(['worktree', 'remove', '--force', worktreeDir], repoDir);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function checkJobSuccessRecently(jobPattern, hours) {
  const prodDir = process.env.PROD_DIR || REPO_DIR;
  const logDir = path.join(prodDir, '.harness', '.local', 'logs');
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - hours);

  if (!fs.existsSync(logDir)) return false;

  const entries = fs.readdirSync(logDir);
  for (const entry of entries) {
    if (!jobPattern.test(entry)) continue;
    const fullPath = path.join(logDir, entry);
    const stat = fs.statSync(fullPath);
    if (!stat.isFile() || stat.mtime < cutoff) continue;
    const content = fs.readFileSync(fullPath, 'utf-8');
    if (/completed successfully|success.*true/i.test(content)) {
      return true;
    }
  }
  return false;
}

function crossValidateProposal(proposal) {
  const patternKey = proposal.patternKey;

  // auth.session_expire: if daily-report succeeded recently, session is fine
  // Also skip if the proposal's own source entries contain success markers
  if (patternKey === 'auth.session_expire') {
    if (checkJobSuccessRecently(/daily-report.*\.log$/, 24)) {
      return {
        valid: false,
        reason: 'daily-report succeeded recently — session not expired (false positive)',
        action: 'skip',
      };
    }
    const successMarkers = ['✓', 'completed successfully', 'step publish'];
    const contentLower = proposal.content.toLowerCase();
    if (successMarkers.some((m) => contentLower.includes(m))) {
      return {
        valid: false,
        reason: 'source entries contain success markers — likely false positive',
        action: 'skip',
      };
    }
  }

  // infra.timeout / infra.network: if any harness job succeeded recently, skip
  if (patternKey === 'infra.timeout' || patternKey === 'infra.network') {
    if (checkJobSuccessRecently(/.*\.log$/, 24)) {
      return {
        valid: false,
        reason: 'harness jobs succeeded recently — infra issue may be transient (false positive)',
        action: 'skip',
      };
    }
  }

  // runtime.error / runtime.failure: if proposal source entries contain success markers, skip
  if (patternKey === 'runtime.error' || patternKey === 'runtime.failure') {
    const successMarkers = ['✓', 'completed successfully', 'email sent', 'response received', 'step publish'];
    const contentLower = proposal.content.toLowerCase();
    const hasSuccess = successMarkers.some((m) => contentLower.includes(m));
    if (hasSuccess) {
      return {
        valid: false,
        reason: 'source entries contain success markers — likely false positive',
        action: 'skip',
      };
    }
  }

  return { valid: true };
}

function getPendingProposals() {
  if (!fs.existsSync(RULES_PENDING_DIR)) return [];
  const proposals = fs.readdirSync(RULES_PENDING_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const content = fs.readFileSync(path.join(RULES_PENDING_DIR, f), 'utf-8');
      const patternMatch = content.match(/\*\*Pattern-Key\*\*:\s*(\S+)/);
      return {
        file: f,
        filePath: path.join(RULES_PENDING_DIR, f),
        patternKey: patternMatch ? patternMatch[1] : '',
        content,
        hasTemplateFixer: !!(patternMatch && FIXERS[patternMatch[1]]),
      };
    });

  // Cross-validate and filter out false positives
  const validated = [];
  for (const p of proposals) {
    const check = crossValidateProposal(p);
    if (check.valid) {
      validated.push(p);
    } else {
      console.log(`[auto-fix] Cross-validation SKIP: ${p.patternKey} — ${check.reason}`);
    }
  }
  return validated;
}

function sendEmailReport(subject, body) {
  ensureDir(LEARNINGS_DIR);
  const draftPath = path.join(LEARNINGS_DIR, 'auto-fix-report-latest.txt');
  fs.writeFileSync(draftPath, body, 'utf-8');

  if (!fs.existsSync(EMAIL_SCRIPT)) {
    console.log(`[auto-fix] Email script missing. Report saved to ${draftPath}`);
    return { sent: false, draftPath };
  }

  const result = spawnSync(PYTHON_BIN, [EMAIL_SCRIPT, subject, REPORT_TO, draftPath], {
    cwd: REPO_DIR,
    encoding: 'utf-8',
  });

  if (result.status === 0) {
    console.log(`[auto-fix] Report sent to ${REPORT_TO}`);
    return { sent: true, draftPath };
  }
  console.error(`[auto-fix] Email failed: ${result.stderr || result.stdout}`);
  return { sent: false, draftPath };
}

// ---------------------------------------------------------------------------
// AI-Powered Fix Generation
// ---------------------------------------------------------------------------

function extractFileRefsFromLearning(content) {
  // Extract file paths mentioned in the learning entry
  const refs = [];
  const patterns = [
    /(?:in|at|from|file)\s+[`"]?([.\w/-]+\.[a-z]{1,4})[`"]?/gi,
    /([.\w/-]+\.(?:js|ts|mjs|sh|json))\b/g,
  ];
  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const filePath = match[1];
      if (filePath.includes('/') && !refs.includes(filePath)) {
        refs.push(filePath);
      }
    }
  }
  return refs.slice(0, 5); // limit to 5 files
}

function buildAiFixPrompt(proposal, repoDir) {
  const fileRefs = extractFileRefsFromLearning(proposal.content);
  let codeContext = '';

  for (const ref of fileRefs) {
    const fullPath = path.join(repoDir, ref);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        // Limit to first 200 lines to keep prompt manageable
        const lines = content.split('\n').slice(0, 200).join('\n');
        codeContext += `\n### ${ref}\n\`\`\`\n${lines}\n\`\`\`\n`;
      } catch {
        // skip unreadable files
      }
    }
  }

  return `You are a code fixing agent for the LetMeTryAI project.

## Error Report
${proposal.content}

## Relevant Source Code
${codeContext || '(no source files found — analyze the error and suggest which files to modify)'}

## Rules
- Only modify files in these directories: .automation/, .harness/, scripts/, config/
- The patch must be less than 50 lines of diff
- Do NOT delete any files
- Do NOT include passwords, secrets, API keys, or cookies in the patch
- Output ONLY a unified diff patch (the kind produced by \`git diff\`) that can be applied with \`git apply\`
- If this error is caused by an external dependency (e.g., API down, service unavailable) and cannot be fixed by code changes, respond with exactly: NO_CODE_FIX_NEEDED
- Wrap the patch in a code block with \`\`\`diff ... \`\`\`

## Output Format
\`\`\`diff
--- a/path/to/file
+++ b/path/to/file
@@ ... @@
 context line
-old line
+new line
\`\`\``;
}

function callCopilotForFix(prompt) {
  const copilotBin = process.env.COPILOT_BIN || 'copilot';
  const timeout = parseInt(process.env.AI_FIX_TIMEOUT_MS || '300000', 10);

  console.log(`[auto-fix] Calling Copilot for AI-generated fix...`);
  const result = spawnSync(copilotBin, ['-p', prompt, '--yolo'], {
    encoding: 'utf-8',
    timeout,
    maxBuffer: 5 * 1024 * 1024,
  });

  if (result.status !== 0 || result.error) {
    const errMsg = result.error?.message || result.stderr || 'unknown error';
    console.log(`[auto-fix] Copilot failed: ${errMsg}`);
    return null;
  }

  return result.stdout;
}

function resolveKimiBin() {
  if (process.env.KIMI_BIN) return process.env.KIMI_BIN;

  const whichResult = spawnSync('which', ['kimi'], { encoding: 'utf-8' });
  if (whichResult.status === 0 && whichResult.stdout.trim()) {
    return whichResult.stdout.trim();
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const commonPaths = [
    path.join(homeDir, '.local', 'bin', 'kimi'),
    '/usr/local/bin/kimi',
    '/opt/homebrew/bin/kimi',
  ];
  for (const p of commonPaths) {
    if (fs.existsSync(p)) return p;
  }

  return 'kimi';
}

function callKimiForFix(prompt) {
  const kimiBin = resolveKimiBin();
  const timeout = parseInt(process.env.KIMI_FIX_TIMEOUT_MS || '600000', 10);

  console.log(`[auto-fix] Calling Kimi CLI as fallback (${kimiBin})...`);
  const result = spawnSync(kimiBin, [
    '--quiet',
    '-p', prompt,
    '--max-steps-per-turn', '20',
  ], {
    encoding: 'utf-8',
    timeout,
    maxBuffer: 5 * 1024 * 1024,
  });

  if (result.status !== 0) {
    const errMsg = result.error?.message || result.stderr || `exit code ${result.status}`;
    console.log(`[auto-fix] Kimi CLI failed: ${errMsg}`);
    return null;
  }

  if (!result.stdout || !result.stdout.trim()) {
    console.log('[auto-fix] Kimi CLI returned empty output');
    return null;
  }

  // Strip the session resume line that kimi appends
  let stdout = result.stdout || '';
  const resumeLine = stdout.match(/\nTo resume this session: .*/);
  if (resumeLine) {
    stdout = stdout.slice(0, resumeLine.index);
  }
  return stdout;
}

function extractPatchFromAiResponse(response) {
  if (!response) return null;
  if (response.includes('NO_CODE_FIX_NEEDED')) return 'NO_CODE_FIX_NEEDED';

  // Extract diff from code block
  const match = response.match(/```diff\n([\s\S]*?)```/);
  if (match) return match[1].trim();

  // Try without language tag
  const match2 = response.match(/```\n(---[\s\S]*?)```/);
  if (match2) return match2[1].trim();

  // If response starts with --- it might be a raw patch
  if (response.trim().startsWith('---')) return response.trim();

  return null;
}

function applyAiFix(proposal, repoDir) {
  const prompt = buildAiFixPrompt(proposal, repoDir);
  let aiResponse = callCopilotForFix(prompt);
  if (!aiResponse) {
    aiResponse = callKimiForFix(prompt);
  }
  const patch = extractPatchFromAiResponse(aiResponse);

  if (!patch) {
    return { patched: false, reason: 'AI did not produce a valid patch', source: 'ai' };
  }

  if (patch === 'NO_CODE_FIX_NEEDED') {
    return { patched: false, reason: 'AI determined this is not a code issue', source: 'ai' };
  }

  // Write patch to temp file and apply
  const patchFile = path.join(os.tmpdir(), `auto-fix-ai-${Date.now()}.patch`);
  fs.writeFileSync(patchFile, patch, 'utf-8');

  try {
    const applyResult = runProcess('git', ['apply', '--check', patchFile], repoDir);
    if (applyResult.status !== 0) {
      return { patched: false, reason: `Patch does not apply cleanly: ${applyResult.stderr}`, source: 'ai' };
    }

    // Actually apply
    const realApply = runProcess('git', ['apply', patchFile], repoDir);
    if (realApply.status !== 0) {
      return { patched: false, reason: `Patch apply failed: ${realApply.stderr}`, source: 'ai' };
    }

    // Find which files were changed
    const statusResult = runProcess('git', ['diff', '--name-only'], repoDir);
    const changedFiles = statusResult.stdout.trim().split('\n').filter(Boolean)
      .map(f => path.join(repoDir, f));

    return { patched: true, files: changedFiles, patchContent: patch, source: 'ai' };
  } finally {
    try { fs.unlinkSync(patchFile); } catch {}
  }
}

async function main() {
  // Kill switch
  const killSwitch = path.join(REPO_DIR, '.automation', '.local', 'state', 'SELF_EVOLUTION_DISABLED');
  if (fs.existsSync(killSwitch)) {
    console.log('[auto-fix] Kill switch active. Exiting.');
    process.exit(0);
  }

  // Safety guard: refuse to run in the prod directory
  if (REPO_DIR.includes('/prod/')) {
    console.log(`[auto-fix] Safety guard: refusing to run in prod directory (${REPO_DIR}). Exiting.`);
    process.exit(0);
  }

  ensureDir(PATCHES_DIR);
  ensureDir(path.dirname(AUDIT_LOG));

  const now = new Date();
  const hour = now.getHours();

  // Safety gate: time window
  if (!ALLOWED_HOURS.includes(hour)) {
    console.log(`[auto-fix] Outside allowed time window (02:00-05:59). Current hour: ${hour}. Exiting.`);
    process.exit(0);
  }

  // Safety gate: weekly attempt limit
  const attempts = getAttemptsThisWeek();
  if (attempts >= MAX_ATTEMPTS_PER_WEEK) {
    console.log(`[auto-fix] Weekly attempt limit reached (${attempts}/${MAX_ATTEMPTS_PER_WEEK}). Exiting.`);
    process.exit(0);
  }

  const proposals = getPendingProposals();
  if (proposals.length === 0) {
    console.log('[auto-fix] No fixable proposals found.');
    process.exit(0);
  }

  console.log(`[auto-fix] Found ${proposals.length} proposal(s) (${proposals.filter(p => p.hasTemplateFixer).length} with template, ${proposals.filter(p => !p.hasTemplateFixer).length} for AI).`);

  const results = [];

  for (const proposal of proposals) {
    if (attempts + results.filter((r) => r.attempted).length >= MAX_ATTEMPTS_PER_WEEK) {
      console.log('[auto-fix] Skipping remaining proposals due to weekly limit.');
      break;
    }

    const fixer = FIXERS[proposal.patternKey];
    const useAi = !fixer;
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const branchName = `auto-fix/${dateStr}-${proposal.patternKey || 'ai-fix'}`;

    console.log(`[auto-fix] Attempting ${useAi ? 'AI' : 'template'} fix for: ${proposal.patternKey || proposal.file}`);

    let attemptResult = {
      attempted: true,
      patternKey: proposal.patternKey,
      branchName,
      patched: false,
      testsPassed: false,
      pushed: false,
      error: null,
      source: useAi ? 'ai' : 'template',
    };

    try {
      if (useAi) {
        // AI-generated fix path
        withTempWorktree(REPO_DIR, (worktreeDir) => {
          const aiResult = applyAiFix(proposal, worktreeDir);
          if (!aiResult.patched) {
            throw new Error(`AI fix did not apply: ${aiResult.reason}`);
          }
          attemptResult.patched = true;
          attemptResult.files = aiResult.files.map((f) => path.relative(worktreeDir, f));

          // Validate files against whitelist
          for (const f of aiResult.files) {
            const check = validateFileWhitelist(f, worktreeDir);
            if (!check.ok) {
              throw new Error(`AI patch touches disallowed file: ${check.reason}`);
            }
          }

          // Diff size guard
          const patchLines = (aiResult.patchContent || '').split('\n').length;
          if (patchLines > MAX_DIFF_LINES) {
            throw new Error(`AI patch too large (${patchLines} lines > ${MAX_DIFF_LINES} limit)`);
          }

          // Sensitive content guard
          for (const pattern of FORBID_PATTERNS) {
            if (pattern.test(aiResult.patchContent || '')) {
              throw new Error(`AI patch contains forbidden pattern: ${pattern.source}`);
            }
          }

          // Run tests
          const testResult = runProcess('npm', ['test'], worktreeDir);
          attemptResult.testOutput = testResult.stdout + '\n' + testResult.stderr;
          if (testResult.status !== 0) {
            throw new Error(`Tests failed with exit code ${testResult.status}`);
          }
          attemptResult.testsPassed = true;

          // Shadow verification
          console.log(`[auto-fix] Running shadow verification...`);
          const shadowCwd = path.join(worktreeDir, '.harness');
          const shadowEnv = { ...process.env, HARNESS_MODE: 'shadow', PROJECT_DIR: worktreeDir };
          const shadowProc = spawnSync('npx', [
            'tsx', 'scripts/run-daily-app-profile.ts', 'nanrenbao',
          ], { cwd: shadowCwd, encoding: 'utf-8', env: shadowEnv, timeout: 5 * 60 * 1000 });
          if (shadowProc.status !== 0) {
            attemptResult.shadowPassed = false;
            throw new Error(`Shadow verification failed: ${(shadowProc.stderr || shadowProc.stdout || '').slice(0, 500)}`);
          }
          attemptResult.shadowPassed = true;

          // Save patch
          const patchFile = path.join(PATCHES_DIR, `${branchName.replace(/\//g, '-')}.patch`);
          fs.writeFileSync(patchFile, aiResult.patchContent, 'utf-8');
          attemptResult.patchFile = patchFile;

          // Create branch and apply in real repo
          try {
            git(['checkout', '-b', branchName], REPO_DIR);
            const realResult = applyAiFix(proposal, REPO_DIR);
            if (!realResult.patched) {
              git(['checkout', '-'], REPO_DIR);
              git(['branch', '-D', branchName], REPO_DIR);
              throw new Error(`Real repo AI fix did not apply: ${realResult.reason}`);
            }
            for (const f of realResult.files) {
              git(['add', path.relative(REPO_DIR, f)], REPO_DIR);
            }
            git(['commit', '-m', `auto-fix(ai): ${proposal.patternKey || 'general'}\n\nPattern: ${proposal.patternKey}\nSource: ai-generated`], REPO_DIR);
            git(['push', 'origin', branchName], REPO_DIR);
            attemptResult.pushed = true;
          } catch (branchErr) {
            try {
              git(['checkout', '-'], REPO_DIR);
              git(['branch', '-D', branchName], REPO_DIR);
            } catch {}
            throw branchErr;
          }
        });
      } else {
        // Template fixer path (existing logic)
        const affectedFiles = fixer.findFiles(REPO_DIR);
        for (const f of affectedFiles) {
          const check = validateFileWhitelist(f, REPO_DIR);
          if (!check.ok) {
            throw new Error(`File whitelist rejected ${path.relative(REPO_DIR, f)}: ${check.reason}`);
          }
        }

        withTempWorktree(REPO_DIR, (worktreeDir) => {
          const applyResult = fixer.apply(worktreeDir);
          if (!applyResult.patched) {
            throw new Error(`Fix did not apply: ${applyResult.reason}`);
          }
          attemptResult.patched = true;
          attemptResult.files = applyResult.files.map((f) => path.relative(worktreeDir, f));

          const testCmd = fixer.testCommand;
          const testCwd = testCmd.cwd === '.' ? worktreeDir : path.join(worktreeDir, testCmd.cwd);
          const testResult = runProcess(testCmd.cmd, testCmd.args, testCwd);
          attemptResult.testOutput = testResult.stdout + '\n' + testResult.stderr;
          if (testResult.status !== 0) {
            throw new Error(`Tests failed with exit code ${testResult.status}`);
          }
          attemptResult.testsPassed = true;

          console.log(`[auto-fix] Running shadow verification...`);
          const shadowCwd = path.join(worktreeDir, '.harness');
          const shadowEnv = { ...process.env, HARNESS_MODE: 'shadow', PROJECT_DIR: worktreeDir };
          const shadowProc = spawnSync('npx', [
            'tsx', 'scripts/run-daily-app-profile.ts', 'nanrenbao',
          ], { cwd: shadowCwd, encoding: 'utf-8', env: shadowEnv, timeout: 5 * 60 * 1000 });
          if (shadowProc.status !== 0) {
            attemptResult.shadowPassed = false;
            throw new Error(`Shadow verification failed: ${(shadowProc.stderr || shadowProc.stdout || '').slice(0, 500)}`);
          }
          attemptResult.shadowPassed = true;
          console.log(`[auto-fix] Shadow verification passed`);

          const patchResult = runProcess('git', ['diff', 'HEAD'], worktreeDir);
          if (!patchResult.stdout.trim()) {
            throw new Error('No diff generated after fix');
          }
          const patchContent = patchResult.stdout;
          const diffLines = patchContent.split('\n').length;
          if (diffLines > MAX_DIFF_LINES) {
            throw new Error(`Diff too large (${diffLines} lines > ${MAX_DIFF_LINES} limit)`);
          }
          if (!ALLOW_FILE_DELETION && /deleted file mode/.test(patchContent)) {
            throw new Error('Patch contains file deletions, which are not allowed');
          }
          for (const pattern of FORBID_PATTERNS) {
            if (pattern.test(patchContent)) {
              throw new Error(`Patch contains forbidden pattern: ${pattern.source}`);
            }
          }

          const patchFile = path.join(PATCHES_DIR, `${branchName}.patch`);
          fs.writeFileSync(patchFile, patchContent, 'utf-8');
          attemptResult.patchFile = patchFile;

          try {
            git(['checkout', '-b', branchName], REPO_DIR);
            const realApplyResult = fixer.apply(REPO_DIR);
            if (!realApplyResult.patched) {
              git(['checkout', '-'], REPO_DIR);
              git(['branch', '-D', branchName], REPO_DIR);
              throw new Error(`Real repo fix did not apply: ${realApplyResult.reason}`);
            }
            for (const f of realApplyResult.files) {
              git(['add', path.relative(REPO_DIR, f)], REPO_DIR);
            }
            git(['commit', '-m', `auto-fix: ${fixer.description}\n\nPattern: ${proposal.patternKey}`], REPO_DIR);
            git(['push', 'origin', branchName], REPO_DIR);
            attemptResult.pushed = true;
          } catch (branchErr) {
            try {
              git(['checkout', '-'], REPO_DIR);
              git(['branch', '-D', branchName], REPO_DIR);
            } catch {}
            throw branchErr;
          }
        });
      } // end if/else useAi
    } catch (err) {
      attemptResult.error = err.message;
      console.error(`[auto-fix] Failed for ${proposal.patternKey}: ${err.message}`);
    }

    logAudit({
      timestamp: now.toISOString(),
      mode: 'attempt',
      source: attemptResult.source || 'template',
      pattern: proposal.patternKey,
      branchName: attemptResult.branchName,
      files: attemptResult.files || [],
      patched: attemptResult.patched,
      testsPassed: attemptResult.testsPassed,
      pushed: attemptResult.pushed,
      error: attemptResult.error,
    });

    results.push(attemptResult);
  }

  // Build and send report
  const subject = `[Auto-Fix] Weekly Report ${now.toISOString().slice(0, 10)}`;
  let body = `Auto-Fix Agent Weekly Report\nDate: ${now.toISOString().slice(0, 10)}\n\n`;

  const successes = results.filter((r) => r.pushed);
  const failures = results.filter((r) => !r.pushed && r.attempted);

  if (successes.length === 0 && failures.length === 0) {
    body += 'No fixable proposals were processed this week.\n';
  } else {
    if (successes.length > 0) {
      body += `Successfully created ${successes.length} branch(es):\n\n`;
      for (const s of successes) {
        body += `- Pattern: ${s.patternKey}\n`;
        body += `  Branch: ${s.branchName}\n`;
        body += `  Files: ${(s.files || []).join(', ')}\n`;
        body += `  Approve: git fetch && git merge origin/${s.branchName}\n\n`;
      }
    }
    if (failures.length > 0) {
      body += `Failed attempts (${failures.length}):\n\n`;
      for (const f of failures) {
        body += `- Pattern: ${f.patternKey}\n`;
        body += `  Reason: ${f.error || 'Unknown'}\n\n`;
      }
    }
  }

  body += `\nAudit log: ${AUDIT_LOG}\n`;
  body += `Pending proposals: ${RULES_PENDING_DIR}\n`;

  sendEmailReport(subject, body);

  // Clean up processed proposals that succeeded
  for (const s of successes) {
    const proposal = proposals.find((p) => p.patternKey === s.patternKey);
    if (proposal && fs.existsSync(proposal.filePath)) {
      fs.unlinkSync(proposal.filePath);
      console.log(`[auto-fix] Removed processed proposal: ${proposal.file}`);
    }

    // Auto-promote safe patterns if configured
    if (AUTO_FIX_MERGE_MODE === 'auto' && SAFE_AUTO_MERGE_PATTERNS.includes(s.patternKey)) {
      console.log(`[auto-fix] Auto-promoting safe pattern: ${s.patternKey}`);
      const promoteScript = path.join(REPO_DIR, '.automation', 'scripts', 'auto-promote.sh');
      const promoteResult = spawnSync('bash', [promoteScript, s.branchName], {
        cwd: REPO_DIR,
        encoding: 'utf-8',
        env: { ...process.env, AUTO_PROMOTE: 'true', PROD_DIR: process.env.PROD_DIR || '' },
      });
      if (promoteResult.status === 0) {
        console.log(`[auto-fix] Auto-promote succeeded for ${s.branchName}`);
        s.autoPromoted = true;
      } else {
        console.error(`[auto-fix] Auto-promote failed: ${promoteResult.stderr || promoteResult.stdout}`);
        s.autoPromoted = false;
      }
    }
  }
}

main().catch((err) => {
  console.error('[auto-fix] Fatal error:', err);
  process.exit(1);
});
