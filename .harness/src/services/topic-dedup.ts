/**
 * Topic Deduplication Service
 * Hybrid approach: Keyword groups (strict) + Jaccard (fast) + AI (semantic)
 */
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { PATHS } from '../config/index.js';
import { checkDuplicateWithAI, batchCheckDuplicatesWithAI, AIDedupResult } from './topic-dedup-ai.js';

// Keyword groups per profile (ported from check-topic-duplicate.sh)
const KEYWORD_GROUPS: Record<string, string[][]> = {
  nanrenbao: [
    ['球星', '球员', '足球', '篮球', 'NBA', '世界杯'],
    ['PK', '对决', '对战', 'VS', '较量'],
    ['排行', '排名', '榜单', 'TOP'],
    ['坦克', '战机', '航母', '军舰', '武器', '装备'],
    ['汽车', '跑车', '豪车', '车辆'],
    ['手机', '电脑', '数码', '科技'],
  ],
  womanai: [
    ['口红', '唇色', '色号', '唇膏', '唇釉'],
    ['美妆', '化妆', '粉底', '眼影', '腮红', '护肤'],
    ['穿搭', '时尚', '搭配', '衣服', '包包', '鞋子'],
    ['明星', '艺人', '偶像', '综艺', '影视'],
  ],
  'parent-tools': [
    ['作业', '功课', '学习', '考试', '成绩', '补习'],
    ['课外班', '兴趣班', '培训', '辅导', '早教'],
    ['亲子', '育儿', '家长', '陪伴', '家庭教育'],
  ],
  'elder-love': [
    ['养生', '保健', '健康', '长寿', '体检', '中医'],
    ['晨练', '太极', '广场舞', '散步', '健身'],
    ['退休', '老年', '银发', '养老'],
    ['怀旧', '经典', '老歌', '戏曲', '回忆'],
  ],
};

/**
 * Check if a new topic shares any keyword group with recent topics.
 * This is stricter than Jaccard: any keyword overlap in the same group = duplicate.
 */
export function checkKeywordDuplicate(
  newTopic: string,
  recentTopics: string[],
  profileId: string
): DuplicateCheckResult {
  const groups = KEYWORD_GROUPS[profileId] || [];
  const newLower = newTopic.toLowerCase();

  for (const group of groups) {
    const newHas = group.some((kw) => newLower.includes(kw));
    if (!newHas) continue;

    for (const recent of recentTopics) {
      const recentLower = recent.toLowerCase();
      const recentHas = group.some((kw) => recentLower.includes(kw));
      if (recentHas) {
        return {
          isDuplicate: true,
          similarTo: recent,
          similarity: 1.0,
          reasoning: `Keyword overlap in group [${group.join(',')}]`,
          method: 'keyword',
        };
      }
    }
  }

  return { isDuplicate: false, method: 'none' };
}

/**
 * Character-level Jaccard similarity between two strings.
 * Works well for Chinese text where individual characters carry meaning.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const set1 = new Set(str1.split(''));
  const set2 = new Set(str2.split(''));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}

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
export function checkTopicDuplicate(
  newTopic: string,
  recentTopics: string[],
  options: { threshold?: number; profileId?: string } = {}
): DuplicateCheckResult {
  const { threshold = 0.7, profileId } = options;
  
  // First pass: strict keyword group overlap
  if (profileId) {
    const keywordResult = checkKeywordDuplicate(newTopic, recentTopics, profileId);
    if (keywordResult.isDuplicate) {
      return keywordResult;
    }
  }
  
  const keywords = newTopic.toLowerCase();

  for (const topic of recentTopics) {
    const similarity = calculateSimilarity(keywords, topic.toLowerCase());
    if (similarity > threshold) {
      return {
        isDuplicate: true,
        similarTo: topic,
        similarity,
        method: 'jaccard',
      };
    }
  }

  return { isDuplicate: false, method: 'none' };
}

/**
 * Check duplicate with AI semantic judgment
 */
export async function checkTopicDuplicateWithAI(
  newTopic: string,
  recentTopics: string[],
  options: { 
    threshold?: number;
    aiThreshold?: number;
    profileId?: string;
  } = {}
): Promise<DuplicateCheckResult> {
  const { threshold = 0.6, aiThreshold = 0.75, profileId } = options;
  
  // First pass: keyword groups + Jaccard for exact matches
  const jaccardResult = checkTopicDuplicate(newTopic, recentTopics, { threshold, profileId });
  if (jaccardResult.isDuplicate) {
    return jaccardResult;
  }

  // Second pass: Find potentially similar topics with lower threshold
  const candidates: string[] = [];
  const keywords = newTopic.toLowerCase();
  
  for (const topic of recentTopics) {
    const similarity = calculateSimilarity(keywords, topic.toLowerCase());
    // If Jaccard shows some similarity but below threshold, let AI judge
    if (similarity > 0.3 && similarity <= threshold) {
      candidates.push(topic);
    }
  }

  // Limit candidates for performance
  const limitedCandidates = candidates.slice(0, 10);

  if (limitedCandidates.length === 0) {
    return { isDuplicate: false, method: 'none' };
  }

  // AI judgment on candidates
  const aiResult = await checkDuplicateWithAI(newTopic, limitedCandidates);
  
  if (aiResult.isDuplicate && aiResult.similarity >= aiThreshold) {
    return {
      isDuplicate: true,
      similarTo: aiResult.similarTo,
      similarity: aiResult.similarity,
      reasoning: aiResult.reasoning,
      method: 'ai',
    };
  }

  return { 
    isDuplicate: false, 
    method: 'ai',
    reasoning: aiResult.reasoning 
  };
}

