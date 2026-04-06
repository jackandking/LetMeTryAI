import fs from 'fs';

export const DEFAULT_CANDIDATE_STATUS = 'pending_review';
export const APPROVED_STATUS = 'approved';
export const REJECTED_STATUS = 'rejected';

export function loadConfig(configPath) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

export function normalizeTagList(tags = []) {
    return [...new Set(tags.map(tag => String(tag).trim()).filter(Boolean))];
}

function matchManualTagRule(image, rule) {
    if (!rule || rule.disabled) {
        return false;
    }

    if (rule.imageId !== undefined && Number(rule.imageId) === Number(image.id)) {
        return true;
    }

    if (typeof rule.imageUrl === 'string' && rule.imageUrl === image.image_url) {
        return true;
    }

    if (typeof rule.imageUrlContains === 'string' && image.image_url.includes(rule.imageUrlContains)) {
        return true;
    }

    return false;
}

export function attachTagsToImages(images = [], manualTagRules = []) {
    return images.map(image => {
        const tags = manualTagRules
            .filter(rule => matchManualTagRule(image, rule))
            .flatMap(rule => Array.isArray(rule.tags) ? rule.tags : []);

        return {
            ...image,
            tags: normalizeTagList(tags)
        };
    });
}

export function computeTagScores(taggedImages = []) {
    const scores = new Map();

    taggedImages.forEach(image => {
        const viewCount = Number(image.view_count || 0);
        normalizeTagList(image.tags).forEach(tag => {
            scores.set(tag, (scores.get(tag) || 0) + viewCount);
        });
    });

    return [...scores.entries()]
        .map(([tag, score]) => ({ tag, score }))
        .sort((left, right) => right.score - left.score || left.tag.localeCompare(right.tag));
}

function buildDirectionScore(image, optionalTags) {
    const optionalTagHits = optionalTags.filter(tag => image.tags.includes(tag)).length;
    return Number(image.view_count || 0) + optionalTagHits * 5;
}

export function scoreDirections(taggedImages = [], directionTemplates = []) {
    return directionTemplates
        .map(template => {
            const requiredTags = normalizeTagList(template.requiredTags);
            const optionalTags = normalizeTagList(template.optionalTags);
            const matchedImages = taggedImages.filter(image => requiredTags.every(tag => image.tags.includes(tag)));
            const score = matchedImages.reduce((sum, image) => sum + buildDirectionScore(image, optionalTags), 0);

            return {
                ...template,
                score,
                matchedImageCount: matchedImages.length,
                sourceImageIds: matchedImages.map(image => image.id),
                sourceViewCountSum: matchedImages.reduce((sum, image) => sum + Number(image.view_count || 0), 0)
            };
        })
        .sort((left, right) => right.score - left.score || right.matchedImageCount - left.matchedImageCount);
}

export function buildPrompt({ promptFoundation = {}, direction, variant }) {
    const fragments = [
        ...(promptFoundation.baseFragments || []),
        ...(direction.requiredTags || []),
        ...(direction.promptFragments || []),
        ...((variant && variant.promptFragments) || [])
    ];

    return normalizeTagList(fragments).join('，');
}

export function buildGenerationPlan({ rankedDirections = [], dailyVolume = 3, promptFoundation = {} }) {
    if (!rankedDirections.length || dailyVolume <= 0) {
        return [];
    }

    const plan = [];
    let directionIndex = 0;

    while (plan.length < dailyVolume) {
        const direction = rankedDirections[directionIndex % rankedDirections.length];
        const variants = Array.isArray(direction.variants) && direction.variants.length > 0
            ? direction.variants
            : [{ key: 'default', promptFragments: [] }];
        const variant = variants[Math.floor(plan.length / rankedDirections.length) % variants.length];

        plan.push({
            directionKey: direction.key,
            directionLabel: direction.label,
            variantKey: variant.key || 'default',
            promptText: buildPrompt({ promptFoundation, direction, variant }),
            sourceImageIds: direction.sourceImageIds,
            sourceViewCountSum: direction.sourceViewCountSum
        });

        directionIndex += 1;
    }

    return plan;
}

export function buildCreateGeneratedImagesTableSql(tableName) {
    return `
CREATE TABLE IF NOT EXISTS ${tableName} (
    id INT AUTO_INCREMENT PRIMARY KEY,
    direction_key VARCHAR(128) NOT NULL,
    direction_label VARCHAR(255) NOT NULL,
    prompt_text TEXT NOT NULL,
    image_url VARCHAR(2048) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    provider_image_id VARCHAR(255) DEFAULT NULL,
    source_image_ids TEXT,
    source_view_count_sum INT DEFAULT 0 NOT NULL,
    status VARCHAR(32) DEFAULT '${DEFAULT_CANDIDATE_STATUS}' NOT NULL,
    review_note TEXT,
    approved_image_id INT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME DEFAULT NULL,
    INDEX idx_status_created_at (status, created_at),
    UNIQUE INDEX idx_generated_image_url (image_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`.trim();
}

export function buildGeneratedImageInsertStatement(tableName, candidate) {
    return {
        sql: `INSERT INTO ${tableName} (direction_key, direction_label, prompt_text, image_url, provider, provider_image_id, source_image_ids, source_view_count_sum, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
        params: [
            candidate.directionKey,
            candidate.directionLabel,
            candidate.promptText,
            candidate.imageUrl,
            candidate.provider,
            candidate.providerImageId || null,
            JSON.stringify(candidate.sourceImageIds || []),
            Number(candidate.sourceViewCountSum || 0),
            DEFAULT_CANDIDATE_STATUS
        ]
    };
}

export function buildReviewUpdateStatement(tableName, { candidateId, status, reviewNote, approvedImageId = null }) {
    if (status === APPROVED_STATUS) {
        return {
            sql: `UPDATE ${tableName} SET status = ?, review_note = ?, approved_image_id = ?, reviewed_at = NOW() WHERE id = ?`,
            params: [status, reviewNote || null, approvedImageId, candidateId]
        };
    }

    return {
        sql: `UPDATE ${tableName} SET status = ?, review_note = ?, reviewed_at = NOW() WHERE id = ?`,
        params: [status, reviewNote || null, candidateId]
    };
}
