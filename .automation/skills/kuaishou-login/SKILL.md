---
name: kuaishou-login
description: Login to Kuaishou (快手) Creator Platform. Supports QR-code scan (recommended, most reliable) and phone + SMS verification code. Session persists to .automation/.local/auth/kuaishou_auth.json for reuse by publish/crawl scripts. Use when cron jobs fail due to expired login sessions, or when a human needs to re-auth.
---

# Kuaishou Login

登录快手创作者平台，供发布 / 爬虫等脚本复用同一份 session。

## 三种登录方式

1. **`--manual`（推荐，最稳）** —— 打开可视化浏览器窗口，**人**用「扫码登录」扫一下即可，脚本只负责轮询 + 保存 session。本会话「美女刮刮乐」发布就是用这条路径跑通的。
2. **`--serve`（实时二维码，根治死码）** —— 在 `--manual` 基础上再起一个本地 HTTP 服务，浏览器打开 `http://localhost:8731/` 就是**每 2 秒自动刷新的活码**。彻底消灭「聊天里发的是静态快照、等你扫时早已过期」的时序竞速。
3. **`--auto --code`（短信验证码，远程用）** —— 自动填手机号、点「获取验证码」，验证码通过文件 `.automation/.local/auth/_pending_sms_code.txt` 喂给脚本（agent 把 6 位码写进该文件）。验证码失效 / 页面崩溃会**自动重发新码并重试**（最多 4 次）。

## 关键能力

- ✅ 二维码登录（崩溃自愈 + 主动刷新 token，避免无头 Chrome 节流导致死码）
- ✅ 短信验证码登录（`--code` 模式，失效自动重试）
- ✅ `--serve` 本地实时二维码服务（活码，不再依赖聊天快照）
- ✅ 单实例锁：同一时间只允许一个登录进程，避免两个进程抢 `/tmp/ks_qr.png`
- ✅ `--kill` 一键清理卡住的旧登录进程
- ✅ session 自动保存到 `.automation/.local/auth/kuaishou_auth.json`
- ✅ 与其他脚本共享登录状态（publish / crawler 都读同一份）

## Quick Start

### 最省事：扫码登录（带实时二维码页面）

```bash
cd /Users/jak/LetMeTryAI
node .automation/skills/kuaishou-login/scripts/login.js --manual --serve
```

然后在本机（或同网手机）浏览器打开 **http://localhost:8731/** ，用快手 App 扫页面上的二维码即可。页面每 2 秒自动刷新，永远是活码。登录成功后脚本自动保存 session 并关闭服务。

> 不想开浏览器页面、直接在聊天里扫也行：去掉 `--serve`，脚本会把最新二维码写到 `/tmp/ks_qr.png`，由 agent 截图发你（注意这是静态快照，需在 ~2 分钟内扫）。

### 远程 / 无界面：短信验证码

```bash
cd /Users/jak/LetMeTryAI
node .automation/skills/kuaishou-login/scripts/login.js --auto --code
# 脚本会请求短信码，把 6 位验证码发给我，我写入 _pending_sms_code.txt 供脚本读取
```

### 检查现有 session 是否有效

```bash
node .automation/skills/kuaishou-login/scripts/login.js --check
```

### 清理卡住的旧进程

```bash
node .automation/skills/kuaishou-login/scripts/login.js --kill
```

## CLI Usage

```bash
# 扫码登录 + 本地实时二维码服务（推荐）
node scripts/login.js --manual --serve

# 扫码登录（仅写 /tmp/ks_qr.png，由 agent 发图）
node scripts/login.js --manual

# 短信验证码（远程/SSH）：自动填手机号，验证码走文件
node scripts/login.js --auto --code

# 其他手机号
node scripts/login.js --phone 139****8888

# 自定义二维码服务端口
node scripts/login.js --manual --serve --serve-port 9000

# 检查 session
node scripts/login.js --check

# 杀掉任何在跑的登录进程（单实例锁清理）
node scripts/login.js --kill

# 自定义 session 文件路径
node scripts/login.js --auth-file ./custom_auth.json

# 无头模式（不显示浏览器窗口）
node scripts/login.js --headless
```

