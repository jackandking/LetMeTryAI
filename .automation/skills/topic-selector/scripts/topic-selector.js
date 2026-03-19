/**
 * Normalize a list-like field from a topic candidate or profile.
 *
 * @param {unknown} value Raw value to normalize.
 * @returns {string[]} Lower-cased string list without empty items.
 */
function normalizeList(value) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .filter(item => typeof item === 'string')
        .map(item => item.trim().toLowerCase())
        .filter(Boolean);
}

/**
 * Build a normalized topic candidate that is safe to score.
 *
 * @param {object} candidate Raw topic candidate.
 * @returns {object} Normalized topic candidate.
 */
function normalizeCandidate(candidate) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};

    return {
        title: typeof source.title === 'string' ? source.title.trim() : '',
        summary: typeof source.summary === 'string' ? source.summary.trim() : '',
        category: typeof source.category === 'string' ? source.category.trim().toLowerCase() : '',
        format: typeof source.format === 'string' ? source.format.trim().toLowerCase() : '',
        keywords: normalizeList(source.keywords),
        signals: normalizeList(source.signals),
        qualities: normalizeList(source.qualities),
        riskFlags: normalizeList(source.riskFlags)
    };
}

/**
 * Build a normalized brand profile for scoring.
 *
 * @param {object} profile Raw brand profile.
 * @returns {object} Normalized brand profile.
 */
function normalizeProfile(profile) {
    const source = profile && typeof profile === 'object' ? profile : {};

    return {
        id: typeof source.id === 'string' ? source.id : 'unknown',
        name: typeof source.name === 'string' ? source.name : 'Unknown',
        preferredCategories: normalizeList(source.preferredCategories),
        preferredFormats: normalizeList(source.preferredFormats),
        positiveSignals: normalizeList(source.positiveSignals),
        requiredQualities: normalizeList(source.requiredQualities),
        avoidSignals: normalizeList(source.avoidSignals),
        hardBlocks: normalizeList(source.hardBlocks),
        titlePatterns: Array.isArray(source.titlePatterns) ? source.titlePatterns : [],
        questionPatterns: Array.isArray(source.questionPatterns) ? source.questionPatterns : []
    };
}

/**
 * Count overlaps between two string arrays.
 *
 * @param {string[]} left Left-hand string list.
 * @param {string[]} right Right-hand string list.
 * @returns {string[]} Overlapping items.
 */
function findOverlap(left, right) {
    const rightSet = new Set(right);
    return left.filter(item => rightSet.has(item));
}

/**
 * Score one topic candidate against a brand profile.
 *
 * @param {object} candidate Topic candidate to score.
 * @param {object} profile Brand profile to score against.
 * @returns {object} Score details, match reasons, and warnings.
 */
export function scoreTopicCandidate(candidate, profile) {
    const normalizedCandidate = normalizeCandidate(candidate);
    const normalizedProfile = normalizeProfile(profile);
    const reasons = [];
    const warnings = [];
    let score = 0;

    if (
        normalizedProfile.hardBlocks.some(block =>
            normalizedCandidate.keywords.includes(block) ||
            normalizedCandidate.signals.includes(block) ||
            normalizedCandidate.riskFlags.includes(block) ||
            normalizedCandidate.category === block
        )
    ) {
        return {
            accepted: false,
            score: -100,
            candidate: normalizedCandidate,
            profileId: normalizedProfile.id,
            reasons: [],
            warnings: ['Hit hard block'],
            matchedSignals: [],
            blockedSignals: normalizedProfile.hardBlocks
        };
    }

    if (normalizedProfile.preferredCategories.includes(normalizedCandidate.category)) {
        score += 25;
        reasons.push(`Category matches ${normalizedCandidate.category}`);
    } else if (normalizedCandidate.category) {
        warnings.push(`Category ${normalizedCandidate.category} is not preferred`);
    }

    if (normalizedProfile.preferredFormats.includes(normalizedCandidate.format)) {
        score += 18;
        reasons.push(`Format matches ${normalizedCandidate.format}`);
    } else if (normalizedCandidate.format) {
        warnings.push(`Format ${normalizedCandidate.format} is weaker for this profile`);
    }

    const candidateSignals = [
        ...normalizedCandidate.keywords,
        ...normalizedCandidate.signals,
        ...normalizedCandidate.qualities
    ];

    const matchedSignals = findOverlap(candidateSignals, normalizedProfile.positiveSignals);
    score += matchedSignals.length * 8;
    matchedSignals.forEach(signal => {
        reasons.push(`Positive signal: ${signal}`);
    });

    const missingQualities = normalizedProfile.requiredQualities.filter(
        quality => !candidateSignals.includes(quality)
    );
    if (missingQualities.length === 0 && normalizedProfile.requiredQualities.length > 0) {
        score += 12;
        reasons.push('All required qualities present');
    } else {
        score -= missingQualities.length * 4;
        missingQualities.forEach(quality => {
            warnings.push(`Missing quality: ${quality}`);
        });
    }

    const blockedSignals = findOverlap(
        [...candidateSignals, ...normalizedCandidate.riskFlags, normalizedCandidate.category],
        [...normalizedProfile.avoidSignals, ...normalizedProfile.hardBlocks]
    );
    if (blockedSignals.length > 0) {
        score -= blockedSignals.length * 15;
        blockedSignals.forEach(signal => {
            warnings.push(`Avoid signal: ${signal}`);
        });
    }

    return {
        accepted: score > 0,
        score,
        candidate: normalizedCandidate,
        profileId: normalizedProfile.id,
        reasons,
        warnings,
        matchedSignals,
        blockedSignals
    };
}

