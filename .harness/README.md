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

# 快手 follow 工作流测试
npm run test:follow

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

## 快手 follow 手动首轮

先用手动方式跑通“谁用了我发布的快手星火计划任务 → 在快手上 follow 他们”，运行时状态全部保存在 `.harness/.local/state/kuaishou-follow/`。

```bash
# 1. 打开已登录的快手创作者平台，并创建一轮手动 session
npm run kuaishou:follow -- start --plan-id 257060

# 1.5 用受控 Chrome 观察你的手工点击（推荐后续流程用这个）
npm run kuaishou:follow -- observe --url https://open.kuaishou.com/console

# 2. 每 follow / 跳过 / 失败一个账号，就记录一次
npm run kuaishou:follow -- record --creator-id 12345 --handle @creator --status followed
npm run kuaishou:follow -- record --handle @creator2 --status skipped --reason "内容不匹配"

# 3. 随时查看当前进度
npm run kuaishou:follow -- status

# 4. 本轮结束后收尾
npm run kuaishou:follow -- finish --note "第一轮样本已完成"

# 5. 拉取过去 1 天的挂载数据（auto: 官方 API 优先，失败则回退到浏览器态接口）
KUAISHOU_APP_ID=xxx KUAISHOU_APP_SECRET=xxx npm run kuaishou:follow -- fetch-data --days 1 --strategy auto

# 只走浏览器态内部接口（已验证可用）
KUAISHOU_APP_ID=xxx npm run kuaishou:follow -- fetch-data --days 1 --strategy browser
```

这套脚手架先解决三件事：
1. 复用 `.harness/.local/auth/` 下按站点拆分的登录态文件打开已登录浏览器。
2. 把本轮 session、已处理账号、去重状态沉淀在 `.harness/.local/state/`。
3. 支持受控 Chrome + CDP 观察模式，把手工 `click / input / navigation` 以及关键 `network-request / network-response / follow-state` 写入 `.harness/.local/state/kuaishou-follow/observer/events.jsonl`。
4. 为后续“自动抓取使用者列表并自动 follow”保留同一份状态文件格式。

认证文件按站点隔离：
- 开放平台 / 创作者平台（`open.kuaishou.com`、`daren.kuaishou.com`）使用 `.harness/.local/auth/kuaishou_auth.json`
- 快手主站短视频页（`www.kuaishou.com`）使用 `.harness/.local/auth/kuaishou_www_auth.json`
- 观察器只会在检测到真实登录 cookie 后回写 auth，避免未登录网页态覆盖已有平台登录态

## 快手 follow 日常自动化

pilot 验证完成后，日常自动化分成两段：

1. **daily-ingest**：每天 `14:00 Asia/Shanghai` 跑一次，按 `official-only` 为全部配置 app 拉取最新可用挂载数据，并合并进 pending queue
2. **run-hourly**：每小时跑一次，每批最多 `10` 人，批内 follow 间隔至少 `1` 分钟，全天最多 `100` 人
3. **send-report**：支持手工补发某天报告；同时 `daily-ingest` 和每次 `run-hourly` 都会自动发送一封当天累计进度报告

### 自动化配置

不要把 AppSecret 写入仓库。推荐二选一：

1. 用环境变量 `KUAISHOU_FOLLOW_APPS`
2. 在本地创建 `.harness/.local/state/kuaishou-follow/app-config.local.json`

配置格式：

```json
[
  {
    "profileId": "elder-love",
    "appId": "ksxxxx",
    "appSecretEnv": "ELDER_LOVE_KUAISHOU_APP_SECRET"
  },
  {
    "profileId": "parent-tools",
    "appId": "ksxxxx",
    "appSecretEnv": "PARENT_TOOLS_KUAISHOU_APP_SECRET"
  },
  {
    "profileId": "nanrenbao",
    "appId": "ksxxxx",
    "appSecretEnv": "NANRENBAO_KUAISHOU_APP_SECRET"
  },
  {
    "profileId": "womanai",
    "appId": "ksxxxx",
    "appSecretEnv": "WOMANAI_KUAISHOU_APP_SECRET"
  }
]
```

必填环境变量：

```bash
export ELDER_LOVE_KUAISHOU_APP_SECRET=...
export PARENT_TOOLS_KUAISHOU_APP_SECRET=...
export NANRENBAO_KUAISHOU_APP_SECRET=...
export WOMANAI_KUAISHOU_APP_SECRET=...
export KUAISHOU_FOLLOW_REPORT_TO=you@example.com
```

