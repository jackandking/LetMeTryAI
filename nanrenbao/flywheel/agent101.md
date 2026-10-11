# 人保101 · 男人宝投稿飞轮自包含运行手册

> 把本文件**全文**发给一个零上下文的新 Agent，它即可端到端跑完一次飞轮：
> **动态拉取站内当前最热门图 → 提取/反推其提示词 → 出图 → 投稿画廊（待审核）→ 记录进化轨迹**。
> 你只需把这个文件在仓库里的链接丢给 Agent，无需再解释任何背景。

---

## 任务目标

运行一次「男人宝（nanrenbao）图片投稿飞轮」：以**当前站内最受欢迎的那张图**为锚点，生成一张同风格（或更优）的合规人像图，投稿到画廊（`beauty_images`，状态 `pending`），并把这次演化写入 `prompt-log.jsonl`。

这是内容供给飞轮的**一次迭代**，目的是持续给站内供给高质量、合规的人像图。不要做多张、不要做批量——**就跑一次**。

> ⚠️ **核心原则：不要写死任何提示词。** 每次跑都先去线上拉「当前最热门图」，用它的提示词（或反推出的提示词）作为种子。站内榜单是动态的，种子也必须动态。

---

## 硬性红线（不可逾越）

- **内容仅限「着衣 + 艺术化 + 非性化」**。禁止裸露、性暗示姿态、挑逗、色情/擦边。你从榜首图提取的提示词若含越线元素，**主动柔化到红线内**，不要原样照搬。
- 数据库 API `/mysql/query` **只允许只读 SELECT**；所有写操作一律走投稿脚本（脚本内部用 `/mysql/insert`）。**不要尝试 UPDATE 任何行**——后端会直接拒绝，且 legacy 行不参与进化聚合。
- 生成图**必须带「AI生成」水印**（见出图步骤的 `footnote`），这是平台合规要求。
- 新投稿是 `review_status=pending`，需**人工审核通过 + 产生浏览**后，才会进入进化聚合（`evolve.py`）。

---

## 审美基线（飞轮默认，必须应用，零上下文也生效）

> 这些偏好是 Yingjie 在多轮飞轮中确认的稳定审美，作为**所有女性角色生成的默认基线**。即使本地 skill 的 SKILL.md 被重置，本手册这条也照常生效——**务必应用**，不要生成端庄全覆盖写真。

- **body_type = 饱满曲线（amply curved, well-proportioned）**：所有女性 / 古装 / 内衣 / 神话女角，DNA `body_type` 默认填「饱满曲线」，prompt_text 写 `with a well-proportioned, amply curved feminine figure`。除非当次另指定。
- **风格默认 = 高透少覆盖（人体为主）**：不透明衣物遮盖体表超过约 1/3 即「不好看」；**2026-10-11 起用户要求「更透」，新图压到 opaque < 1/4**。默认优先高透薄纱 / 半透真丝，让纱透出肌肤轮廓而非遮挡。**人体必须是画面主体**：肩部、躯干、手臂、双腿以柔光裸肤呈现，衣物极小且策略性，**绝不用长裙 / 长袍 / 连衣裙 / gown / robe / full-coverage 这类会把人裹住的款式**（模型安全过滤常把它们渲染成"裹住全身"，喧宾夺主）。
- **⚠️ 命名角色必须 reinterpret 其 canonical 服饰，不得原样复刻**：当角色有标志性强设定服装（如 赵灵儿 的飘逸仙女白裙、王熙凤 的古典华服、小龙女 的素色长袍、林黛玉 的潇湘麻衣 / 披风），**绝不要原样生成那套全覆盖服装**——那正是"穿太多"的根源。改为用**极小覆盖 + 高透** reinterpret：仅保留角色识别特征（发色/发型、主色系、标志性配饰：赵灵儿 的铃铛/灵珠、王熙凤 的金步摇、小龙女 的白缎束发、林黛玉 的玉簪/竹影/落英），其余严格按本基线走 比基尼 / 肚兜 + 高透飘纱 + 人体为主。**基线（少覆盖 / 高透 / 人体为主）永远优先于 canonical 服装。**
- **🚫 服装构造禁词（每次必查，出现即覆盖）**：`drape（罩纱/披挂）、veil、shawl、wrap、cape、hanfu、kimono、robe、gown、dress、full-coverage、covered body、long skirt、flowing fabric covering body、sari、burqa、abaya、披风、长袍、罩衫`。**这些词哪怕加了"high-transparency / sheer"也会把人裹住**——之前林黛玉(2026-10-11) 就栽在 `hanfu-style drape` 上。构造服装只允许：`bikini / tiny dudou（小三角兜）+ 单条极薄飘纱 scarf at hip + 裸肤主体`。
- **📋 强制 wardrobe 模板（直接抄，替换 [ ] 即可，不得另起炉灶）**：
  - DNA `wardrobe` 字段固定写法：`minimal bikini/dudou + single sheer scarf at hip, body as subject, opaque < 1/4; NEVER drape/robe/gown/hanfu/veil`
  - prompt_text 服装段固定写法：`She wears a tiny minimal [dudou/bikini] set (small triangle top + small bottom) in [主色], plus a single extremely sheer [主色] scarf drifting loosely at the hip. The human figure is the unmistakable focal point: her shoulders, torso, arms and long legs are bare skin softly lit; the clothing is minimal and strategic, never a covering gown or robe or drape.`
