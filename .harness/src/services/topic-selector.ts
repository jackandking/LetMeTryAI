/**
 * Topic Selector - Generates topic candidates using AI (Copilot → Kimi fallback)
 */
import { ProfileConfig, TopicCandidate, ToolResult } from '../types/index.js';
import { logger } from '../utils/logger.js';
import { defaultRegistry } from '../tools/index.js';
import fs from 'fs';
import path from 'path';

export interface TopicSelectionResult {
  profileId: string;
  reportSummary: string;
  topicCandidates: TopicCandidate[];
}

export function buildTopicSelectionPrompt(
  profile: ProfileConfig,
  date: string,
  trendingContext?: string,
  recentTopics?: string[],
  topicHint?: string
): string {
  const categories = profile.preferredCategories.join('、');
  const doMore = profile.topicGuidelines.doMore.join('；');
  const avoid = profile.topicGuidelines.avoid.join('；');

  const recentNote = recentTopics && recentTopics.length > 0
    ? `最近已发布的主题（请避免重复）：\n${recentTopics.slice(0, 15).map((t, i) => `${i + 1}. ${t}`).join('\n')}\n`
    : '';

  return `今天是 ${date}。

为 LetMeTryAI 的${profile.name}品牌挑选适合做投票页的热点话题。

品牌定位：${profile.name}
优先类别：${categories}
优先方向：${doMore}
避免方向：${avoid}

${trendingContext ? `\n${trendingContext}\n` : '\n当前无热点数据，请基于品牌定位自选话题。\n'}

${recentNote}

${topicHint ? `重要：你必须围绕这个指定话题生成投票页面：「${topicHint}」。\n- 只需提供 1 个 topicCandidate（不是3个），标题必须使用或包含该指定话题。\n- 为该话题设计 2-4 个有对比性的选项。\n` : `重要：${trendingContext ? '3个候选中至少2个必须直接源自今日热搜数据，或与热搜中的事件/现象强相关。第3个候选可以结合品牌定位自由发挥。' : '优先从今日热搜中选择与品牌定位相关的话题，或将热点元素融入选题。避免选择过于冷门或与当前时事完全无关的话题。'}\n`}

请返回 JSON 格式：
{
  "profileId": "${profile.id}",
  "reportSummary": "一句话中文总结",
  "topicCandidates": [
    {
      "appId": "kebab-case-id",
      "title": "主题标题（不含极限词）",
      "pageTitle": "页面标题",
      "appName": "应用名称",
      "summary": "为何适合做投票",
      "description": "metadata描述",
      "question": "投票问题句子",
      "category": "分类",
      "keywords": ["关键词"],
      "options": [
        {
          "label": "选项名",
          "value": "kebab-id",
          "caption": "展示文案",
          "alt": "图片alt",
          "image": "kebab-id.svg"
        }
      ]
    }
  ]
}

要求：
- ${topicHint ? '提供 1 个 topicCandidate' : '提供 3 个 topicCandidates'}
- 每个候选必须有 2-4 个 options
- appId、options.value、options.image 必须是 ASCII kebab-case
- 标题、appName、question、description 中绝对禁止出现以下极限词：最、第一、唯一、极致、绝对、顶级、史上、全网。含有任意一个极限词的候选将被视为无效。
- 适合手机阅读的图文投票页
- 避免低俗、侵权、血腥、政治敏感、医疗误导`;
}

export function parseTopicSelectionResponse(content: unknown): TopicSelectionResult {
  if (!content || typeof content !== 'object') {
    throw new Error('Invalid response: not an object');
  }

  const obj = content as Record<string, unknown>;

  if (!Array.isArray(obj.topicCandidates)) {
    throw new Error('Invalid response: topicCandidates is not an array');
  }

  // Validate and normalize candidates
  const candidates = obj.topicCandidates.map((c, idx) => {
    const candidate = c as Record<string, unknown>;
    
    if (!candidate.title || typeof candidate.title !== 'string') {
      throw new Error(`Candidate ${idx}: missing title`);
    }
    if (!candidate.category || typeof candidate.category !== 'string') {
      throw new Error(`Candidate ${idx}: missing category`);
    }
    if (!candidate.question || typeof candidate.question !== 'string') {
      throw new Error(`Candidate ${idx}: missing question`);
    }
    if (!Array.isArray(candidate.options) || candidate.options.length < 2) {
      throw new Error(`Candidate ${idx}: must have at least 2 options`);
    }

    // Normalize options
    const options = candidate.options.map((o: unknown, oidx: number) => {
      const opt = o as Record<string, unknown>;
      return {
        label: String(opt.label || `选项${oidx + 1}`),
        value: String(opt.value || `option-${oidx + 1}`),
        caption: String(opt.caption || opt.label || `选项${oidx + 1}`),
        alt: String(opt.alt || opt.label || `选项${oidx + 1}`),
        image: String(opt.image || `${opt.value || 'option'}.svg`),
      };
    });

    return {
      appId: String(candidate.appId || `app-${idx}`),
      title: String(candidate.title),
      pageTitle: String(candidate.pageTitle || candidate.title),
      appName: String(candidate.appName || candidate.pageTitle || candidate.title),
      summary: String(candidate.summary || ''),
      description: String(candidate.description || candidate.summary || ''),
      question: String(candidate.question),
      category: String(candidate.category),
      keywords: Array.isArray(candidate.keywords) ? candidate.keywords.map(String) : [],
      options,
    } as TopicCandidate;
  });

  return {
    profileId: String(obj.profileId || 'unknown'),
    reportSummary: String(obj.reportSummary || ''),
    topicCandidates: candidates,
  };
}

/**
 * Generate topic candidates using AI with automatic fallback
 */
