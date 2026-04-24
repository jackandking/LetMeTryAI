#!/usr/bin/env node
/**
 * category-rebalancer.js
 *
 * Reads topic-performance-summary.json and reorders preferredCategories
 * in profile JSON configs based on actual Kuaishou exposure data.
 *
 * Safety: only reorders existing categories, never adds or removes.
 *
 * Usage:
 *   node .automation/scripts/category-rebalancer.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const PERF_SUMMARY = path.join(REPO_DIR, '.automation', '.local', 'state', 'topic-performance-summary.json');
const PROFILES_DIR = path.join(REPO_DIR, '.harness', 'config', 'profiles');
const AUDIT_LOG = path.join(REPO_DIR, '.automation', '.local', 'logs', 'category-rebalancer.jsonl');
const DRY_RUN = process.argv.includes('--dry-run');

const PROFILE_IDS = ['nanrenbao', 'womanai', 'parent-tools', 'elder-love'];

function main() {
  if (!fs.existsSync(PERF_SUMMARY)) {
    console.log('[rebalancer] No performance summary found, skipping');
    process.exit(0);
  }

  const summary = JSON.parse(fs.readFileSync(PERF_SUMMARY, 'utf-8'));
  const ranking = summary.categoryRanking || [];

  if (ranking.length === 0) {
    console.log('[rebalancer] No category ranking data, skipping');
    process.exit(0);
  }

  console.log(`[rebalancer] Loaded performance data from ${summary.reportDate}, ${ranking.length} categories ranked`);

  let totalChanges = 0;

  for (const profileId of PROFILE_IDS) {
    const profilePath = path.join(PROFILES_DIR, `${profileId}.json`);
    if (!fs.existsSync(profilePath)) {
      console.log(`[rebalancer] ${profileId}: no JSON config, skipping`);
      continue;
    }

    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
    const original = [...profile.preferredCategories];

    const profileCats = new Set(original);
    const rankedForProfile = ranking
      .filter(r => profileCats.has(r.category))
      .map(r => r.category);

    const unranked = original.filter(c => !rankedForProfile.includes(c));
    const reordered = [...rankedForProfile, ...unranked];

    if (reordered.length !== original.length ||
        !original.every(c => reordered.includes(c))) {
      console.error(`[rebalancer] ${profileId}: safety check failed, skipping`);
      continue;
    }

    const changed = original.some((c, i) => c !== reordered[i]);
    if (!changed) {
      console.log(`[rebalancer] ${profileId}: no change needed`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`[rebalancer] DRY-RUN ${profileId}:`);
      console.log(`  Before: ${original.join(', ')}`);
      console.log(`  After:  ${reordered.join(', ')}`);
      totalChanges++;
      continue;
    }

    profile.preferredCategories = reordered;
    fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2) + '\n', 'utf-8');
    console.log(`[rebalancer] ${profileId}: reordered categories`);
    console.log(`  Before: ${original.join(', ')}`);
    console.log(`  After:  ${reordered.join(', ')}`);

    const audit = {
      timestamp: new Date().toISOString(),
      profileId,
      before: original,
      after: reordered,
      basedOn: summary.reportDate,
    };
    fs.mkdirSync(path.dirname(AUDIT_LOG), { recursive: true });
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(audit) + '\n', 'utf-8');
    totalChanges++;
  }

  console.log(`[rebalancer] Done. ${totalChanges} profile(s) ${DRY_RUN ? 'would change' : 'changed'}.`);
}

main();
