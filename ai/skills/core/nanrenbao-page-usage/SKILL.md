---
name: nanrenbao-page-usage
description: 查询男人宝快手小程序各页面(H5挂载目标)被达人使用情况——最近一天(或指定天数/日期)每个页面的挂载视频数、动用人数量、播放/点击/进入、CTR、进/播率，以及页面×达人明细和近7日趋势。This skill should be used when the user asks about 页面被达人使用/达人挂载情况/哪个页面有达人在用/各页面使用数据/page usage by creators/星火任务页面日报, or wants a daily usage report for the 男人宝 mini-program pages. Data source is the Kuaishou open API (plc/photo/query), read-only.
agent_created: true
---

# 男人宝快手小程序 · 页面达人使用查询

## Overview

查询男人宝快手小程序「各页面被达人使用情况」：达人把短视频挂载到哪些 H5 页面、每个页面动用了多少达人、带来多少播放/点击/进入。默认输出「数据最新日」当天 + 近 7 日趋势，支持任意窗口。核心是一个自包含只读脚本，直接运行即可。

## 数据模型（先读这个，避免口径错误）

- **页面** = `plcMntPath` 里的挂载目标（`target=xxx`），如 `nanrenbao/beauty-scratch`、`nanrenbao/back-view-killer`、`index`。带 `?id=N` 的（如 `beauty-scratch?id=636`）按基础页归并，原目标保留在「细分」。
- **达人** = `authorName`。**使用 = 达人把视频挂载到该页面**（挂载口径，与是否接单无关——广告分成模式下不接单也能挂载，photoCount 与挂载数是两个口径，勿混用）。
- 指标：`plcShowCnt`(挂载曝光) ≈ `displayPlayCnt`(播放，当前数据两者恒等)；`plcClickCnt`(点击)；`plcClickEnterCnt`(进入小程序)；CTR = 点击/曝光；进/播 = 进入/播放。

完整字段语义见 `references/data-model.md`。

## 使用方法

运行（必须用受管 Node，脚本无第三方依赖）：

```bash
/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node \
  <skill-dir>/scripts/nanrenbao-page-usage.mjs [参数]
```

| 参数 | 含义 |
|---|---|
| 无 | 最近一天（= 数据最新日）+ 近 7 日上下文 |
| `--days 3` | 最近 3 天（按数据最新日往前推） |
| `--date 20261015` | 指定日期 |
| `--top 5` | 每页展示 Top N 达人（默认 3） |
| `--no-fetch` | 复用本地快照 `ks-mp-mounted-videos.json`，不调接口（调试用） |

**前置条件**：`/Users/jak/.secrets/ks_mp_creds.json` 存在且含 `app_id`/`app_secret`（快手开放平台小程序凭据）。token 自动获取并缓存于 `/tmp/ks_access_token.txt`（48h 有效，权限 600）。**严禁打印 app_secret 或 token**。

## 输出

默认写入 `~/LetMeTryAI/.automation/reports/`（可用环境变量 `PAGE_USAGE_OUT` 覆盖）：

| 文件 | 内容 |
|---|---|
| `ks-page-usage-<YYYYMMDD>.md` | 当日报告：页面级表 + 页面×达人 Top + 近 7 日趋势 |
| `ks-page-usage-<YYYYMMDD>.csv` | 页面级汇总 |
| `ks-page-usage-<YYYYMMDD>-authors.csv` | 页面×达人明细（含新达人标记） |
| `ks-page-usage-<YYYYMMDD>.json` | 聚合原始数据 |
| `ks-mp-mounted-videos.json` | 全量挂载快照（每次拉取自动刷新） |

## 结果解读指南

向用户汇报时，按以下优先级提炼信号：

1. **数据新鲜度**：脚本会打印「⚠️ 数据最新日为 X，最近 N 天无新挂载上传」——uploadDt 只有日期粒度且接口可能滞后，最新日 < 今天时必须说明，避免把旧数据当当日数据。
2. **页面集中度**：当天只有 1 个页面被用（如全是 beauty-scratch）= 达人只认单一产品线；近 7 日只剩 1-2 个页面 = 其他任务页面零新增，星火任务可能停摆，需结合 `nanrenbao-ks-ledger.mjs` 台账看任务状态。
3. **新达人占比**：窗口内首次出现的达人（基于当前在挂载集合判定）。注意口径：历史视频自然解绑后重现也会算「新」，标注即可，不当绝对结论。
4. **质量信号**：进/播 < 0.1% 的页面/达人 = 错配或锚点文案弱（参考治理文档 ks-mp-quality-governance.md 的裁决标准）；CTR 异常高但进入为 0 需人工看标题。
5. **横向对比**：单日样本小（常见 1-10 条），结论必须带近 7 日趋势一起说，勿凭单日下绝对结论。

## 注意事项

- 脚本只读：仅 GET 快手开放平台接口 + 写本地报告文件，无任何写回/解绑/修改操作。
- 与治理动作（解绑/黑名单）解耦：本 skill 只做观测。任何清退动作走 `ks-mp-quality-governance.md` 流程（当前处于冻结观察期，勿执行）。
- 挂载明细接口只返回**当前在挂载**的视频；历史累计趋势需对比历次快照。
- 若接口返回 `access denied`：缺 scope（如 `scope.us.profile`），本查询所需的最小 scope 已具备则重试，否则走后台页面截图分析。
