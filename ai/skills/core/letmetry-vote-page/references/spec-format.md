# Spec 格式规范

本文件定义 `generate_vote_page.py` 读取的话题规格（spec）JSON 结构与校验规则。

## 目录
- 必填字段
- 可选字段
- 完整示例
- 验证规则
- 主题色说明

## 必填字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 页面 HTML `<title>` 与 h1 标题 |
| `question` | string | 投票问题文本，显示在选项上方 |
| `options` | array | 至少 1 个选项对象，每个必须含 `label` |

## 可选字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `appId` | string | 由 title 派生 | 目录名、URL、input name、storageKey 来源 |
| `name` | string | title | metadata 中的展示名 |
| `description` | string | 自动生成 | metadata 描述 |
| `category` | string | `""` | 决定主题色（科技/美妆/时尚/娱乐/美食/体育/生活） |
| `tags` | array | `[]` | metadata 标签 |
| `featured` | boolean | false | 是否在首页推荐 |
| `inputName` | string | appId | 单选 radio 的 name 属性 |
| `eventEndpoint` | string | letmetry.cloud 默认 | 事件上报接口地址 |
| `baiduHmId` | string | 默认 id | 百度统计 HM id（留空不填则用默认） |
| `resultBtnText` | string | "查看实时票选结果" | 查看按钮文案 |
| `resultHeading` | string | "标题+投票结果" | 结果标题 |
| `resultSubtitle` | string | 自动 | 结果副标题 |
| `adLoadingText` | string | 自动 | 广告 loading 文案 |

### options 元素字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `label` | string | 必填 | 选项文案（卡片标题） |
| `value` | string | label 归一化 | 选项 id，用于图片文件名与 JS value |
| `svgText` | string | label 前 6 字 | SVG 图中的文字 |
| `grad1` | string | 主题主色 | SVG 渐变起始色 |
| `grad2` | string | 主题深色 | SVG 渐变结束色 |

## 完整示例

```json
{
  "appId": "spring-lipstick",
  "title": "春季口红新色大PK",
  "question": "面对今春各大品牌的新色，你最想为哪一款买单？",
  "name": "春季显白色号大战",
  "description": "春季口红新色投票，看看哪款最种草。",
  "category": "美妆",
  "tags": ["口红", "显白", "种草"],
  "options": [
    { "value": "milk-tea", "label": "奶茶裸调", "svgText": "奶茶裸调" },
    { "value": "rose", "label": "玫瑰豆沙", "svgText": "玫瑰豆沙" },
    { "value": "ruby", "label": "复古红莓", "svgText": "复古红莓" }
  ]
}
```

## 验证规则

- `title`、`question` 必须为非空字符串。
- `options` 必须为非空数组；每项必须是含非空 `label` 的对象。
- 任一规则不满足，脚本会以非零退出码输出 `{"status":"error","message":...}`。
- `appId` 未提供时由 `title` 归一化为 kebab-case；`value` 同理归一化为 kebab-case。
- 图片文件名均从归一化后的 `value` 得到 `images/<value>.svg`。

## 主题色说明

`category` 命中内置调色板时应用对应主题色，否则使用默认蓝。命中逻辑为子串匹配，例如 `娱乐`、`文娱` 均命中 `娱乐` 调色板。