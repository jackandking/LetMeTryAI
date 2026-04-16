import { loadProfileConfig } from '../config/index.js';
export class ConstraintViolationError extends Error {
    violations;
    constructor(violations) {
        const messages = violations.map(v => v.message).join('; ');
        super(`Constraint violations: ${messages}`);
        this.violations = violations;
        this.name = 'ConstraintViolationError';
    }
}
export class ConstraintsEngine {
    profileId;
    profile;
    constructor(profileId) {
        this.profileId = profileId;
        this.profile = loadProfileConfig(profileId);
    }
    /**
     * Validate a topic candidate against all constraints
     * Throws ConstraintViolationError if any constraint fails
     */
    async validateTopicAllowed(candidate) {
        const checks = [
            this.checkForbiddenKeywords(candidate),
            this.checkCategoryBudget(candidate),
            await this.checkRecentSimilarity(candidate),
        ];
        const results = await Promise.all(checks);
        const failures = results.filter(r => !r.passed && r.severity === 'error');
        if (failures.length > 0) {
            throw new ConstraintViolationError(failures);
        }
        // Log warnings
        const warnings = results.filter(r => !r.passed && r.severity === 'warning');
        for (const warning of warnings) {
            console.warn(`[Constraint Warning] ${warning.message}`);
        }
    }
    /**
     * Check for forbidden keywords in title and description
     */
    checkForbiddenKeywords(candidate) {
        const forbidden = this.profile.constraints.forbiddenKeywords || [];
        const text = `${candidate.title} ${candidate.description} ${candidate.appName}`;
        for (const keyword of forbidden) {
            if (text.includes(keyword)) {
                return {
                    passed: false,
                    message: `Forbidden keyword "${keyword}" found in topic`,
                    severity: 'error',
                };
            }
        }
        return { passed: true, severity: 'error' };
    }
    /**
     * Check category rotation constraints
     */
    checkCategoryBudget(candidate) {
        const rotation = this.profile.constraints.categoryRotation;
        if (!rotation) {
            return { passed: true, severity: 'error' };
        }
        // Map category to rotation key
        const categoryKey = this.mapCategoryToKey(candidate.category);
        const constraint = rotation[categoryKey];
        if (!constraint) {
            return { passed: true, severity: 'error' };
        }
        // TODO: Check actual recent usage from database
        // For now, just validate the constraint exists
        return { passed: true, severity: 'error' };
    }
    /**
     * Check if similar topic was recently published
     */
    async checkRecentSimilarity(candidate) {
        const { loadPublishedTaskNames, checkTopicDuplicate } = await import('../services/topic-dedup.js');
        const publishedNames = loadPublishedTaskNames();
        if (publishedNames.length === 0) {
            return { passed: true, severity: 'error' };
        }
        const title = candidate.title || candidate.appName || '';
        const dupCheck = checkTopicDuplicate(title, publishedNames, { threshold: 0.6 });
        if (dupCheck.isDuplicate) {
            return {
                passed: false,
                message: `Topic too similar to published "${dupCheck.similarTo}" (${(dupCheck.similarity * 100).toFixed(0)}% similar)`,
                severity: 'error',
            };
        }
        return { passed: true, severity: 'error' };
    }
    /**
     * Get alternative suggestions when constraints fail
     */
    async suggestAlternative(candidate, error) {
        const suggestions = {};
        for (const violation of error.violations) {
            if (violation.message?.includes('Forbidden keyword')) {
                // Suggest removing forbidden keywords
                suggestions.title = this.sanitizeText(candidate.title);
                suggestions.description = this.sanitizeText(candidate.description);
            }
        }
        return suggestions;
    }
    sanitizeText(text) {
        const forbidden = this.profile.constraints.forbiddenKeywords || [];
        let sanitized = text;
        for (const keyword of forbidden) {
            sanitized = sanitized.replaceAll(keyword, this.getAlternative(keyword));
        }
        return sanitized;
    }
    getAlternative(keyword) {
        const alternatives = {
            '最': '更',
            '第一': '领先',
            '顶级': '高端',
            '史上': '历来',
        };
        return alternatives[keyword] || '优秀';
    }
    mapCategoryToKey(category) {
        const mapping = {
            '体育': 'sports',
            '军事': 'military',
            '美妆': 'beauty',
            '时尚': 'fashion',
            '教育': 'education',
            '健康': 'health',
        };
        return mapping[category] || category.toLowerCase();
    }
    /**
     * Get current constraint status for debugging
     */
    getStatus() {
        return {
            profileId: this.profileId,
            constraints: this.profile.constraints,
        };
    }
}
//# sourceMappingURL=engine.js.map