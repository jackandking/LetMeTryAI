# 快手 API 参考（2026-04-25 更新）

本文档汇总目前已打通和已发现的所有快手 API 能力，供开发参考。

---

## 1. 开放平台 OAuth

- **平台**: open.kuaishou.com
- **网页应用**: 试试看（App ID: `ks683421244533878879`）
- **Token 存储**: `letmetry.cloud:/root/letmetry_web_service/kuaishou_token.json`
- **access_token**: 48 小时有效
- **refresh_token**: 180 天有效（约到 2026-10 过期）

### Token 管理接口（部署在 letmetry.cloud）

| 接口 | 说明 |
|------|------|
| `GET https://letmetry.cloud/oauth/kuaishou/token` | 查看当前 token |
| `GET https://letmetry.cloud/oauth/kuaishou/refresh` | 刷新 token |

> 注意：letmetry.cloud 只能从 192.168.1.6（wdev/prod/auto 所在机器）访问，ydev 无法直连。

---

## 2. 开放平台 API（已验证）

Base URL: `https://open.kuaishou.com`

### 视频查询

| API | 方法 | 路径 | 参数 |
|-----|------|------|------|
| 查询视频列表 | GET | `/openapi/photo/list` | access_token, app_id, count, cursor |
| 查询单一视频 | GET | `/openapi/photo/info` | access_token, app_id, photo_id |
| 查询视频数量 | GET | `/openapi/photo/count` | access_token, app_id |

返回字段（视频列表）：photo_id, caption, cover, play_url, create_time, like_count, comment_count, view_count, pending

### 视频发布（3 步流程，已验证 2026-04-25）

1. **发起上传**: `POST /openapi/photo/start_upload?access_token=&app_id=` → 返回 upload_token + endpoint
2. **上传视频**: `POST http://{endpoint}/api/upload?upload_token=` — body 为视频二进制（<10MB 直传，否则分片）
3. **发布视频**: `POST /openapi/photo/publish?access_token=&app_id=&upload_token=` — multipart/form-data: cover(封面图) + caption(标题文案)

测试脚本：`.harness/scripts/test-kuaishou-video-publish.js`
测试视频 photo_id: `3xcezrvdb75jv52`

### 小程序挂载（待批准）

`POST /openapi/photo/mp_plc/bind`
- Content-Type: `x-www-form-urlencoded`
- 参数: access_token, app_id, photo_id, plc_mp_app_id, plc_title, plc_mp_path
- 发布后需等约 1 分钟再调用（发布是异步的）
- 文档: https://open.kuaishou.com/docs/develop/functionAccessGuide/apivideomount.html

**当前状态**: 已为"老人爱"小程序发起批量挂载关联"试试看"的申请，等待平台批准。
批准后 10001008 错误应消失。每个小程序都要单独申请。

---

## 3. 小程序 App ID 列表

| 小程序 | App ID |
|--------|--------|
| 老人爱 | `ks696932044951748651` |
| 家长爱 | `ks703405968097659757` |
| 男人宝 | `ks689613695629865000` |
| 人人爱男人宝 | `ks655273748878573030` |
| 人人爱女人宝 | `ks716072343099672366` |
| 让孩子爱上博物馆 | `ks667658647789007096` |
| 旅游宝 | `ks658088497935323570` |

---

## 4. 无法自动化的能力

### 星火计划任务关联
- 只能在快手 APP 发布视频时操作
- 路径：作者服务 → 小程序 → 参与关联任务 → 搜索任务名 → 参与任务
- 发布后无法补挂星火计划任务
- "只上传不发布"方案不可行：上传后视频不会进入 APP 草稿箱

### 自动回复评论
- 开放平台未提供评论 API（无法读取或回复评论）
- WebHook 回调只支持：关注/取关事件，不包含评论事件

---

## 5. 小程序服务端 API（待接入）

这些 API 来自快手小程序开发者平台，可能需要小程序自己的 AppSecret（非开放平台 OAuth）。

### 高价值（优先接入 auto observe）

| API | 说明 | auto 用途 |
|-----|------|-----------|
| 获取短视频挂载数据 | 挂载了小程序的视频的播放/点击数据 | 衡量视频→小程序转化率，指导视频内容策略 |
| 获取广告数据 | 小程序广告收入/展示/点击数据 | 收入是最终目标指标，指导广告位优化 |
| 获取流量数据 | 小程序访问量/用户数/页面 PV 等 | 衡量小程序整体健康度和趋势 |

### 中等价值

| API | 说明 |
|-----|------|
| 数据分析 | 综合数据报告（可能与上面三个有重叠） |
| 小程序码 | 生成小程序二维码（可嵌入视频封面） |
| 内容安全 | 文本/图片审核（发布前校验） |

### 低优先级

| API | 说明 |
|-----|------|
| 达人开放平台 | 达人相关接口（暂不涉及） |
| 订阅消息 | 模板消息推送（可用于召回用户） |
| 支付 | 小程序内支付（投票类不适用） |

---

## 6. 创作者平台 API（非官方，Cookie 认证）

Base URL: `https://daren.kuaishou.com`

这些是通过抓包发现的创作者平台内部 API，需要浏览器 Cookie 认证，不够稳定。

| API | 路径 | 说明 |
|-----|------|------|
| 创建星火任务 | `POST /rest/pc/creator/marketing/distribution/create` | 创建星火计划分发任务 |
| 极限词校验 | `POST /rest/pc/creator/marketing/common/textCheck` | 检查任务名是否含违禁词 |
| 资源检查 | `POST /rest/pc/creator/marketing/distribution/resource/checkResource` | 检查可用资源 |
| AI 封面 | `GET /rest/node/ai/img` | 生成 AI 封面图 |
| AI 审核 | `GET /rest/node/ai/review` | AI 审核内容 |
| 任务详情 | `POST /rest/pc/creator/marketing/distribution/detail` | 查询任务详情 |

违禁词：最, 第一, 唯一, 极致, 绝对, 顶级, 史上, 全网
工具函数：`.harness/scripts/publish-kuaishou-task-utils.js` 的 `validateTaskName()`

---

## 7. 当前架构与待办

### 当前方案
- harness 生成视频 → 邮件通知用户（含视频 + 文案 + 任务名）
- 用户在快手 APP 手动发布并关联星火计划任务
- 开放平台 API 用于查询视频数据（播放量、点赞等）
- 待批准后：可 API 发布视频 + 自动挂载小程序（星火关联仍需手动）

### 待办
1. 加 cron 定期刷新 access_token（每 ~40 小时）
2. 视频播放/点赞数据接入 auto observe
3. 接入小程序服务端 API（短视频挂载数据、广告数据、流量数据）
4. 小程序挂载批准后测试 mp_plc/bind
5. 其他小程序也申请批量挂载关联"试试看"
