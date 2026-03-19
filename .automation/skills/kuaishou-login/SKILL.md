---
name: kuaishou-login
description: Login to Kuaishou (快手) Creator Platform using mobile phone + SMS verification code. Handles session persistence to .runtime/kuaishou_auth.json. Use when cron jobs fail due to expired login sessions.
---

# Kuaishou Login

手动登录快手创作者平台，支持手机号 + 短信验证码登录方式。

## Features

- ✅ 手机号 + 短信验证码登录
- ✅ 自动保存 session 到 `.runtime/kuaishou_auth.json`
- ✅ 可视化浏览器（方便处理滑块验证码）
- ✅ 验证现有 session 是否有效
- ✅ 与其他脚本共享登录状态

## Quick Start

### 运行登录

```bash
cd /Users/weiping/LetMeTryAI
node .agents/skills/kuaishou-login/scripts/login.js
```

按提示操作：
1. 手机号（默认 13810417594，直接回车使用默认）
2. 脚本会自动点击"获取验证码"
3. 输入收到的短信验证码
4. 如有滑块验证码，手动完成后按回车
5. 登录成功，session 自动保存

### 验证 Session 是否有效

```bash
node .agents/skills/kuaishou-login/scripts/login.js --check
```

## CLI Usage

```bash
# 交互式登录（默认手机号 13810417594）
node scripts/login.js

# 使用其他手机号
node scripts/login.js --phone 139****8888

# 自动模式（适合远程 SSH）：自动填充手机号，只提示验证码
node scripts/login.js --auto

# 检查现有 session 是否有效
node scripts/login.js --check

# 自定义 session 文件路径
node scripts/login.js --auth-file ./custom_auth.json

# 无头模式（不显示浏览器窗口）
node scripts/login.js --headless

# 显示帮助
node scripts/login.js --help
```

## 使用场景

### 1. 定期维护（推荐）

快手 session 有效期约 7 天，建议每周手动运行一次：

```bash
# 每周运行一次，保持 session 新鲜（使用默认手机号）
node .agents/skills/kuaishou-login/scripts/login.js

# 或使用指定手机号
node .agents/skills/kuaishou-login/scripts/login.js --phone 13810417594
```

### 2. Cron Job 失败时

当发布脚本因 session 过期失败时：

```bash
# 1. 重新登录
node .agents/skills/kuaishou-login/scripts/login.js

# 2. 再次运行发布脚本
node scripts/publish-kuaishou-task.js <appId> <appName> <description>
```

## Session 文件

- **默认位置**: `.runtime/kuaishou_auth.json`
- **格式**: Playwright storageState JSON
- **包含**: Cookies、localStorage、sessionStorage

示例结构：
```json
{
  "cookies": [
    {
      "name": "token",
      "value": "xxx",
      "domain": ".kuaishou.com",
      "path": "/"
    }
  ],
  "origins": [
    {
      "origin": "https://daren.kuaishou.com",
      "localStorage": [
        {"name": "userInfo", "value": "..."}
      ]
    }
  ]
}
```

## 与其他脚本集成

### publish-kuaishou-task.js

发布脚本会自动读取 `.runtime/kuaishou_auth.json`：

```javascript
const AUTH_FILE = resolveAuthFilePath(); // 指向 .runtime/kuaishou_auth.json
const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined
});
```

### kuaishou-crawler

爬虫脚本同样使用此 session 文件。

## Troubleshooting

| 问题 | 解决方案 |
|------|----------|
| 提示"验证码错误" | 重新运行脚本，输入正确的短信验证码 |
| 出现滑块验证码 | 在浏览器窗口中手动完成滑块，然后按回车继续 |
| "操作频繁"提示 | 等待 5 分钟后重试 |
| Session 很快过期 | 快手 session 通常 7 天过期，属于正常情况 |
| 找不到登录按钮 | 脚本会自动检测多种选择器，如仍失败请检查页面是否加载完整 |
| 没有自动点击"获取验证码" | 手动点击浏览器中的按钮，然后继续输入验证码 |
| 默认手机号不对 | 使用 `--phone` 参数指定其他号码 |

## Technical Details

### 登录流程

```
1. 启动浏览器 (非 headless 模式)
2. 访问 https://daren.kuaishou.com/distribution-plan-list
3. 检测是否已登录
4. 未登录则：
   - 点击"手机号登录"
   - 提示输入手机号
   - 输入手机号
   - 点击"获取验证码"
   - 提示输入短信验证码
   - 输入验证码
   - 点击登录按钮
   - 检测滑块验证码
5. 等待登录成功
6. 保存 session 到文件
```

### 依赖

- Playwright (已安装于项目)
- Node.js 18+

## References

- `scripts/publish-kuaishou-task.js` - 发布任务脚本
- `kuaishou-crawler` - 数据爬取 skill
- `kuaishou-publisher` - 任务发布 skill
