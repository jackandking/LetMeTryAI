---
name: content-paywall-app
description: 依据站点配置一键生成完整的内容付费变现小程序，包含积分经济、付费解锁、看广告赚积分、上传校验与管理后台等整套实现；当用户需要仿"男人宝"搭建可收费图片内容社区、实现内容付费墙或构建积分激励变现应用时使用
---

# 内容付费变现小程序生成器

## 任务目标
- 本 Skill 用于:将一个站点配置 spec 转化为一套完整、可部署的内容付费变现小程序（仿 LetMeTryAI 男人宝模式）。
- 能力包含:生成 4 个页面（主页/欣赏/上传/管理后台）、积分系统（签到/上传/看广告赚积分/付费解锁）、URL 安全校验、数据库 schema 与 metadata。
- 触发条件:用户希望搭建"内容付费解锁"或"积分激励"内容社区；需要把图片内容变现；或要复刻男人宝式小程序。

## 前置准备
- 运行环境:Python 3.6+（仅标准库，无第三方依赖）。
- 输入准备:按 [references/spec-format.md](references/spec-format.md) 编写 spec JSON（`appId` 必填）。
- 产物依赖一个 MySQL 兼容 API（默认 `apiBase + /mysql/query`），页面运行时经该接口读写内容表；`allowAd` 开启时若需真实广告需接入激励视频 SDK（脚本默认提供模拟回调）。

## 操作步骤
- 标准流程:
  1. 确认站点需求 — 应用名、分类、内容表、图片域名白名单、积分规则（含解锁消耗与免费天数）。
  2. 编写 spec JSON — 字段与示例见参考文档；智能体可依据描述生成。
  3. 调用脚本生成 — `python scripts/generate_paywall_app.py --spec spec.json --outdir ./`
     - 成功输出 `{"status":"success","appId":...,"files":[...],"metadata":{...}}`；失败返回 `{"status":"error","message":...}` 且退出码非零。
  4. 部署前准备 — 在 MySQL 中执行 `database-schema.sql` 建表；将目录部署到站点根目录下。
  5. 可选上线 — 将 `metadata.json` 登记到站点目录索引并推送部署。
- 可选分支:
  - 当关闭广告:spec 设 `allowAd: false`，欣赏页改为免费直接查看大图。
  - 当定制图片来源:在 `allowedDomains` 配置自己的 CDN 域名白名单。
  - 当调整积分:在 `points` 中设置新用户/签到/上传/解锁/广告各档数值与免费天数。

## 使用示例
- 示例1（男性兴趣内容社区）:
  - 场景/输入:用户要仿男人宝搭建"先生乐园"，提供图片，付费解锁查看。
  - 预期产出:`<outdir>/mens-zone/` 下完整可部署站点（含付费解锁与积分经济）。
  - 关键要点:`appId` 必填；建议在 `allowedDomains` 配置自身图片 CDN，否则受默认白名单限制。
- 示例2（关闭广告、纯订阅解锁的内容站）:
  - 场景/输入:一个不需要广告、仅靠积分解锁的内容平台。
  - 预期产出:欣赏页直接预览大图、管理后台可批量上传的站点。
  - 关键要点:设 `allowAd:false` 并调整 `points.view/freeDays` 控制解锁策略。
- 示例3（为已有 MySQL 接入）:
  - 场景/输入:已有内容表与 API 服务，只需生成前端。
  - 预期产出:前端目录直接指向既有表与接口。
  - 关键要点:显式配置 `apiBase` 与 `contentTable`，避免默认值。

## 资源索引
- 脚本:见 [scripts/generate_paywall_app.py](scripts/generate_paywall_app.py)(用途与参数:`--spec <file>` 必填、`--outdir <dir>` 默认 `.`；渲染完整内容付费小程序站点)。
- 参考:见 [references/spec-format.md](references/spec-format.md)(何时读取:编写或校验 spec 输入时，含全部字段、积分规则、域名白名单与示例)。
- 资产:见 [assets/templates/](assets/templates/)(何时读取:脚本渲染 4 页面 + 积分/校验/配置 JS + 样式 + schema + metadata 模板，消费方无需手动引用)。

## 注意事项
- 脚本是独立命令行工具，动态变化字段（appName/apiBase/积分规则/域名白名单等）都应通过 spec 传入，不要改动模板。
- 页面运行时调用 MySQL API 与（可选）广告 SDK 属于产物行为，真实接入需替换 `config.js` 中地址与 `watchAd` 中的激励回调。
- 生成后确认 `url-validator.js` 白名单含自身图源，否则上传会被拒绝；确认 `database-schema.sql` 与 `config.js` 中表名一致。
- 充分利用智能体能力:站点定位、内容运营、积分策略设计、域名白名单整理由智能体负责，脚本只做确定性站点渲染。