# 项目北极星、能力与约束（2026-04-25 更新）

## 北极星目标

**让 auto 能自动优化 harness 的一切，最大化小程序广告收入。**

闭环：auto 观察数据 → 调整策略 → harness 执行 → 产生新数据 → auto 再观察

---

## 可用的能力

### 执行层（harness）

| 能力 | 状态 | 说明 |
|------|------|------|
| 每日生成投票应用 | 运行中 | 4 个 profile × 每天 1 个 app，cron 凌晨跑 |
| 发布星火计划任务 | 运行中 | daren 后台 API（Cookie 认证），自动创建+AI 封面 |
| 暂停星火任务 | 已验证 | `POST distribution/update` + `planOffline:"1"` |
| API 发布视频到快手 | 已验证 | 开放平台 OAuth，start_upload→upload→publish |
| 小程序挂载 mp_plc/bind | 待批准 | 老人爱已申请，其他小程序还没申请 |
| 视频生成 | 运行中 | hot-task 视频 + 封面，邮件发给用户手动发布 |

### 观察层（auto observe）

| 数据源 | 状态 | 内容 |
|--------|------|------|
| 星火任务报表 | 运行中 | 305 个任务的曝光/点击/达人/作品/结算 |
| 短视频挂载数据 | 已接入 | 2676 条视频，470 万播放，3761 次进入小程序 |
| 广告收入数据 | 已接入 | 7 天 13.22 元，nanrenbao eCPM 最高 28.64 |
| 流量数据 | 需申请 scope | 按渠道拆分的 DAU/PV |
| harness 运行日志 | 运行中 | 成功/失败率、错误原因 |

### 策略层（auto act）

| 能力 | 状态 | 说明 |
|------|------|------|
| 类目权重自动调整 | 运行中 | category-rebalancer 基于曝光+挂载数据重排 |
| Profile 配置外部化 | 已完成 | JSON 文件，auto 可直接修改 |
| 回归检测 | 运行中 | auto-monitor 对比前后表现 |
| 自动修复 | 受限 | auto-fix-agent 周限额 3 次 |

---

## 不可改变的约束（平台/外部）

| 约束 | 原因 |
|------|------|
| 星火计划任务只能在 APP 端关联视频 | 快手产品设计，无 API |
| 评论无 API | 开放平台不提供 |
| Cookie 认证会过期（~30 天） | daren 后台非官方 API |
| 流量数据需申请 scope.us.profile | 快手权限管控 |
| 小程序挂载需逐个申请批量挂载权限 | 快手权限管控 |
| GitHub Pages 单 repo 1GB 软限制 | GitHub 政策 |
| GitHub Pages 每次部署 10 分钟构建限制 | GitHub 政策 |
| 广告收入由平台和用户行为决定 | 无法直接控制 |

## 可改变的约束（自己设置的）

| 约束 | 当前状态 | 可以怎么改 |
|------|---------|-----------|
| 每个 app 一个目录在 repo 根目录 | 430+ 个目录，repo 不断膨胀 | 清理僵尸目录、归档旧 app、或改用子目录 |
| GitHub Pages 直接 serve repo 根目录 | 所有 app 永久占用 repo 空间 | 改用 gh-pages 分支、或 build 产物部署 |
| auto-fix 周限额 3 次 | 防止过度修改 | 可以调大 |
| 4 个目录分离（ydev/wdev/prod/auto） | 隔离开发和生产 | 架构选择，可简化但有风险 |
| auto 不直接改 prod | 通过 git push/pull 传播 | 可以让 auto SSH 直接改，但更危险 |
| harness push 不做 pull | 偶尔冲突失败 | 加 git pull --rebase 再 push |
| 视频手动发布 | 用户在 APP 操作 | 小程序挂载批准后可 API 发布+挂载 |
| 每个 profile 每天只生成 1 个 app | 控制产出频率 | 可以调多 |
| 69 个僵尸任务占配额 | 从未清理 | 可批量暂停（API 已验证） |
| 挂载数据 appSlug→category 映射率低 | 老应用没有 category 标签 | 补标签或让 harness 写入映射表 |

---

## 四个目录代号

| 代号 | 路径 | 用途 |
|------|------|------|
| ydev | `/Users/yliu5/github/LetMeTryAI` | Claude Code 开发 |
| wdev | `/Users/weiping/LetMeTryAI` | Kimi/Copilot CLI 开发 |
| prod | `/Users/weiping/prod/LetMeTryAI` | harness cron 生产 |
| auto | `/Users/weiping/newharness/LetMeTryAI` | auto 进化系统 |

## 四个 Profile

| Profile | 小程序 | 模板 |
|---------|--------|------|
| nanrenbao | 人人爱男人宝 | sport-blue |
| womanai | 人人爱女人宝 | coral-pink |
| parent-tools | 家长爱 | edu-blue |
| elder-love | 老人爱 | warm-gold |
