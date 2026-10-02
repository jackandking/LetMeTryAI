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
- `skills/nanrenbao-contribute/SKILL.md` + `contribute.cjs` — 投稿 skill：插入待审行 + 返回预览链接
- `../review-preview.html` — 部署在 `nanrenbao/` 下，按 id 读投稿，审核前占位、通过后展示并深链

## 数据流（已落库字段）

两表共有：`review_status`(pending/approved/rejected)、`source_type`(legacy/skill)、`submitted_at`、
`prompt_dna`(TEXT，存用户改良版提示词 JSON)。
互动量列名不同：`beauty_images` 用 `view_count`（花积分解锁次数，见 points-system.js），`back_view_images` 用 `click_count`（点击次数，见 back-view-killer.html）；evolve.py 按表用对列名聚合，避免误以为双表同列。

投稿走后端 **`POST /mysql/insert`**——这两个表在白名单内，**公开即可插入且默认 pending**（P0 安全修复后，
`/mysql/query` 仅允许对白名单表只读 SELECT，`/mysql/insert` 对白名单表开放写）。无需 admin key。

## 端到端验证

```bash
# ② 投稿（返回预览链接）
node skills/nanrenbao-contribute/contribute.cjs \
  --image "https://eb118-file.cdn.bcebos.com/xxx.jpg" --table beauty \
  --source-id "studio-A" --dna '{"style":"电影感","lighting":"霓虹"}'
# → https://letmetry.cn/nanrenbao/review-preview.html?id=<id>&table=beauty

# ① 记录这次的提示词演化
python3 recorder.py --source-id "studio-A" --source-prompt "..." \
  --user-prompt "..." --dna '{"style":"电影感"}' --db-id <id> --table beauty

# ③ 打开预览链接：审核中显示占位；审核员在 admin 通过/驳回后，链接自动展示真实照片
#    并通过 #img-<id> 深链到画廊对应卡片（back-view-killer.html / appreciate.html 已加锚点）
```

## 进化：evolve.py 与 seeds.json 自动部署

`evolve.py` 是飞轮的「反馈大脑」：拉线上 `approved` 且互动量 > 0 的 `skill` 投稿，按 6 个 DNA 维度聚合浏览/点击量，产出胜出维度与冠军种子，写进 `seeds.json`（单一真相源，部署在 `letmetryai.cn/nanrenbao/seeds.json`，GitHub Pages 静态文件）。

`portrait-prompt-studio` 运行时 `fetch` 该 URL 取最新种子，取不到/为空则回退内置兜底（A/B/C/D）。这样进化只动 `seeds.json`，skill 包本身**无需重发**。

消除「每次进化要手动部署」的摩擦——用 `--auto-push`：

```bash
python3 evolve.py --out ../seeds.json --auto-push
```

- 仅当 `champion_seeds` 相对上次提交**发生变化**时才 `git add + commit + push` 到 `main`，触发 GH Pages 重建（约 80s 后生效）；无变化则跳过，不会无谓推送。
- 当前（2026-10-02）所有 skill 投稿互动量仍为 0 → 无 champion 信号，evolve 产出空 champion + 内置兜底，属「架好待命」态。等用户真实解锁/点击 skill 图产生信号后，进化自动顶上。
- 推荐用定时任务（每日或每周）跑一次；GitHub SSH key 在本机（`~/.ssh/id_rsa`），推送无需口令。

## 内容红线（skill 与站点共守）

- 仅着衣、艺术化、非性化；标注 AI 生成。
- 不把「最大化性感 / 试探平台边界」作为优化目标；演化轴是**审美质量 + 风格多样度**。
- 后台审核拦截越线内容；监管变化优先于任何增长目标。

## 发布

两个 skill 经 SkillHub 团队后台（北京南路科技）发布为**免费 skill**：
先发 `portrait-prompt-studio` 引流，再发 `nanrenbao-contribute` 承接投稿转化。
