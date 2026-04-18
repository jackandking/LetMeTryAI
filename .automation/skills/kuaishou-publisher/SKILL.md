---
name: kuaishou-publisher
description: Publish LetMeTryAI mini-apps to Kuaishou Spark Plan by wrapping the existing publish-kuaishou-task.js workflow. Use when a new app has already been deployed and needs Kuaishou task publication.
---

# Kuaishou Publisher

Reusable publication workflow for Kuaishou Spark Plan.

## Purpose

This skill exposes the repository's existing Kuaishou publication workflow as a stable, reusable interface.

It does **not** replace the publish-kuaishou-task.js script. Instead, it:

- normalizes publish inputs
- prepares the command to run
- reminds callers about preflight checks
- maps the workflow to the related Kuaishou skills
- surfaces template task id / wait / exit-code behavior as deterministic inputs

## Source of Truth

- Script: publish-kuaishou-task.js (located in .automation/scripts/)
- Related skill: kuaishou-scraper

## Inputs

### Required

- `appId`
- `appName`
- `description`

### Optional

- `sourceTaskId`
- `authFile`
- `headless`
- `deployedUrl`

## Quick Start

```javascript
import { buildPublishPlan } from './scripts/publisher.js';

const plan = buildPublishPlan({
    appId: 'spring-lipstick',
    appName: '春季显白色号',
    description: '投票选出春季最显白的热门色号',
    deployedUrl: 'https://letmetryai.cn/spring-lipstick/'
});

console.log(plan.command);
console.log(plan.checklist);
```

## Main Exports

### `normalizePublishSpec(spec)`

Normalizes input and fills sensible defaults from the existing repo workflow.

### `buildPublishCommand(spec)`

Returns the exact node publish-kuaishou-task.js ... command.

### `buildPublishChecklist(spec)`

Returns the required preflight/postflight checks before running the script.

### `buildPublishPlan(spec)`

Returns a full publication package with command, defaults, dependencies, and checklist.

## Composition Pattern

```javascript
import { buildScaffoldPlan } from '../voting-app-scaffold/scripts/scaffold.js';
import { buildPublishPlan } from './scripts/publisher.js';

const scaffold = buildScaffoldPlan(scaffoldSpec);

const publishPlan = buildPublishPlan({
    appId: scaffold.metadataEntry.id,
    appName: scaffold.metadataEntry.name,
    description: scaffold.metadataEntry.description,
    deployedUrl: `https://letmetryai.cn/${scaffold.metadataEntry.url}/`
});
```

## Workflow Notes

1. Deploy first.
2. Reuse `kuaishou_auth.json` if available.
3. The browser automation is handled by publish-kuaishou-task.js.
4. The script now supports `SOURCE_TASK_ID` and exits non-zero when submission is not confirmed.
5. If selectors drift, update the script rather than forking publisher logic here.

## When To Use

- After a new app has been deployed and verified online
- When a daily automation needs a reusable publication step
- When orchestration code needs a stable Kuaishou publish interface

## When Not To Use

- Topic selection
- App directory generation
- Kuaishou analytics scraping
- Email reporting
