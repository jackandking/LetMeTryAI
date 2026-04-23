# Session Memory — LetMeTryAI 对话状态

> 本文件由 Evolution Agent 自动维护。每次对话结束后更新。
> 新 session 启动时自动加载，确保承上启下。

## 当前会话

- **lastSessionDate**: 2026-04-23
- **currentFocus**: 重构 AUTO 系统 — 从空转改为真正进化，解决 session 失忆问题
- **sessionId**: evolution-20260423

## 已做出的关键决策

### [DEC-20260423-001] 诊断 AUTO 空转问题
- **决策**: AUTO 系统当前是"健康检查 + 文档生成器"，不是"增长引擎"
- **原因**: 只观测技术错误（cron/log），不观测业务指标（达人采用率）
- **证据**: auto-fix-agent 只有 2 个 fixer 模板，rules-pending 为空，42 个 pending errors 未处理

### [DEC-20260423-002] 设计上下文继承系统
- **决策**: 创建 Kimi Skill + Session Memory + Evolution State 三层机制
- **原因**: 解决每次新 session"失忆"问题
- **方案**: 
  1. `.kimi/skills/evolution-engine/SKILL.md` — Kimi 自动加载
  2. `.kimi/SESSION_MEMORY.md` — 对话状态
  3. `.kimi/EVOLUTION_STATE.md` — 进化指标和历史

### [DEC-20260423-003] 重构进化引擎目标
- **决策**: 新 AUTO 的观测对象从"系统健康"改为"业务健康"
- **北极星指标**: 达人采用率 = 采用任务的达人数 / 发布任务数
- **辅助指标**: 视频播放量、点击率(CTR)、达人复用率

### [DEC-20260423-004] auto-evolve 引擎已创建并测试通过
- **决策**: 创建 `.harness/scripts/auto-evolve.mjs` 替代旧版 auto-run
- **首次运行结果**: 
  - 发现 Harness 失败率 50%（6 次运行，3 次失败）— **后续核实为 dev 目录数据，prod 实际 14%**
  - 发现 42 个 pending errors（比之前的 36 个更多）
  - 7 天总采用数 20，但 womanai 为 0 — **后续核实为数据源错误，prod 实际 75**

### [DEC-20260423-005] 调研前必须先确认数据源
- **决策**: 任何业务指标调研，第一步永远是验证数据采集链路，而不是直接读数
- **原因**: 本次误读了 dev 目录（数据断档）而非 prod 目录（生产环境），导致"womanai 0 采用"的错误结论
- **验证步骤**:
  1. `crontab -l` 确认任务运行在哪个目录（prod vs dev）
  2. `ls -lt daily-runs/` 确认数据采集是否正常
  3. 明确指标口径（fetched/queueAdded ≠ 新任务采用数）
  4. 再下结论
- **关键区分**:
  - `fetched`: 平台上有多少达人视频挂载了该品牌（含历史）
  - `queueAdded`: 加入 follow 队列的达人
  - **新任务采用**: 需要看具体视频挂载到了哪个任务路径

## 待办事项

### 进行中
- [x] 完成 evolution-engine skill 全部文件创建
- [x] 创建 `.kimi/EVOLUTION_STATE.md`
- [x] 创建新的 `auto-evolve.mjs` 引擎
- [x] 创建手动触发 Prompt `.kimi/EVOLUTION_PROMPT.md`
- [ ] 设置 auto-evolve 每天自动运行的 cron
- [ ] 修复 auto-evolve 发现的 Harness 50% 失败率
- [ ] 处理 42 个 pending skill errors

### 待开始
- [ ] 在 Topic Selection 中引入历史采用率权重
- [ ] 优化 KuaishouPublisher 的任务标题/封面策略
- [ ] 创建达人创作素材包自动生成流程

### 阻塞项
- [ ] `.automation/` 默认只读，修改 auto-fix-agent.js 需要用户批准
- [x] Harness 失败率 50% — **已修正为 14%**（dev 目录数据断档导致误报）

## 知识索引 (Knowledge Index)

> 轻量索引表，新 session 启动时自动加载。执行用户任务前按需加载相关学习点全文。
> 设计文档: `.kimi/docs/knowledge-index-design.md`
> 加载规则: 用户输入匹配任意关键词 → 自动读取来源文件的指定行号范围 → 注入上下文

