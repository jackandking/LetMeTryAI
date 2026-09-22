# 男人宝 · 提示词飞轮 (Prompt Flywheel)

把「提示词 → 用户生成 → 投稿 → 审核 → 站内浏览 → 提示词进化」串成一个自增强闭环。
内容方向（审美 / 风格 / 尺度）由**市场反馈与监管**共同决定，本仓库只提供机制与合规种子。

## 三段闭环

```
[① 提示词工作室 skill]                 [② 投稿 skill]                [③ 站内 + 审核]
portrait-prompt-studio  ──提示词──▶  用户生成图片  ──▶  nanrenbao-contribute
 (返回 DNA 化提示词)                  (改良提示词)    插入 review_status=pending
        ▲                                                     │
        │                              review-preview.html 展示占位/已上线
        │                                                     ▼
        └──── prompt_dna 列 + prompt-log.jsonl ── 站内浏览/翻转量回流加权 ── 进化提示词
```

## 目录

- `prompt-dna.schema.json` — 提示词 DNA 结构（subject/scene/lighting/.../prompt_text）
- `recorder.py` — 第①段记录器：存「源提示词 + 用户改良版 + DNA」到 `prompt-log.jsonl`
- `skills/portrait-prompt-studio/SKILL.md` — 免费 skill：返回高质感写真/艺术人像提示词（含红线）
- `skills/nanrenbao-contribute/SKILL.md` + `contribute.js` — 投稿 skill：插入待审行 + 返回预览链接
- `../review-preview.html` — 部署在 `nanrenbao/` 下，按 id 读投稿，审核前占位、通过后展示并深链

## 数据流（已落库字段）

`beauty_images` / `back_view_images` 均含：
`review_status`(pending/approved/rejected)、`source_type`(legacy/skill)、`submitted_at`、
`prompt_dna`(TEXT, 本次新增：存用户改良版提示词 JSON)、`click_count` / `view_count`(站内热度)。

投稿走后端 **`POST /mysql/insert`**——这两个表在白名单内，**公开即可插入且默认 pending**（P0 安全修复后，
`/mysql/query` 仅允许对白名单表只读 SELECT，`/mysql/insert` 对白名单表开放写）。无需 admin key。

## 端到端验证

```bash
# ② 投稿（返回预览链接）
node skills/nanrenbao-contribute/contribute.js \
  --image "https://eb118-file.cdn.bcebos.com/xxx.jpg" --table beauty \
  --source-id "studio-A" --dna '{"style":"电影感","lighting":"霓虹"}'
# → https://letmetry.cn/nanrenbao/review-preview.html?id=<id>&table=beauty

# ① 记录这次的提示词演化
python3 recorder.py --source-id "studio-A" --source-prompt "..." \
  --user-prompt "..." --dna '{"style":"电影感"}' --db-id <id> --table beauty

# ③ 打开预览链接：审核中显示占位；审核员在 admin 通过/驳回后，链接自动展示真实照片
#    并通过 #img-<id> 深链到画廊对应卡片（back-view-killer.html / appreciate.html 已加锚点）
```

## 内容红线（skill 与站点共守）

- 仅着衣、艺术化、非性化；标注 AI 生成。
- 不把「最大化性感 / 试探平台边界」作为优化目标；演化轴是**审美质量 + 风格多样度**。
- 后台审核拦截越线内容；监管变化优先于任何增长目标。

## 发布

两个 skill 经 SkillHub 团队后台（北京南路科技）发布为**免费 skill**：
先发 `portrait-prompt-studio` 引流，再发 `nanrenbao-contribute` 承接投稿转化。
