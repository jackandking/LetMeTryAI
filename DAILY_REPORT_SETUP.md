# 快手日报与多品牌日更设置指南

每天早上 6 点自动抓取快手数据并发送邮件报告；每天早上 7 点后按品牌分别运行日更页面流水线。

## 多品牌日更（男人宝 / 老人爱 / 后续品牌）

### 推荐方式

保持 `daily_run.sh` 单次只跑一个品牌，通过 `scripts/run-daily-profile.sh` 给 cron 传入品牌 ID。

这样每个品牌都有独立的：
- `DAILY_PROFILE_ID`
- `logs/daily-orchestrator/<brand>/`
- `.runtime/email-drafts/<brand>-latest.txt`

默认继续共享：
- `.runtime/kuaishou_auth.json`

### 手动运行

```bash
cd /Users/weiping/prod/LetMeTryAI

# 男人宝
scripts/run-daily-profile.sh nanrenbao

# 老人爱
scripts/run-daily-profile.sh elder-love
```

### 推荐 cron 配置

```bash
# 快手日报 - 每天 06:00
0 6 * * * cd /Users/weiping/prod/LetMeTryAI && git pull --ff-only && KUAISHOU_EMAIL_TO=jackandking@163.com node scripts/daily_kuaishou_report.js >> logs/daily_report.log 2>&1

# 男人宝日更 - 每天 07:00
0 7 * * * cd /Users/weiping/prod/LetMeTryAI && scripts/run-daily-profile.sh nanrenbao >> logs/daily-run-nanrenbao.log 2>&1

# 老人爱日更 - 每天 08:00
0 8 * * * cd /Users/weiping/prod/LetMeTryAI && scripts/run-daily-profile.sh elder-love >> logs/daily-run-elder-love.log 2>&1
```

后续新品牌继续按这个模式错峰添加，例如 09:00、10:00。

### 为什么不混

不会和男人宝混，前提是每条 cron 都显式传品牌 ID：
- 男人宝：`scripts/run-daily-profile.sh nanrenbao`
- 老人爱：`scripts/run-daily-profile.sh elder-love`

wrapper 会自动导出各自的 `DAILY_PROFILE_ID`、日志目录和邮件草稿路径。

## 快速设置

### 方式1：一键设置（推荐）

```bash
./scripts/setup-cron.sh
```

按照提示输入邮箱地址，脚本会自动：
1. 检测系统类型（macOS/Linux）
2. 安装快手日报定时任务（每天 6:00 AM）
3. 安装男人宝 / 老人爱日更定时任务
4. 可选择立即运行测试

### 方式2：手动设置

#### macOS / Linux

```bash
# 编辑 crontab
crontab -e

# 添加以下行
0 6 * * * cd /Users/weiping/prod/LetMeTryAI && git pull --ff-only && KUAISHOU_EMAIL_TO=jackandking@163.com "$(command -v node)" scripts/daily_kuaishou_report.js >> logs/daily_report.log 2>&1
0 7 * * * cd /Users/weiping/prod/LetMeTryAI && scripts/run-daily-profile.sh nanrenbao >> logs/daily-run-nanrenbao.log 2>&1
0 8 * * * cd /Users/weiping/prod/LetMeTryAI && scripts/run-daily-profile.sh elder-love >> logs/daily-run-elder-love.log 2>&1
```

如果你是在别的 clone 里手动运行，把 `cd /Users/weiping/prod/LetMeTryAI` 替换成当前仓库路径即可。

#### 使用 launchd (macOS 推荐)

创建 `~/Library/LaunchAgents/com.kuaishou.dailyreport.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.kuaishou.dailyreport</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-lc</string>
        <string>cd /Users/weiping/prod/LetMeTryAI && git pull --ff-only && "$(command -v node)" scripts/daily_kuaishou_report.js</string>
    </array>
    <key>WorkingDirectory</key>
    <string>/Users/weiping/prod/LetMeTryAI</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>KUAISHOU_EMAIL_TO</key>
        <string>jackandking@163.com</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>6</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>/Users/weiping/prod/LetMeTryAI/logs/daily_report.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/weiping/prod/LetMeTryAI/logs/daily_report_error.log</string>
</dict>
</plist>
```

加载任务：
```bash
launchctl load ~/Library/LaunchAgents/com.kuaishou.dailyreport.plist
```

## 配置说明

### 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `KUAISHOU_EMAIL_TO` | 收件人邮箱 | jackandking@163.com |
| `AGENTMAIL_API_KEY` | AgentMail API 密钥 | 已内置 |
| `HEADLESS` | 是否无头模式（后台运行） | true |
| `DAILY_PROFILE_ID` | 目标品牌 ID | `nanrenbao` |
| `DAILY_LOG_DIR` | orchestrator 日志目录 | `logs/daily-orchestrator/<brand>` |
| `EMAIL_DRAFT_PATH` | 最新邮件草稿路径 | `.runtime/email-drafts/<brand>-latest.txt` |

### 首次运行

首次运行需要手动登录快手，之后 session 会自动保存：

```bash
# 手动模式运行一次，完成登录
cd /Users/weiping/prod/LetMeTryAI
HEADLESS=false node scripts/daily_kuaishou_report.js
```