### 自动化命令

```bash
# 1. 拉取今日视频清单（official-only，多 app 合并进 pending queue）
npm run kuaishou:follow -- daily-ingest

# 2. 执行一轮 hourly follow worker
npm run kuaishou:follow -- run-hourly

# 3. 需要时手工补发某天报告
npm run kuaishou:follow -- send-report --date 2026-04-12

# 4. 查看 queue / 今日 worker / 报告状态
npm run kuaishou:follow -- status

# 5. 启动专用 scheduler（14:00 ingestion + 每小时 worker）
npm run kuaishou:follow:scheduler -- start
```

### 日常运行时状态

除原有 `follow-history.jsonl` 外，还会写入：

- `pending-queue.json`：待 follow 队列
- `daily-runs/YYYY-MM-DD.json`：当天 ingestion、hourly worker、最近一次 report 状态
- `reports/follow-report-YYYY-MM-DD.txt`：邮件正文
- `reports/follow-report-YYYY-MM-DD.json`：结构化日报摘要

### Cron 部署

如果你不想常驻 `scheduler` 进程，可以直接用仓库内包装脚本配 cron：

```bash
# 每天 14:00 拉清单
0 14 * * * cd /path/to/LetMeTryAI/.harness && ./scripts/run-kuaishou-follow-ingest.sh

# 每小时跑一轮 follow worker
0 * * * * cd /path/to/LetMeTryAI/.harness && ./scripts/run-kuaishou-follow-worker.sh
```

这两个脚本会自动读取：

- `.harness/.env`
- `.harness/.local/state/kuaishou-follow/cron.env`（推荐放 follow 专用 secret / report email，且不要提交）

### 已验证页面发现（2026-04-12）

- 页面：`https://open.kuaishou.com/project/data-operation-data?appId=ks696932044951748651`
- 入口：`经营数据` → `短视频挂载分析`
- 时间范围：`昨日`
- 已验证可见字段：
  - 明细主表：`作者openID`、`视频id`、`挂载路径`、`视频标题`、`作者粉丝数`、`视频播放次数`、`评论次数`、`点赞次数`、`分享次数`、`完播率`、`PLC曝光次数`、`PLC点击次数`、`PLC点击率`、`进入小程序数`、`创建订单数`、`支付订单数`、`引入gmv(元)`、`单均价(元)`、`退款订单数`、`退款金额(元)`
  - 简表：`时间`、`视频链接`、`作者昵称`
- 页面上存在 `下载数据` 按钮，可继续尝试接口化获取同一批数据
- 已验证首条样本：
  - 作者昵称：`晴天娃娃 默`
  - 作者 openID：`f1b4334804641ec514bf5724f002d67f`
  - 视频链接：`https://www.kuaishou.com/short-video/3xwrfhxamzi57wi`

### API 路线决策（2026-04-12）

- 当前确认有两条可行路线：
  1. **官方 OpenAPI**：使用 `AppID/AppSecret` 获取 `access_token`，优先尝试 `openapi/mp/data/video_mount/get`
  2. **浏览器态内部接口**：复用登录 cookie，直接请求开放平台页面实际使用的接口
- 当前页面已反查出真实内部接口：
  - `https://open.kuaishou.com/rest/bi/plcCoreDataV2`
  - `https://open.kuaishou.com/rest/bi/plcDetailDataV2`
- 选择浏览器态内部接口作为当前阶段首个 API 验证路径的原因：
  - 它与页面展示结果一致，验证速度最快
  - 已确认能返回 `authorName`、`openId`、`videoId`、`videoLink` 等关键字段
  - 适合探索期快速确认“哪些字段能拿到”
- 最终自动化策略：
  - **主链路优先官方 OpenAPI**
  - **字段不够或能力受限时，再用浏览器态内部接口做 fallback**

### fetch-data MVP（过去 1 天）

- 命令：`npm run kuaishou:follow -- fetch-data --days 1 --strategy auto`
- 输出：
  - 终端摘要（策略、记录数、首条样本）
  - 导出文件：`.harness/.local/state/kuaishou-follow/exports/mount-data-*.json`
- 策略说明：
  - `official`：只尝试官方 OpenAPI，需要 `KUAISHOU_APP_ID` + `KUAISHOU_APP_SECRET`
  - `browser`：只走浏览器态内部接口，需要 `.harness/.local/auth/kuaishou_auth.json`
  - `auto`：优先 `official`，失败后自动回退到 `browser`

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
