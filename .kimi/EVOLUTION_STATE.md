# LetMeTryAI Evolution State

> 进化引擎的指标看板和行动历史。每次进化执行后更新。

## 指标看板

### 达人采用指标（每日更新）

| 日期 | 发布任务数 | 新达人挂载视频 | 新任务被采用 | 采用率 | 总播放量 | 总点击量 | CTR |
|------|-----------|---------------|-------------|--------|---------|---------|-----|
| 2026-04-21 | 4 | 56 (全品牌) | womanai: 0* | ? | ? | ? | ? |
| 2026-04-22 | 4 | 30 (全品牌) | womanai: 0* | ? | ? | ? | ? |
| 2026-04-23 | 4 | 11 (全品牌) | womanai: 待查 | ? | ? | ? | ? |

> *注：新任务采用率指标口径说明：
>   - 已观测到任务发布后存在"待上线"状态（审核中），此期间达人无法挂载
>   - womanai/313566 从发布(4/21)到"进行中"(4/23)耗时约 1.75 天（单个样本）
>   - "1个工作日"是经验推断，**尚未用足够样本验证**
>   - 4/21 当天"0 被采用"可能与任务仍在"待上线"状态有关
>   - 正确的指标跟踪方式：**排除"待上线"期间后**再统计新任务的采用数
>
> **指标口径说明**：
> - `fetched`: 平台上有多少达人视频挂载了该品牌（含历史，非新采用）
> - `queueAdded`: 加入 follow 队列的新达人（我们主动关注，非达人采用）
> - **真正需要跟踪的指标**：新发布任务在 N 天内被多少新达人挂载

### 系统健康指标

| 指标 | 当前值 | 趋势 |
|------|--------|------|
| DailyAppAgent 成功率 | ~86% (prod, 近7天) | → |
| Kuaishou publish 成功率 | ~90%（偶有SESSION_EXPIRED）| → |
| Topic Selection AI 成功率 | ~95% | → |
| Git push 成功率 | ~95% | → |
| WomanAI 新任务采用率 | ~0% (发布当天) | ↓ |
| Nanrenbao 新任务采用率 | ~0% (发布当天) | ↓ |

### 待修复错误

| 类型 | 数量 | 状态 |
|------|------|------|
| skill.broken_script | 7 | pending |
| skill.missing_path | 11 | pending |
| 其他 | 18 | pending |
| **总计** | **36** | **全部 pending** |

## 进化历史

### 2026-04-23 — 进化引擎重构启动

**诊断**: AUTO 系统每天空转，不观测业务指标
**行动**:
- 创建 evolution-engine skill
- 创建 SESSION_MEMORY + EVOLUTION_STATE
- 计划重构 auto-evolve 引擎
**预期效果**: 让进化引擎真正观测和优化达人采用率

## 当前假设（待验证）

1. **假设A**: Topic 同质化（全是投票类）导致达人采用率低
   - 验证方法：对比不同互动形式（投票 vs 测试 vs 对战）的采用率
   - 状态: 未验证

2. **假设B**: 任务标题/封面不够吸引达人
   - 验证方法：A/B 测试不同标题风格
   - 状态: 未验证

3. **假设C**: 达人采用后缺乏创作素材，导致复用率低
   - 验证方法：为部分任务提供素材包，对比复用率
   - 状态: 未验证

4. **假设D**: 热门时间段发布的任务更容易被采用
   - 验证方法：分析不同发布时间段的采用率
   - 状态: 未验证

5. **假设E**: 新任务发布后缺乏曝光，达人看不到
   - 验证方法：对比新任务 vs 历史任务在同一天的挂载比例
   - 状态: **部分验证** — 已确认任务发布后存在"待上线"状态（审核中），此期间达人无法挂载。womanai/313566 从发布到"进行中"耗时约 1.75 天（单个样本）。
   - **待验证**: 这是普遍规律还是个案？不同任务/品牌的审核时长是否一致？
   - 2026-04-24 更新: 用户提醒"1个工作日"是经验规律，需更多样本验证

6. **假设F**: 数据采集链路本身有缺陷（auto-evolve 读取了 dev 目录而非 prod）
   - 验证方法：检查 auto-evolve.mjs 的 STATE_DIR 配置
   - 状态: **已确认** — auto-evolve 读取了 dev 目录，prod 数据正常

## 实验队列

| 优先级 | 实验 | 假设 | 预期指标变化 |
|--------|------|------|-------------|
| P0 | 在 Topic Selection 中加入历史采用率权重 | A | 采用率 +20% |
| P0 | 修复 auto-evolve 数据源（确保读取 prod 目录）| F | 数据准确性 |
| P0 | 修复 36 个 pending skill errors | 系统稳定 | 减少故障 |
| P0 | 诊断新任务 0 采用原因（平台曝光？达人习惯？）| E | 采用率 +30% |
| P1 | 优化任务标题（加入悬念词） | B | 列表点击率 +15% |
| P1 | 自动生成达人创作素材包 | C | 复用率 +10% |
| P2 | 测试不同发布时间 | D | 采用率 +10% |


