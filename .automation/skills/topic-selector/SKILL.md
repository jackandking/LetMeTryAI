---
name: topic-selector
description: Select and rank topic ideas against brand-specific audience profiles. Use when topic strategy differs by product, such as 男人宝、女人爱、爱老人、家长爱. Supports manual topic priority queue.
---

# Topic Selector

Reusable topic scoring and ranking for LetMeTryAI products with different audience strategies.

## Manual Topic Priority (NEW)

人工提交的选题会被**优先于 AI 生成选题**处理。

### 快速添加人工选题
```bash
# 添加到男人宝队列
echo "坦克之王评选" >> topics/man-manual-topics.txt

# 添加到女人爱队列
echo "春季口红新色对比" >> topics/woman-manual-topics.txt

# 批量添加
cat >> topics/man-manual-topics.txt << EOF
战斗机速度对比
最强战舰投票
EOF
```

### 在代码中使用
```javascript
import { selectNextTopic } from './scripts/topic-selector.js';

// 优先检查人工队列，无则返回 null
const topic = selectNextTopic('man');
if (topic) {
  console.log(`使用人工选题: ${topic.title}`);
} else {
  // 走 AI 生成逻辑
  const aiTopic = await generateAITopic('man');
}
```

### 处理机制
1. **完全优先**: 只要有人工选题，就不使用 AI 生成
2. **FIFO**: 按提交顺序处理（文件行顺序）
3. **自动清理**: 处理完成后自动从队列删除
4. **多品牌独立**: 各品牌有独立队列文件

### 队列文件位置
- `topics/man-manual-topics.txt` - 男人宝
- `topics/woman-manual-topics.txt` - 女人爱
- `topics/parent-manual-topics.txt` - 家长爱
- `topics/elder-manual-topics.txt` - 爱老人

## Purpose

Use this skill when the technical workflow is the same, but the topic strategy changes by product.

- `男人宝` wants male-oriented entertainment, hard-tech, sports, cars, and strong PK framing.
- `女人爱` wants beauty, fashion, relationships, and celebrity-oriented framing.
- `爱老人` wants health, nostalgia, practical life, and family-care topics.
- `家长爱` wants parenting, education, family decisions, and utility-driven topics.

This skill keeps the selector generic and pushes audience differences into profile data.

## Inputs

### Topic Candidate

```javascript
{
    title: '春季口红新色：谁更显白？',
    summary: '对比豆沙色、玫瑰色和奶茶色的春季热度',
    category: '美妆',
    format: '投票',
    keywords: ['口红', '显白', '春季', '种草'],
    signals: ['时尚', '美妆', '对比强', '适合投票'],
    riskFlags: []
}
```

### Profile

Load from `../brand-profiles/scripts/profile-loader.js`.

```javascript
import { getBrandProfile } from '../brand-profiles/scripts/profile-loader.js';
```

## Quick Start

```javascript
import { getBrandProfile } from '../brand-profiles/scripts/profile-loader.js';
import { rankTopicCandidates, buildTopicBrief } from './scripts/topic-selector.js';

const profile = getBrandProfile('womanai');

const ranked = rankTopicCandidates(topicCandidates, profile, { limit: 3 });
const best = ranked[0];

console.log(best.score);
console.log(buildTopicBrief(best.candidate, profile));
```

## Core Rules

1. **Profile-first**: the selector never hardcodes 男人宝/女人爱 logic.
2. **Reject obvious mismatch**: topics that hit profile hard blocks should be filtered out early.
3. **Reward shape + substance**: category fit and PK/voting suitability both matter.
4. **Preserve explainability**: each score returns reasons and warnings for prompt construction.

## Main Exports

### `scoreTopicCandidate(candidate, profile)`

Returns a scored result with reasons and warnings.

### `rankTopicCandidates(candidates, profile, options)`

Sorts candidates by descending score and filters out blocked topics.

### `buildTopicBrief(candidate, profile)`

Produces a compact brief that downstream skills can feed into app scaffolding or prompting.

## Composition Pattern

```javascript
import { getBrandProfile } from '../brand-profiles/scripts/profile-loader.js';
import { rankTopicCandidates } from './scripts/topic-selector.js';

const profile = getBrandProfile('nanrenbao');
const ranked = rankTopicCandidates(candidates, profile, { limit: 5 });

// Next steps:
// - pass the winner to voting-app-scaffold
// - publish through kuaishou-publisher
// - send results through report-sender
```

## When To Use

- Daily idea selection for different mini-programs
- Turning trend lists into audience-specific voting topics
- Preventing “男人宝 topic drift” from leaking into `女人爱` or `家长爱`

## When Not To Use

- Raw web scraping
- Kuaishou publishing
- Email delivery
- App directory scaffolding
