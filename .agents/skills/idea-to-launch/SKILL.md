---
name: idea-to-launch
description: Orchestrate the full LetMeTryAI workflow from audience-specific topic selection to app scaffold, deployment verification, Kuaishou publication, and report delivery.
---

# Idea To Launch

Reusable orchestration skill for the full LetMeTryAI launch pipeline.

## Purpose

This skill connects the reusable building blocks that now exist in the repository:

- `brand-profiles`
- `topic-selector`
- `voting-app-scaffold`
- `kuaishou-publisher`
- `report-sender`

It is the skill form of the daily workflow previously expressed only as a large prompt.

## Workflow

1. Pick the right audience profile
2. Rank topic candidates
3. Build the app scaffold plan
4. Verify deploy and public URL
5. Build the Kuaishou publish plan
6. Build the reporting plan

## Quick Start

```javascript
import { buildLaunchWorkflow } from './workflows/launch.js';

const workflow = buildLaunchWorkflow({
    profileId: 'womanai',
    topicCandidates,
    appId: 'spring-lipstick',
    appName: '春季显白色号',
    category: '娱乐',
    options,
    report: {
        to: 'jackandking@163.com',
        subject: '[Copilot Report] Daily Update'
    }
});

console.log(workflow.summary);
console.log(workflow.steps);
```

## Inputs

### Required

- `profileId`
- `topicCandidates`
- `appId`
- `appName`
- `category`
- `options`

### Optional

- `description`
- `coverImage`
- `deployedUrl`
- `report`
- `publish`

## Main Export

### `buildLaunchWorkflow(spec)`

Returns an orchestration package with:

- selected topic
- scaffold plan
- deploy verification step
- Kuaishou publish plan
- report plan
- ordered step list

## When To Use

- Daily automation runs
- End-to-end launch workflows for new mini-apps
- Coordinating multiple lower-level skills without rewriting them

## When Not To Use

- Low-level page automation
- Direct Kuaishou scraping
- Standalone report delivery without launch context