export async function generateTopicsWithAI(
  profile: ProfileConfig,
  date: string = new Date().toISOString().split('T')[0],
  trendingContext?: string
): Promise<TopicSelectionResult> {
  const prompt = buildTopicSelectionPrompt(profile, date, trendingContext);
  
  logger.info('Generating topics with AI', { profile: profile.id, date });

  // Use ai.generate with automatic fallback (Copilot → Kimi)
  const result = await defaultRegistry.execute('ai.generate', {
    prompt,
    outputFormat: 'json',
    fallbackOnTimeout: true,
  }) as ToolResult;

  if (!result.success) {
    logger.error('AI topic generation failed', result.error as Error);
    throw result.error || new Error('AI topic generation failed');
  }

  // Parse the response
  const content = result.data;
  const parsed = parseTopicSelectionResponse(content);
  
  logger.info('Topic generation successful', {
    provider: (content as Record<string, unknown>)?._meta?.provider,
    candidateCount: parsed.topicCandidates.length,
  });

  return parsed;
}

export async function chooseBestTopic(
  candidates: TopicCandidate[],
  profile: ProfileConfig,
  options: { useAIDedup?: boolean } = {}
): Promise<TopicCandidate> {
  const { useAIDedup = false } = options;
  
  logger.info('Choosing best topic', { 
    candidateCount: candidates.length,
    titles: candidates.map(c => c.title),
    useAIDedup,
  });

  // Import dedup service
  const { 
    deduplicateCandidates, 
    deduplicateCandidatesWithAI,
    loadPublishedTaskNames 
  } = await import('./topic-dedup.js');
  
  // Load published tasks for dedup
  const publishedNames = loadPublishedTaskNames();
  
  // Mark duplicates (with or without AI)
  const marked = useAIDedup 
    ? await deduplicateCandidatesWithAI(candidates, { publishedNames, threshold: 0.6, useAI: true, profileId: profile.id })
    : deduplicateCandidates(candidates, { publishedNames, threshold: 0.6, profileId: profile.id });
  
  // Filter out blocked candidates
  const valid = marked.filter(c => !c._blocked);
  const blocked = marked.filter(c => c._blocked);
  
  // Log blocked candidates
  for (const b of blocked) {
    logger.warn('Topic blocked by dedup', { 
      title: b.title, 
      similarTo: b._duplicateOf,
      similarity: b._similarity,
      reasoning: b._reasoning,
      method: b._method,
    });
  }
  
  // Use valid candidates, or fallback to all if all blocked
  const pool = valid.length > 0 ? valid : candidates;

  // Load historical performance for this profile
  const profilePerformance = loadProfilePerformance(profile.id);
  logger.info('Loaded profile performance', { profileId: profile.id, avgScore: profilePerformance });

  // Score and select best
  const scored = pool.map(c => ({
    candidate: c,
    score: scoreCandidate(c, profile, profilePerformance),
  })).sort((a, b) => b.score - a.score);
  
  const best = scored[0]?.candidate || candidates[0];
  
  if (valid.length === 0 && blocked.length > 0) {
    logger.warn('All candidates blocked by dedup — using fallback', { 
      fallback: best.title,
      blockedCount: blocked.length,
    });
  }
  
  logger.info('Selected topic', { 
    title: best.title, 
    category: best.category,
    wasBlocked: (best as unknown as { _blocked?: boolean })._blocked || false,
  });
  
  return best;
}

/**
 * Score a candidate based on profile preferences.
 */
function loadProfilePerformance(profileId: string): number {
  const perfFile = path.join(process.cwd(), '.automation', '.local', 'state', 'topic-performance.jsonl');
  if (!fs.existsSync(perfFile)) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  let total = 0;
  let count = 0;

  const lines = fs.readFileSync(perfFile, 'utf-8').split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const record = JSON.parse(line) as { date?: string; profileId?: string; score?: number };
      if (!record.date || record.profileId !== profileId || typeof record.score !== 'number') continue;
      const recordDate = new Date(record.date);
      if (recordDate < cutoff) continue;
      total += record.score;
      count += 1;
    } catch {
      // ignore malformed lines
    }
  }

  return count > 0 ? total / count : 0;
}

function scoreCandidate(
  candidate: TopicCandidate,
  profile: ProfileConfig,
  profilePerformance: number = 0
): number {
  let score = 0;

  // Category preference (30 points)
  const catIndex = profile.preferredCategories.indexOf(candidate.category);
  if (catIndex >= 0) {
    score += 30 - catIndex * 5; // Higher score for earlier categories
  }

  // Do More guidelines (20 points)
  const doMoreMatch = profile.topicGuidelines.doMore.some(guideline => {
    const keywords = guideline.toLowerCase().split(/[，,、\s]+/);
    return keywords.some(kw =>
      candidate.title.toLowerCase().includes(kw) ||
      candidate.description.toLowerCase().includes(kw)
    );
  });
  if (doMoreMatch) score += 20;

  // Avoid guidelines penalty (-20 points)
  const avoidMatch = profile.topicGuidelines.avoid.some(guideline => {
    const keywords = guideline.toLowerCase().split(/[，,、\s]+/);
    return keywords.some(kw =>
      candidate.title.toLowerCase().includes(kw) ||
      candidate.description.toLowerCase().includes(kw)
    );
  });
  if (avoidMatch) score -= 20;

  // Option count bonus (up to 10 points)
  score += Math.min(candidate.options.length * 3, 10);

  // Historical performance boost / penalty
  if (profilePerformance >= 40) score += 10;
  else if (profilePerformance >= 20) score += 5;
  else if (profilePerformance > 0 && profilePerformance < 5) score -= 10;

  return score;
}
