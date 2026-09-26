---
name: letmetry-vote-page
description: 依据话题规格一键生成完整可部署的投票话题页（index.html/app.js/styles.css/metadata.json及选项SVG图）；当用户需要为热点话题制作投票页面、批量产出投票话题页或新增投票应用时使用
---

# LetMeTry 投票话题页生成器

## 任务目标
- 本 Skill 用于:将一个热点投票话题的规格，转化为一份完整、可部署的 LetMeTryAI 投票话题页目录。
- 能力包含:生成 `index.html`、`app.js`（投票/结果统计/事件上报逻辑）、`styles.css`（分类主题色）、`metadata.json`、以及每个选项的本地 SVG 图片。
- 触发条件:用户提供一个话题及若干选项，希望生成投票页；或需要新建一个投票小程序页面。

## 前置准备
- 运行环境:Python 3.6+（仅依赖标准库，无需第三方包）。
- 输入准备:按 [references/spec-format.md](references/spec-format.md) 编写一个 spec JSON 文件（必填 `title`、`question`、`options`）。
- 将 spec 文件与技能解压到同一工作环境，`--outdir` 指向目标（如 LetMeTryAI 仓库根目录）。

## 操作步骤
- 标准流程:
  1. 确认话题并整理选项 — 收集标题、问题、选项（含 label），以及可选的 category/tags。
  2. 编写 spec JSON — 若缺乏完整 JSON，可由智能体依据用户描述生成，字段见参考文档。
  3. 调用脚本生成 — `python scripts/generate_vote_page.py --spec spec.json --outdir ./`
     - 脚本输出 `{"status":"success","appId":...,"outputDir":...,"files":[...]}`；失败时返回 `{"status":"error","message":...}` 且退出码非零。
  4. 校验产物 — 脚本在 `<outdir>/<appId>/` 生成目录，确认 `index.html`/`app.js`/`styles.css`/`metadata.json`/`images/*.svg` 齐全。
  5. 注册上线 — 可选地将 `metadata.json` 条目同步到 `apps-metadata.json`，并提交推送部署。
- 可选分支:
  - 当需要自定义主题:在 spec 中设置 `category`（科技/美妆/时尚/娱乐/美食/体育/生活）。
  - 当选项需定制配色:为 `options[i]` 配置 `grad1`/`grad2`。

## 使用示例
- 示例1（美妆投票页）:
  - 场景/输入:用户给出"春季口红新色大PK"话题与 3 个色号选项，category=美妆。
  - 预期产出:`<outdir>/spring-lipstick/` 下完整的投票页目录。
  - 关键要点:spec 中尽量提供 `appId`（否则由 title 归一化），选项 `label` 必填。
- 示例2（科技热点投票）:
  - 场景/输入:针对"AI 养龙虾是不是智商税"给出 5 个态度选项。
  - 预期产出:生成带条形图结果的科技主题投票页。
  - 关键要点:类别映射到主题色，无需额外配置；如需二次票机会话可自行组合多次调用。

## 资源索引
- 脚本:见 [scripts/generate_vote_page.py](scripts/generate_vote_page.py)(用途与参数:`--spec <file>` 必填、`--outdir <dir>` 默认 `.`；生成完整投票页目录，仅标准库)。
- 参考:见 [references/spec-format.md](references/spec-format.md)(何时读取:编写或校验 spec 输入时，含字段定义与示例)。
- 资产:见 [assets/templates/](assets/templates/)(何时读取:脚本渲染 `index.html`/`app.js`/`styles.css`/`option.svg` 模板，消费方无需手动引用)。

## 注意事项
- 脚本是独立命令行工具，任何需要动态变化的字段（标题、问题、选项）都应通过 spec 传入，不要改动模板。
- 生成后确认 `images/` 内每张 SVG 与 JS 的 `value` 一一对应，避免页面缺图。
- 站点部署依赖仓库既有 `util.js` 与事件接口（`eventEndpoint`）；本地预览时需放置于站点根目录结构下。
- 充分利用智能体能力:话题构思、选项设计、spec 字段补全由智能体负责，脚本只做确定性渲染。