- **最优款 = 古典肚兜**（王熙凤 id=602 用户赞"这个好"）；**最差款 = 全包紧身衣**（猫女 id=601 用户"不好看"）。贴身少覆盖（比基尼 / 肚兜 / 露脐 / 露腿 / 高透纱）始终优于全包。
- **内容红线（并行）**：仍须着衣 / 艺术化 / 非性化；负向词必含 `nudity, explicit, exposed nipples, genitalia, see-through revealing, arousal, vulgar, suggestive pose`。不可渲染色情或暴露生殖器 / 乳头。

## 环境准备

1. **拿到运行代码（二选一；推荐方案 B，最自包含）**
   - 方案 B（克隆仓库，一次拿到全部脚本，推荐）：
     ```bash
     git clone --depth 1 https://github.com/jackandking/LetMeTryAI.git
     # 用到：
     #   LetMeTryAI/nanrenbao/flywheel/skills/nanrenbao-contribute/contribute.cjs
     #   LetMeTryAI/nanrenbao/flywheel/recorder.py
     #   LetMeTryAI/nanrenbao/flywheel/prompt-dna.schema.json
     ```
   - 方案 A（用本机已装的 skill，获得完整运行指引）：
     > ⚠️ **不要重装 skill**。`portrait-prompt-studio` 的 SKILL.md 里已 bake 进上方「审美基线」。重新 `skillhub install` 会用 skillhub 上的**原版空基线包覆盖掉本地改动**，导致新 Agent 生成"端庄写真 = 穿太多"。**直接用本机已装的 `~/.workbuddy/skills/@letmetry/portrait-prompt-studio/`**；仅当它不存在时才装一次。
     ```bash
     ls ~/.workbuddy/skills/@letmetry/portrait-prompt-studio/SKILL.md || skillhub install @letmetry/portrait-prompt-studio --dir ~/.workbuddy/skills/
     ls ~/.workbuddy/skills/@letmetry/nanrenbao-contribute/contribute.cjs || skillhub install @letmetry/nanrenbao-contribute --dir ~/.workbuddy/skills/
     # 注意：skill 包只含 contribute.cjs，不含 recorder.py。
     # 还需单独取 recorder.py（任选其一）：
     #   ① 顺手浅克隆仓库： git clone --depth 1 https://github.com/jackandking/LetMeTryAI.git
     #   ② 或直接下载单文件：
     curl -s -o recorder.py https://raw.githubusercontent.com/jackandking/LetMeTryAI/main/nanrenbao/flywheel/recorder.py
     ```

2. **Node 18+**（投稿脚本用全局 `fetch`/`FormData`）。优先用本机托管运行时：
   ```bash
   NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
   ```
   若该路径不存在，用 PATH 里的 `node`，先 `node --version` 确认 ≥ 18。