### 2026-04-23 — Auto-Evolve 运行（dev 目录，数据错误 ❌）

**时间**: 2026-04-23T13:36:23.858Z
**模式**: observe
**观测结果**:
- DailyAppAgent: 1 个 profile 有数据
- Kuaishou Follow: 18 新达人入队（近7天）
- Pending Errors: 42
- Skill Broken Refs: 29

**诊断**: 7 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理

> ⚠️ **数据核实**: 以上数据来自 dev 目录，已断档。prod 实际数据见下方修正版。


### 2026-04-23 — Auto-Evolve 运行（dev 目录，数据错误 ❌）

**时间**: 2026-04-23T13:37:59.746Z
**模式**: fix
**观测结果**:
- DailyAppAgent: 1 个 profile 有数据
- Kuaishou Follow: 18 新达人入队（近7天）
- Pending Errors: 42
- Skill Broken Refs: 2

**诊断**: 7 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理

> ⚠️ **数据核实**: 以上数据来自 dev 目录，已断档。prod 实际数据见下方修正版。


### 2026-04-23 — Auto-Evolve 运行修正版（prod 目录 ✅）

**时间**: 2026-04-23T22:00+08:00
**数据来源**: `/Users/weiping/prod/LetMeTryAI/.harness/.local/state/`
**观测结果**:
- DailyAppAgent: 4 个 profile 均有数据（nanrenbao, elder-love, parent-tools, womanai）
- Kuaishou Follow: 75 新达人入队（近7天），日均 11
- Pending Errors: 42（未变）
- Skill Broken Refs: 2
- Harness 失败率: 14%（非 50%）
- **新发现**: womanai 新任务发布当天 0 被采用，达人持续挂载历史任务

**诊断**: 3 个问题, 2 个机会

**关键修正**:
| 指标 | 之前（dev） | 修正后（prod） |
|------|-----------|-------------|
| 7天新达人入队 | 18 | **75** |
| Harness 失败率 | 50% | **14%** |
| womanai 状态 | "0 采用" | **"历史任务有采用，新任务 0 采用"** |
| DailyAppAgent 活跃品牌 | 1 | **4** |

**自动修复**: 0 项成功

**计划行动 (3 个)：**
- [high] **fix**: 修正 auto-evolve 数据源，确保读取 prod 目录
- [high] **diagnose**: 分析为什么新任务发布当天 0 被采用
- [medium] **fix**: 批量处理 42 个 pending errors

**执行结果：**
- queued: 修正 auto-evolve 数据源路径
- queued: 诊断新任务 0 采用原因
- queued: 批量处理 42 个 pending errors


### 2026-04-26 — Auto-Evolve 运行

**时间**: 2026-04-26T21:00:01.137Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 87 新达人入队（近7天）
- Pending Errors: 3
- Skill Broken Refs: 2

**诊断**: 2 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-04-26 — Auto-Evolve 运行

**时间**: 2026-04-26T21:30:01.230Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 87 新达人入队（近7天）
- Pending Errors: 3
- Skill Broken Refs: 2

**诊断**: 2 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-04-27 — Auto-Evolve 运行

**时间**: 2026-04-27T21:00:01.372Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 69 新达人入队（近7天）
- Pending Errors: 4
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-04-27 — Auto-Evolve 运行

**时间**: 2026-04-27T21:30:01.182Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 69 新达人入队（近7天）
- Pending Errors: 4
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-04-28 — Auto-Evolve 运行

**时间**: 2026-04-28T21:00:01.431Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 60 新达人入队（近7天）
- Pending Errors: 6
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-04-28 — Auto-Evolve 运行

**时间**: 2026-04-28T21:30:01.434Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 60 新达人入队（近7天）
- Pending Errors: 6
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-04-29 — Auto-Evolve 运行

**时间**: 2026-04-29T21:00:00.651Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 56 新达人入队（近7天）
- Pending Errors: 6
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-04-29 — Auto-Evolve 运行

**时间**: 2026-04-29T21:30:00.507Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 56 新达人入队（近7天）
- Pending Errors: 6
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-05-01 — Auto-Evolve 运行

**时间**: 2026-05-01T21:00:00.851Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 43 新达人入队（近7天）
- Pending Errors: 9
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-05-01 — Auto-Evolve 运行

**时间**: 2026-05-01T21:30:01.371Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 43 新达人入队（近7天）
- Pending Errors: 9
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-05-02 — Auto-Evolve 运行

**时间**: 2026-05-02T21:00:00.442Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 43 新达人入队（近7天）
- Pending Errors: 10
- Skill Broken Refs: 2

