#!/usr/bin/env node
/**
 * mount-data-analyzer.js
 *
 * Reads kuaishou-follow mount-data exports and produces an aggregated
 * summary of PLC (小程序锚点) performance per profile and per app.
 *
 * Output: .automation/.local/state/mount-data-summary.json
 *
 * Data source (from PROD_DIR):
 *   .harness/.local/state/kuaishou-follow/exports/{profileId}-official-mount-data-*.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const OUTPUT_FILE = path.join(REPO_DIR, '.automation', '.local', 'state', 'mount-data-summary.json');

const EXPORTS_DIR = path.join(PROD_DIR, '.harness', '.local', 'state', 'kuaishou-follow', 'exports');

const KNOWN_PROFILES = ['elder-love', 'parent-tools', 'nanrenbao', 'womanai'];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function extractAppSlug(plcMntPath) {
  if (!plcMntPath) return null;
  const match = plcMntPath.match(/target=([^&]+)/);
  if (!match) return null;
  let slug = match[1];
  // Normalize: "elder-love/cooking/vote" → "elder-love/cooking/vote" (keep as-is)
  // Remove date suffixes like "-2026-04-01" for grouping
  slug = slug.replace(/-\d{4}-\d{2}-\d{2}$/, '');
  return slug;
}

function findLatestExport(profileId) {
  if (!fs.existsSync(EXPORTS_DIR)) return null;
  const prefix = `${profileId}-official-mount-data-`;
  const files = fs.readdirSync(EXPORTS_DIR)
    .filter(f => f.startsWith(prefix) && f.endsWith('.json'))
    .sort();
  if (files.length === 0) return null;
  const latest = files[files.length - 1];
  try {
    return JSON.parse(fs.readFileSync(path.join(EXPORTS_DIR, latest), 'utf-8'));
  } catch { return null; }
}

function extractRecords(exportData) {
  const rawPages = exportData?.result?.raw || [];
  const records = [];
  for (const page of rawPages) {
    const items = page?.data?.records?.plcPhotoDetailList || [];
    records.push(...items);
  }
  return records;
}

function analyzeProfile(profileId) {
  const exportData = findLatestExport(profileId);
  if (!exportData) return null;

  const records = extractRecords(exportData);
  if (records.length === 0) return null;

  const appId = exportData.appId || '';
  const exportDate = exportData.runDateKey || '';

  let totalPlays = 0, totalPlcShow = 0, totalPlcClick = 0, totalPlcEnter = 0;
  const byApp = {};

  for (const r of records) {
    const slug = extractAppSlug(r.plcMntPath);
    if (!slug) continue;

    const plays = r.displayPlayCnt || 0;
    const plcShow = r.plcShowCnt || 0;
    const plcClick = r.plcClickCnt || 0;
    const plcEnter = r.plcClickEnterCnt || 0;

    totalPlays += plays;
    totalPlcShow += plcShow;
    totalPlcClick += plcClick;
    totalPlcEnter += plcEnter;

    if (!byApp[slug]) {
      byApp[slug] = { plays: 0, plcShow: 0, plcClick: 0, plcEnter: 0, videoCount: 0 };
    }
    const app = byApp[slug];
    app.plays += plays;
    app.plcShow += plcShow;
    app.plcClick += plcClick;
    app.plcEnter += plcEnter;
    app.videoCount++;
  }

  const byAppList = Object.entries(byApp)
    .map(([appSlug, stats]) => ({
      appSlug,
      ...stats,
      plcClickRate: stats.plcShow > 0 ? +(stats.plcClick / stats.plcShow).toFixed(4) : 0,
    }))
    .sort((a, b) => b.plcEnter - a.plcEnter || b.plcClick - a.plcClick || b.plays - a.plays);

  return {
    appId,
    exportDate,
    totalVideos: records.length,
    totalPlays,
    totalPlcShow,
    totalPlcClick,
    totalPlcEnter,
    plcClickRate: totalPlcShow > 0 ? +(totalPlcClick / totalPlcShow).toFixed(4) : 0,
    byApp: byAppList,
  };
}

function main() {
  console.log('[mount-data] Scanning exports from', EXPORTS_DIR);

  if (!fs.existsSync(EXPORTS_DIR)) {
    console.log('[mount-data] Exports directory not found, skipping');
    process.exit(0);
  }

  const profiles = {};
  for (const profileId of KNOWN_PROFILES) {
    const result = analyzeProfile(profileId);
    if (result) {
      profiles[profileId] = result;
      console.log(`[mount-data] ${profileId}: ${result.totalVideos} videos, plays=${result.totalPlays}, plcClick=${result.totalPlcClick}, plcEnter=${result.totalPlcEnter}`);
    } else {
      console.log(`[mount-data] ${profileId}: no export data found`);
    }
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    profiles,
  };

  ensureDir(path.dirname(OUTPUT_FILE));
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`\n[mount-data] Summary written to ${OUTPUT_FILE}`);

  // Print top apps across all profiles
  console.log('\n=== Top Apps by PLC Enter (across all profiles) ===');
  const allApps = [];
  for (const [pid, data] of Object.entries(profiles)) {
    for (const app of data.byApp.slice(0, 5)) {
      allApps.push({ profileId: pid, ...app });
    }
  }
  allApps.sort((a, b) => b.plcEnter - a.plcEnter);
  for (const app of allApps.slice(0, 15)) {
    console.log(`  [${app.profileId}] ${app.appSlug}: plcEnter=${app.plcEnter}, plcClick=${app.plcClick}, plays=${app.plays}, videos=${app.videoCount}`);
  }
}

main();
