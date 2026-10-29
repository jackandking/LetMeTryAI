---
name: nanrenbao-flywheel
description: 跑大飞轮——男人宝写真投稿完整闭环（选人 → 出图 → 投稿 → 自动审批 → 可选发快手）。封装经过验证的命名 IP 约定、subject 格式、合规自检、API 自动审批（密钥从 Vault 取）与快手发布注意事项，避免每次重头回忆。
read_when:
  - 用户说"跑大飞轮" / "发一张写真" / "投稿男人宝" / "发快手任务"
  - 需要生成男人宝画廊美图并走完整发布闭环
  - 涉及 nanrenbao 写真飞轮的选人 / 出图 / 投稿 / 审批 / 发快手任一段
---

# 跑大飞轮（nanrenbao 写真投稿闭环）

一条龙：选人 → 写 DNA → 出图 → 投稿男人宝画廊 → **自动审批通过** → （可选）发布快手星火单图任务。
本 skill 是「记忆体」，把飞轮跑顺后沉淀的硬规矩固化下来，照着做就不会踩坑。

## 0. 铁律（先读，最重要）

1. **面向快手的轮次必须选「命名 IP 角色」，别选原创。**
   - 快手任务名 = 从 `prompt_dna.subject` 自动解析，格式要求「人物（作品）reinterpret，非真人仿冒」→ 拼成 `美女+作品(IP)+人物+id`（例：`美女神雕侠侣小龙女622`）。
   - 原创 subject（无 IP）→ 解析退化成 `美女写真<id>`，**太泛、不吸引人**（Yingjie 明确反对）。所以务必选命名 IP。
   - **优先「仙/雅极端」**：聂小倩（倩女幽魂）、小龙女（神雕侠侣）、女儿国（西游记）——既命中站内胜出规律，名字又能精准锁武侠/仙侠粉丝群。
   - 都市/现代原创类目（唐晶/安迪型）只适合做画廊**多样性补位**，不适合做快手任务名（无名可解析、无粉丝锚点）。
2. **合规自检（出图后、投稿前必做）**：着衣、无露点、姿态知性非性化、右下角「AI生成」水印、原创虚构脸 + 负向词排斥撞脸（non-real-person）。任何一项不达标就重出，绝不带病投稿。
3. **自动审批是纯 API Call，不走网页模拟**：`POST https://letmetry.cn/api/nanrenbao/admin/review`，header `x-admin-key`，body `{table, id, action:'approve'}`。密钥从 Vault 取（见 §4）。
4. **快手发布是外部不可逆动作**：先 `--dry-run` 看清单再执行；登录态失效需手动登 `daren.kuaishou.com` 一次。
5. **ImageGen 严禁并行出图（2026-10-24 batch27 实证升级，已踩 4+ 批：22/23/24/27）**：并行调用时 `output_dir` 参数被忽略（指定 4 个不同目录，产物全落默认目录）、按秒级时间戳自动命名会撞名（一张覆盖另一张，**被覆盖者无声无息消失**）、偶发 server error。**唯一对策：严格串行单发**——「文件名带前缀」「指定 output_dir」在并行下全部无效，工具不读这些参数。串行纪律：每张生成后 **Read 图片按内容核实角色**（靠 signature motif 辨认，如杏仙靠「石案诗笺」）→ 确认无误立即 `mv` 到 `r<id>-<name>.png` → 再发下一张。批次跑见 §9。
6. **批量跑前先看 §9 脚手架**：每批从零手搓 gen/run/publish 三件套已重复 4+ 轮，模板在 §9，直接用。

## 1. 选人（数据驱动，不拍脑袋）

```bash
python3 ~/.workbuddy/skills/portrait-character-selector/scripts/select_character.py --top 5
```
- 扫 `~/LetMeTryAI/nanrenbao/flywheel/prompt-log.jsonl` 的胜出规律，输出候选榜。
- 选**命名 IP**、且**尚未跑过**、优先**仙/雅极端**。避开已跑过的轮次（会内卷）。
- 把选定角色记进 DNA 的 `subject` 字段（见 §2 格式）。

## 2. 写 DNA

- 模板/基线锁死表参考：`~/LetMeTryAI/nanrenbao/flywheel/prompt-dna.schema.json`。
- **subject 字段必须写成**：`人物（作品）reinterpret，非真人仿冒`
  - 例：`唐晶（我的前半生）reinterpret，非真人仿冒` → 快手名解析为 `美女我的前半生唐晶<id>`（具体、锁人群）。
  - 例：`小龙女（神雕侠侣）reinterpret，非真人仿冒` → `美女神雕侠侣小龙女<id>`。
