# AI Skills — core 母版

本目录存放 LetmetryAI 对外发布 Skill 的**母版**（唯一事实源）。

- 每个子目录是一个完整 Skill（含 `SKILL.md`、`scripts/`、`assets/`、`references/`）。
- 所有平台的发布版本（SkillHub / 虾评 / 扣子等）均从本母版派生，在父目录 `skills/<平台>/` 存放派生副本。
- 改动统一在此处进行，然后 `node ai/build.js build --skill <name>` 生成 `.skill` 制品。

## 已收录

| Skill | 说明 |
|---|---|
| `nanrenbao-contribute/` | 男人宝·图片投稿（beauty / back_view 待审行 + 预览链接） |
| `portrait-prompt-studio/` | 美女写真·艺术人像提示词工作室 |
| `letmetry-vote-page/` | 投票话题页生成器（LetMeTryAI 核心模式） |
| `content-paywall-app/` | 内容付费变现小程序生成器（男人宝式） |