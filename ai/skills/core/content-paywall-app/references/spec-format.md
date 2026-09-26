# Spec 格式规范

本文件定义 `generate_paywall_app.py` 读取的站点配置（spec）JSON 结构与校验规则。

## 目录
- 必填字段
- 可选字段
- points 规则
- allowedDomains 说明
- 完整示例
- 验证规则

## 必填字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `appId` | string | 站点/应用标识（kebab-case），用于目录名、storage 前缀、表名与 URL |

## 可选字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `appName` | string | appId | 站点显示名（页面标题） |
| `category` | string | `""` | 内容分类 |
| `description` | string | `""` | 站点描述（metadata） |
| `apiBase` | string | `https://letmetry.cloud` | MySQL/API 服务地址 |
| `contentTable` | string | appId→snake + `_content` | 内容表名 |
| `allowAd` | boolean | true | 是否启用"看广告赚积分" |
| `allowedDomains` | array | 内置白名单 | URL 校验允许的图片域名 |
| `tags` | array | `[]` | 站点标签（metadata） |
| `points` | object | 见下 | 积分规则 |

## points 规则

```json
"points": {
  "newUser": 20,      // 新用户初始积分
  "dailyVisit": 10,   // 每日签到奖励
  "upload": 10,       // 上传奖励
  "view": 1,          // 查看单张内容消耗积分
  "freeDays": 3,      // 解锁后免费重看天数
  "adFull": 10,       // 完整观看广告奖励
  "adPartial": 3      // 部分观看广告奖励
}
```

## allowedDomains 说明

数组元素支持精确域名（如 `letmetry.cloud`）与通配后缀（如 `.myqcloud.com` 表示该域名及其任意子域）。默认白名单:

```json
[".bcebos.com", ".myqcloud.com", ".byteimg.com", ".qpic.cn", ".klingai.com", "letmetry.cloud"]
```

## 完整示例

```json
{
  "appId": "mens-zone",
  "appName": "先生乐园",
  "category": "娱乐",
  "description": "男性兴趣内容社区",
  "apiBase": "https://api.example.com",
  "allowAd": true,
  "allowedDomains": [".example-cdn.com", "api.example.com"],
  "tags": ["娱乐", "图片"],
  "points": {
    "newUser": 20, "dailyVisit": 10, "upload": 10,
    "view": 1, "freeDays": 3, "adFull": 10, "adPartial": 3
  }
}
```

## 验证规则

- `appId` 必须为非空字符串，缺失时脚本以非零退出码报错。
- `appId` 被归一化为 kebab-case 后用于输出目录名、storage 前缀及表名。
- 渲染完成后脚本校验文件中无未解析占位符，否则拒绝输出。
- 输出产物位于 `<outdir>/<appId>/`。