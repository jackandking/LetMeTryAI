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

## 2026-04-23 — 调研前必须先确认数据源

**场景**: 用户问"womanai 为什么 0 采用"，我直接看了 dev 目录的数据，得出错误结论。

**错误**: 
- 看了 `/Users/weiping/LetMeTryAI/.harness/.local/state/`（dev 目录），数据断档在 4/12
- 得出"womanai 0 采用"的错误结论
- 实际上 prod 目录 (`/Users/weiping/prod/LetMeTryAI/`) 数据每天都更新

**正确做法**:
1. 先看 crontab 确认任务运行在哪个目录（prod vs dev）
2. 确认数据采集流程是否正常运行（daily-runs 是否有最新日期）
3. 确认指标口径（fetched ≠ 新任务采用，queueAdded ≠ 达人采用新任务）
4. 再下结论

**关键区分**:
- `fetched`: 平台上有多少达人视频挂载了该品牌（含历史）
- `acceptedCandidates`: 符合关注条件的新达人
- `queueAdded`: 加入 follow 队列的达人
- **新任务采用**: 需要看具体视频挂载到了哪个任务路径

**教训**: 任何业务指标调研，第一步永远是验证数据采集链路，而不是直接读数。

---

## 2026-04-14 — Cron 日志不要重复重定向

**场景**: 审查 cron 任务时发现 `.automation/scripts/refine-vote-apps.sh` 的日志每行写了两次。

**错误**: 
- 脚本内部 `log()` 函数已经用了 `tee -a "$LOG_FILE"`
- cron 命令又加了 `>> "$LOG_FILE" 2>&1`
- 导致每条日志重复写入

**正确做法**:
- 如果脚本内部已经用 `tee -a` 或显式文件重定向 → **cron 命令不要再加外部重定向**
- 如果脚本只打印到 stdout/stderr → **cron 命令才需要加重定向**

**规则**: `内部有 tee → cron 不加 >>；内部无 tee → cron 要加 >>`

**教训**: 写 cron 前先检查脚本内部是否已经做了日志重定向。

---

## 2026-04-14 — Harness 运行时目录必须隔离

**场景**: `.harness` 脚本的日志被写到了 `.automation/.local/logs/`，违反了数据隔离原则。

**错误**: 
- `.harness/scripts/run-topic-selector.sh` 和 `run-daily-app-cron.sh` 的 cron 输出被重定向到 `.automation/.local/logs/`
- `.harness/verify.mjs` 创建了 `.automation/.local/harness/` 目录
- `.harness/README.md` 文档也写的是旧路径

**正确做法**:
- `.harness` 的所有运行时数据必须严格放在 `.harness/.local/` 下
- `.automation` 的所有运行时数据严格放在 `.automation/.local/` 下
- 两个系统互不依赖、互不干扰

**教训**: 多系统并存时，每个系统必须有独立的运行时目录，不能混用。修改代码后必须同步更新 cron、验证脚本和文档。

---

## 2026-04-17 — Skill 引用断裂是系统性问题

**场景**: Skill Health Check 扫描 19 个 skill，发现 14 个问题。

**问题分布**:
- `skill.broken_script`: 10 次（脚本文件不存在或无法执行）
- `skill.missing_path`: 11 次（SKILL.md 引用的路径不存在）
- `auth.session_expire`: 2 次（快手认证过期）
- `runtime.error`: 2 次（运行时错误）

**根因**: 
- 文件移动/重命名后，SKILL.md 中的引用没有同步更新
- 脚本被删除但 SKILL.md 仍然引用
- 缺乏 skill health check 的自动化修复流程

**正确做法**:
1. 移动/重命名任何被 SKILL.md 引用的文件时，**同步更新 SKILL.md**
2. 定期运行 `skill-health-check` 扫描断裂引用
3. 将修复 skill 引用作为代码变更的必做检查项

**教训**: SKILL.md 是 skill 的 canonical 文档，引用断裂 = skill 失效。文件重构时必须同步更新文档。