| 触发关键词 | 来源文件 | 行号范围 | 摘要 | 记录日期 |
|-----------|---------|---------|------|---------|
| 调研,数据源,数据验证,prod,dev,指标口径 | `.learnings/LEARNINGS.md` | L38-L59 | 调研前必须先验证数据采集链路和指标口径 | 2026-04-23 |
| womanai,女人爱,新任务采用 | `.learnings/LEARNINGS.md` | L38-L59 | WomanAI 新任务采用率低分析 | 2026-04-23 |
| cron,日志,log,tee,重定向,duplicate | `.learnings/LEARNINGS.md` | L62-L78 | Cron 日志不要重复重定向 | 2026-04-14 |
| harness,路径,prod,dev,.local,运行时,隔离 | `.learnings/LEARNINGS.md` | L82-L100 | Harness 运行时目录必须隔离 | 2026-04-14 |
| skill,broken,missing_path,health,引用断裂 | `.learnings/LEARNINGS.md` | L103-L124 | Skill 引用断裂是系统性问题 | 2026-04-17 |
| git,cleanup,untracked,清理,提交前 | `.learnings/LEARNINGS.md` | L1-L35 | 提交前审计未跟踪文件，区分临时文件和有价值资产 | 2026-04-14 |
| 进化,evolve,auto-run,auto-evolve,指标看板 | `.kimi/EVOLUTION_STATE.md` | 全文 | 进化引擎指标看板和历史行动 | 2026-04-23 |
| 审核,上线,周期,1个工作日,任务审核,达人选择 | `.kimi/SESSION_MEMORY.md` | L121-L128 | 新任务需1个工作日快手官方审核后才能供达人选择 | 2026-04-24 |

## 上下文压缩摘要（给新 session 的快速加载）

```
项目: LetMeTryAI — 快手小程序投票平台
路径: /Users/weiping/LetMeTryAI
目标: 让更多快手达人采用发布的任务
当前问题: 
  1. AUTO 系统空转（已创建 auto-evolve 替代）
  2. Harness 失败率 50%
  3. 42 个 pending errors
  4. womanai 新任务采用率低（历史任务有持续挂载，但新任务几乎无人采用）
  5. 任务同质化
已创建: 
  - .kimi/skills/evolution-engine/SKILL.md
  - .kimi/SESSION_MEMORY.md (本文件)
  - .kimi/EVOLUTION_STATE.md
  - .kimi/EVOLUTION_PROMPT.md
  - .harness/scripts/auto-evolve.mjs
  - .kimi/docs/knowledge-index-design.md
快速命令:
  cd .harness && npm run evolve        # 手动触发进化
  cd .harness && npm run evolve:act    # 带行动执行
```

## 历史会话摘要

### 2026-04-23 — AUTO 为什么没有带来进化
- 用户指出 AUTO 系统空转，要求改进
- 深入分析了 auto-run.sh / auto-fix-agent.js / self-improvement-orchestrator.js
- 发现核心问题：观测技术错误而非业务指标
- 决定创建上下文继承系统 + 重构进化引擎
- **已完成**: skill + memory + state + prompt + auto-evolve 引擎全部创建并测试通过

### 2026-04-23 — womanai 零采用根因分析（修正版）
- 用户选择分析 womanai 零采用原因
- **错误**: 直接读取 dev 目录数据（断档在 4/12），得出"womanai 0 采用"错误结论
- **纠正**: 查看 crontab 后发现所有生产任务在 prod 目录运行
- **真实数据**: womanai 每天都有 3-17 个新达人挂载视频（近7天共 56 个）
- ~~**真正问题**: 新发布的任务几乎无人采用~~ ❌ **已修正**：新任务需1个工作日审核，发布当天0采用是正常行为
- **学习**: 调研前必须先验证数据采集链路（目录、时效性、指标口径）
- **关键发现**: 4/21 发布新任务后，14 个新达人视频中 13 个挂载历史任务，1 个挂载 4/19 任务，0 个挂载当天新任务

### 2026-04-24 — 观测发现：快手任务存在"待上线"状态
- **观测**: womanai `class-reunion-makeup-vote` (planId: 313566) 的快手平台状态变化：
  - 4/21 发布 → 状态"待上线"
  - 4/22 仍为"待上线"
  - 4/23 变为"进行中"
  - **耗时约 1.75 天**（单个样本）
- **待验证**: 这是普遍规律还是个案？审核时长是否因任务类型/平台负载而异？
- **影响**: 说明新任务发布后达人确实无法立即挂载，但"1个工作日"是经验推断，非已验证事实
- **指标口径**: 统计新任务采用率时，应排除"待上线"期间的数据
