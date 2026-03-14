---
name: topic-selector
description: Select and rank topic ideas against brand-specific audience profiles. Use when topic strategy differs by product, such as 男人宝、女人爱、爱老人、家长爱.
---

# Topic Selector

Reusable topic scoring and ranking for LetMeTryAI products with different audience strategies.

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
