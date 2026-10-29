---
name: portrait-character-selector
description: "This skill should be used when a portrait-generation flywheel / 'manrenbao' task needs to choose the NEXT character or subject to generate — i.e. any request like 选下一个人物, 推荐一个人物, 下一个飞轮人物, 接下来画谁. It turns the data-driven selection methodology (high-recognition IP pool, minimal reinterpret rule, baseline lock, winning-recirculation, red-line) into a repeatable, script-backed workflow so any task can pick the next character without re-deriving the method each time."
agent_created: true
---

# 选下一个人物（portrait-character-selector）

为「男人宝 / nanrenbao 写真飞轮」选择下一个生成人物。把"怎么选人"从一次性复盘变成可复用能力：
给定飞轮历史数据（本地日志 + 线上胜出种子），输出**已用人物分布 / 胜出规律 / 当前盲区 / 下一个人物候选榜**，
让其它任务也能轻松选出下一个人物。

## 何时使用

- 用户说「选下一个人物 / 推荐一个人物 / 跑飞轮选人 / 接下来画谁」。
- 任何需要在高辨识度女性 IP 池里挑下一个写真主体、且希望**基于数据而非拍脑袋**的场景。
- 注意：本 skill 只负责「选人 + 产出 DNA 草稿」；出图与投稿交给 `portrait-prompt-studio` 与 `nanrenbao-contribute`。

## 工作流程

### 1. 运行选择器脚本（核心）

```bash
python3 ~/.workbuddy/skills/portrait-character-selector/scripts/select_character.py
# 可选参数:
#   --log   ~/LetMeTryAI/nanrenbao/flywheel/prompt-log.jsonl   # 本地日志
#   --seeds https://letmetryai.cn/nanrenbao/seeds.json         # 线上胜出种子
#   --top   5                                                 # 候选数
#   --no-network                                              # 离线（仅用日志）
```

脚本会产出 5 段：
1. 最近几次实际人物 / 题材分布（含表分布 beauty vs back_view）
2. 同 IP 内卷预警（出现 ≥2 次标 ⚠️）
3. 胜出规律（线上冠军按 view 排序）
4. 当前盲区（gap）
5. **下一个人物候选榜**（已排除已跑 IP，按 胜出极端+2 / 补盲区+1 打分）

### 2. 从候选榜选 1 个

- 优先：命中「仙 / 雅」胜出极端，或补最大盲区（都市 / 西方 / 背影）。
- 避免：同 IP 内卷（脚本已预警的 IP 不要再选其变体）。

### 3. 套基线写 DNA（见 references/methodology.md）

每个候选套死基线：`饱满曲线 + 超写实人像精修·电影感 + 柔光 + 高透极小遮蔽（不透明区域不超过 1/4 身体）`。
reinterpret 铁律：角色标志服装 → 极小 dudou/bikini + 单条高透飘纱，只保留识别特征（发色/主色/标志配饰），**绝不裹袍**。

### 4. 出图 + 投稿 + 记录

- 出图（ImageGen，约 5–10 credits）；自检图片必须 **着衣 / 艺术化 / 非性化**，带 AI 水印。
- `nanrenbao-contribute` 投稿 `beauty_images`（pending）。
- `recorder.py` 记录到 `prompt-log.jsonl`（供下次回流）。
- 把选人理由 + 结果记入工作日志。

## 红线（不可越）

着衣 / 艺术化 / 非性化。负向词必含 nudity / explicit / see-through revealing 等；平台拒则收敛，不硬刚。

## 参考

- `references/methodology.md` — 完整方法论：人物池定义、reinterpret 铁律、基线锁死表、胜出回流、盲区清单、标准工作流。
- `scripts/select_character.py` — 数据驱动选择器（日志解析 + 种子拉取 + 候选打分）。