3. **Python3**（recorder.py 用）。

---

## 步骤 0：动态拉取当前最热门图（飞轮种子来源）

**这是整个飞轮的关键——每次都先执行，不要跳过、不要写死。**

先取「当前最受欢迎、且本身带可用提示词」的图（按浏览量降序）：

```bash
curl -s -m 25 -X POST https://letmetry.cn/mysql/query \
  -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT id, image_url, view_count, review_status, source_type, prompt_dna FROM beauty_images WHERE review_status='\''approved'\'' AND prompt_dna IS NOT NULL ORDER BY view_count DESC LIMIT 1","params":[]}'
```

- **若返回一行** → 这就是「最热门且可学习」的冠军图，记下它的 `id` / `image_url` / `prompt_dna`。
- **若返回空**（还没有任何 skill 投稿累积过浏览，或带 DNA 的图都还没浏览量）→ 退回取「纯按浏览量最高的图」：
  ```bash
  curl -s -m 25 -X POST https://letmetry.cn/mysql/query \
    -H 'Content-Type: application/json' \
    -d '{"sql":"SELECT id, image_url, view_count, review_status, source_type, prompt_dna FROM beauty_images WHERE review_status='\''approved'\'' ORDER BY view_count DESC LIMIT 1","params":[]}'
  ```
  记下它的 `id` / `image_url` / `prompt_dna`（这条很可能是 legacy 老图，`prompt_dna` 为 `NULL`）。

---

## 步骤 1：得到种子提示词（DNA）

按步骤 0 的结果分两种情形：

### 情形 A：榜首图自带 `prompt_dna`（非空 JSON）
直接把它解析成 DNA 对象，提取其中的 `prompt_text` 作为种子提示词。
> 可选精修：你可以用它直接出图；也可以在不越红线、保留其「获胜属性」（如红衣/园林/姿态）的前提下，把光线、肤质、构图再推一档，得到「满分版」`prompt_text`。精修后请把完整 DNA（含新 `prompt_text`）存成 `dna.json`。

### 情形 B：榜首图 `prompt_dna` 为 NULL（legacy 老图，无存提示词）
**下载这张图，看它，反推提示词**——这正是飞轮「向成功样本学习」的本意：

1. 下载图片：
   ```bash
   curl -s -m 40 -o champion.jpg "<步骤0拿到的 image_url>"
   ```
2. 用你的视觉能力**看这张图**，识别：人物特征、服装（必须着衣）、场景、光线、姿态、构图、色调、镜头。
3. 加载 `portrait-prompt-studio` skill（若有）获取合规方法与 DNA 结构；按其红线把观察结果写成英文写真提示词，**主动柔化任何越线/擦边元素**，输出结构化 DNA（字段见下）并存入 `dna.json`，`prompt_text` 即种子。
4. 若未装 skill，也请自觉遵守红线：着衣、自然写真姿态、艺术化，禁止裸露/性暗示/挑逗。

### DNA 结构（写入 `dna.json`，供投稿脚本读取）
```json
{
  "subject": "人物特征",
  "scene": "场景",
  "lighting": "光线",
  "composition": "构图",
  "style": "风格",
  "mood": "情绪",
  "wardrobe": "服装（必须着衣；默认极小覆盖：比基尼/肚兜+单条高透飘纱，人体为主，opaque < 1/4；禁用 drape/veil/hanfu/robe/gown/dress/wrap/shawl/cape/长裙/长袍/披风）",
  "body_type": "饱满曲线",
  "coverage": "minimal — body as subject, opaque < 1/4 of body surface",
  "camera": "镜头/参数",
  "negative": "nudity, explicit, exposed nipples, genitalia, see-through revealing, arousal, vulgar, suggestive pose, heavy clothing, gown, dress, robe, full-coverage, covered body, bulky outfit, drape, veil, shawl, wrap, cape, hanfu, kimono, long skirt, flowing fabric covering body, sultry gaze, cleavage-focused, deformed hands, extra fingers, watermark, text, lowres, plastic skin, oversaturated",
  "prompt_text": "英文写真提示词（出图用）"
}
```

