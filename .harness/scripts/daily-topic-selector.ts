#!/usr/bin/env tsx
/**
 * Daily Topic Selector - Standalone topic selection for cron
 *
 * 1. Fetches trending hot topics
 * 2. Generates AI candidates inspired by trends
 * 3. Applies strict keyword-based deduplication against recent apps
 * 4. Pushes the selected topic to the manual topic queue
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { fetchTrendingTopics } from '../src/services/fetch-trending.js';
import { loadProfileConfig, PATHS } from '../src/config/index.js';
import { defaultRegistry } from '../src/tools/index.js';
import {
  parseTopicSelectionResponse,
  buildTopicSelectionPrompt,
} from '../src/services/topic-selector.js';
import { logger } from '../src/utils/logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

function log(stage: string, message: string): void {
  const ts = new Date().toISOString();
  console.log(`[topic-selector][${ts}][${stage}] ${message}`);
}

function getRecentAppTitles(days = 7): string[] {
  const result = spawnSync(
    'git',
    ['log', `--since=${days} days ago`, '--name-status', '--diff-filter=A', '--', '*/app.js'],
    { encoding: 'utf-8', cwd: PATHS.projectRoot }
  );

  if (result.error || result.status !== 0) {
    log('warn', 'Failed to get recent apps from git log');
    return [];
  }

  const dirs = result.stdout
    .split('\n')
    .filter((line) => line.startsWith('A'))
    .map((line) => line.split(/\s+/)[1])
    .filter(Boolean)
    .map((filePath) => join(PATHS.projectRoot, filePath, '..'))
    .filter((dir) => existsSync(join(dir, 'index.html')));

  return dirs
    .map((dir) => {
      try {
        const html = readFileSync(join(dir, 'index.html'), 'utf-8');
        const match = html.match(/<title>([^<]*)<\/title>/i);
        return match ? match[1].trim() : '';
      } catch {
        return '';
      }
    })
    .filter(Boolean);
}

function hasKeywordOverlap(title: string, recentTitles: string[], profileId: string): boolean {
  const groups = KEYWORD_GROUPS[profileId] || [];
  const titleLower = title.toLowerCase();

  for (const group of groups) {
    const titleHas = group.some((kw) => titleLower.includes(kw));
    if (!titleHas) continue;

    for (const recent of recentTitles) {
      const recentLower = recent.toLowerCase();
      const recentHas = group.some((kw) => recentLower.includes(kw));
      if (recentHas) {
        log('dedup', `Blocked "${title}" — shares group [${group.join(',')}] with "${recent}"`);
        return true;
      }
    }
  }

  return false;
}

function pushToManualQueue(profileId: string, topic: string): void {
  const map: Record<string, string> = {
    nanrenbao: 'man',
    womanai: 'woman',
    'parent-tools': 'parent',
    'elder-love': 'elder',
  };
  const fileKey = map[profileId] || profileId;
  const queueDir = join(PATHS.projectRoot, '.automation', '.local', 'state', 'topics');
  const queueFile = join(queueDir, `${fileKey}-manual-topics.txt`);

  mkdirSync(queueDir, { recursive: true });

  let existing = '';
  if (existsSync(queueFile)) {
    existing = readFileSync(queueFile, 'utf-8');
  }

  // Prepend so it is picked first by FIFO consumers
  const newContent = topic.trim() + '\n' + existing;
  writeFileSync(queueFile, newContent);
  log('queue', `Pushed "${topic}" to ${queueFile}`);
}

async function main(): Promise<void> {
  const profileId = process.argv[2];
  if (!profileId) {
    console.error('Usage: tsx daily-topic-selector.ts <profile-id>');
    process.exit(1);
  }

  log('start', `Profile=${profileId}`);

  const profile = loadProfileConfig(profileId);
  const currentDate = new Date().toISOString().split('T')[0];

  // 1. Fetch trending topics
  let trendingContext = '';
  try {
    trendingContext = (await fetchTrendingTopics({ profile })) as string;
    log('trending', `Fetched ${trendingContext.length} chars`);
  } catch (err) {
    log('warn', `Trending fetch failed: ${(err as Error).message}`);
  }

  // 2. Load recent app titles for dedup context
  const recentTitles = getRecentAppTitles(7);
  log('dedup', `Loaded ${recentTitles.length} recent titles`);
  if (recentTitles.length > 0) {
    recentTitles.slice(0, 10).forEach((t) => log('dedup', `  - ${t}`));
  }

  // 3. Build prompt and generate candidates
  const prompt = buildTopicSelectionPrompt(
    profile,
    currentDate,
    trendingContext || undefined,
    recentTitles,
    undefined // no topicHint for standalone selector
  );

  const aiResult = await defaultRegistry.execute('ai.generate', {
    prompt,
    outputFormat: 'json',
    fallbackOnTimeout: true,
  });

  if (!aiResult.success) {
    throw new Error('AI topic generation failed');
  }

  const parsed = parseTopicSelectionResponse(aiResult.data);
  log('ai', `Generated ${parsed.topicCandidates.length} candidates`);
  parsed.topicCandidates.forEach((c, i) => log('ai', `  ${i + 1}. ${c.title}`));

  // 4. Apply strict keyword dedup and select
  let selected = null;
  for (const candidate of parsed.topicCandidates) {
    if (hasKeywordOverlap(candidate.title, recentTitles, profileId)) {
      continue;
    }
    selected = candidate;
    break;
  }

  if (!selected) {
    selected = parsed.topicCandidates[0];
    log('fallback', 'All candidates blocked by dedup — using first candidate as fallback');
  }

  // 5. Push to manual queue
  pushToManualQueue(profileId, selected.title);

  log('done', `Selected="${selected.title}" | category="${selected.category}"`);
}

main().catch((err) => {
  logger.error('Topic selector failed', err);
  process.exit(1);
});
