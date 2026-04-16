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

const MAX_ATTEMPTS_PER_WEEK = 3;
const ALLOWED_HOURS = [2, 3, 4, 5]; // 02:00 - 05:59
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

function getPendingProposals() {
  if (!fs.existsSync(RULES_PENDING_DIR)) return [];
  return fs.readdirSync(RULES_PENDING_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const content = fs.readFileSync(path.join(RULES_PENDING_DIR, f), 'utf-8');
      const patternMatch = content.match(/\*\*Pattern-Key\*\*:\s*(\S+)/);
      return {
        file: f,
        filePath: path.join(RULES_PENDING_DIR, f),
        patternKey: patternMatch ? patternMatch[1] : '',
        content,
      };
    })
    .filter((p) => FIXERS[p.patternKey]);
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
// Main
// ---------------------------------------------------------------------------

async function main() {
  // Kill switch
  const killSwitch = path.join(REPO_DIR, '.automation', '.local', 'state', 'SELF_EVOLUTION_DISABLED');
  if (fs.existsSync(killSwitch)) {
    console.log('[auto-fix] Kill switch active. Exiting.');
    process.exit(0);
  }

  // Dev-only guard
  if (!REPO_DIR.includes('LetMeTryAI') || REPO_DIR.includes('/prod/')) {
    console.log(`[auto-fix] Dev-only guard: refusing to run in ${REPO_DIR}. Exiting.`);
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

  console.log(`[auto-fix] Found ${proposals.length} fixable proposal(s).`);

  const results = [];

  for (const proposal of proposals) {
    if (attempts + results.filter((r) => r.attempted).length >= MAX_ATTEMPTS_PER_WEEK) {
      console.log('[auto-fix] Skipping remaining proposals due to weekly limit.');
      break;
    }

    const fixer = FIXERS[proposal.patternKey];
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const branchName = `auto-fix/${dateStr}-${proposal.patternKey}`;

    console.log(`[auto-fix] Attempting fix for pattern: ${proposal.patternKey}`);

    let attemptResult = {
      attempted: true,
      patternKey: proposal.patternKey,
      branchName,
      patched: false,
      testsPassed: false,
      pushed: false,
      error: null,
    };

    try {
      const affectedFiles = fixer.findFiles(REPO_DIR);
      for (const f of affectedFiles) {
        const check = validateFileWhitelist(f, REPO_DIR);
        if (!check.ok) {
          throw new Error(`File whitelist rejected ${path.relative(REPO_DIR, f)}: ${check.reason}`);
        }
      }

      withTempWorktree(REPO_DIR, (worktreeDir) => {
        // Apply fix inside worktree
        const applyResult = fixer.apply(worktreeDir);
        if (!applyResult.patched) {
          throw new Error(`Fix did not apply: ${applyResult.reason}`);
        }
        attemptResult.patched = true;
        attemptResult.files = applyResult.files.map((f) => path.relative(worktreeDir, f));

        // Run tests
        const testCmd = fixer.testCommand;
        const testCwd = testCmd.cwd === '.' ? worktreeDir : path.join(worktreeDir, testCmd.cwd);
        const testResult = runProcess(testCmd.cmd, testCmd.args, testCwd);
        attemptResult.testOutput = testResult.stdout + '\n' + testResult.stderr;
        if (testResult.status !== 0) {
          throw new Error(`Tests failed with exit code ${testResult.status}`);
        }
        attemptResult.testsPassed = true;

        // Generate patch from worktree
        const patchResult = runProcess('git', ['diff', 'HEAD'], worktreeDir);
        if (!patchResult.stdout.trim()) {
          throw new Error('No diff generated after fix');
        }
        const patchContent = patchResult.stdout;

        // Diff size guard
        const diffLines = patchContent.split('\n').length;
        if (diffLines > MAX_DIFF_LINES) {
          throw new Error(`Diff too large (${diffLines} lines > ${MAX_DIFF_LINES} limit)`);
        }

        // File deletion guard
        if (!ALLOW_FILE_DELETION && /deleted file mode/.test(patchContent)) {
          throw new Error('Patch contains file deletions, which are not allowed');
        }

        // Sensitive content guard
        for (const pattern of FORBID_PATTERNS) {
          if (pattern.test(patchContent)) {
            throw new Error(`Patch contains forbidden pattern: ${pattern.source}`);
          }
        }

        const patchFile = path.join(PATCHES_DIR, `${branchName}.patch`);
        fs.writeFileSync(patchFile, patchContent, 'utf-8');
        attemptResult.patchFile = patchFile;

        // Create branch and commit in real repo
        try {
          git(['checkout', '-b', branchName], REPO_DIR);
          for (const f of applyResult.files) {
            const relPath = path.relative(REPO_DIR, f);
            // We need to apply the same change to the real repo. Re-apply fix on real repo.
            // Actually, easier: apply the patch to the real repo while on the branch.
          }
          // Better approach: apply fix again on real repo (same function is deterministic)
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
          // Cleanup branch if created
          try {
            git(['checkout', '-'], REPO_DIR);
            git(['branch', '-D', branchName], REPO_DIR);
          } catch {
            // ignore cleanup errors
          }
          throw branchErr;
        }
      });
    } catch (err) {
      attemptResult.error = err.message;
      console.error(`[auto-fix] Failed for ${proposal.patternKey}: ${err.message}`);
    }

    logAudit({
      timestamp: now.toISOString(),
      mode: 'attempt',
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
  }
}

main().catch((err) => {
  console.error('[auto-fix] Fatal error:', err);
  process.exit(1);
});
