#!/usr/bin/env node
/**
 * Self-Improvement Orchestrator
 *
 * Weekly shadow-mode agent that reads recent .learnings/ entries,
 * clusters recurring error patterns, and proposes AGENTS.md rule updates.
 *
 * Safety: this script is READ-ONLY for AGENTS.md. It only writes proposals
 * to .learnings/rules-pending/ and sends an email report.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const LEARNINGS_DIR = path.join(REPO_DIR, '.learnings');
const RULES_PENDING_DIR = path.join(LEARNINGS_DIR, 'rules-pending');
const EMAIL_SCRIPT = path.join(REPO_DIR, '.automation', 'scripts', 'send_email.py');
const PYTHON_BIN = process.env.DAILY_PYTHON_BIN || '/usr/bin/python3';
const REPORT_TO = process.env.DAILY_REPORT_TO || 'jackandking@163.com';

const LOOKBACK_DAYS = 7;
const RECURRENCE_THRESHOLD = 2;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function parseMdFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const statusMatch = content.match(/\*\*Status\*\*:\s*(\S+)/);
  const patternMatch = content.match(/\*\*Pattern-Key\*\*:\s*(\S+)/);
  const areaMatch = content.match(/\*\*Area\*\*:\s*(\S+)/);
  const summaryMatch = content.match(/### Summary\n+(.+?)(?:\n{2,}|\n###)/s);
  const dateMatch = path.basename(filePath).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const idMatch = content.match(/##\s*\[(\S+)\]/);

  return {
    id: idMatch ? idMatch[1] : path.basename(filePath, '.md'),
    file: filePath,
    status: statusMatch ? statusMatch[1] : 'unknown',
    patternKey: patternMatch ? patternMatch[1] : '',
    area: areaMatch ? areaMatch[1] : 'unknown',
    summary: summaryMatch ? summaryMatch[1].trim() : '',
    date: dateMatch ? `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}` : '',
  };
}

function getPendingEntries(sinceDate) {
  const entries = [];
  const years = fs.readdirSync(LEARNINGS_DIR).filter((d) => /^\d{4}$/.test(d));

  for (const year of years) {
    const yearDir = path.join(LEARNINGS_DIR, year);
    if (!fs.statSync(yearDir).isDirectory()) continue;
    const months = fs.readdirSync(yearDir).filter((d) => /^\d{2}$/.test(d));

    for (const month of months) {
      const monthDir = path.join(yearDir, month);
      if (!fs.statSync(monthDir).isDirectory()) continue;
      const files = fs.readdirSync(monthDir).filter((f) => f.endsWith('.md'));

      for (const file of files) {
        const filePath = path.join(monthDir, file);
        const parsed = parseMdFile(filePath);
        if (!parsed.date) continue;
        const fileDate = new Date(parsed.date);
        if (fileDate >= sinceDate && parsed.status === 'pending') {
          entries.push(parsed);
        }
      }
    }
  }

  return entries;
}

function clusterByPattern(entries) {
  const clusters = {};
  for (const entry of entries) {
    const key = entry.patternKey || entry.area;
    if (!clusters[key]) {
      clusters[key] = [];
    }
    clusters[key].push(entry);
  }
  return clusters;
}

function generateRuleProposal(patternKey, entries) {
  const dateStr = new Date().toISOString().slice(0, 10);
  const summaries = entries.map((e) => `- ${e.id}: ${e.summary}`).join('\n');
  const relatedFiles = [
    ...new Set(entries.flatMap((e) => {
      const match = e.file.match(/Related Files:\s*(.+?)(?:\n{2,}|\n###)/s);
      return match ? match[1].split(',').map((s) => s.trim()) : [];
    })),
  ];

  let ruleTitle = patternKey;
  let ruleContent = '';

  if (patternKey === 'harden.log_redirection') {
    ruleTitle = 'Cron Log Redirection';
    ruleContent =
      '- If a script uses `tee -a "$LOG_FILE"` internally, the cron command must NOT append `>> "$LOG_FILE" 2>&1`.\n' +
      '- If the script only prints to stdout/stderr, add the redirection in the cron command.';
  } else if (patternKey === 'harness.path_isolation') {
    ruleTitle = 'Harness Path Isolation';
    ruleContent =
      '- `.harness` scripts, logs, and runtime data must live under `.harness/.local/`.\n' +
      '- Never redirect `.harness` cron output to `.automation/.local/logs/`.';
  } else {
    ruleTitle = patternKey;
    ruleContent = `- Recurring issue detected ${entries.length} time(s) in the last ${LOOKBACK_DAYS} days. Review related files and add a specific hard rule.`;
  }

  const proposalPath = path.join(RULES_PENDING_DIR, `${dateStr}-${patternKey}.md`);
  const body = `# AGENTS.md Rule Proposal: ${ruleTitle}

**Generated**: ${dateStr}
**Pattern-Key**: ${patternKey}
**Occurrences**: ${entries.length}
**Area**: ${entries[0]?.area || 'unknown'}

## Proposed Rule

${ruleContent}

## Source Entries

${summaries}

## Related Files

${relatedFiles.length > 0 ? relatedFiles.map((f) => `- ${f}`).join('\n') : '- N/A'}

## Action Required

1. Review the proposed rule above.
2. If correct, copy it into the relevant \`AGENTS.md\` file.
3. Update the source \`.learnings/\` entries from \`Status: pending\` to \`Status: resolved\`.
4. Delete this proposal file.

---
*Generated by self-improvement-orchestrator.js*
`;

  return { proposalPath, body, title: ruleTitle };
}

async function main() {
  ensureDir(RULES_PENDING_DIR);

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - LOOKBACK_DAYS);
  sinceDate.setHours(0, 0, 0, 0);

  console.log(`[self-improvement] Scanning pending entries since ${sinceDate.toISOString().slice(0, 10)}...`);

  const entries = getPendingEntries(sinceDate);
  console.log(`[self-improvement] Found ${entries.length} pending entries.`);

  const clusters = clusterByPattern(entries);
  const proposals = [];

  for (const [patternKey, clusterEntries] of Object.entries(clusters)) {
    if (!patternKey || clusterEntries.length < RECURRENCE_THRESHOLD) continue;

    const { proposalPath, body, title } = generateRuleProposal(patternKey, clusterEntries);

    if (!fs.existsSync(proposalPath)) {
      fs.writeFileSync(proposalPath, body, 'utf-8');
      console.log(`[self-improvement] Created proposal: ${proposalPath}`);
    } else {
      console.log(`[self-improvement] Proposal already exists: ${proposalPath}`);
    }

    proposals.push({ title, proposalPath, entries: clusterEntries });
  }

  // Send report
  const dateStr = new Date().toISOString().slice(0, 10);
  const subject = `[Self-Improvement] Weekly Report ${dateStr}`;
  let bodyText = `Self-Improvement Weekly Report\nDate: ${dateStr}\n\n`;

  if (proposals.length === 0) {
    bodyText += 'No recurring pending patterns found in the last 7 days.\n';
  } else {
    bodyText += `Found ${proposals.length} recurring pattern(s):\n\n`;
    for (const p of proposals) {
      bodyText += `- ${p.title} (${p.entries.length} occurrences)\n`;
      bodyText += `  Proposal file: ${p.proposalPath}\n\n`;
    }
    bodyText += 'Please review the proposal files and update the relevant AGENTS.md if appropriate.\n';
  }

  const draftPath = path.join(LEARNINGS_DIR, 'report-latest.txt');
  fs.writeFileSync(draftPath, bodyText, 'utf-8');

  if (fs.existsSync(EMAIL_SCRIPT)) {
    const result = spawnSync(PYTHON_BIN, [EMAIL_SCRIPT, subject, REPORT_TO, draftPath], {
      cwd: REPO_DIR,
      encoding: 'utf-8',
    });
    if (result.status === 0) {
      console.log(`[self-improvement] Report sent to ${REPORT_TO}`);
    } else {
      console.error(`[self-improvement] Failed to send email: ${result.stderr || result.stdout}`);
    }
  } else {
    console.log(`[self-improvement] Email script not found. Report saved to ${draftPath}`);
  }
}

main().catch((err) => {
  console.error('[self-improvement] Orchestrator failed:', err);
  process.exit(1);
});
