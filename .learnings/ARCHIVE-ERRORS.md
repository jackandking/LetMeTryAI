
## [ERR-20260414-001] harness_runtime_path_mismatch

**Logged**: 2026-04-14T06:45:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
`.harness` runtime data and logs were being written to `.automation/.local/` due to stale configuration and live crontab entries, despite the source code already pointing to `.harness/.local/`.

### Error
Cron entries for `.harness/scripts/run-topic-selector.sh` and `.harness/scripts/run-daily-app-cron.sh` redirected output to `.automation/.local/logs/daily-topic-selector.log` and `.automation/.local/logs/daily-run-*.log`. Additionally, `.harness/verify.mjs` and `.harness/README.md` referenced the old `.automation/.local/harness/` path.

### Context
- `.harness/src/config/index.ts` correctly set `HARNESS_RUNTIME_DIR` to `join(PROJECT_ROOT, '.harness', '.local')`.
- However, live crontab had `.harness` scripts logging to `.automation/.local/logs/`.
- `.harness/verify.mjs` created `.automation/.local/harness/{state,logs,tasks}` on verification.
- `.harness/README.md` documented the old data-isolation path.

### Suggested Fix
1. Update live crontab to redirect `.harness` script output to `.harness/.local/logs/`.
2. Fix `.harness/verify.mjs` runtime directory list.
3. Fix `.harness/README.md` data isolation documentation.

### Resolution
- **Resolved**: 2026-04-14T06:45:00+08:00
- **Commit/PR**: manual edit
- **Notes**: Updated crontab paths, `verify.mjs`, `README.md`, and `add-refine-cron.sh`.

### Metadata
- Reproducible: yes
- Related Files: `.harness/src/config/index.ts`, `.harness/verify.mjs`, `.harness/README.md`, `.automation/scripts/setup-cron.sh`
- See Also: LRN-20260414-001

---