/**
 * Rank multiple topic candidates for a given brand profile.
 *
 * @param {object[]} candidates Topic candidates to score.
 * @param {object} profile Brand profile.
 * @param {{ limit?: number, includeRejected?: boolean }} [options] Ranking options.
 * @returns {object[]} Ranked scoring results.
 */
export function rankTopicCandidates(candidates, profile, options = {}) {
    const list = Array.isArray(candidates) ? candidates : [];
    const scored = list.map(candidate => scoreTopicCandidate(candidate, profile));
    const filtered = options.includeRejected ? scored : scored.filter(item => item.accepted);
    const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : filtered.length;

    return filtered
        .sort((left, right) => right.score - left.score)
        .slice(0, limit);
}

/**
 * Build a compact topic brief for downstream prompting or scaffolding.
 *
 * @param {object} candidate Topic candidate.
 * @param {object} profile Brand profile.
 * @returns {object} Brief with starter title/question text.
 */
export function buildTopicBrief(candidate, profile) {
    const normalizedCandidate = normalizeCandidate(candidate);
    const normalizedProfile = normalizeProfile(profile);
    const titleTemplate = normalizedProfile.titlePatterns[0] || '{title}';
    const questionTemplate =
        normalizedProfile.questionPatterns[0] || '你更愿意把票投给谁：{title}？';

    return {
        profileId: normalizedProfile.id,
        brandName: normalizedProfile.name,
        title: titleTemplate.replace('{title}', normalizedCandidate.title),
        question: questionTemplate.replace('{title}', normalizedCandidate.title),
        category: normalizedCandidate.category,
        format: normalizedCandidate.format,
        keywords: normalizedCandidate.keywords
    };
}

// ==================== Manual Topic Priority Queue ====================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve topics directory to .automation/.local/state/topics/
const PROJECT_ROOT = process.cwd();
const TOPICS_DIR = path.join(PROJECT_ROOT, '.automation', '.local', 'state', 'topics');

/**
 * Brand ID mapping for manual topic queue files.
 */
const BRAND_FILE_MAP = {
    'man': 'man',
    'nanrenbao': 'man',
    'woman': 'woman',
    'womanai': 'woman',
    'parent': 'parent',
    'elder': 'elder'
};

/**
 * Get the queue file path for a brand.
 * @param {string} brandId - Brand identifier.
 * @returns {string} Full path to the queue file.
 */
function getQueueFilePath(brandId) {
    const normalizedId = brandId.toLowerCase();
    const fileKey = BRAND_FILE_MAP[normalizedId] || normalizedId;
    return path.join(TOPICS_DIR, `${fileKey}-manual-topics.txt`);
}

/**
 * Peek at manual topics without removing them.
 * @param {string} brandId - Brand identifier.
 * @returns {string[]} Array of topic titles.
 */
export function peekManualTopics(brandId) {
    const filePath = getQueueFilePath(brandId);
    
    if (!fs.existsSync(filePath)) {
        return [];
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

/**
 * Pop the next manual topic (FIFO) and remove it from the queue.
 * @param {string} brandId - Brand identifier.
 * @returns {string|null} The topic title, or null if queue is empty.
 */
export function popManualTopic(brandId) {
    const filePath = getQueueFilePath(brandId);
    const topics = peekManualTopics(brandId);
    
    if (topics.length === 0) {
        return null;
    }
    
    const nextTopic = topics[0];
    const remaining = topics.slice(1);
    
    // Write back remaining topics
    if (remaining.length > 0) {
        fs.writeFileSync(filePath, remaining.join('\n') + '\n');
    } else {
        fs.writeFileSync(filePath, '');
    }
    
    return nextTopic;
}

/**
 * Check if there are pending manual topics.
 * @param {string} brandId - Brand identifier.
 * @returns {boolean} True if manual topics exist.
 */
export function hasManualTopics(brandId) {
    return peekManualTopics(brandId).length > 0;
}

/**
 * Select the next topic for a brand, prioritizing manual submissions.
 * 
 * This is the main entry point for topic selection with priority:
 * 1. Check manual topic queue first
 * 2. If empty, return null (caller should fall back to AI generation)
 * 
 * @param {string} brandId - Brand identifier (e.g., 'man', 'woman', 'parent', 'elder').
 * @returns {{title: string, source: 'manual', brandId: string}|null} Topic object or null.
 */
export function selectNextTopic(brandId) {
    const manualTopic = popManualTopic(brandId);
    
    if (manualTopic) {
        return {
            title: manualTopic,
            source: 'manual',
            brandId: brandId
        };
    }
    
    return null;
}
