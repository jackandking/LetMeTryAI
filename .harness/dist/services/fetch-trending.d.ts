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
interface ProfileConfig {
    trendingSources?: string[];
}
export declare function fetchTrendingTopics({ profile, cacheTtlMs }?: {
    profile?: ProfileConfig;
    cacheTtlMs?: number;
}): Promise<string>;
export {};
//# sourceMappingURL=fetch-trending.d.ts.map