登录成功后，session 会保存到 `.runtime/kuaishou_auth.json`，之后的定时任务就会自动运行了。

## 管理定时任务

### 查看任务
```bash
crontab -l
```

### 编辑任务
```bash
crontab -e
```

### 删除任务
```bash
# 删除所有 cron 任务（谨慎！）
crontab -r

# 或者编辑删除特定行
crontab -e
```

### 查看运行日志
```bash
# 实时查看
cd /Users/weiping/prod/LetMeTryAI
tail -f logs/daily_report.log

# 查看最近100行
tail -n 100 logs/daily_report.log

# 查看男人宝日更日志
tail -n 100 logs/daily-run-nanrenbao.log

# 查看老人爱日更日志
tail -n 100 logs/daily-run-elder-love.log
```

## 手动运行测试

### 立即运行一次
```bash
cd /Users/weiping/prod/LetMeTryAI
node scripts/daily_kuaishou_report.js

# 运行男人宝日更
scripts/run-daily-profile.sh nanrenbao

# 运行老人爱日更
scripts/run-daily-profile.sh elder-love
```

### 指定邮箱运行
```bash
cd /Users/weiping/prod/LetMeTryAI
KUAISHOU_EMAIL_TO=other@example.com node scripts/daily_kuaishou_report.js
```

### 调试模式（显示浏览器窗口）
```bash
cd /Users/weiping/prod/LetMeTryAI
HEADLESS=false node scripts/daily_kuaishou_report.js
```

## 输出文件

每次运行会生成以下文件：

```
metrics/kuaishou/daily/
├── kuaishou_report_2026-03-10.json    # 完整 JSON 数据
├── kuaishou_report_2026-03-10.csv     # Excel 可打开的 CSV
└── ...

logs/
├── daily_report.log                    # 快手日报日志
├── daily-run-nanrenbao.log             # 男人宝日更日志
├── daily-run-elder-love.log            # 老人爱日更日志
└── daily_report_error.log              # 错误日志（如果使用 launchd）

.runtime/
├── kuaishou_auth.json                  # 快手登录态
└── email-drafts/
    ├── nanrenbao-latest.txt            # 男人宝最新草稿
    ├── elder-love-latest.txt           # 老人爱最新草稿
    └── email-draft-时间戳.txt           # 历史草稿归档
```

## 邮件内容示例

```
📊 快手星火计划日报 (2026-03-10)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 数据概览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 总任务数: 36 个
• 有数据任务: 31 个
• 总曝光数: 68,085
• 总点击数: 7,713
• 总达人数量: 2,432
• 总作品数量: 3,414
• 整体点击率: 11.33%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 TOP 10 曝光任务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. [40685] 这是什么鱼白条
   曝光: 9888 | 点击: 41 | 达人: 45
...

[包含 CSV 附件]
```

## 故障排查

### 问题1：提示 "Login required"
**原因**：Session 过期或首次运行  
**解决**：
```bash
HEADLESS=false node scripts/daily_kuaishou_report.js
# 手动登录一次，后续自动运行
```

### 问题2：邮件未收到
**检查**：
1. 查看日志 `logs/daily_report.log`
2. 检查 AgentMail API Key 是否有效
3. 检查收件人邮箱是否正确

### 问题3：数据未更新
**检查**：
1. 确认定时任务已正确安装 `crontab -l`
2. 检查日志中是否有错误
3. 手动运行测试是否正常

### 问题4：Cron 任务未执行
**macOS**：
```bash
# 检查 cron 服务状态
sudo launchctl list | grep cron

# 确保 cron 有完全磁盘访问权限
# 系统设置 -> 隐私与安全 -> 完全磁盘访问权限 -> 添加 /usr/sbin/cron
```

## 修改发送时间

编辑 crontab 修改时间：

```bash
# 格式: 分 时 日 月 周
# 每天早上6点
0 6 * * * ...

# 每天早上8点30分
30 8 * * * ...

# 每周一早上9点
0 9 * * 1 ...

# 每小时执行一次
0 * * * * ...
```

## 关闭自动报告

```bash
# 方式1：删除所有 cron 任务
crontab -r

# 方式2：编辑删除特定行
crontab -e
# 删除包含 daily_kuaishou_report.js 的那一行

# 方式3：macOS launchd
launchctl unload ~/Library/LaunchAgents/com.kuaishou.dailyreport.plist
rm ~/Library/LaunchAgents/com.kuaishou.dailyreport.plist
```

## 安全提示

1. **不要提交 `.runtime/`** - 其中包含 `kuaishou_auth.json` 等运行态文件，已添加到 `.gitignore`
2. **保护 API Key** - 如需更换，修改脚本中的 `CONFIG.apiKey` 或使用环境变量
3. **日志文件** - 定期清理 `logs/` 目录避免占用过多磁盘空间
4. **生产运行目录** - 建议 cron 固定使用 `/Users/weiping/prod/LetMeTryAI`，开发 clone 保持独立

## 支持

如有问题，检查：
1. 日志文件 `logs/daily_report.log`
2. 截图文件 `metrics/kuaishou/daily/`
3. Session 文件 `.runtime/kuaishou_auth.json` 是否存在