- 体型基线（站内胜出）：饱满曲线、D 罩杯级、高透极小遮蔽（opaque<1/4）、超写实电影感、冷调柔光。
- **coverage_pct 字段（2026-10-20 门禁规则）必写**：遮蔽度估算 0-100。欣赏美女页对未激活「后宫」用户隐藏 <50 的图（快手落地页/刮刮乐不过滤）。基线值：dudou+高透=20 / 比基尼=40 / 旗袍长裙=85 / 全遮蔽仙裙宫装=95。contribute.cjs 会自动带上；不写则按 wardrobe 关键词兜底估算。
- 写文件：`~/LetMeTryAI/nanrenbao/flywheel/dna-<id>-<name>.json`，其中 `id` 用你计划的逻辑序号（投稿后会拿到真实 mysql id，两者不同，注意区分）。

## 3. 出图

用 **ImageGen** 工具（肖像比例 `1024x1536`，`quality: high`，`style: cinematic fashion editorial`，`footnote: AI生成`）。
- prompt 要点：虚构脸声明（"entirely original, fictional face that does NOT resemble any real actress/celebrity"）、具体场景/姿态、dudou/高透纱着衣、电影感光影、负向词排斥撞脸。
- 出图后**先 Read 图片自检合规**（§0.2），通过再投稿。

## 4. 投稿 + 自动审批（一条龙）

```bash
/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node \
  ~/LetMeTryAI/nanrenbao/flywheel/flywheel.cjs \
  --image "/绝对路径/到/出图.png" \
  --table beauty \
  --source-id "portrait-prompt-studio-<角色>-<逻辑id>" \
  --dna-file "/绝对路径/dna-<id>-<name>.json" \
  --source-prompt "一句话：角色 + 基线要点 + 合规声明" \
  --user-prompt "$(python3 -c "import json;print(json.load(open('/绝对路径/dna-<id>-<name>.json'))['prompt_text'])")"
```
- `flywheel.cjs` 会：① spawn `contribute.cjs` 投稿（拿到 mysql id + imageUrl）→ ② spawn `recorder.py` 回填 db_id/image_url（进化闭环）→ ③ **自动审批**：若持有管理密钥，调 review 端点把行置 `approved`。
- 无密钥时安全降级为 pending（仅告警，不阻断）。
- 想跳过自动审批（仍走人工）：加 `--no-approve`。

### 自动审批密钥来源（按序，绝不明文落仓库）
1. 环境变量 `NANRENBAO_ADMIN_KEY`
2. 文件 `NANRENBAO_ADMIN_KEY_FILE` → 默认 `~/.automation/.local/auth/nanrenbao_admin_key`
3. **统一密钥库 Vault**：slug = `nrb_admin_key`，token 取 env `VAULT_AGENT_TOKEN` → 缺省自动读 `~/.automation/.local/auth/vault_agent_token`

### Vault 取密钥（已接入，全自动）
- **真相（2026-10-16 核实）**：admin.html 后台让用户输的 64 位密钥（存 localStorage 键 `nrb_admin_key`）**就是服务器 `.env` 的全局 admin 主密钥 `KV_ADMIN_KEY`**。后端 `nanrenbaoAdminApi.js` 的 `adminGuard` 比对的就是 `process.env.KV_ADMIN_KEY`——**这不是一把可随意生成的专用钥匙**，必须用真值（从 lws `.env` 取），否则永远 401。
- **已就绪**：`nrb_admin_key` 已用真实 `KV_ADMIN_KEY` 值存入 Vault（slug=`nrb_admin_key`）。Agent `nanrenbao-flywheel`（registration_id=46）已注册并由 Owner 直接批准，scope=`['nrb_admin_key']`；其 token 已落 `~/.automation/.local/auth/vault_agent_token`（chmod 600，不进仓库）。
- **`flywheel.cjs` 自动取用**：默认从 token 文件读 agent token → `GET /api/vault/secrets/nrb_admin_key` 取回 `KV_ADMIN_KEY` → 调 review 端点审批。无需任何环境变量或手动密钥。
- 取用规则：token 与密钥等同密码，不写文件（除约定路径）/不进版本库/不回显；值即用即丢。
- 补审批既有 pending 行：`node flywheel.cjs --approve-only <id> [--table beauty|backview]`（不重新投稿/记录）。

## 5. （可选）发快手星火任务

