#!/usr/bin/env node
/**
 * category-rebalancer.js
 *
 * Reads topic-performance-summary.json and mount-data-summary.json,
 * then reorders preferredCategories in profile JSON configs based on
 * actual performance data.
 *
 * Ranking signal priority:
 *   1. Mount PLC enter count (direct measure of video → mini-program conversion)
 *   2. Kuaishou task exposure (daren platform data)
 *   3. Original order (fallback)
 *
 * Safety: only reorders existing categories, never adds or removes.
 *
 * Usage:
 *   node .automation/scripts/category-rebalancer.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const PERF_SUMMARY = path.join(REPO_DIR, '.automation', '.local', 'state', 'topic-performance-summary.json');
const MOUNT_SUMMARY = path.join(REPO_DIR, '.automation', '.local', 'state', 'mount-data-summary.json');
const HARNESS_RUNS_DIR = path.join(PROD_DIR, '.harness', '.local', 'state', 'daily-app-runs');
const PROFILES_DIR = path.join(REPO_DIR, '.harness', 'config', 'profiles');
const AUDIT_LOG = path.join(REPO_DIR, '.automation', '.local', 'logs', 'category-rebalancer.jsonl');
const DRY_RUN = process.argv.includes('--dry-run');

const PROFILE_IDS = ['nanrenbao', 'womanai', 'parent-tools', 'elder-love'];

function buildAppSlugToCategoryMap() {
  if (!fs.existsSync(HARNESS_RUNS_DIR)) return {};
  const map = {};
  for (const f of fs.readdirSync(HARNESS_RUNS_DIR)) {
    if (!f.endsWith('.jsonl')) continue;
    const lines = fs.readFileSync(path.join(HARNESS_RUNS_DIR, f), 'utf-8')
      .split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const run = JSON.parse(line);
        if (!run.success || !run.selectedTopic) continue;
        const t = run.selectedTopic;
        if (t.appId && t.category) {
          map[t.appId] = { category: t.category, profileId: run.profileId };
        }
      } catch {}
    }
  }
  return map;
}

function buildMountCategoryScores(mountSummary, slugToCategory) {
  const scores = {};
  for (const [profileId, data] of Object.entries(mountSummary.profiles || {})) {
    for (const app of (data.byApp || [])) {
      // Try exact match first, then strip date suffix for fuzzy match
      let mapping = slugToCategory[app.appSlug];
      if (!mapping) {
        const base = app.appSlug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
        mapping = slugToCategory[base];
      }
      if (!mapping || mapping.profileId !== profileId) continue;
      const cat = mapping.category;
      const key = `${profileId}:${cat}`;
      if (!scores[key]) scores[key] = { profileId, category: cat, plcEnter: 0 };
      scores[key].plcEnter += app.plcEnter;
    }
  }
  return scores;
}

function main() {
  // Load daren performance data (optional)
  let darenRanking = [];
  if (fs.existsSync(PERF_SUMMARY)) {
    const summary = JSON.parse(fs.readFileSync(PERF_SUMMARY, 'utf-8'));
    darenRanking = summary.categoryRanking || [];
    console.log(`[rebalancer] Daren data: ${darenRanking.length} categories from ${summary.reportDate}`);
  }

  // Load mount data (optional)
  let mountScores = {};
  if (fs.existsSync(MOUNT_SUMMARY)) {
    const mountSummary = JSON.parse(fs.readFileSync(MOUNT_SUMMARY, 'utf-8'));
    const slugToCategory = buildAppSlugToCategoryMap();
    mountScores = buildMountCategoryScores(mountSummary, slugToCategory);
    const mappedCount = Object.keys(mountScores).length;
    console.log(`[rebalancer] Mount data: ${mappedCount} profile:category pairs mapped`);
    if (mappedCount > 0) {
      for (const [key, val] of Object.entries(mountScores)) {
        console.log(`  ${key}: plcEnter=${val.plcEnter}`);
      }
    }
  }

  if (darenRanking.length === 0 && Object.keys(mountScores).length === 0) {
    console.log('[rebalancer] No performance data found, skipping');
    process.exit(0);
  }

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

    // Score each category: mount plcEnter (priority) then daren exposure
    const catScores = {};
    for (const cat of original) {
      const mountKey = `${profileId}:${cat}`;
      const mountPlcEnter = mountScores[mountKey]?.plcEnter || 0;
      const darenEntry = darenRanking.find(r => r.category === cat);
      const darenExposure = darenEntry?.totalExposure || 0;
      // Mount data gets 1M multiplier to always outrank daren-only data
      catScores[cat] = mountPlcEnter * 1000000 + darenExposure;
    }

    const reordered = [...original].sort((a, b) => catScores[b] - catScores[a]);

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
      for (const cat of reordered) {
        const mk = `${profileId}:${cat}`;
        const mp = mountScores[mk]?.plcEnter || 0;
        const de = darenRanking.find(r => r.category === cat)?.totalExposure || 0;
        console.log(`    ${cat}: mountPlcEnter=${mp}, darenExposure=${de}`);
      }
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
      source: Object.keys(mountScores).length > 0 ? 'mount+daren' : 'daren',
    };
    fs.mkdirSync(path.dirname(AUDIT_LOG), { recursive: true });
    fs.appendFileSync(AUDIT_LOG, JSON.stringify(audit) + '\n', 'utf-8');
    totalChanges++;
  }

  console.log(`[rebalancer] Done. ${totalChanges} profile(s) ${DRY_RUN ? 'would change' : 'changed'}.`);
}

main();
