## [LRN-20260414-003] best_practice

**Logged**: 2026-04-14T23:05:00+08:00
**Priority**: medium
**Status**: resolved
**Area**: infra

### Summary
Before committing, always audit untracked files to separate temporary artifacts from valuable assets.

### Details
When asked to clean up untracked files, I inspected timestamps, content, and git history to classify files into three buckets:
1. **Temporary/one-off artifacts** — hardcoded analysis scripts (`.mjs` targeting a single app), generated screenshots/comparison images, and already-archived per-day markdown drafts. These were safe to delete.
2. **Documentation** — `AGENTS.md` files for `.automation` and `.harness`. These provide durable conventions and should be tracked.
3. **Prototype code** — `auto-fix-agent.js` and `self-improvement-orchestrator.js`. Even though they are early-stage, they represent intentional automation work and should be version-controlled.

### Resolution
- **Resolved**: 2026-04-14T23:05:00+08:00
- **Commit/PR**: `8e5fe28`
- **Notes**: Deleted 5 temporary files + 3 images, then committed 7 retained files (docs, prototypes, archives).

### Suggested Action
When encountering a dirty worktree with many untracked files:
1. Run `git status` + `stat` to check recency and file types.
2. Read a sample of file contents to determine if they are generic/reusable or single-use.
3. Ask the user (or infer from context) whether prototypes and docs should be committed.
4. Remove clearly ephemeral artifacts before staging.

### Metadata
- Source: conversation
- Related Files: `.automation/AGENTS.md`, `.harness/AGENTS.md`, `.automation/scripts/auto-fix-agent.js`, `.automation/scripts/self-improvement-orchestrator.js`
- Tags: git, cleanup, workflow, untracked-files
- Pattern-Key: workflow.git_cleanup
- See Also: LRN-20260414-001

---
