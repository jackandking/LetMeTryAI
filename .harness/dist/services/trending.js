/**
 * Trending Topics Service
 * Fetches hot topics from Chinese platforms for topic selection inspiration.
 * Ported from legacy automation/scripts/lib/fetch-trending.js
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config/index.js';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const FETCH_TIMEOUT_MS = 5000;
const MAX_ITEMS_PER_PLATFORM = 8;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
// ─── Platform fetchers ───
async function fetchBaiduTrending() {
    try {
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
    catch (e) {
        console.warn('[Trending] Baidu fetch failed:', e.message);
        return [];
    }
}
async function fetchToutiaoTrending() {
    try {
        const res = await fetch('https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc', {
            headers: { 'User-Agent': UA },
            signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        });
        const json = await res.json();
        return (json.data || []).slice(0, 15).map((item) => ({
            title: item.Title || item.title || '',
            hot: item.HotValue || ''
        })).filter((i) => i.title);
    }
    catch (e) {
        console.warn('[Trending] Toutiao fetch failed:', e.message);
        return [];
    }
}
const PLATFORM_FETCHERS = {
    baidu: { fn: fetchBaiduTrending, label: '百度热搜' },
    toutiao: { fn: fetchToutiaoTrending, label: '头条热榜' }
};
// ─── Cache ───
function getCacheFile() {
    return join(PATHS.state, 'trending-cache.json');
}
function readCache() {
    try {
        const cacheFile = getCacheFile();
        if (!existsSync(cacheFile))
            return null;
        return JSON.parse(readFileSync(cacheFile, 'utf-8'));
    }
    catch {
        return null;
    }
}
function writeCache(data) {
    try {
        const cacheFile = getCacheFile();
        writeFileSync(cacheFile, JSON.stringify({ timestamp: Date.now(), data }, null, 2));
    }
    catch {
        /* non-fatal */
    }
}
// ─── Formatting ───
function formatTrendingForPrompt(platformData) {
    const sections = [];
    for (const [platform, items] of Object.entries(platformData)) {
        const config = PLATFORM_FETCHERS[platform];
        if (!config || !items?.length)
            continue;
        const trimmed = items.slice(0, MAX_ITEMS_PER_PLATFORM);
        const line = trimmed.map((item, i) => `${i + 1}. ${item.title}`).join(' ');
        sections.push(`【${config.label}】${line}`);
    }
    if (sections.length === 0)
        return '';
    return `今日热搜参考（仅供灵感，不必照搬，需结合品牌定位筛选）：\n${sections.join('\n')}`;
}
export async function fetchTrendingTopics(options = {}) {
    const { platforms = Object.keys(PLATFORM_FETCHERS), cacheTtlMs = CACHE_TTL_MS } = options;
    // Check cache
    const cached = readCache();
    if (cached && (Date.now() - cached.timestamp) < cacheTtlMs) {
        console.log('[Trending] Using cached data');
        return formatTrendingForPrompt(cached.data);
    }
    console.log('[Trending] Fetching from platforms:', platforms.join(', '));
    // Fetch all in parallel
    const results = await Promise.allSettled(platforms.map(async (p) => {
        const config = PLATFORM_FETCHERS[p];
        if (!config)
            return null;
        const items = await config.fn();
        return { platform: p, items };
    }));
    // Collect successes
    const data = {};
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value?.items?.length) {
            data[result.value.platform] = result.value.items;
        }
    }
    // Cache even partial results
    if (Object.keys(data).length > 0) {
        writeCache(data);
        console.log(`[Trending] Fetched ${Object.keys(data).length} platforms`);
    }
    else {
        console.warn('[Trending] No data fetched from any platform');
    }
    return formatTrendingForPrompt(data);
}
// CLI test
if (import.meta.main) {
    fetchTrendingTopics({}).then(result => {
        console.log('\n=== Trending Topics ===');
        console.log(result || '(no trending data fetched)');
    }).catch(err => {
        console.error('Error:', err.message);
        process.exit(1);
    });
}
//# sourceMappingURL=trending.js.map