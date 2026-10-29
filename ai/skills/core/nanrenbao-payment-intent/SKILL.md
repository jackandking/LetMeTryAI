---
name: nanrenbao-payment-intent
description: 一键查询男人宝有没有人想尝试充值/支付——最近 N 天支付意向次数与用户明细、真实订单状态、积分入账、支付宝通道是否配置，并给出「是否值得推进支付」的下一步建议。This skill should be used when the user asks about 男人宝充值/付费意愿/支付意向/有没有人想花钱/充值尝试/payment intent for nanrenbao, or wants to decide whether to launch the Alipay recharge flow. Data source is the LWS backend (MySQL + miniapp-events + process env), read-only.
agent_created: true
---

# 男人宝支付意向速查

## Overview

回答一个问题：**「最近有没有人想尝试在男人宝里花钱？值不值得推进支付？」**

前端充值页（`nanrenbao/recharge.html`）自 2026-08-15（commit `effe7128`）起是「假支付页」：点支付按钮不建单、不扣款，只 sendBeacon 上报 `payment_intent` 事件 + localStorage 计数。本 skill 把四个数据源交叉验证，一条命令给出结论 + 决策建议。核心是一个自包含只读脚本，直接运行即可。

## 数据模型（先读这个，避免口径错误）

| 数据源 | 语义 | 关键口径 |
|---|---|---|
| `alipay_payment_orders` 表 | 真实充值订单 | `status=PENDING` = 订单已创建但支付宝未验签回调（用户可能跳到支付宝后放弃）；只有异步通知验签通过才会变已支付。**暂停支付后的新代码不建单**，表里的旧订单是历史遗留 |
| `alipay_points_ledger` 表 | 积分入账流水 | 只有验签成功的支付才会写；**0 条 = 历史上从未有过成功支付** |
| `data/miniapp-events/<date>.jsonl` | 前端埋点事件流 | `payment_intent` = 用户点了「支付宝支付意向」按钮。**这是「想花钱」的信号，不等于支付行为**。按 `appId=nanrenbao-recharge` 过滤 |
| 进程环境 / `.env` | 支付宝密钥配置 | `ALIPAY_APP_ID/PRIVATE_KEY/PUBLIC_KEY` 三件套缺任何一个，`create-order` 直接抛「支付宝服务端密钥尚未配置」——通道实际关闭 |

辅证：`api_stats` 表 `/api/track` 近 7 日调用量，确认埋点管道活着（没管道 = 没数据 ≠ 没意向）。

**用户身份**：`userUuid` 是前端 localStorage 生成的访客 UUID，换设备/清缓存即变，不去重跨设备同一人。

## 使用方法

运行（必须用受管 Node，脚本无第三方依赖）：

```bash
/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node \
  ~/.workbuddy/skills/nanrenbao-payment-intent/scripts/nanrenbao-payment-intent.mjs [--days 30]
```

| 参数 | 含义 |
|---|---|
| 无 | 默认最近 30 天窗口 |
| `--days 7` / `--days 90` | 自定义意向窗口 |
| `--help` | 用法 |

**前置条件**：本机 SSH 别名 `lws` 可用（`ssh lws echo ok`）。脚本只读：SSH 到 lws 执行 SELECT + grep JSONL，不建单、不改库、不写生产。

## 输出

结论直接打在 stdout；同时写入 `~/LetMeTryAI/.automation/reports/nanrenbao-payment-intent-<YYYYMMDD>.md`（环境变量 `NANRENBAO_PAYMENT_OUT` 可覆盖目录）。

报告结构：结论 → 指标总表（意向/订单/入账/通道/管道）→ 窗口内意向明细（日期/UUID/套餐/金额）→ 最近 10 笔订单 → 下一步建议。

## 结果解读指南

1. **结论优先**：脚本第一行就是裁决——「有人想花钱」/「无人尝试」/「从未有人尝试」，直接转述给用户，不要让人翻表。
2. **意向 ≠ 订单**：有意向但订单为 0 是暂停期的正常状态（前端不建单）。两者要一起说：意向 = 需求信号，订单 = 真实转化。
3. **决策树**（脚本已内置，汇报时按此展开）：
   - 有意向 + 通道未配置 → 最高优先级：配支付宝三件套密钥（走 Vault/密钥文件，勿明文进仓库）+ **先把积分从 localStorage 迁到服务端账户**（付费积分存本地 = 换设备即丢 + 资损风险，这是重开支付的前置坑，后端 `alipay_points_ledger` 表已设计好待接）
   - 有意向 + 通道已配置 → 盯 create-order 报错和支付宝回调验签
   - 无意向但有历史意向 → 查入口曝光（充值链接只在 `appreciate.html`），考虑套餐定价（¥1=100 分 / ¥5=550 分 / ¥10=1200 分，递增送分）
   - 从未有意向 → 先别做支付，验证有没有人看到入口
4. **僵尸订单**：订单表有历史 PENDING 且全部未支付时，脚本会提醒重开前先清理/标记 EXPIRED，否则对账分不清历史遗留与新失败。
5. **单次意向也是信号**：全历史就 1-2 次时，值得告诉用户具体日期和套餐（用户点了 ¥1 档 = 低门槛试探），但不要夸大样本量。

## 注意事项

- 脚本只读，无任何写回操作；DB 凭据在服务器上运行时从后端 `mysqlUtil.js` 提取（与 `business-metrics-report` 同模式），不写入 skill 目录、不回显、不落本地。
- `/api/track` 的 `date` 字段来自前端浏览器（UTC 口径），跨天边界可能有几小时偏差，单次查询不影响结论。
- 若 SSH 失败：先 `ssh lws echo ok` 确认别名和网络，再重跑。
- 相关文档：服务端 `ALIPAY-PAYMENT.md`（支付链路设计）、`payment-schema.sql`（表结构）；前端设计见 `nanrenbao/recharge.html` + `recharge.js` + `recharge.test.js`。
