# .automation/ — Convention Guide

This directory contains all automation tooling for the LetMeTryAI project. The website lives at the repo root; automation lives here.

## Directory Layout

```
.automation/
├── scripts/           # Runnable scripts (cron jobs, CLI tools, utilities)
│   ├── templates/     # Brand theme templates (sport-blue, edu-blue, etc.)
│   └── topics/        # Topic queue management
├── skills/            # Agent skills (self-contained capability modules)
├── docs/              # Automation documentation
├── config/            # Static config files (checked into git)
├── shared/            # Shared utilities across scripts/skills
├── workflows/         # Multi-step workflow definitions
├── tools/             # AI CLI tool configs (copilot, kimi, openclaw)
└── .local/            # Runtime data — NEVER commit (gitignored)
    ├── auth/          # Session/auth files (kuaishou_auth.json)
    ├── state/         # Email drafts, processed IDs, topics
    ├── exports/       # Metrics, task exports, CSVs
    ├── logs/          # All automation logs
    ├── screenshots/   # Automation screenshots
    └── tmp/           # Temporary files
```

## Golden Rules

1. **Runtime data goes in `.local/`** — never write logs, auth tokens, exports, or temp files to the repo root or any tracked directory.
2. **Use `runtime-paths.js` helpers** — never hardcode `.local/` paths in JS. Use `resolveRuntimeDir()`, `resolveKuaishouAuthFile()`, `resolveEmailDraftLatestPath()`.
3. **Website stays at repo root** — mini-app directories, `apps-metadata.json`, `index.html`, `main.js`, `styles.css`, `util/` are not part of automation. The orchestrator creates apps there but automation code lives here.

## Path Resolution

### In JavaScript (ES modules)

```js
import { resolveProjectRoot, resolveRuntimeDir, resolveKuaishouAuthFile } from './runtime-paths.js';

// Repo root (for website files like apps-metadata.json)
const REPO_DIR = resolveProjectRoot(import.meta.url);

// Runtime directory (.automation/.local/)
const RUNTIME_DIR = resolveRuntimeDir(import.meta.url);

// Specific runtime files
const authFile = resolveKuaishouAuthFile(import.meta.url);
```

`resolveProjectRoot` goes up 2 levels from `.automation/scripts/` to reach the repo root. Environment variable `PROJECT_DIR` overrides this.

### In Shell Scripts

```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"     # repo root (2 levels up)
LOCAL_DIR="$PROJECT_DIR/.automation/.local"          # runtime data
```

For skills (3 levels deep: `.automation/skills/<name>/`):
```bash
PROJECT_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
```

## Adding a New Script

1. Place it in `.automation/scripts/`
2. Derive `PROJECT_DIR` as shown above (2 levels up from `SCRIPT_DIR`)
3. Write logs to `$PROJECT_DIR/.automation/.local/logs/`
4. Import `runtime-paths.js` for any auth/state/export paths
5. Usage messages should reference `.automation/scripts/<name>`

## Adding a New Skill

1. Create a directory under `.automation/skills/<skill-name>/`
2. Include a `SKILL.md` describing the skill
3. Derive `PROJECT_DIR` going up 3 levels from the skill script
4. Use `.automation/.local/` for any runtime artifacts
5. Reference sibling skills via `../other-skill/` (relative within skills/)

## Skill Discovery Symlink

`.agents/skills/` is a git-tracked **symlink** pointing to `.automation/skills/`. This exists so that Kimi CLI (which scans `.agents/skills/` by convention) auto-discovers all skills. The canonical location remains `.automation/skills/` — never place files directly in `.agents/skills/`.

Copilot discovers skills via the catalog in `.github/copilot-instructions.md`.

## Cron Job Convention

Cron entries follow this pattern:
```cron
0 7 * * * cd /path/to/LetMeTryAI && .automation/scripts/<script>.sh <args> >> .automation/.local/logs/<logfile>.log 2>&1
```

- Always `cd` to repo root first
- Reference scripts via `.automation/scripts/`
- Logs go to `.automation/.local/logs/`
- Use `setup-cron.sh` to generate entries: `bash .automation/scripts/setup-cron.sh`

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `PROJECT_DIR` | Override repo root detection | auto-detected from script location |
| `LETMETRY_RUNTIME_DIR` | Override runtime dir | `$PROJECT_DIR/.automation/.local` |
| `KUAISHOU_AUTH_FILE` | Override auth file path | `.automation/.local/auth/kuaishou_auth.json` |
| `EMAIL_DRAFT_PATH` | Override email draft path | `.automation/.local/state/email-drafts/latest.txt` |
| `DAILY_LOG_DIR` | Override orchestrator log dir | `.automation/.local/logs/daily-orchestrator/` |
| `DAILY_PROFILE_ID` | Brand profile to run | `nanrenbao` |

## What Does NOT Belong Here

- Website HTML/CSS/JS (stays at repo root)
- Website utility modules (`util/`)
- Website-dev scripts (`scripts/setup-mcp.sh`, `scripts/build-and-commit-mcp.sh`)
- Website documentation (`docs/`)
- Test files (`tests/`, `*.test.js`)
- `package.json`, `node_modules/`