---

## 步骤 2：出图（ImageGen，约 5–10 credits）

调用你的 **ImageGen** 能力，参数如下（credits 由你的环境结算，单次约 5–10）：

- `prompt`：上面 `dna.json` 里的 `prompt_text`
- `size`：`1024x1536`（竖版，贴近站内图比例）
- `quality`：`high`
- `footnote`：`AI生成`（合规水印，≤16 字）
- 保存到工作目录，记下本地路径 `IMG`

---

## 步骤 3：投稿（上传 + 插入 pending 行）

```bash
$NODE contribute.cjs --image "$IMG" --table beauty \
  --source-id "flywheel-$(date +%Y%m%d)-001" \
  --dna-file ./dna.json
```

脚本会：上传图到 `letmetry.cn` → 插入 `beauty_images`（`review_status=pending`、`source_type=skill`、`prompt_dna`=文件内容）→ 打印 **预览链接** 和新行 **`id=XXX`**。记下这个 id，下文称 `DB_ID`。

（`contribute.cjs` 路径：方案 A 在 `~/.workbuddy/skills/@letmetry/nanrenbao-contribute/contribute.cjs`；方案 B 在克隆仓库的 `nanrenbao/flywheel/skills/nanrenbao-contribute/contribute.cjs`。）

---

## 步骤 4：取回自托管图 URL

```bash
curl -s -X POST https://letmetry.cn/mysql/query \
  -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT image_url FROM beauty_images WHERE id = <DB_ID>","params":[]}'
```

记下返回的 `image_url`，下文称 `IMG_URL`。

---

## 步骤 5：记录进化轨迹

```bash
PROMPT=$(python3 -c "import json;print(json.load(open('dna.json'))['prompt_text'])")
python3 recorder.py \
  --source-id "flywheel-$(date +%Y%m%d)-001" \
  --source-prompt "$PROMPT" \
  --user-prompt "$PROMPT" \
  --dna "$(cat dna.json)" \
  --image-url "<IMG_URL>" \
  --db-id <DB_ID> \
  --table beauty
```

（`recorder.py` 路径：方案 B 在克隆仓库的 `nanrenbao/flywheel/recorder.py`；方案 A 用第 1 步 curl 下来的 `./recorder.py` 即可。用绝对路径调用最稳妥。）

---

## 完成标准 / 汇报格式

跑完后请向用户汇报以下信息：

- **本次种子来源**：榜首图 `id=XXX`（情形 A 带 DNA / 情形 B 反推），`view_count=YYY`
- **预览链接**：`https://letmetryai.cn/nanrenbao/review-preview.html?id=<DB_ID>&table=beauty`
- **自托管图**：`<IMG_URL>`
- **DB 新行 id**：`<DB_ID>`（状态 `pending`，等待人工审核）
- **演化轨迹**：是否已写入 `prompt-log.jsonl`
- **使用的种子提示词**：附上 `dna.json` 里的 `prompt_text`

---

## 备注

- 飞轮的优化目标是**审美质量与风格多样度**，不是「越性感越好」。从榜首提取的种子，其「获胜属性」值得保留，但不要为了热度往性化方向改。
- 若用户要求换题材：保持 `wardrobe=着衣`、不越红线即可；其余 `scene/lighting/mood/style` 可自由发挥。换题材时同样先按步骤 0 拉榜首参考其风格基线。**但换题材仍须遵守上方「审美基线」（饱满曲线 + 高透少覆盖 + 人体为主），不要把角色生成成端庄全覆盖写真。**
- 数据库写入只能通过投稿脚本；任何直接 UPDATE/INSERT 的尝试都会失败。
- 极端兜底：若线上完全拉不到任何图（数据库为空/不可达），先向用户报告，可加载 `portrait-prompt-studio` 从零生成一条合规红衣园林写真提示词作为启动种子，再继续——但**正常情况永远走「动态拉榜首」这条主路**。
