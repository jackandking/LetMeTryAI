# Harness Engineering - LetMeTryAI Automation

下一代自动化编排系统，取代原有 `.automation/` 的 cron job，实现智能、可靠、可观测的每日应用创建流水线。

## 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                     Harness Engineering                        │
├─────────────────────────────────────────────────────────────────┤
│  Scheduler → DailyAppAgent → ReAct Loop → Tools/Constraints    │
└─────────────────────────────────────────────────────────────────┘
         │                                           │
         ▼                                           ▼
   Cron Expression                          Git/Deploy/Publish
   Profile Rotation                         Category Constraints
   State Persistence                        Keyword Filtering
```

### 核心组件

1. **Scheduler** (`src/scheduler.ts`)
   - Cron 调度抽象
   - Profile 轮询管理
   - 任务持久化

2. **DailyAppAgent** (`src/agents/daily-app-agent.ts`)
   - ReAct 循环协调器
   - 状态机: topic_selection → scaffold → validation → git_push → deploy → publish
   - 失败恢复与人工升级

3. **Constraints Engine** (`src/constraints/engine.ts`)
   - 硬边界约束（非警告）
   - 禁止关键词过滤（最、第一、顶级...）
   - 分类轮询限制（军事/体育 每周最多2次）
   - 预算与频率限制

4. **Tool Registry** (`src/tools/registry.ts`)
   - 统一工具接口
   - 自动重试（指数退避）
   - 超时控制与指标收集

5. **Scaffold Service** (`src/services/scaffold.ts`)
   - HTML/JS/CSS 生成
   - 元数据创建
   - 文件物化

## 快速开始

### 安装

```bash
cd .harness
npm install
```

### 运行测试

```bash
# 手动测试（Mock 模式，快速）
npm test

# MVP 快速测试
npm run test:mvp

# 完整 MVP 测试（真实 Copilot 调用）
npm run test:mvp:full

# 类型检查
npm run typecheck
```

### 配置 Profile

```typescript
// src/config/index.ts
const profiles = {
  nanrenbao: {
    id: 'nanrenbao',
    name: '男人宝',
    constraints: {
      categoryRotation: {
        military: { maxPerWeek: 2, minIntervalDays: 3 },
        sports: { maxPerWeek: 2, minIntervalDays: 3 },
        tech: { maxPerWeek: 3 },
        car: { maxPerWeek: 2 },
      },
      forbiddenKeywords: ['最', '第一', '顶级', '最强'],
      weeklyBudget: 7,
    }
  }
};
```

## 运行模式

| 模式 | 说明 | 环境变量 |
|------|------|----------|
| `development` | 开发模式，跳过影子模式 | `HARNESS_MODE=development` |
| `shadow` | 影子模式，与旧系统并行运行 | `HARNESS_MODE=shadow` |
| `canary` | 金丝雀发布，仅部分流量 | `HARNESS_MODE=canary` |
| `production` | 完全接管 | `HARNESS_MODE=production` |

## 项目结构

```
.harness/
├── src/
│   ├── types/          # TypeScript 类型定义
│   ├── config/         # 配置管理
│   ├── tools/          # 工具注册与执行
│   ├── constraints/    # 约束引擎
│   ├── workflows/      # ReAct 循环
│   ├── agents/         # 智能体实现
│   ├── services/       # 业务服务
│   └── utils/          # 工具函数
├── tests/              # 单元测试
├── test-manual.mjs     # 手动测试（Mock）
├── test-mvp-fast.mjs   # MVP 快速测试
└── test-mvp.mjs        # MVP 完整测试
```

## AI 生成与故障转移

Harness 使用统一的 `ai.generate` 工具，支持自动故障转移：

```
Copilot (Primary) ──timeout──→ Kimi (Fallback)
        │                           │
   5 min timeout              2 min timeout
   gpt-5-mini                 kimi-k2-0711-preview
```

### 配置

```bash
# Optional: Kimi API key for fallback
export KIMI_API_KEY="your-moonshot-api-key"
export KIMI_API_BASE="https://api.moonshot.cn/v1"  # optional
```

### 使用

```typescript
import { defaultRegistry } from './src/tools/index.js';

// Automatic fallback on timeout
const result = await defaultRegistry.execute('ai.generate', {
  prompt: 'Generate a topic about sports',
  outputFormat: 'json',
  fallbackOnTimeout: true,  // default: true
});

// Or use directly
const copilotResult = await defaultRegistry.execute('copilot.generate', { ... });
const kimiResult = await defaultRegistry.execute('kimi.generate', { ... });
```

## 与旧系统对比

| 特性 | 旧系统 (`.automation/`) | Harness (`.harness/`) |
|------|------------------------|----------------------|
| 配置 | Shell 环境变量 | TypeScript 类型安全 |
| 约束 | 无/软约束 | 硬约束（阻断发布） |
| 重试 | 手动实现 | 统一重试策略 |
| AI 故障转移 | 无 | Copilot → Kimi |
| 状态 | 文件散落 | 集中状态管理 |
| 可观测 | 日志文件 | 结构化指标 |
| 失败处理 | 静默失败 | 自动恢复/人工升级 |

## 部署状态

| 模块 | 状态 | 说明 |
|------|------|------|
| Core | ✅ | Types, Config, Logger |
| Tools | ✅ | Registry, Copilot, **Kimi**, AI Generate (fallback) |
| Constraints | ✅ | Hard boundaries, keyword filtering, category rotation |
| Workflows | ✅ | ReAct Loop with state persistence |
| Agents | ✅ | DailyAppAgent with state machine |
| Services | ✅ | Scaffold generator, Topic selector |
| Tests | ✅ | All passing (manual, mvp, ai-fallback) |

**待接入**: Git 操作、部署流水线、调度器激活

## 数据隔离

所有运行时数据存储在 `.automation/.local/harness/`

```
.automation/.local/harness/
├── state/      # 任务状态
├── logs/       # 结构化日志
├── tasks/      # 任务历史
└── metrics/    # 性能指标
```

旧系统的 `.automation/.local/` 继续独立运行，不受影响。