只对 `review_status='approved'` 的图有效。用 `nanrenbao-scratch-publish` skill 的脚本：
```bash
node ~/.workbuddy/skills/@letmetry/nanrenbao-scratch-publish/scripts/publish-scratch-tasks.js --only <mysql_id> [--title "自定义标题"]
```
- 任务名由 §2 的 subject 自动解析（命名 IP → 具体人名；原创 → 泛化，慎发）。`--title` 可覆盖自动标题（如自动名有冗余时）；不同 id 必须分开发（标题需唯一，带 id）。
- 标题党红线（平台实证）：可蹭事件/赛事/节日/IP；**绝不挂真实名人名**（梅西会被锁确认按钮）；禁极限词（最/第一/唯一/极致/绝对/顶级/史上/全网/Pro）与特殊符号。
- **知名游戏/影视/动漫 IP 名不能进标题（10-18 实证）**：标题框 placeholder 明示「不得包含影视、动漫、游戏、明星、网红等词语」；「王者荣耀」触发表单硬错误 `不得含有知名ip【王者荣耀】`（确认按钮被遮罩挡 30s 后流程静默降级——真凶是这个校验错误，不是遮罩）。**分级实证（10-18 二次实证，更严）**：知名游戏名 ❌ 硬拦 / **纯游戏角色名（公孙离）❌ 也硬拦**（错误明文 `包含游戏知识产权角色名称(公孙离属于王者荣耀游戏角色)，建议修改为非游戏相关角色名称`）/ 短剧名（龙蛇起陆）✅ 可过（不够知名）/ 双身份历史+游戏人物（武则天）✅ 可过（历史名） / 历史人物名（杨玉环/虞姬/穆桂英/蔡文姬等）✅ 可过。**对策分级**：双身份人物用历史名 + 身份钩子（`美女海之女帝武则天672`）；纯游戏角色图照出，标题用**纯特征描述**（如 `美女红叶伞舞少女678`，不提角色名），IP 信息留 DNA/画廊记录；或低知名度 IP 直接进标题。
- **外部不可逆**：先 `--dry-run` 看清单，确认无误再实发。注意 `published-record.json` 去重，避免重复发。
- **标题后缀必须=mysql id（2026-10-24 事故）**：634 回收任务标题后缀误写 807，与 batch25 的潘金莲 mysql 807 同后缀指向两张图，人工抽查必错（mount path 分析不受影响）。发布前核对一遍 `--title` 后缀与 `--only` 的 id 一致。
- **老图可再发布（retitle）**：已发过任务的图可换新标题再发新任务（`--force --only <id> --title "..."`），零边际成本试错/节日卡位用；流程与平台 gate 排查见 scratch-publish skill 的 `references/retitle-and-experiments.md`。
- 登录态：`~/LetMeTryAI/.automation/.local/auth/kuaishou_auth.json`。
- 单日发布约 15-18 单后可能触发平台频控（表现为登录页跳转循环/超时）——当天停发，次日再补。

## 6. 已知坑（别再踩）

- `flywheel.cjs` 曾把 `--dna-file` 透传给 `recorder.py`（它只认 `--dna`）导致记录断链 → 已修：dnaFile 先读内容再传 `--dna`。
- 投稿端点 `/mysql/update` 是 403 陷阱（仅 KV_ADMIN_KEY 可写）→ 审批必须走 `/api/nanrenbao/admin/review`（带 `x-admin-key`），**别直接写库**。
- 日志里偶有退化记录（subject 为空、只剩服装短语）——那是飞轮跑飞了的产物，清洗或忽略，别当真。
- `back_view` 表长期空白：给胜出 IP（聂小倩/小龙女）做背影变体是性价比高的补位动作。
- **AI 封面生成遮罩会吞掉确认点击（10-18 实证，已修 commit 5a1a382e）**：点「AI生成」后全屏 `ks-overlay` 未退时，主弹窗确认按钮被拦截（58 次重试 30s 超时），随后流程静默降级——日期页不出现、提交按钮找不到、**不抛错所以无转储**。已修：pre-confirm 增加 overlay 消退等待（12×2.5s）+ 弹窗堆叠诊断 `reportDialogStack` + 失败即 dump 页面 HTML 到 `publish-errors/`（实际绝对路径 `/Users/jak/LetMeTryAI/.automation/.local/logs/publish-errors/`）。**排查姿势：发布失败先看输出里 🔎/🧹 诊断行，再扒 `publish-errors/*.html` 搜 `ks-form-item__error`（表单校验错误明文，如「不得含有知名ip」）。**
- **「美女」前缀撞「儿女/美人/女神」开头的作品名会拼出错别字被平台 AI 校验驳回（10-22 实证）**：自动标题 `美女+儿女英雄传+何玉凤+十三妹+780` → 平台明文 `存在错别字（美儿子应为儿女），且末尾数字78与标题无明显关联`，确认点击超时、静默降级无提交。**对策：批量发布前先扫一遍自动标题拼接处**——作品名以「儿女/美人/女神/仙女」等开头时（美女+X 产歧义），用 `--title` 覆盖为平台建议形式（如 `儿女英雄传何玉凤十三妹780`，去掉美女前缀）即可过。错误明文同样在 `publish-errors/*.html` 的 `ks-form-item__error` 里，且平台会直接给出建议标题。
- **快手登录态会被失败发布覆盖毁掉（10-18 实证，已修）**：headless 发布遇「未登录」时旧逻辑等人工扫码（headless 无人扫），且用「任意 text 输入框」误判登录页为表单页，超时/误判后把登录页 storage 存回 `kuaishou_auth.json`，有效 passToken 被清空 → 之后每轮必失败。**已加三部防护（commit 29b220b2）**：① 启动门——auth 文件缺身份 cookie（passToken/userId/bUserId）即拒跑 exit 2，有健康备份则自动恢复，`KUAISHOU_AUTH_FORCE=1` 可强绕；② 未登录分支只认任务名输入框 `input.ks-input__inner`（登录页实测 0 次出现）；③ 保存门——保存前自动备份（保留最近 5 份 `.bak-`），新态缺身份 cookie 而旧态健康时拒绝覆盖抛 `AUTH_DEGRADED`。仍可能需人工时：**`HEADLESS=false` 重跑，弹真实 Chrome，用户 60 秒内扫码 → 脚本自动保存完整登录态并继续发布**。

