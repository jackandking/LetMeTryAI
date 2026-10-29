---
name: nanrenbao-ks-task-analytics
description: 男人宝快手小程序「任务级挂载分析」——按单图任务(beauty-scratch?id=N)聚合有机达人/播放/进小程序/进播率，含农场号过滤、每日脉冲趋势、发布日峰值检测、标题A/B实验聚焦配对度量。This skill should be used when the user asks about 哪个任务被达人挂载/任务表现/Top10任务/发布日脉冲/标题实验复盘/新任务首日数据, or wants task-level (not page-level, not revenue) mount analytics for the 男人宝 mini-program. Data source is the Kuaishou open API (plc/photo/query), read-only. 兄弟skill边界: nanrenbao-page-usage=页面级, nanrenbao-ad-revenue=收入级, 本skill=任务id级。
agent_created: true
---

# 男人宝快手小程序 · 任务级挂载分析

## Overview

回答三类问题：① **哪个任务被达人挂载了、挂载质量如何**（按 beauty-scratch 单图任务聚合有机达人/播放/进入/进播率）；② **发布日脉冲**——新任务发布当日的挂载爆发与次日衰减；③ **标题 A/B 实验复盘**（聚焦模式做同日同图多变体的配对比较）。核心是一个自包含只读脚本，与 `nanrenbao-page-usage` 同源同快照文件，可直接运行。

## 数据模型（先读这个，避免口径错误）

- **任务** = `plcMntPath` 里的 `beauty-scratch?id=N`，N = mysql id。**只统计 beauty-scratch**；其他挂载目标（emperor/cr7/back-view-killer/appreciate 等）单列备查，不进任何表——它们不是我们的写真任务，混进来会污染 Top 榜。
- **达人** = `authorName`；**挂载** = 达人把短视频挂到该任务（与是否接单无关）。
- **农场号**（必须过滤）：单日跨 ≥3 个不同 beauty 任务挂载的账号——星火「喜爱度激励计划」末端刷量，脉冲日集中出现。原始挂载数被灌水，**任何汇报都不能用未过滤的数**。
- **有机达人**（主 KPI）= 剔除农场号后按作者去重的达人数。**进/播** = 进入小程序/播放（历史带 0.07%~0.16%，3 倍差对应「可演名场景」）。
- **刷量嫌疑标记**：播放 <1000 且进入 ≥5 且进/播 >1% 的视频（如「165 播放 14 进入」）——激励末端刷量，标记不计 KPI。
- **多任务型标记**：跨 ≥5 个任务的达人——挂载收集号而非内容匹配，实验复盘时重点排查。
- 指标口径同 page-usage：`displayPlayCnt`(播放)、`plcClickEnterCnt`(进入)。

## 使用方法

```bash
/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node \
  <skill-dir>/scripts/nanrenbao-ks-task-analytics.mjs [参数]
```

| 参数 | 含义 |
|---|---|
| 无 | 全量：新鲜度 + 每日趋势(14天) + 任务 Top10 + 达人 Top10 |
| `--since 2026-10-22` | 只统计该日期起（含）——复盘某批发布时用 |
| `--ids 830,834,835,836` | **聚焦模式**：指定任务配对对比（标题实验复盘）；附无效轮判定 |
| `--days 14` | 趋势窗天数 |
| `--top 10` | Top N |
| `--no-fetch` | 复用本地快照不调接口（调试用） |
| `--names map.json` | 追加 id→人物 映射 JSON（老图无 prompt-log 记录时用，如 `{"550":"古风泳装团扇"}`） |

**前置条件**：`/Users/jak/.secrets/ks_mp_creds.json`（同 page-usage）。token 缓存 `/tmp/ks_access_token.txt`，48h 有效；**报 token 错先删这个文件再重跑**（脚本已内置重试一次）。人物名默认从 `~/LetMeTryAI/nanrenbao/flywheel/prompt-log.jsonl` 的 db_id→subject 解析，查不到的显示 `id<N>`。

## 输出

写入 `~/LetMeTryAI/.automation/reports/`（可用 `KS_TASK_ANALYTICS_OUT` 覆盖）：`ks-task-analytics-<数据最新日>.{md,csv,json}` + 刷新 `ks-mp-mounted-videos.json` 快照。

## 结果解读指南（按优先级）

1. **数据新鲜度**：脚本首行必打印「数据最新日 + 延迟天数」。**接口延迟约 2 天**（实测不是 T-1）——今日发布的任务最早 T+2 可见，复盘排期按 T+2，永远不要把旧数据当当日数据汇报。
2. **脉冲结构**：趋势图看发布日尖峰（10-22 积压批发布日 69 有机 vs 次日 15，衰减 ~78%）。**单日脉冲主导**：新任务价值在发布日榜单曝光；跨 3 天以上仍有挂载的 = 主题匹配的持续型（如女儿国国王/小青），才是真资产。
3. **聚焦模式（实验复盘）**：主 KPI = 有机达人增量，做配对比较（B vs A 等）；进/播仅辅助（单图单日样本小）；**最新日全平台有机挂载 <10 → 脚本判定无效轮**，结论不可信需重跑；有「多任务型」达人横跨多个细胞时该细胞数据要打折看。
4. **转化 vs pickup 正交**：进/播高的任务（女娲 0.16%）pickup 可能只排第 7；pickup 第一的任务转化可能仅 0.05%。**「可演名场景」是转化的前提**（补天/拜月/怒沉百宝箱），纯颜值和异相高播放不转化。两者分开汇报，不要混为一个「效果」。
5. **达人运营**：追剧号类内容匹配达人（如小艺追剧）是真实转化资产，值得定向维护；大 V（万播级）进/播全部 <0.1%，不划算；刷量嫌疑号拉黑不计 KPI。
6. **活动波次**：单日全平台尖峰 + 挂载视频标题带统一话题词（`#热力重阳节` / `@喜爱度激励计划小助手`）= 平台激励活动波次。规律与卡位打法见 `references/campaign-playbook.md`。

## 标题 A/B 实验标准流程（本 skill 的核心场景）

干净的单变量实验 = **同一张图 × N 个标题变体，同一发布窗口连发**（物料制备见 `nanrenbao-scratch-publish` skill 的同图多变体流程）：

1. 选图：优先**从未发布的零污染老图**（首轮为零，无回归干扰）；其次高认知 IP。
2. 每格独立 mysql id（image_url 唯一索引 + 上传内容哈希去重的绕法规避，见 scratch-publish skill）。
3. 同天连发（约 1 分钟/单），标题后缀 = mysql id。
4. **T+2 后**跑本脚本 `--ids <各格id> --since <发布日>` 复盘，配对比较。
5. 判定：主 KPI 有机达人；无效轮（<10）重跑；胜出家族才值得换图复制。

参考实例：`~/LetMeTryAI/.automation/reports/title-exp-01-design.md`（2026-10-25 四格实验）。

## 注意事项

- 脚本只读：仅 GET 快手开放平台接口 + 写本地报告，无任何写回/解绑/修改。
- 挂载明细接口只返回**当前在挂载**的视频——历史农场波次会随解绑消失（农场号检出为 0 是正常的，说明当期无活跃刷量波）。
- 与治理动作（解绑/黑名单）解耦：本 skill 只做观测。
- 单日样本小（常见 1-40 条），结论必须带趋势一起说，勿凭单日下绝对结论。
- 若返回 `access denied`：先删 `/tmp/ks_access_token.txt` 重试；仍失败查 scope 或改用后台页面截图。
