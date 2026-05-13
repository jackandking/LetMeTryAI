---
name: kuaishou-task-manager
description: Batch manage Kuaishou Spark Plan distribution tasks. Currently supports stopping tasks (停止接单) based on CTR, age, or explicit plan IDs. Use when cleaning up underperforming tasks.
---

# Kuaishou Task Manager

Batch operations for Kuaishou distribution tasks (星火计划分销任务).

## Capabilities

- **Stop tasks (停止接单)**: Batch pause task acceptance by plan ID or filter criteria

## Prerequisites

- Valid Kuaishou auth cookies at `~/.runtime/kuaishou_auth.json`
- Daily report data at `.harness/.local/exports/metrics/kuaishou/daily/`
- DailyAppAgent run records at `.harness/.local/state/daily-app-runs/`

## Script

`scripts/batch-stop-tasks.js`

## Usage

### Stop specific tasks by plan ID

```bash
node .agents/skills/kuaishou-task-manager/scripts/batch-stop-tasks.js \
  --plan-ids 326043,313564,338732 \
  --execute
```

### Dry-run: preview what would be stopped

```bash
node .agents/skills/kuaishou-task-manager/scripts/batch-stop-tasks.js \
  --ctr-below 0.1 \
  --days-old 14
```

### Execute: stop all tasks matching criteria

```bash
node .agents/skills/kuaishou-task-manager/scripts/batch-stop-tasks.js \
  --ctr-below 0.1 \
  --days-old 14 \
  --brand "老人爱" \
  --execute
```

## Filter Options

| Option | Description | Example |
|---|---|---|
| `--plan-ids` | Comma-separated plan IDs | `326043,313564` |
| `--ctr-below` | Max CTR % to include | `0.1` |
| `--days-old` | Min age in days since publish | `14` |
| `--brand` | Filter by miniAppName (optional) | `老人爱` |
| `--execute` | Actually execute (default: dry-run) | — |

## How It Works

1. Loads daily report to get task stats (CTR, exposure, clicks)
2. Reads `daily-app-runs/*.jsonl` to determine publish dates
3. Filters tasks matching criteria
4. For each target:
   - Calls `POST /distribution/detail` to get current `version`
   - Calls `POST /distribution/update` with `{"updateFields":{"planOffline":"1"}}`
5. Prints summary

## API Reference

### Stop Task

```http
POST https://daren.kuaishou.com/rest/pc/creator/marketing/distribution/update
Cookie: <kuaishou cookies>
Content-Type: application/json

{
  "distributionPlanId": 313564,
  "version": 1,
  "updateFields": {
    "planOffline": "1"
  }
}
```

Response:
```json
{"result":1,"message":"成功","data":{"status":1,"distributionPlanId":313564,"version":2}}
```

Status mapping:
- `value: 2` = 进行中
- `value: 3` = 待结束 (停止接单后)

## Safety

- **Default is dry-run**. Must pass `--execute` to actually stop tasks.
- 500ms delay between requests to avoid rate limiting.
- Requires valid cookies. If expired, run `kuaishou-login` skill first.
