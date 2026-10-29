# 数据模型参考：plc/photo/query（挂载明细）

接口：`GET https://open.kuaishou.com/openapi/mp/developer/plc/photo/query`
参数：`page_size=500&cursor=<next_cursor>&access_token=<token>&app_id=<app_id>`
鉴权：client_credentials 换 access_token（48h），仅需小程序基础权限，**不需要** scope.us.profile。
返回路径：`data.records.plcPhotoDetailList`；翻页看 `data.next_cursor`（'0' 或与上次相同即末页）。

## 字段语义（本 skill 用到的）

| 字段 | 含义 | 备注 |
|---|---|---|
| `photoId` | 视频在挂载系统的 ID | 解绑操作按它定位 |
| `uploadDt` | 上传日期 | **只有日期粒度，无时刻**；接口可能滞后 1-2 天 |
| `photoTitle` | 视频标题/文案 | 主题分类依据 |
| `plcMntPath` | 挂载路径 | 形如 `pages/rewardedWebview/rewardedWebview?target=nanrenbao/back-view-killer&showAd=true` |
| `authorName` | 达人昵称 | 可能为空 → `(未知)` |
| `accuDisplayFansUserNum` | 达人粉丝数 | |
| `displayPlayCnt` | 视频播放量 | 与 plcShowCnt 在当前数据中恒等 |
| `plcShowCnt` | 挂载曝光 | = 播放量（曝光组件随播放触发） |
| `plcClickCnt` | 挂载点击 | |
| `plcClickEnterCnt` | 点击后进入小程序 | 核心转化指标 |
| `submitOrderNum` / `payOrderNum` / `payOrderAmt` | 提交/支付订单 | 当前男人宝无支付设计，长期为 0 |
| `displayLikeCnt` / `displayCommentCnt` / `shareSuccessCnt` / `completePlayRatio` | 赞/评/转/完播率 | 参考 |

## 挂载目标（页面）解析规则

```
plcMntPath = pages/rewardedWebview/rewardedWebview?target=<TARGET>&showAd=true
```

1. 有 `target=` → 取 `target=([^&]+)`，如 `nanrenbao/beauty-scratch?id=636`
2. 无 `target=` → 取 `pages/([^/?]+)`，如 `pages/index/index` → `index`
3. 归并基础页：`split('?')[0]`（`beauty-scratch?id=636` → `beauty-scratch`），原值入「细分」

已知页面（target 清单，截至 2026-10-18）：

| 基础页 | 产品线 |
|---|---|
| `nanrenbao/beauty-scratch` | 美人刮刮乐（含 ?id=N 指定写真） |
| `nanrenbao/back-view-killer` | 背影杀 |
| `nanrenbao/top10` | Top10 榜单 |
| `index` | 小程序首页 |
| `spring-tea-health` | 养生茶 |
| `hidden-high-calorie-foods` | 高热量食物 |
| `emperor` | 皇帝/宫廷 |
| `stealth-fighter-faceoff` / `surface-warship-duel` | 军事 |
| `cr7-new-look-score` / `cristiano-ronaldo-new-look-score` | C罗 |
| `shaokao-tan-bidian` | 烧烤 |
| `robot-dogs` | 机器狗 |

## 口径坑（踩过的）

1. **photoCount ≠ 挂载视频数**：任务接口的 photoCount 只统计「接单作品」；广告分成模式下不接单也能挂载。判断任务有没有流量必须看 plc/photo/query，不能看 photoCount。
2. **接口只返回当前在挂载的视频**：自然到期/被解绑的视频会消失，跨时间对比要用历次快照。
3. **「新达人」是快照口径**：基于当前在挂载集合判首次出现；老达人视频掉挂载后重现会被误判为新，汇报时需注明。
4. **曝光 = 播放**：`plcShowCnt` 与 `displayPlayCnt` 恒等，CTR 与进/播不要重复解读。
