---
slug: show-me-the-pretty
name: show-me-the-pretty
displayName: Show Me The Pretty
version: 1.0.0
description: 1 分钱随机获得一张男人宝画廊「已审核」美图（着衣、艺术化、非性化）。按次微信支付 ¥0.01。本服务收取随机检索与展示服务费，不包含任何图片版权授权。
summary: 1 分钱随机抽一张男人宝已审核美图的付费 Skill。
license: MIT
namespace: letmetry
type: paid
---

# Show Me The Pretty（随手赏美图）

1 分钱随机抽一张男人宝画廊里**已通过内容审核**的美图。适合想随手看张高质量、合规的人像图的场景。

## 何时使用
- 用户说「给我看张好看的 / 随机来张美图 / 赏图 / show me the pretty / 抽张图」。
- 想要的是**一张随机的、已过审的**人像图，而不是指定某张或某主题。

## 输入
无必填参数。端点为 `POST`，可直接以空 JSON body `{}` 调用。

## 调用流程（付费编排 · 严格遵守）
端点：`POST https://letmetry.cn/skillhub/show-me-the-pretty`（可用环境变量 `PRETTY_API_BASE` 覆盖）。

1. **发起请求**：以 `{}` 或任意 JSON body `POST` 上面端点。
2. **若返回 HTTP 402（PAYMENT_REQUIRED）**：
   - 从响应头取 `WeixinPay-Required`（即 `paymentCode`）和 `X-Out-Trade-No`。
   - 通过平台微信支付能力（**weixinpay_pay**）以该 `paymentCode` 向用户发起 **¥0.01** 授权，请用户用微信完成支付。
   - 支付成功后，**用原请求体不变**，加请求头 `X-Out-Trade-No: <上面的值>` **重新 POST** 同一端点。
3. **若返回 HTTP 200**：解析响应体 `content`，按「输出格式」呈现给用户（见下）。
4. **若返回 HTTP 404**：当前画廊暂无可展示的过审图片。

> 便捷方式：本 skill 附 `scripts/query.js`，可代为发起 POST 并解析 402/200/404；支付步骤仍由你（agent）通过 weixinpay_pay 完成后再带 `--out-trade-no` 重试。本地联调时可用 `node scripts/query.js` 与 `node scripts/query.js --out-trade-no <no>`。

## 输出格式（呈现给用户）
对返回的一张图片展示：
- **图片**：直接展示 `image.imageUrl`（公开可外链）。
- **来源类型** `image.sourceType`（投稿渠道标识，可选展示）。
- **提交时间** `image.submittedAt`（可选展示）。

**末尾必须附免责声明**（响应体已含 `disclaimer`，原样展示或转述）：
> 图片来自男人宝画廊已审核内容，均为着衣、艺术化、非性化作品；版权归原作者/投稿人所有，本服务仅提供随机检索与展示，不包含图片版权授权。

## 版权与合规（重要）
- 我们收取的是**随机检索与展示服务费**，不是图片售卖；图片版权归原作者/投稿人所有。
- 所有返回图片均来自**已过内容审核**的画廊内容，仅限着衣、艺术化、非性化作品。
- 用户须自行对**后续使用**（转载、商用、再创作）的合规性负责。

## 限制
- 每次调用返回**一张**随机过审图；同一会话多次调用会得到不同（或不尽相同）的图片。
- 价格为测试价 ¥0.01/次；正式定价以后续公告为准。
