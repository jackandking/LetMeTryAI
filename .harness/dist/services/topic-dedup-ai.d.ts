export interface AIDedupResult {
    isDuplicate: boolean;
    similarTo?: string;
    similarity: number;
    reasoning?: string;
}
/**
 * Check if a topic is duplicate using AI judgment
 */
export declare function checkDuplicateWithAI(candidateTitle: string, historicalTitles: string[], candidateDescription?: string): Promise<AIDedupResult>;
/**
 * Batch check multiple candidates with AI (much faster)
 */
export declare function batchCheckDuplicatesWithAI(candidates: Array<{
    title: string;
    description?: string;
}>, historicalTitles: string[]): Promise<AIDedupResult[]>;
/**
 * Batch check multiple candidates with AI (legacy alias)
 */
export declare function deduplicateCandidatesWithAI(candidates: Array<{
    title: string;
    description?: string;
}>, historicalTitles: string[]): Promise<Array<{
    title: string;
    isDuplicate: boolean;
    similarTo?: string;
}>>;
//# sourceMappingURL=topic-dedup-ai.d.ts.map