/**
 * Load published task names from Kuaishou reports
 */
export function loadPublishedTaskNames(): string[] {
  // Try harness path first, then fallback to automation
  let metricsDir = join(PATHS.harnessRuntimeDir, '..', '..', '.automation', '.local', 'exports', 'metrics', 'kuaishou', 'daily');
  
  if (!existsSync(metricsDir)) {
    // Fallback to automation path directly
    metricsDir = join(PATHS.harnessRuntimeDir, '..', '..', '..', 'prod', 'LetMeTryAI', '.automation', '.local', 'exports', 'metrics', 'kuaishou', 'daily');
  }
  
  if (!existsSync(metricsDir)) {
    console.log('[Dedup] Metrics directory not found:', metricsDir);
    return [];
  }

  try {
    const files = readdirSync(metricsDir)
      .filter(f => f.startsWith('kuaishou_report_') && f.endsWith('.json'))
      .sort()
      .reverse();

    if (files.length === 0) {
      return [];
    }

    const latestReport = JSON.parse(
      readFileSync(join(metricsDir, files[0]), 'utf-8')
    );

    const names = (latestReport.allTasks || [])
      .map((t: { name?: string }) => t.name)
      .filter(Boolean) as string[];
    
    console.log(`[Dedup] Loaded ${names.length} published tasks from ${files[0]}`);
    return names;
  } catch (error) {
    console.error('[Dedup] Failed to load published tasks:', error);
    return [];
  }
}

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
export function deduplicateCandidates(
  candidates: DedupCandidate[],
  options: DedupOptions
): Array<DedupCandidate & { _blocked?: boolean; _duplicateOf?: string; _similarity?: number; _reasoning?: string; _method?: string }> {
  const { publishedNames, threshold = 0.6, profileId } = options;
  const blockedAppIds = new Set<string>();

  return candidates.map(candidate => {
    // Check against published tasks (with keyword dedup if profileId known)
    const publishedCheck = checkTopicDuplicate(
      candidate.title,
      publishedNames,
      { threshold, profileId }
    );

    if (publishedCheck.isDuplicate) {
      return {
        ...candidate,
        _blocked: true,
        _duplicateOf: publishedCheck.similarTo,
        _similarity: publishedCheck.similarity,
        _reasoning: publishedCheck.reasoning,
        _method: publishedCheck.method,
      };
    }

    // Check against previous candidates (prevent duplicates in same batch)
    for (const blockedId of blockedAppIds) {
      const selfCheck = checkTopicDuplicate(
        candidate.title,
        [blockedId],
        { threshold: 0.8, profileId } // Stricter for same-batch
      );
      if (selfCheck.isDuplicate) {
        return {
          ...candidate,
          _blocked: true,
          _duplicateOf: blockedId,
          _similarity: selfCheck.similarity,
          _reasoning: selfCheck.reasoning,
          _method: selfCheck.method,
        };
      }
    }

    blockedAppIds.add(candidate.title);
    return candidate;
  });
}

/**
 * Async deduplication with AI judgment (batch mode for speed)
 */
export async function deduplicateCandidatesWithAI(
  candidates: DedupCandidate[],
  options: DedupOptions
): Promise<Array<DedupCandidate & { _blocked?: boolean; _duplicateOf?: string; _similarity?: number; _reasoning?: string; _method?: string }>> {
  const { publishedNames, threshold = 0.6, useAI = true, profileId } = options;
  
  if (!useAI) {
    // Fallback to sync version
    return deduplicateCandidates(candidates, { publishedNames, threshold, profileId });
  }

  // First pass: keyword + Jaccard for exact matches (fast)
  const jaccardResults = deduplicateCandidates(candidates, { publishedNames, threshold: 0.8, profileId });
  const needAiCheck = jaccardResults.filter(c => !c._blocked);
  
  if (needAiCheck.length === 0) {
    return jaccardResults;
  }

  // Second pass: Batch AI check for remaining candidates
  console.log(`[AI Dedup] ${needAiCheck.length} candidates need semantic check`);
  const aiResults = await batchCheckDuplicatesWithAI(
    needAiCheck.map(c => ({ title: c.title, description: c.description })),
    publishedNames
  );

  // Merge results
  const aiResultMap = new Map(needAiCheck.map((c, i) => [c.title, aiResults[i]]));
  
  return jaccardResults.map(c => {
    if (c._blocked) return c; // Already blocked by keyword or Jaccard
    
    const aiResult = aiResultMap.get(c.title);
    if (aiResult?.isDuplicate && (aiResult.similarity || 0) >= 0.75) {
      return {
        ...c,
        _blocked: true,
        _duplicateOf: aiResult.similarTo,
        _similarity: aiResult.similarity,
        _reasoning: aiResult.reasoning,
        _method: 'ai',
      };
    }
    return c;
  });
}
