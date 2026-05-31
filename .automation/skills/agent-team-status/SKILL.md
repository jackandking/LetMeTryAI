---
name: agent-team-status
description: Inspect the file-backed agent team runtime, including inbox/outbox queues, approvals, heartbeats, workspaces, and recent events.
---

# Agent Team Status

Use this skill to quickly inspect whether the agent team runtime is initialized, which agents are active, whether approvals are pending, and whether workspaces are still leased.

## What it shows

- runtime initialization status
- configured agents and their missions
- inbox/outbox pending counts per agent
- heartbeat freshness per agent
- pending manager and boss approvals
- active/released workspaces
- recent runtime events

## Quick Start

```bash
node .agents/skills/agent-team-status/scripts/status.js
```

JSON output:

```bash
node .agents/skills/agent-team-status/scripts/status.js --json
```

## Typical usage

### 1. Check whether the runtime has been initialized

```bash
node .agents/skills/agent-team-status/scripts/status.js
```

### 2. Inspect pending boss approvals

```bash
node .agents/skills/agent-team-status/scripts/status.js --json
```

Look at:

- `approvals.boss.pending`
- `approvals.boss.entries`

### 3. Check whether workers are stale

Each agent entry includes:

- `inboxPending`
- `outboxPending`
- `heartbeat.status`
- `heartbeat.ageMs`

### 4. Verify same-repo isolation

Use the workspace section to see:

- how many workspaces exist
- which ones are still `active`
- which agent currently holds each lease

## Notes

- Runtime artifacts live under `.automation/.local/agent-team/`
- If the runtime has not been initialized yet, the skill reports `initialized: no`
- Heartbeats older than 15 minutes are reported as `stale`

## References

- `scripts/status.js`
- `../../../.automation/shared/agent-team/status.js`
