/**
 * Topic Deduplication Service
 * Based on legacy automation/shared/topic-dedup.js
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config/index.js';

/**
 * Character-level Jaccard similarity between two strings.
 * Works well for Chinese text where individual characters carry meaning.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

interface DuplicateCheckResult {
  isDuplicate: boolean;
  similarTo?: string;
  similarity?: number;
}

/**
 * Check if a new topic duplicates any recent topic.
 */
export function checkTopicDuplicate(
  newTopic: string,
  recentTopics: string[],
  options: { threshold?: number } = {}
): DuplicateCheckResult {
  const { threshold = 0.7 } = options;
  const keywords = newTopic.toLowerCase();

  for (const topic of recentTopics) {
    const similarity = calculateSimilarity(keywords, topic.toLowerCase());
    if (similarity > threshold) {
      return {
        isDuplicate: true,
        similarTo: topic,
        similarity,
      };
    }
  }

  return { isDuplicate: false };
}

interface PublishedTask {
  name: string;
  planId?: string;
  publishTime?: string;
}

/**
 * Load published Kuaishou task names from metrics reports.
 */
export function loadPublishedTaskNames(): string[] {
  // Check both prod and dev metrics directories
  const metricsDirs = [
    join(PATHS.projectRoot, '..', 'prod', 'LetMeTryAI', '.automation', '.local', 'exports', 'metrics', 'kuaishou', 'daily'),
    join(PATHS.projectRoot, '.automation', '.local', 'exports', 'metrics', 'kuaishou', 'daily'),
  ];

  for (const metricsDir of metricsDirs) {
    try {
      if (!existsSync(metricsDir)) continue;

      const files = readdirSync(metricsDir)
        .filter(f => f.startsWith('kuaishou_report_') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (files.length === 0) continue;

      const report = JSON.parse(readFileSync(join(metricsDir, files[0]), 'utf-8'));
      const names: string[] = (report.allTasks || [])
        .map((t: PublishedTask) => t.name)
        .filter(Boolean);

      console.log(`[Dedup] Loaded ${names.length} published tasks from ${files[0]}`);
      return names;
    } catch (err) {
      console.warn(`[Dedup] Failed to load from ${metricsDir}:`, (err as Error).message);
    }
  }

  return [];
}

/**
 * Load recent app directories from git history.
 */
export function loadRecentAppIds(days = 30): string[] {
  try {
    const { execSync } = require('child_process');
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    // Get recently created directories
    const output = execSync(
      `git log --since="${since}" --name-status --pretty=format: | grep -E "^A\s+[^/]+/index.html$" | head -50`,
      { encoding: 'utf-8', cwd: PATHS.projectRoot }
    );
    
    const appIds = output
      .split('\n')
      .map(line => line.trim().replace(/^A\s+/, '').replace('/index.html', ''))
      .filter(id => id && !id.includes('/'));
    
    return [...new Set(appIds)];
  } catch {
    return [];
  }
}

/**
 * Comprehensive deduplication check for topic candidates.
 * Returns filtered list with duplicates marked.
 */
export function deduplicateCandidates<T extends { title?: string; appName?: string }>(
  candidates: T[],
  options: {
    publishedNames?: string[];
    recentAppIds?: string[];
    threshold?: number;
  } = {}
): Array<T & { _blocked?: boolean; _duplicateOf?: string; _similarity?: number }> {
  const {
    publishedNames = loadPublishedTaskNames(),
    recentAppIds = loadRecentAppIds(),
    threshold = 0.6,
  } = options;

  return candidates.map(candidate => {
    const title = candidate.title || candidate.appName || '';
    
    // Check 1: Similar to published tasks
    const dupCheck = checkTopicDuplicate(title, publishedNames, { threshold });
    if (dupCheck.isDuplicate) {
      return {
        ...candidate,
        _blocked: true,
        _duplicateOf: dupCheck.similarTo,
        _similarity: dupCheck.similarity,
      };
    }

    // Check 2: App ID collision with recent apps
    const appId = (candidate as unknown as { appId?: string }).appId;
    if (appId && recentAppIds.includes(appId)) {
      return {
        ...candidate,
        _blocked: true,
        _duplicateOf: `existing app: ${appId}`,
        _similarity: 1,
      };
    }

    return candidate;
  });
}
