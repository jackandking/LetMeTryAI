
## [LRN-20260414-001] best_practice

**Logged**: 2026-04-14T06:45:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Cron output redirection can duplicate logs when scripts already write to log files internally.

### Details
When reviewing cron jobs, discovered that `.automation/scripts/refine-vote-apps.sh` uses `tee -a "$LOG_FILE"` in its internal `log()` functions, while `add-refine-cron.sh` also appended `>> "$LOG_FILE" 2>&1` in the cron command. This caused every log line to be written twice. Other scripts (`run-daily-report.sh`, `run-daily-profile.sh`, `daily_run.sh`) only use `echo` internally and rely on cron redirection, so they do not have this problem.

### Resolution
- **Resolved**: 2026-04-14T06:45:00+08:00
- **Changes**: Removed `>> "$LOG_FILE" 2>&1` from `add-refine-cron.sh` cron command.
- **Rule of thumb**: If a script uses `tee -a` or explicit file redirects internally, do NOT add external redirection in cron. If it only prints to stdout/stderr, add the redirection in cron.

### Metadata
- Source: conversation
- Related Files: `.automation/scripts/add-refine-cron.sh`, `.automation/scripts/refine-vote-apps.sh`
- Tags: cron, logging, deduplication
- Pattern-Key: harden.log_redirection

---
