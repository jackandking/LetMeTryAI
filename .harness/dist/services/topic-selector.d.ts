/**
 * Topic Selector - Generates topic candidates using AI (Copilot → Kimi fallback)
 */
import { ProfileConfig, TopicCandidate } from '../types/index.js';
export interface TopicSelectionResult {
    profileId: string;
    reportSummary: string;
    topicCandidates: TopicCandidate[];
}
export declare function buildTopicSelectionPrompt(profile: ProfileConfig, date: string, trendingContext?: string, recentTopics?: string[], topicHint?: string): string;
export declare function parseTopicSelectionResponse(content: unknown): TopicSelectionResult;
/**
 * Generate topic candidates using AI with automatic fallback
 */
export declare function generateTopicsWithAI(profile: ProfileConfig, date?: string, trendingContext?: string): Promise<TopicSelectionResult>;
export declare function chooseBestTopic(candidates: TopicCandidate[], profile: ProfileConfig, options?: {
    useAIDedup?: boolean;
}): Promise<TopicCandidate>;
//# sourceMappingURL=topic-selector.d.ts.map