---
name: voting-app-scaffold
description: Generate the concrete scaffold outputs for a new voting app based on the fighter-jets pattern. Use when turning a selected topic into app config, option markup, and metadata registration.
---

# Voting App Scaffold

Reusable scaffold helpers for creating new voting-style mini-apps in LetMeTryAI.

## Purpose

This skill converts upstream topic decisions into repository-ready scaffold outputs.

It is designed around the actual workflow used in this repo:

1. Copy the `fighter-jets` template.
2. Replace `questionConfig` in `app.js`.
3. Replace the option blocks in `index.html`.
4. Register the app in `apps-metadata.json`.

## Inputs

### Required

- `appId`
- `appName`
- `category`
- `topicBrief`
- `options`

### Optional

- `brandProfile`
- `description`
- `coverImage`
- `inputName`
- `tags`

## Quick Start

```javascript
import { getBrandProfile } from '../brand-profiles/scripts/profile-loader.js';
import { buildTopicBrief } from '../topic-selector/scripts/topic-selector.js';
import { buildScaffoldPlan } from './scripts/scaffold.js';

const profile = getBrandProfile('womanai');
const topicBrief = buildTopicBrief(
    {
        title: '春季口红新色大 PK',
        category: '美妆',
        format: '投票',
        keywords: ['口红', '显白', '种草']
    },
    profile
);

const plan = buildScaffoldPlan({
    appId: 'spring-lipstick',
    appName: '春季显白色号',
    category: '娱乐',
    topicBrief,
    brandProfile: profile,
    options: [
        { value: 'milk-tea', label: '奶茶裸调', image: 'milk-tea.jpg' },
        { value: 'rose', label: '玫瑰豆沙', image: 'rose.jpg' }
    ],
    coverImage: 'spring-lipstick/images/cover.jpg'
});

console.log(plan.metadataEntry);
console.log(plan.files.appJsQuestionConfig);
console.log(plan.files.indexOptionsMarkup);
```

## Main Exports

### `createQuestionConfig(spec)`

Returns the normalized `questionConfig` object for `app.js`.

### `renderQuestionConfigSnippet(spec)`

Returns the exact JS snippet to paste into the template app.

### `renderOptionMarkup(options, inputName)`

Returns the repeated `<label class="option">...</label>` blocks for `index.html`.

### `createMetadataEntry(spec)`

Returns the app record for `apps-metadata.json`.

### `buildScaffoldPlan(spec)`

Returns a full scaffold package with template path, generated snippets, metadata, and checklist.

## Composition Pattern

```javascript
import { getBrandProfile } from '../brand-profiles/scripts/profile-loader.js';
import { rankTopicCandidates } from '../topic-selector/scripts/topic-selector.js';
import { buildScaffoldPlan } from './scripts/scaffold.js';

const profile = getBrandProfile('nanrenbao');
const topic = rankTopicCandidates(candidates, profile, { limit: 1 })[0];

const scaffold = buildScaffoldPlan({
    appId: 'top-supercars',
    appName: '超跑擂台',
    category: '娱乐',
    topicBrief: topic.candidate,
    brandProfile: profile,
    options
});
```

## Output Surfaces

- `app.js` question config
- `index.html` option markup
- `apps-metadata.json` entry
- scaffold checklist for copy/edit/register/deploy

## When To Use

- Creating a new voting app from a selected topic
- Standardizing the fighter-jets clone workflow
- Turning profile-aware topic decisions into actual app edits

## When Not To Use

- Topic discovery itself
- Kuaishou publishing
- Email reporting
