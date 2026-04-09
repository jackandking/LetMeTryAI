/**
 * AI-Assisted Topic Deduplication
 * Uses AI to judge semantic similarity between topics
 */
import { logger } from '../utils/logger.js';
import { defaultRegistry } from '../tools/index.js';

export interface AIDedupResult {
  isDuplicate: boolean;
  similarTo?: string;
  similarity: number; // 0-1
  reasoning?: string;
}

interface AIDedupCheck {
  candidateTitle: string;
  candidateDescription?: string;
  historicalTitles: string[];
}

/**
 * Build prompt for AI deduplication check
 */
function buildDedupPrompt(check: AIDedupCheck): string {
  const titlesList = check.historicalTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  
  return `你是一位话题去重专家。请判断新话题是否与历史发布的话题重复或过于相似。

新话题："${check.candidateTitle}"
${check.candidateDescription ? `描述：${check.candidateDescription}` : ''}

历史已发布话题（共${check.historicalTitles.length}条）：
${titlesList}

请分析：
1. 新话题与历史话题在主题、角度、受众上是否有实质性差异
2. 如果新话题只是历史话题的简单变体（如改几个字、换种说法），应判定为重复
3. 如果新话题有全新的视角或内容，应判定为不重复

返回 JSON 格式：
{
  "isDuplicate": true/false,
  "similarTo": "最相似的历史话题标题（如果没有则空字符串）",
  "similarity": 0.0-1.0,
  "reasoning": "判断理由（一句话）"
}

重要：只返回 JSON，不要 markdown 代码块。`;
}

/**
 * Build batch prompt for multiple candidates
 */
function buildBatchDedupPrompt(
  candidates: Array<{ title: string; description?: string }>,
  historicalTitles: string[]
): string {
  const historyList = historicalTitles.map((t, i) => `${i + 1}. ${t}`).join('\n');
  const candidatesList = candidates.map((c, i) => `${i + 1}. ${c.title}`).join('\n');
  
  return `你是一位话题去重专家。请批量判断以下新话题是否与历史话题重复。

历史已发布话题（共${historicalTitles.length}条）：
${historyList}

新话题候选（共${candidates.length}个）：
${candidatesList}

请逐一判断每个新话题：
1. 是否与历史话题在主题、角度、受众上重复
2. 是否只是历史话题的简单变体（改几个字、换种说法）

返回 JSON 数组格式：
[
  {
    "index": 1,
    "isDuplicate": true/false,
    "similarTo": "最相似的历史话题（无则空）",
    "similarity": 0.0-1.0,
    "reasoning": "判断理由"
  },
  ...
]

重要：只返回 JSON 数组，不要 markdown 代码块。`;
}

/**
 * Check if a topic is duplicate using AI judgment
 */
export async function checkDuplicateWithAI(
  candidateTitle: string,
  historicalTitles: string[],
  candidateDescription?: string
): Promise<AIDedupResult> {
  // If no history, not a duplicate
  if (historicalTitles.length === 0) {
    return { isDuplicate: false, similarity: 0 };
  }

  // Limit history to most recent 30 for performance
  const recentTitles = historicalTitles.slice(0, 30);

  logger.info('AI dedup check', { 
    candidate: candidateTitle,
    historyCount: recentTitles.length 
  });

  const prompt = buildDedupPrompt({
    candidateTitle,
    candidateDescription,
    historicalTitles: recentTitles,
  });

  try {
    const result = await defaultRegistry.execute('ai.generate', {
      prompt,
      outputFormat: 'json',
      fallbackOnTimeout: true,
    });

    if (!result.success || !result.data) {
      logger.warn('AI dedup failed, falling back to rule-based', { error: result.error?.message });
      return { isDuplicate: false, similarity: 0 };
    }

    const data = result.data as Record<string, unknown>;
    
    const isDuplicate = Boolean(data.isDuplicate);
    const similarTo = String(data.similarTo || '');
    const similarity = Number(data.similarity || 0);
    const reasoning = String(data.reasoning || '');

    logger.info('AI dedup result', {
      candidate: candidateTitle,
      isDuplicate,
      similarTo,
      similarity,
      reasoning,
    });

    return {
      isDuplicate,
      similarTo: similarTo || undefined,
      similarity,
      reasoning,
    };
  } catch (error) {
    logger.error('AI dedup error', error as Error);
    // Fail open - don't block if AI fails
    return { isDuplicate: false, similarity: 0 };
  }
}

/**
 * Batch check multiple candidates with AI (much faster)
 */
export async function batchCheckDuplicatesWithAI(
  candidates: Array<{ title: string; description?: string }>,
  historicalTitles: string[]
): Promise<AIDedupResult[]> {
  if (candidates.length === 0) {
    return [];
  }

  if (historicalTitles.length === 0) {
    return candidates.map(() => ({ isDuplicate: false, similarity: 0 }));
  }

  // Limit history to most recent 30 for performance
  const recentTitles = historicalTitles.slice(0, 30);
  
  logger.info('Batch AI dedup check', { 
    candidateCount: candidates.length,
    historyCount: recentTitles.length 
  });

  const prompt = buildBatchDedupPrompt(candidates, recentTitles);

  try {
    const result = await defaultRegistry.execute('ai.generate', {
      prompt,
      outputFormat: 'json',
      fallbackOnTimeout: true,
    });

    if (!result.success || !result.data) {
      logger.warn('Batch AI dedup failed, falling back to individual checks', { error: result.error?.message });
      // Fallback to individual checks
      return Promise.all(
        candidates.map(c => checkDuplicateWithAI(c.title, historicalTitles, c.description))
      );
    }

    const data = result.data as Array<Record<string, unknown>>;
    
    if (!Array.isArray(data)) {
      logger.warn('Batch AI dedup returned non-array, falling back');
      return Promise.all(
        candidates.map(c => checkDuplicateWithAI(c.title, historicalTitles, c.description))
      );
    }

    const results: AIDedupResult[] = data.map((item, idx) => ({
      isDuplicate: Boolean(item?.isDuplicate),
      similarTo: String(item?.similarTo || '') || undefined,
      similarity: Number(item?.similarity || 0),
      reasoning: String(item?.reasoning || ''),
    }));

    const blockedCount = results.filter(r => r.isDuplicate).length;
    logger.info('Batch AI dedup complete', { 
      total: candidates.length,
      blocked: blockedCount,
      passed: candidates.length - blockedCount 
    });

    return results;
  } catch (error) {
    logger.error('Batch AI dedup error, falling back', error as Error);
    // Fallback to individual checks
    return Promise.all(
      candidates.map(c => checkDuplicateWithAI(c.title, historicalTitles, c.description))
    );
  }
}

/**
 * Batch check multiple candidates with AI (legacy alias)
 */
export async function deduplicateCandidatesWithAI(
  candidates: Array<{ title: string; description?: string }>,
  historicalTitles: string[]
): Promise<Array<{ title: string; isDuplicate: boolean; similarTo?: string }>> {
  const results = await batchCheckDuplicatesWithAI(candidates, historicalTitles);
  
  return candidates.map((c, i) => ({
    title: c.title,
    isDuplicate: results[i]?.isDuplicate || false,
    similarTo: results[i]?.similarTo,
  }));
}
