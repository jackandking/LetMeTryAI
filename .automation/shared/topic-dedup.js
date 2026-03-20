/**
 * Shared topic deduplication utilities.
 * Extracted from nanrenbao.js for use across all brand profiles.
 */

/**
 * Character-level Jaccard similarity between two strings.
 * Works well for Chinese text where individual characters carry meaning.
 * @param {string} str1
 * @param {string} str2
 * @returns {number} 0-1 similarity score
 */
export function calculateSimilarity(str1, str2) {
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
}

/**
 * Check if a new topic duplicates any recent topic.
 * @param {string} newTopic
 * @param {string[]} recentTopics
 * @param {object} [options]
 * @param {number} [options.threshold=0.7] - Similarity threshold to flag as duplicate
 * @returns {{ isDuplicate: boolean, similarTo?: string, similarity?: number }}
 */
export function checkTopicDuplicate(newTopic, recentTopics, options = {}) {
    const { threshold = 0.7 } = options;
    const keywords = newTopic.toLowerCase();

    for (const topic of recentTopics) {
        const similarity = calculateSimilarity(keywords, topic.toLowerCase());
        if (similarity > threshold) {
            return {
                isDuplicate: true,
                similarTo: topic,
                similarity
            };
        }
    }

    return { isDuplicate: false };
}

/**
 * Recommend the next topic category based on rotation priority.
 * Picks the least-used category from the priority list.
 *
 * @param {string[]} recentCategories - Categories used recently
 * @param {string[]} rotationPriority - Ordered list of all categories
 * @returns {string} The recommended category
 */
export function getRecommendedCategory(recentCategories, rotationPriority) {
    const categoryCount = {};
    for (const cat of rotationPriority) {
        categoryCount[cat] = recentCategories.filter(c => c === cat).length;
    }

    // Use a copy to avoid mutating the original array
    return [...rotationPriority].sort((a, b) => categoryCount[a] - categoryCount[b])[0];
}
