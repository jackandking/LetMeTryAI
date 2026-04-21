# .harness - Agent Documentation

## Scope

This directory contains the next-generation automation orchestration system (Harness) for LetMeTryAI. It supersedes legacy `.automation/` cron jobs with a type-safe, observable, constraint-driven pipeline.

## Hard Rules

1. **Runtime Isolation**: All Harness runtime data **must** live under `.harness/.local/`. Never write logs, state, or auth to `.automation/.local/`.
2. **Mode Safety**: Default mode is `shadow`. Production mode must be explicitly set via `HARNESS_MODE=production`.
3. **Clean Worktree**: Daily pipelines require a clean git worktree unless `DAILY_ALLOW_DIRTY_WORKTREE=true` is set.
4. **TypeScript First**: All new Harness code is TypeScript. Use ES modules (`import`/`export`).
5. **No Business Logic in Harness**: Harness orchestrates topic selection, scaffold generation, and publishing. It does not modify mini-app HTML/JS/CSS directly.
6. **Self-Contained Stable Layer**: `.harness` is the independent production layer. It must not depend on `.automation/` for any runtime capability. All scripts, utilities, and configs required for prod must live under `.harness/`.
7. **Kuaishou Auth Session Failures**: `SESSION_EXPIRED` responses must be returned as `success: false` in the ReAct loop observation with a `next` state for graceful degradation. Automatic retries on session expiry are prohibited; use the kuaishou-login skill for manual re-authentication.

## Technology Stack

- **Runtime**: Node.js 22+ with `tsx`
- **Language**: TypeScript (ES modules)
- **Code Quality**: Biome (lint + format)
- **Testing**: Node.js built-in test runner + Jest for compatibility tests

## Directory Structure

```
.harness/
├── src/
│   ├── agents/      # DailyAppAgent, state machines
│   ├── workflows/   # ReAct loop, orchestration
│   ├── tools/       # Tool registry (Copilot, Kimi, AI generate)
│   ├── constraints/ # Hard boundaries, keyword filtering
│   ├── config/      # Type-safe configuration
│   ├── types/       # Shared TypeScript types
│   └── services/    # Scaffold generator, topic dedup
├── scripts/         # CLI and cron entry points
├── tests/           # Unit and integration tests
├── config/          # Harness-specific config
└── .local/          # Runtime data (gitignored)
    ├── state/
    ├── logs/
    ├── tasks/
    └── metrics/
```

## Build and Development Commands

```bash
cd .harness
npm install
npx biome check .
npx biome check --write .
npm test
```

## Running Daily Profiles

### Shadow Mode (safe, no side effects)
```bash
HARNESS_MODE=shadow npx tsx scripts/run-daily-app-profile.ts nanrenbao
```

### Production Mode
```bash
HARNESS_MODE=production npx tsx scripts/run-daily-app-profile.ts nanrenbao
```

### Cron Wrapper
```bash
.harness/scripts/run-daily-app-cron.sh <profile-id>
```

## Data Isolation

All Harness runtime data is stored in `.harness/.local/`:

```
.harness/.local/
├── state/      # Task state, daily-app-runs JSONL
├── logs/       # Structured logs
├── tasks/      # Task history
├── auth/       # Authentication state
└── metrics/    # Performance metrics
```

The legacy `.automation/.local/` continues to operate independently.

## Configuration

- `HARNESS_MODE`: `shadow` | `canary` | `production` | `legacy`
- `DAILY_COPILOT_MODEL`: default `gpt-5-mini`
- `DAILY_TEMP_WORKTREE`: use temporary worktree for dirty repos
- `HARNESS_CRON_LOG_FILE`: per-profile cron log path

## Code Style

- **Indentation**: 2 spaces (Biome default)
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Module system**: ES modules
- **Naming**: camelCase for variables/functions, PascalCase for classes

## Troubleshooting

**Missing `.local/` directories**: Run `node verify.mjs` to create them.

**Type errors after moving files**: Update `tsconfig.json` paths if needed.

**Copilot fallback not triggering**: Ensure `COPILOT_BIN` is in PATH or set explicitly.

## Resources

- **Harness README**: `.harness/README.md`
- **Phase 1 Summary**: `.harness/PHASE1_SUMMARY.md`