## 7. 关键文件路径

| 用途 | 路径 |
|---|---|
| 飞轮串联脚本 | `~/LetMeTryAI/nanrenbao/flywheel/flywheel.cjs` |
| 选人脚本 | `~/.workbuddy/skills/portrait-character-selector/scripts/select_character.py` |
| DNA schema | `~/LetMeTryAI/nanrenbao/flywheel/prompt-dna.schema.json` |
| 投稿（被 flywheel 调用） | `~/.workbuddy/skills/@letmetry/nanrenbao-contribute/contribute.cjs` |
| 进化记录 | `~/LetMeTryAI/nanrenbao/flywheel/recorder.py` + `prompt-log.jsonl` |
| 快手发布 | `~/.workbuddy/skills/@letmetry/nanrenbao-scratch-publish/scripts/publish-scratch-tasks.js` |
| 出图目录 | `~/LetMeTryAI/nanrenbao/flywheel/images/` |
| 预览页 | `https://letmetryai.cn/nanrenbao/review-preview.html?id=<id>&table=beauty` |

## 8. 成败判定

- ✅ 完整一轮 = 出图合规 + 投稿拿到 id + （密钥就位时）自动审批 `review_status=approved` + 记录行 db_id 回填。
- 若只到 pending：检查密钥源（Vault token 是否获批 / env / 文件）。
- 快手名若是 `美女写真<id>`：说明 subject 没写对格式或选了原创角色，下一轮改命名 IP。

## 9. 批次模式（十连跑脚手架）

十连跑已重复 4+ 轮（647-686 / 686-695 / 696-705…），每批重写三件套是纯浪费。模板如下，按批号 N 落盘到 `~/LetMeTryAI/nanrenbao/flywheel/batch-N/`：

### 9.1 三件套

| 文件 | 职责 | 模板 |
|---|---|---|
| `gen-dna-batch-N.mjs` | 读角色清单 → 逐角色生成 DNA JSON（套 §2 格式 + coverage_pct） | 角色清单写死在文件头 `const ROLES=[...]`，DNA 输出 `dna-<id>-<name>.json` |
| `run-batch-N.sh` | 串行驱动：对每个 DNA 调 ImageGen 出图 → 合规自检 → flywheel.cjs 投稿 | **ImageGen 必须串行**（铁律 5），每张之间 `sleep 3-5`；任一图合规自检不过 → 记入 skip 清单继续，不整批停 |
| `publish-batch-N.sh` | 熔断循环：对投稿拿到的 id 逐张发布，单张失败记入 failed 清单，**不熔断整批**；全部跑完后对 failed 清单人工按 ks-ops 决策树处理 | 频控 ~15-18 单/日，超限即停，剩余进次日清单 |

### 9.2 批次纪律

- **先 dry-run 再实跑**：gen 完先打印角色×id 清单人工确认；run 前确认出图目录为空或已清理旧批。
- **断点续跑**：run 脚本每完成一张就 append 到 `done.txt`；重跑时读 `done.txt` 跳过。发布侧复用 `--only`/`--since-id`。
- **投稿 id ≠ 逻辑 id**：DNA 里写的逻辑序号与 mysql 真实 id 不同，publish 与记录一律用投稿返回的真实 id。
- **收尾**：批跑完统一 `evolve.py --auto-push` 更新 seeds（champion 变化才提交）。
- **退化记录清洗**：批跑量大了 prompt-log.jsonl 里会有 subject 为空的退化行，evolve 聚合前忽略。
