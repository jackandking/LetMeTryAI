---
name: nanrenbao-ad-revenue
description: 查询男人宝快手小程序广告(激励视频)收入——近7天/近30天或任意窗口的收入、拉取、曝光、点击、CTR、ecpm、每日明细与趋势占比。This skill should be used when the user asks about 广告收入/变现收入/星火激励广告赚了多少/ad revenue/monetization for the 男人宝 mini-program, or wants a revenue check before/after traffic changes. Data source is the Kuaishou open API (ad/data/query), read-only; costTotal is in yuan.
agent_created: true
---

# 男人宝快手小程序 · 广告收入查询

## Overview

查询男人宝快手小程序的广告收入（唯一变现渠道=激励视频广告；支付订单长期为 0，无支付设计）。默认一次输出近 7 天 + 近 30 天两个窗口：收入、拉取/曝光/点击、CTR、ecpm、每日明细、近 7 天占 30 天比例。核心是一个自包含只读脚本，直接运行即可。

## 数据模型（先读这个，避免口径错误）

- 接口：`POST /openapi/mp/developer/ad/data/query`，body `{startTime, endTime, type: 0, page, pageSize: 100}`，时间单位毫秒。
- **`costTotal` 单位是「元」，不是分**（数据量级 ¥0.01~1.5/天，与后台结算一致）。
- 指标：`queryCnt`(广告拉取) / `impression`(曝光) / `click`(点击) / `costTotal`(收入)；CTR=点击/曝光；ecpm=收入/曝光×1000。
- 返回 items 按天×广告位多行，同一天需合并；且可能返回窗口外或零收入行——脚本已按本地日期过滤（start 含、end=今天不含）。
- **时区坑**：窗口边界必须用本地时区日期串（GMT+8 的 00:00 在 UTC 还是前一天，用 `toISOString` 会整整天切掉当天数据）。脚本用本地 ymd，勿改回 UTC。
- **发布任务量（第二数据源，2026-10-28 加入）**：达人平台任务列表 `daren.kuaishou.com/rest/pc/creator/marketing/distribution/list`（cookie 登录态，非开放平台 token）。口径：只统计小程序「人人爱男人宝」的计划；任务标题尾部数字=图片 id，**每 id 取 effectiveTime 最早的计划行为「首发」**，按 GMT+8 落日计入发布量；**改名会在平台生成新计划行（旧行保留），后续行单列为「改名」不计入发布量**；首发即审核拒绝的单列「拒绝」。此口径避免把改名日虚增成发布日（如 10-25 实际首发 9 个 + 改名 14 个）。

## 使用方法

```bash
/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node \
  <skill-dir>/scripts/nanrenbao-ad-revenue.mjs [参数]
```

| 参数 | 含义 |
|---|---|
| 无 | 默认 7 天 + 30 天两个窗口 |
| `--days 7` | 只要近 7 天 |
| `--days 3,7,30` | 任意多个窗口（逗号分隔） |
| `--no-tasks` | 跳过任务列表拉取，只要收入（省约 10s） |

**前置条件**：`/Users/jak/.secrets/ks_mp_creds.json` 存在且含 `app_id`/`app_secret`。token 自动获取并缓存于 `/tmp/ks_access_token.txt`（48h，权限 600）。**严禁打印 app_secret 或 token**。发布任务量另需达人平台登录态 `~/LetMeTryAI/.automation/.local/auth/kuaishou_auth.json`（`KS_AUTH_FILE` 可覆盖）；缺失或失效时发布数列显示「—」并在报告注明，不影响收入数据。登录态刷新：跑一次 `ks_fetch_tasks.mjs` 或 `ks_mp_login.mjs` 扫码。

## 输出

默认写入 `~/LetMeTryAI/.automation/reports/`（环境变量 `AD_REVENUE_OUT` 可覆盖）：

| 文件 | 内容 |
|---|---|
| `ks-ad-revenue-<YYYYMMDD>.md` | 报告：各窗口汇总表 + 每日明细（含发布任务量列）+ 趋势 + 解读要点 |
| `ks-ad-revenue-<YYYYMMDD>.csv` | 每日明细长表（窗口,日期,发布,拉取,曝光,点击,收入） |
| `ks-ad-revenue-<YYYYMMDD>.json` | 原始聚合（含 taskStats 每日发布/改名/拒绝） |

## 结果解读指南

1. **绝对金额极小**（月入十元级）：不为这 ¥10 做专门优化；它的价值是信号——曝光→点击漏斗本身是通的（CTR ~2%、ecpm ¥29~49）。
2. **瓶颈是量**：达人视频日均 3k+ 播放只换约 17 次广告曝光/天，rewardedWebview 页面内广告触发点弱。先解决流量基数（见 `nanrenbao-page-usage` skill 的页面使用数据），收入随基数走。
3. **趋势口径**：近 7 天占近 30 天的比例是核心趋势信号（挂载 surge 会同步推高广告曝光）。
4. **发布量联动**：每日明细表现含「发布」列（首发任务数）。发布尖峰日当天/次日曝光与收入同步冲高（如 10-22 发 70 个 → 当日 ¥1.99；10-25/27 高位），但 ecpm 不随发布量修复——涨量不涨价，别把收入脉冲全归功于发布。
5. **交叉验证**：与 `plc/photo/query` 的播放量对照——若播放涨而曝光不涨，说明页面内广告触发出问题，不是流量问题。
6. 单日波动大（¥0.01~1.38，尖峰日可达 ¥2.7），勿凭单日下结论；至少看 7 天窗口。

## 注意事项

- 脚本只读：仅请求快手开放平台接口 + 写本地报告文件，无任何写回操作。
- 与治理动作（解绑/黑名单）解耦：本 skill 只做观测。清退动作走 `ks-mp-quality-governance.md` 流程（当前冻结观察期，勿执行）。
- 广告数据接口可能滞后 1 天（当天数据次日上午才齐），早上查「最近一天」时注意。
- 若返回 `access denied`：缺 scope，本查询所需的基础权限已具备；若报错先查 token 是否过期（删 `/tmp/ks_access_token.txt` 重试）。
