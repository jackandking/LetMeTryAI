/**
 * Fetch trending topics from Chinese platforms for topic selection inspiration.
 *
 * Supported sources: Baidu Hot Search, Toutiao Hot Board.
 * Results are cached for 2 hours to avoid redundant requests when running
 * multiple brand profiles in sequence.
 *
 * Usage:
 *   import { fetchTrendingTopics } from '../services/fetch-trending.js';
 *   const context = await fetchTrendingTopics({ profile });
 *   // Returns a formatted string ready to inject into the AI prompt
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../config/index.js';

const CACHE_DIR = join(PATHS.harnessRuntimeDir, 'state', 'trending');
const CACHE_FILE = join(CACHE_DIR, 'trending-cache.json');
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const FETCH_TIMEOUT_MS = 5000;
const MAX_ITEMS_PER_PLATFORM = 8;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

interface TrendingItem {
  title: string;
  hot: string | number;
}

interface ProfileConfig {
  trendingSources?: string[];
}

// ─── Platform fetchers ───

async function fetchBaiduTrending(): Promise<TrendingItem[]> {
  const res = await fetch('https://top.baidu.com/api/board?platform=wise&tab=realtime', {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  const json = await res.json() as Record<string, unknown>;
  const items: TrendingItem[] = [];
  const cards = (json.data as Record<string, unknown> | undefined)?.cards;
  for (const card of Array.isArray(cards) ? cards : []) {
    for (const group of card?.content || []) {
      for (const item of group?.content || []) {
        if (item?.word) {
          items.push({ title: item.word, hot: item.hotScore || '' });
        }
      }
    }
  }
  return items.slice(0, 15);
}

async function fetchToutiaoTrending(): Promise<TrendingItem[]> {
  const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
    headers: { 'User-Agent': UA },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  const json = await res.json() as Record<string, unknown>;
  const data = Array.isArray(json.data) ? json.data : [];
  return data
    .slice(0, 15)
    .map((item: Record<string, unknown>) => ({
      title: String(item.Title || item.title || ''),
      hot: item.HotValue || '',
    }))
    .filter((i: TrendingItem) => i.title);
}

const PLATFORM_FETCHERS: Record<string, { fn: () => Promise<TrendingItem[]>; label: string }> = {
  baidu: { fn: fetchBaiduTrending, label: '百度热搜' },
  toutiao: { fn: fetchToutiaoTrending, label: '头条热榜' }
};

// ─── Cache ───

function readCache(): { timestamp: number; data: Record<string, TrendingItem[]> } | null {
  try {
    if (!existsSync(CACHE_FILE)) return null;
    return JSON.parse(readFileSync(CACHE_FILE, 'utf-8'));
  } catch { return null; }
}

function writeCache(data: Record<string, TrendingItem[]>): void {
  try {
    if (!existsSync(CACHE_DIR)) {
      mkdirSync(CACHE_DIR, { recursive: true });
    }
    writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
  } catch { /* non-fatal */ }
}

// ─── Formatting ───

function formatTrendingForPrompt(platformData: Record<string, TrendingItem[]>): string {
  const sections: string[] = [];
  for (const [platform, items] of Object.entries(platformData)) {
    const config = PLATFORM_FETCHERS[platform];
    if (!config || !items?.length) continue;
    const trimmed = items.slice(0, MAX_ITEMS_PER_PLATFORM);
    const line = trimmed.map((item, i) => `${i + 1}. ${item.title}`).join(' ');
    sections.push(`【${config.label}】${line}`);
  }
  if (sections.length === 0) return '';
  return `今日热搜参考（仅供灵感，不必照搬，需结合品牌定位筛选）：\n${sections.join('\n')}`;
}

// ─── Main entry ───

export async function fetchTrendingTopics(
  { profile, cacheTtlMs }: { profile?: ProfileConfig; cacheTtlMs?: number } = {}
): Promise<string> {
  const ttl = cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;

  // Check cache
  const cached = readCache();
  if (cached && (Date.now() - cached.timestamp) < ttl) {
    return formatTrendingForPrompt(cached.data);
  }

  // Determine platforms
  const platforms = profile?.trendingSources || Object.keys(PLATFORM_FETCHERS);

  // Fetch all in parallel
  const results = await Promise.allSettled(
    platforms.map(async p => {
      const config = PLATFORM_FETCHERS[p];
      if (!config) return null;
      return { platform: p, items: await config.fn() };
    })
  );

  // Collect successes
  const data: Record<string, TrendingItem[]> = {};
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value?.items?.length) {
      data[result.value.platform] = result.value.items;
    }
  }

  // Cache even partial results
  if (Object.keys(data).length > 0) {
    writeCache(data);
  }

  return formatTrendingForPrompt(data);
}
