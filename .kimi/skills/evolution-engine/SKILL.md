---
name: evolution-engine
description: >
  LetMeTryAI 进化引擎的入口 skill。每当用户提到"进化"、"evolve"、"auto-run"、
  "harness改进"、"达人采用"、"session记忆"、"上下文"、"不失忆"时触发。
  自动加载项目完整上下文，承上启下，不需要重新解释项目背景。
---

# Evolution Engine — LetMeTryAI 进化引擎

## 触发条件

用户提到以下任一关键词时触发：
- 进化、evolve、auto-run、auto-fix
- harness 改进、改进 harness
- 达人采用、获得更多达人
- session 记忆、上下文、不失忆
- 继续、接着做、上次说到

## 承上启下机制

**每次启动时，按顺序读取以下文件加载上下文：**

1. `/Users/weiping/LetMeTryAI/.kimi/SESSION_MEMORY.md` — 当前项目状态、关键决策、待办
2. `/Users/weiping/LetMeTryAI/.kimi/EVOLUTION_STATE.md` — 进化引擎状态、指标、历史行动
3. `/Users/weiping/LetMeTryAI/AGENTS.md` — 项目全局规范
4. `/Users/weiping/LetMeTryAI/.harness/AGENTS.md` — Harness 子系统规范

**读取后，在回复开头简要总结当前状态：**
- 当前北极星指标（达人采用数）及趋势
- 上次行动的结果
- 当前待办/阻塞项
- 本次可以做什么

## 项目核心上下文（精简版）

- **项目**: LetMeTryAI — 快手小程序投票平台
- **目标**: 每天自动生成投票小程序 → 发布快手星火计划 → 让达人采用并挂载
- **北极星指标**: 达人采用数（每天有多少达人领取并挂载任务）
- **关键目录**:
  - `.harness/` — 下一代自动化编排系统（TypeScript）
  - `.automation/` — 老自动化系统（JS）
  - `.kimi/` — Kimi CLI 上下文和记忆
- **当前问题**: AUTO 系统每天空转，不观测业务指标，不带来进化

## 行动指令

### 当用户说"手动发起进化"

执行 `/Users/weiping/LetMeTryAI/.kimi/scripts/evolve.sh` 或读取 `.kimi/skills/evolution-engine/references/evolution-prompt.md` 并按其指令行动。

### 当用户说"继续"或"接着做"

查看 SESSION_MEMORY.md 的 `## 上次对话` 和 `## 待办事项`，直接继续未完成的工作。不需要重新询问用户要做什么。

### 当用户提到任何业务指标

查看 EVOLUTION_STATE.md 的 `## 指标看板`，给出数据驱动的回答。

## 会话结束时的义务

**每次对话结束前，更新以下文件：**

1. `.kimi/SESSION_MEMORY.md` — 追加本次关键决策和待办
2. `.kimi/EVOLUTION_STATE.md` — 如有指标变化则更新

更新规则：
- 不要删除已有内容，只追加或修改
- 用时间戳标记新条目
- 保留 `## 待办事项` 和 `## 上次对话` 区块
