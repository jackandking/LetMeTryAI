# 家长爱 · 每日迭代飞轮

把「信号 → 聚合 → 维度进化 → 候选 → 埋点验证 → 新信号」做成每天自动跑一圈的机制。

## 与男人宝飞轮的关键差异

男人宝按「榜首图 `prompt_dna` + `view_count`」进化审美；亲子类**不能照搬价值函数**——评判家长、制造焦虑、收集孩子身份都会反噬。这里换成：

| 男人宝 | 家长爱 |
|---|---|
| `view_count`（解锁次数） | `card_saved` 结果卡存图率（主）+ 分享完成率 + 首任务完成率 |
| subject / wardrobe / body_type | emotion / artifact_type / share_target / question_template / unlock_point |
| 图片投稿 + `/mysql/insert` | H5 页面 + `metadata.json`，静态部署 |
| 图片合规审核 | 文案红线审核（不评分、不诊断、不收孩子身份） |
| 审美质量 + 风格多样度 | 结果物保存率 + 分享完成率，护栏优先 |

## 双模驱动（诚实处理零数据）

- **EXPERIMENT 模式（默认，当前所处状态）**：没有家长爱信号时，每天按固定队列推进一个待验证创意，产出「今日候选 + 红线复核 + 明日该看什么」。**绝不编造冠军**。
- **EVOLVE 模式**：某创意结果展示 ≥ 20、总事件 ≥ 5、分数 > 0、护栏与文案红线均通过，才按 DNA 维度聚合出冠军，写回 `seeds.json`。champion 变化时才 commit+push。
- **FAIL-CLOSED**：拉取失败时日报标 ERROR，不写 seeds、不推进实验队列。

## 数据流

```
H5 / 小程序  --signal.js-->  POST https://letmetry.cn/api/track
                                   │  (jsonl，按 date 分文件)
                                   ▼
                     GET /api/track/summary?date=<UTC 昨天>
                                   │
                          daily.py 按 pl.<ideaId>.<topic> 提取
                                   │
                    ┌──────────────┴──────────────┐
              零/不足信号                      样本达标
                    ▼                              ▼
              实验队列 + 日报                维度榜 + champion
                                                     │
                                          seeds.json 变化时 push
```

## appId 与事件约定

- appId 格式：`pl.<ideaId>.<topic>`，例如 `pl.06.parent-chat-teen`。`pl.home` 等未映射 ID 只计入总量，不参与打分。
- 事件：`page_load` / `tool_open` / `result_shown` / `card_saved` / `share_tap` / `share_open_first_complete` / `first_task_complete` / `unlock_complete` / `abort` / `negative_feedback`。完整定义见 `config.json`。
- 漏斗：`result_shown → card_saved`（主）；`share_tap → share_open_first_complete`（分享回环）；`abort` / `negative_feedback` 是护栏。
- 分享回环需要小程序 `onShareAppMessage` 的 path 带 topic + choice，并在落地页保留 `pl_from=share` 参数。

## 运行

```bash
# 本机手动验证（不写 seeds/state）
python3 parent-tools/flywheel/daily.py --dry-run

# 正式跑（launchd 每日执行）
bash parent-tools/flywheel/run-daily.sh

# 指定日期回补
python3 parent-tools/flywheel/daily.py --date 2026-11-15
```

launchd：`~/Library/LaunchAgents/com.letmetry.parent-love-flywheel.plist`，每日 09:05。
日报在 `reports/YYYY-MM-DD.md|html`（本地产物，不进 git）；运行时状态在 `state.json`（不进 git）。

## 红线

见 `redlines.json`。命中评分 / 孩子身份 / 焦虑类词表的候选直接拦截。
明确不做：育儿能力测评、心理测试、排行榜、别人家孩子对比、收集孩子姓名照片学校。
明确禁止把男人宝 `agent101.md` 的审美基线带进亲子类内容。

## 已知前提与缺口

1. 截至建立当日，家长爱 H5 与小程序**零埋点**，线上 `/api/track/summary` 中没有任何 `pl.` 前缀 appId。因此首期必然是 EXPERIMENT 模式——这是真实状态，不是故障。
2. `signal.js` 已提供零依赖接入：页面加一行 script + `meta[name=pl-app]` + `data-pl-result` / `data-pl-event`。当前只接入首页与 `parent-type-test`，其余工具页待扩。
3. `/api/track/summary` 只给 `appId × event` 计数，不解析选项比例。要看「少数派身份卡」的真实百分比，需在结果页读取 AWS KV 的真实票数，不能由本引擎推断或编造。
4. `.harness/scripts/daily-kuaishou-report.js:1127` 取 UTC 当天，在 UTC 01:3x 运行时读到半天数据（历史日志 8 天有 6 天为 0）。本引擎固定取 UTC 昨天，规避同一缺陷；该脚本本身未改（属 `.automation` 相邻约定，需单独批准）。
