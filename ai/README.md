# Letmetry AI — AI 能力层

> 本目录存放 LetmetryAI（https://letmetryai.cn/）对外发布的 AI 能力（Skill / Agent / MCP）。
> 遵循产品仓 AI 能力标准结构：`ai/skills/{core,<平台>}` / `ai/agents` / `ai/shared`。
> 后端接口由 `letmetry_web_service`（共用）提供。

## 能力清单

| 能力 | 目录 | 发布平台 | 状态 |
|---|---|---|---|
| 男人宝·图片投稿 | `skills/core/nanrenbao-contribute/` | SkillHub | 已发布 |
| 美女写真·艺术人像提示词工作室 | `skills/core/portrait-prompt-studio/` | SkillHub | 已发布 |
| 投票话题页生成器 | `skills/core/letmetry-vote-page/` | SkillHub | 待发布 |
| 内容付费变现小程序生成器 | `skills/core/content-paywall-app/` | SkillHub | 待发布 |

## 目录结构

```
ai/
├── README.md          # 本文件：产品 AI 能力清单 + 发布状态
├── build.cjs          # 单源多端构建：node ai/build.cjs build --skill <name> --platform <skillhub|xiaping>
├── skills/
│   └── core/          # 唯一事实源（母版）：所有平台版本都从 core 派生，仓库不维护任何平台副本
│       ├── nanrenbao-contribute/
│       ├── portrait-prompt-studio/
│       ├── letmetry-vote-page/
│       ├── content-paywall-app/
│       └── prompt-dna.schema.json   # 共享 schema（portrait 引用，build 时内联进包）
├── build/dist/        # 构建产物（gitignore）：build.cjs 按 --platform 派生出的各平台包 + .zip
├── agents/            # Bot/Agent 配置（系统提示词、工具清单等）
└── shared/            # 共用素材（图标、触发词、用例）
```

## 工作流（单源多端，对外发布）

```
修改 core/ 母版（唯一事实源）
  → node ai/build.cjs build --skill <name> --platform <skillhub|xiaping>
  → 生成 build/dist/<platform>/<name>/ + <name>.<platform>.zip
  → 上传对应平台（SkillHub: skillhub publish <dir>；虾评: POST /api/upload）
```

新增发布平台 = 在 `build.cjs` 的 `PLATFORMS` 加一个配置（字段映射 + 打包差异），**不需要新建仓库目录或维护新副本**。

## 约定
- 对外发布的 AI 能力必须维护在 `skills/core/` 下（母版），各平台版本从 core 派生，避免描述越改越偏
- 修改技能后需同步更新本 README 的状态
- 对内开发用的 MCP 工具（给 Copilot/Cursor 用）不放本层，用 `.mcp/`、`.copilot/` 等惯例位置