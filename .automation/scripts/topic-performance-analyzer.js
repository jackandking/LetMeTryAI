#!/usr/bin/env node
/**
 * topic-performance-analyzer.js
 *
 * Reads Kuaishou daily reports + harness run history to build a
 * topic category → performance mapping. Used by auto-run.sh to
 * guide topic selection strategy evolution.
 *
 * Output: .automation/.local/state/topic-performance-summary.json
 *
 * Data sources (all from PROD_DIR):
 *   - .harness/.local/exports/metrics/kuaishou/daily/*.json  (Kuaishou stats)
 *   - .harness/.local/state/daily-app-runs/*.jsonl           (harness run history)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_DIR = path.resolve(__dirname, '../..');
const PROD_DIR = process.env.PROD_DIR || REPO_DIR;
const OUTPUT_FILE = path.join(REPO_DIR, '.automation', '.local', 'state', 'topic-performance-summary.json');

const KS_REPORT_DIR = path.join(PROD_DIR, '.harness', '.local', 'exports', 'metrics', 'kuaishou', 'daily');
const HARNESS_RUNS_DIR = path.join(PROD_DIR, '.harness', '.local', 'state', 'daily-app-runs');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Load all Kuaishou daily reports from the last N days
function loadKsReports(days = 30) {
  if (!fs.existsSync(KS_REPORT_DIR)) return [];
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return fs.readdirSync(KS_REPORT_DIR)
    .filter(f => f.startsWith('kuaishou_report_') && f.endsWith('.json'))
    .map(f => {
      const dateMatch = f.match(/(\d{4}-\d{2}-\d{2})/);
      if (!dateMatch) return null;
      const date = dateMatch[1];
      if (new Date(date) < cutoff) return null;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(KS_REPORT_DIR, f), 'utf-8'));
        return { date, ...data };
      } catch { return null; }
    })
    .filter(Boolean);
}

// Load harness run history to get topic → category mapping
function loadHarnessRuns() {
  if (!fs.existsSync(HARNESS_RUNS_DIR)) return [];
  const runs = [];
  for (const f of fs.readdirSync(HARNESS_RUNS_DIR)) {
    if (!f.endsWith('.jsonl')) continue;
    const lines = fs.readFileSync(path.join(HARNESS_RUNS_DIR, f), 'utf-8')
      .split('\n').filter(Boolean);
    for (const line of lines) {
      try { runs.push(JSON.parse(line)); } catch {}
    }
  }
  return runs;
}

// Build appId → category mapping from harness runs
function buildCategoryMap(runs) {
  const map = {};
  for (const run of runs) {
    if (!run.success || !run.selectedTopic) continue;
    const topic = run.selectedTopic;
    if (topic.appId && topic.category) {
      map[topic.appId] = {
        category: topic.category,
        title: topic.title || topic.appName,
        profileId: run.profileId,
        date: run.timestamp?.slice(0, 10),
      };
    }
  }
  return map;
}

// Match Kuaishou task names to appIds (fuzzy: task name ≈ app name)
function matchTaskToApp(taskName, categoryMap) {
  // Try exact match on title
  for (const [appId, info] of Object.entries(categoryMap)) {
    if (info.title && taskName.includes(info.title.slice(0, 6))) {
      return { appId, ...info };
    }
  }
  return null;
}

function main() {
  console.log('[topic-perf] Loading Kuaishou reports...');
  const reports = loadKsReports(30);
  console.log(`[topic-perf] Found ${reports.length} reports`);

  console.log('[topic-perf] Loading harness runs...');
  const runs = loadHarnessRuns();
  console.log(`[topic-perf] Found ${runs.length} runs`);

  const categoryMap = buildCategoryMap(runs);
  console.log(`[topic-perf] Built category map: ${Object.keys(categoryMap).length} apps`);

  // Aggregate stats by category
  const categoryStats = {};
  const appStats = {};

  // Use the latest report for current stats
  const latestReport = reports.sort((a, b) => b.date.localeCompare(a.date))[0];
  if (!latestReport) {
    console.log('[topic-perf] No reports found');
    process.exit(0);
  }

  const allTasks = latestReport.allTasks || [];
  console.log(`[topic-perf] Latest report (${latestReport.date}): ${allTasks.length} tasks`);

  let matched = 0;
  let unmatched = 0;

  for (const task of allTasks) {
    const stats = task.stats || {};
    const exposure = parseInt(stats['组件曝光数'] || 0);
    const clicks = parseInt(stats['组件点击数'] || 0);
    const daren = parseInt(stats['已履单达人数量'] || 0);
    const works = parseInt(stats['已发布作品数'] || 0);
    const revenue = parseFloat(stats['已结算金额'] || 0);

    // Try to match to a category
    const match = matchTaskToApp(task.name, categoryMap);
    const category = match ? match.category : 'unknown';

    if (match) matched++;
    else unmatched++;

    if (!categoryStats[category]) {
      categoryStats[category] = {
        taskCount: 0, totalExposure: 0, totalClicks: 0,
        totalDaren: 0, totalWorks: 0, totalRevenue: 0, apps: [],
      };
    }
    const cat = categoryStats[category];
    cat.taskCount++;
    cat.totalExposure += exposure;
    cat.totalClicks += clicks;
    cat.totalDaren += daren;
    cat.totalWorks += works;
    cat.totalRevenue += revenue;

    if (match) {
      cat.apps.push({
        appId: match.appId,
        name: task.name,
        profileId: match.profileId,
        exposure, clicks, daren, works, revenue,
      });
    }
  }

  // Compute averages and rank
  const ranked = Object.entries(categoryStats)
    .filter(([cat]) => cat !== 'unknown')
    .map(([category, stats]) => ({
      category,
      ...stats,
      avgExposure: stats.taskCount > 0 ? Math.round(stats.totalExposure / stats.taskCount) : 0,
      avgDaren: stats.taskCount > 0 ? Math.round(stats.totalDaren / stats.taskCount) : 0,
    }))
    .sort((a, b) => b.totalExposure - a.totalExposure);

  const summary = {
    generatedAt: new Date().toISOString(),
    reportDate: latestReport.date,
    matchRate: `${matched}/${matched + unmatched} (${Math.round(matched / (matched + unmatched) * 100)}%)`,
    overallStats: latestReport.summary,
    categoryRanking: ranked,
    unmatchedCount: unmatched,
    recommendation: generateRecommendation(ranked),
  };

  ensureDir(path.dirname(OUTPUT_FILE));
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(summary, null, 2), 'utf-8');
  console.log(`[topic-perf] Summary written to ${OUTPUT_FILE}`);

  // Print highlights
  console.log('\n=== Category Performance Ranking ===');
  for (const cat of ranked.slice(0, 10)) {
    console.log(`  ${cat.category}: ${cat.taskCount} tasks, exposure=${cat.totalExposure}, daren=${cat.totalDaren}, avgExposure=${cat.avgExposure}`);
  }
  console.log(`\n=== Recommendation ===`);
  console.log(summary.recommendation);
}

function generateRecommendation(ranked) {
  if (ranked.length === 0) return 'Not enough data to generate recommendation.';

  const top = ranked.slice(0, 3).map(c => c.category);
  const bottom = ranked.filter(c => c.totalExposure < 100).map(c => c.category);

  let rec = `Top performing categories: ${top.join(', ')}. `;
  if (bottom.length > 0) {
    rec += `Low performers (exposure < 100): ${bottom.join(', ')}. `;
  }
  rec += `Consider increasing frequency of top categories and reducing or rotating low performers.`;
  return rec;
}

main();