**诊断**: 1 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-05-02 — Auto-Evolve 运行

**时间**: 2026-05-02T21:30:01.163Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 43 新达人入队（近7天）
- Pending Errors: 10
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 系统状态良好


### 2026-05-03 — Auto-Evolve 运行

**时间**: 2026-05-03T21:00:00.764Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 33 新达人入队（近7天）
- Pending Errors: 12
- Skill Broken Refs: 2

**诊断**: 2 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-03 — Auto-Evolve 运行

**时间**: 2026-05-03T21:30:00.796Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 33 新达人入队（近7天）
- Pending Errors: 12
- Skill Broken Refs: 2

**诊断**: 3 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-04 — Auto-Evolve 运行

**时间**: 2026-05-04T21:00:01.370Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 32 新达人入队（近7天）
- Pending Errors: 13
- Skill Broken Refs: 2

**诊断**: 3 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-04 — Auto-Evolve 运行

**时间**: 2026-05-04T21:30:00.632Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 32 新达人入队（近7天）
- Pending Errors: 13
- Skill Broken Refs: 2

**诊断**: 3 个问题, 0 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-05 — Auto-Evolve 运行

**时间**: 2026-05-05T21:00:01.334Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 42 新达人入队（近7天）
- Pending Errors: 14
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-05 — Auto-Evolve 运行

**时间**: 2026-05-05T21:30:00.901Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 42 新达人入队（近7天）
- Pending Errors: 14
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-06 — Auto-Evolve 运行

**时间**: 2026-05-06T21:00:00.478Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 32 新达人入队（近7天）
- Pending Errors: 14
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-06 — Auto-Evolve 运行

**时间**: 2026-05-06T21:30:00.743Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 32 新达人入队（近7天）
- Pending Errors: 14
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-09 — Auto-Evolve 运行

**时间**: 2026-05-09T01:18:24.765Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 32 新达人入队（近7天）
- Pending Errors: 14
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-09 — Auto-Evolve 运行

**时间**: 2026-05-09T01:18:24.673Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 32 新达人入队（近7天）
- Pending Errors: 14
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-09 — Auto-Evolve 运行

**时间**: 2026-05-09T21:00:01.064Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 39 新达人入队（近7天）
- Pending Errors: 17
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-09 — Auto-Evolve 运行

**时间**: 2026-05-09T21:30:00.893Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 39 新达人入队（近7天）
- Pending Errors: 17
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-10 — Auto-Evolve 运行

**时间**: 2026-05-10T08:26:29.397Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 47 新达人入队（近7天）
- Pending Errors: 17
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 1 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-10 — Auto-Evolve 运行

**时间**: 2026-05-10T08:29:45.873Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 47 新达人入队（近7天）
- Pending Errors: 17
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 1 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-10 — Auto-Evolve 运行

**时间**: 2026-05-10T08:31:14.036Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 47 新达人入队（近7天）
- Pending Errors: 17
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 1 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-10 — Auto-Evolve 运行

**时间**: 2026-05-10T08:32:45.620Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 47 新达人入队（近7天）
- Pending Errors: 17
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 1 项成功

**下一步**: 有高优先级问题需处理

## 下次进化聚焦

**当前最可能带来收益的行动**:
1. 修正 auto-evolve 数据源（影响所有后续决策的准确性）
2. 诊断新任务 0 采用原因（直接影响北极星指标）
3. 修复 pending errors（系统稳定性）


### 2026-05-10 — Auto-Evolve 运行

**时间**: 2026-05-10T21:00:00.526Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 47 新达人入队（近7天）
- Pending Errors: 18
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 1 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-10 — Auto-Evolve 运行

**时间**: 2026-05-10T21:30:00.488Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 47 新达人入队（近7天）
- Pending Errors: 18
- Skill Broken Refs: 2

**诊断**: 3 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-11 — Auto-Evolve 运行

**时间**: 2026-05-11T21:00:00.720Z
**模式**: full
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 46 新达人入队（近7天）
- Pending Errors: 19
- Skill Broken Refs: 2

**诊断**: 2 个问题, 1 个机会

**自动修复**: 1 项成功

**下一步**: 有高优先级问题需处理


### 2026-05-11 — Auto-Evolve 运行

**时间**: 2026-05-11T21:30:00.864Z
**模式**: report
**观测结果**:
- DailyAppAgent: 4 个 profile 有数据
- Kuaishou Follow: 46 新达人入队（近7天）
- Pending Errors: 19
- Skill Broken Refs: 2

**诊断**: 2 个问题, 1 个机会

**自动修复**: 0 项成功

**下一步**: 有高优先级问题需处理

## 下次进化聚焦

**当前最可能带来收益的行动**:
1. 修正 auto-evolve 数据源（影响所有后续决策的准确性）
2. 诊断新任务 0 采用原因（直接影响北极星指标）
3. 修复 pending errors（系统稳定性）

