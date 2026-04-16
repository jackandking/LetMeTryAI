/**
 * Constraints Engine - Hard boundaries that prevent mistakes
 */
import type { TopicCandidate, ConstraintResult } from '../types/index.js';
export declare class ConstraintViolationError extends Error {
    violations: ConstraintResult[];
    constructor(violations: ConstraintResult[]);
}
export declare class ConstraintsEngine {
    private profileId;
    private profile;
    constructor(profileId: string);
    /**
     * Validate a topic candidate against all constraints
     * Throws ConstraintViolationError if any constraint fails
     */
    validateTopicAllowed(candidate: TopicCandidate): Promise<void>;
    /**
     * Check for forbidden keywords in title and description
     */
    private checkForbiddenKeywords;
    /**
     * Check category rotation constraints
     */
    private checkCategoryBudget;
    /**
     * Check if similar topic was recently published
     */
    private checkRecentSimilarity;
    /**
     * Get alternative suggestions when constraints fail
     */
    suggestAlternative(candidate: TopicCandidate, error: ConstraintViolationError): Promise<Partial<TopicCandidate>>;
    sanitizeText(text: string): string;
    private getAlternative;
    private mapCategoryToKey;
    /**
     * Get current constraint status for debugging
     */
    getStatus(): Record<string, unknown>;
}
//# sourceMappingURL=engine.d.ts.map