---
name: nanrenbao-contribute
description: 把用户生成的人像图片投稿到男人宝画廊，自动插入 beauty/back_view 待审行(review_status=pending)并返回预览链接，审核通过后深链展示站内真实效果；当需要向男人宝投稿 AI 人像图、获取图片审核与预览链接或登记生成提示词时使用
dependency:
  system:
    - node
---

# 男人宝·图片投稿 Skill

把用户生成的人像图投稿到男人宝站点画廊（beauty_images / back_view_images），走**审核中 → 已上线**的流程，并返回一张**预先准备好的预览链接**，让用户立刻看到「我投的图会去哪」。

## 工作流

1. 用户提供：图片（URL 或本地文件路径）、投稿类型（beauty 单图 / backview 背影杀需 背+正 两张）、以及生成时用的改良版提示词 DNA。
2. 校验：URL 必须 https；本地文件先走 `/image/upload` 拿到公开 URL。
3. 入库：调用后端 `POST https://letmetry.cn/mysql/insert`（后端 API 域名，脚本中以 `API_BASE` 定义；前端站点为 `${SITE_BASE}=https://letmetryai.cn`），插入待审行：
   - `beauty_images`: `{ image_url, review_status:"pending", source_type:"skill", submitted_at: <now>, prompt_dna:<json> }`
   - `back_view_images`: `{ back_image_url, front_image_url, review_status:"pending", source_type:"skill", submitted_at:<now>, prompt_dna:<json> }`
   - 这两个表在后端白名单内，**公开即可插入，无需 admin key**（见后端 P0 安全修复）。
4. 返回预览链接：
   `https://letmetryai.cn/nanrenbao/review-preview.html?id=<insertId>&table=<beauty|back_view>`
5. 文案（给用户）：「已提交审核，通常 1–2 个工作日内完成。审核通过前此链接显示占位；通过后即可看到你的照片在站内的真实效果，并可一键跳到画廊中它的位置。」

## 执行脚本

本 skill 附带 `scripts/contribute.cjs`（Node 18+，CommonJS，用全局 fetch/FormData）：

```bash
node scripts/contribute.cjs \
  --image /path/to/photo.jpg \
  --table beauty \
  --source-id "studio-A" \
  --dna '{"style":"电影感","lighting":"霓虹"}'

# 或传 URL：
node scripts/contribute.cjs --image "https://.../p.jpg" --table beauty --dna '{...}'

# 背影杀（需背+正两张）：
node scripts/contribute.cjs --table backview --back <backUrl> --front <frontUrl> --dna '{...}'
```

脚本会打印预览链接。投稿后请顺手运行 `../recorder.py` 把这次的 (source_id, 源提示词, 改良提示词, db_id) 记到 `prompt-log.jsonl`。

## 资源索引
- 脚本:见 [scripts/contribute.cjs](scripts/contribute.cjs)(用途与参数:`node scripts/contribute.cjs --image <url|本地路径> --table beauty|backview [--back <url> --front <url>] [--source-id <id>] [--dna <json>|--dna-file <file>]`；校验并入库待审行，stdout 输出预览链接)。

## 合规与红线
- 仅接收**着衣、艺术化、非性化**内容；后台审核会拦截越线内容。
- 投稿即视为同意 AI 生成内容标识与站点社区准则。
- 预览链接在审核前仅显示占位与「未来可访问地址」，不暴露未审内容。
