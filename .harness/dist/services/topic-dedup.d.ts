/**
 * Check if a new topic shares any keyword group with recent topics.
 * This is stricter than Jaccard: any keyword overlap in the same group = duplicate.
 */
export declare function checkKeywordDuplicate(newTopic: string, recentTopics: string[], profileId: string): DuplicateCheckResult;
/**
 * Character-level Jaccard similarity between two strings.
 * Works well for Chinese text where individual characters carry meaning.
 */
export declare function calculateSimilarity(str1: string, str2: string): number;
interface DuplicateCheckResult {
    isDuplicate: boolean;
    similarTo?: string;
    similarity?: number;
    reasoning?: string;
    method: 'keyword' | 'jaccard' | 'ai' | 'none';
}
/**
 * Check if a new topic duplicates any recent topic.
 * Uses keyword groups first, then Jaccard, then AI for semantic judgment on close matches.
 */
export declare function checkTopicDuplicate(newTopic: string, recentTopics: string[], options?: {
    threshold?: number;
    profileId?: string;
}): DuplicateCheckResult;
/**
 * Check duplicate with AI semantic judgment
 */
export declare function checkTopicDuplicateWithAI(newTopic: string, recentTopics: string[], options?: {
    threshold?: number;
    aiThreshold?: number;
    profileId?: string;
}): Promise<DuplicateCheckResult>;
/**
 * Load published task names from Kuaishou reports
 */
export declare function loadPublishedTaskNames(): string[];
interface DedupCandidate {
    title: string;
    description?: string;
    [key: string]: unknown;
}
interface DedupOptions {
    publishedNames: string[];
    threshold?: number;
    useAI?: boolean;
    profileId?: string;
}
/**
 * Mark candidates with _blocked flag if duplicate
 */
export declare function deduplicateCandidates(candidates: DedupCandidate[], options: DedupOptions): Array<DedupCandidate & {
    _blocked?: boolean;
    _duplicateOf?: string;
    _similarity?: number;
    _reasoning?: string;
    _method?: string;
}>;
/**
 * Async deduplication with AI judgment (batch mode for speed)
 */
export declare function deduplicateCandidatesWithAI(candidates: DedupCandidate[], options: DedupOptions): Promise<Array<DedupCandidate & {
    _blocked?: boolean;
    _duplicateOf?: string;
    _similarity?: number;
    _reasoning?: string;
    _method?: string;
}>>;
export {};
//# sourceMappingURL=topic-dedup.d.ts.map