## 使用场景

### 1. 定期维护（推荐每周一次）

快手 session 有效期约 7 天。每周用 `--manual --serve` 扫一次，保持 session 新鲜。

### 2. Cron / 发布脚本因 session 过期失败时

```bash
# 1. 重新登录（--serve 最稳）
node .automation/skills/kuaishou-login/scripts/login.js --manual --serve

# 2. 再次运行发布脚本
node scripts/publish-kuaishou-task.js <appId> <appName> <description>
```

## Session 文件

- **默认位置**: `.automation/.local/auth/kuaishou_auth.json`（注意：不是旧文档写的 `.runtime/`，那是过时路径）
- **格式**: Playwright storageState JSON
- **包含**: Cookies、localStorage、sessionStorage

示例结构：
```json
{
  "cookies": [
    { "name": "token", "value": "xxx", "domain": ".kuaishou.com", "path": "/" }
  ],
  "origins": [
    { "origin": "https://daren.kuaishou.com", "localStorage": [ {"name": "userInfo", "value": "..."} ] }
  ]
}
```

## 与其他脚本集成

### publish-kuaishou-task.js

发布脚本（及 `kw_watch_real.sh` 监视器）自动读取 `.automation/.local/auth/kuaishou_auth.json` 复用登录态。

### kuaishou-crawler

爬虫脚本同样使用此 session 文件。

## 关于 `ks-sms-login.js`（遗留脚本）

`.automation/scripts/ks-sms-login.js` 是**早期的独立短信登录脚本**（提交 `12c17eb7`），用 stdin 读验证码、无二维码、无崩溃自愈。它写入的 session 路径与上面一致（`.automation/.local/auth/kuaishou_auth.json`），但能力已被本 skill 的 `--auto --code` 模式**完全覆盖且更稳**。**新流程请用本 skill 的 `login.js`，`ks-sms-login.js` 不再维护。**

## Troubleshooting

| 问题 | 解决方案 |
|------|----------|
| 二维码「刚发就过期」 | 那是聊天快照的静态图。改用 `--serve` 打开 http://localhost:8731/ 扫活码，或扫得更快。脚本本身在后台持续刷新二维码，是好的。 |
| 提示「已有登录进程在运行」 | 之前的进程没退干净。运行 `node login.js --kill` 清理，再重试。 |
| 「验证码错误 / 失效」 | 短信码约 5 分钟过期。`--code` 模式会自动重发新码重试；手动模式重新运行脚本即可。 |
| 出现滑块验证码 | 在弹出的浏览器窗口里手动完成滑块，脚本会等待你完成。 |
| "操作频繁"提示 | 等待 5 分钟后重试。 |
| Session 很快过期 | 快手 session 通常 7 天过期，属正常；每周维护一次。 |
| 默认手机号不对 | 用 `--phone` 参数指定其他号码。 |

## Technical Details

### 登录流程（--manual 推荐路径）

```
1. 启动浏览器（系统 Chrome，headless=false 以便人扫码）
2. 访问 passport.kuaishou.com 登录页（sid=kuaishou.creator.marketing）
3. 检测是否已登录（有 passToken/userId 等 cookie 即判定成功）
4. 未登录 → 停在「扫码登录」tab，持续刷新二维码 + 写入 /tmp/ks_qr.png
5. --serve 模式额外起 HTTP 服务，把活码暴露到 localhost
6. 人扫码 → 检测登录成功 → 保存 session 到文件 → 关闭浏览器/服务
```

### 依赖

- Playwright（项目已装）
- Node.js 18+
- 系统 Chrome（`/Applications/Google Chrome.app`，无自带 chromium 时走这个）
