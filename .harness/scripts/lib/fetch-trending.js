/**
 * Fetch trending topics from Chinese platforms for topic selection inspiration.
 *
 * Supported sources: Baidu Hot Search, Toutiao Hot Board.
 * Results are cached for 2 hours to avoid redundant requests when running
 * multiple brand profiles in sequence.
 *
 * Usage:
 *   import { fetchTrendingTopics } from './lib/fetch-trending.js';
 *   const context = await fetchTrendingTopics({ profile });
 *   // Returns a formatted string ready to inject into the AI prompt
 */

import fs from 'fs';
import path from 'path';
import { resolveRuntimeDir, ensureDirectory } from '../runtime-paths.js';

const RUNTIME_DIR = resolveRuntimeDir(import.meta.url);
const CACHE_DIR = path.join(RUNTIME_DIR, 'state', 'trending');
const CACHE_FILE = path.join(CACHE_DIR, 'trending-cache.json');
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const FETCH_TIMEOUT_MS = 5000;
const MAX_ITEMS_PER_PLATFORM = 8;

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

// ─── Platform fetchers ───

async function fetchBaiduTrending() {
    const res = await fetch('https://top.baidu.com/api/board?platform=wise&tab=realtime', {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    const json = await res.json();
    const items = [];
    for (const card of json.data?.cards || []) {
        for (const group of card.content || []) {
            for (const item of group.content || []) {
                if (item.word) {
                    items.push({ title: item.word, hot: item.hotScore || '' });
                }
            }
        }
    }
    return items.slice(0, 15);
}

async function fetchToutiaoTrending() {
    const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
        headers: { 'User-Agent': UA },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    const json = await res.json();
    return (json.data || []).slice(0, 15).map(item => ({
        title: item.Title || item.title || '',
        hot: item.HotValue || ''
    })).filter(i => i.title);
}

const PLATFORM_FETCHERS = {
    baidu: { fn: fetchBaiduTrending, label: '百度热搜' },
    toutiao: { fn: fetchToutiaoTrending, label: '头条热榜' }
};

// ─── Cache ───

function readCache() {
    try {
        if (!fs.existsSync(CACHE_FILE)) return null;
        return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch { return null; }
}

function writeCache(data) {
    try {
        ensureDirectory(CACHE_DIR);
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
    } catch { /* non-fatal */ }
}

// ─── Formatting ───

function formatTrendingForPrompt(platformData) {
    const sections = [];
    for (const [platform, items] of Object.entries(platformData)) {
        const config = PLATFORM_FETCHERS[platform];
        if (!config || !items?.length) continue;
        const trimmed = items.slice(0, MAX_ITEMS_PER_PLATFORM);
        const line = trimmed.map((item, i) => `${i + 1}. ${item.title}`).join(' ');
        sections.push(`【${config.label}】${line}`);
    }
    if (sections.length === 0) return '';
    return `今日热搜数据（重要素材，请至少将其中1个热点转化为符合品牌定位的投票主题）：\n${sections.join('\n')}`;
}

// ─── Main entry ───

export async function fetchTrendingTopics({ profile, cacheTtlMs } = {}) {
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
    const data = {};
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.items?.length) {
            data[result.value.platform] = result.value.items;
        }
    }

    // Cache even partial results
    if (Object.keys(data).length > 0) {
        writeCache({ timestamp: Date.now(), data });
    }

    return formatTrendingForPrompt(data);
}

// ─── CLI test ───
if (process.argv[1]?.endsWith('fetch-trending.js')) {
    fetchTrendingTopics({}).then(result => {
        console.log(result || '(no trending data fetched)');
    }).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
}
