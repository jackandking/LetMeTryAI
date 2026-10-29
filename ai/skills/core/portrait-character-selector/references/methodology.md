# 选人物方法论（portrait-character-selector）

本文件是「怎么选下一个人物」的完整方法论，由 nanrenbao 飞轮多次复盘提炼而成。
Skill 的 `scripts/select_character.py` 是这套方法论的代码化；本文件解释其背后的判断逻辑。

---

## 一、人物池定义（选人范围）

- **高辨识度女性 IP 为主**：中国古典 / 武侠 / 仙侠 + 经典影视为主（三国、红楼、射雕、笑傲、仙剑、西游、倩女幽魂、封神、大话西游、喜剧之王），少量西方（Catwoman、Wonder Woman 等）。
- **不选**：真实人物、无辨识度路人、辨识度低的原创角色（除非作为「都市盲区补位」的原创类目）。
- 判据 = `辨识度 + 可极简 reinterpret 性`：角色必须有强标志设定（特定颜色 / 发型 / 配饰），才能改成极小遮蔽仍被一眼认出。

## 二、reinterpret 铁律

- 角色标志性强设定服装（赵灵儿白裙、王熙凤华服、小龙女素袍）→ 改成 **极小 dudou/bikini + 单条高透飘纱**，只保留识别特征（发色/发型、主色、标志性配饰：赵灵儿苗银/玉坠、王熙凤金步摇、林黛玉玉簪/落英）。
- **绝不裹袍**：NEVER gown / robe / drape / hanfu / kimono / long skirt 等全覆盖。

## 三、基线锁死（每个候选都套）

| 维度 | 默认值 |
|---|---|
| body_type | 饱满曲线（女性角色默认，已与用户确认） |
| style | 超写实人像精修·时尚大片 / 电影感 |
| lighting | 柔和自然散射光 |
| wardrobe | 极小遮蔽，不透明区域不超过 1/4 身体 |
| negative | nudity, explicit, exposed nipples, genitalia, see-through revealing, arousal, vulgar, heavy clothing, gown, dress, robe, full-coverage, covered body, drape, veil, shawl, wrap, cape, hanfu, kimono, long skirt, flowing fabric covering body, deformed hands, extra fingers, watermark, text, lowres, plastic skin, oversaturated |

## 四、胜出回流（数据驱动闭环）

- 每天 01:05 `evolve.py` 按站内 view_count 聚合 → 更新 `seeds.json` → 下次直接拉胜出 DNA 复跑变体。
- **已验证的胜出规律**：赢的要么是「优雅端庄」（旗袍 / 白泳装），要么是「仙气古装高透 IP」（聂小倩 / 女儿国）。**中间态（半遮半露的内衣套装）最弱** —— 用户更吃「仙 / 雅」两极端，不买「半遮半露」的账。
- 因此打分权重：命中「仙 / 雅」极端 +2，补盲区 +1。

## 五、红线兜底（不可越）

- 着衣 / 艺术化 / 非性化。
- 负向词必含 nudity / explicit / see-through revealing 等。
- 平台拒则收敛（遮蔽更多 / 换更端庄的 IP），不硬刚。

## 六、盲区清单（每次选人都检查）

1. **都市 / 现代几乎空白**：早期试过霓虹但没复跑也没上榜；seed C（电影感霓虹）没被利用 → 用「原创都市霓虹独立女性」补。
2. **back_view 表被冷落**：记录少、0 冠军；站内「背影杀」是已知玩法却没跑出来 → 给胜出 IP 做背影变体。
3. **单一画像**：全是亚洲青年女性，无男性 / 情侣 / 年龄层；西方 IP 仅 Catwoman。
4. **同 IP 内卷**：赵灵儿 3、聂小倩 2、妲己 2、玉兔 2 —— 在单 IP 上做古装/泳装/高透三变体，边际收益递减。脚本会对出现 ≥2 次的 IP 预警。

## 七、标准工作流（调用顺序）

1. 跑 `scripts/select_character.py` → 得到候选榜 + 盲区。
2. 从候选榜选 1 个（优先命中胜出极端或补最大盲区）。
3. 套「基线锁死」表写 DNA JSON。
4. 出图（ImageGen，约 5–10 credits）。
5. 自检图片：着衣 / 艺术化 / 非性化，不露点，带 AI 水印。
6. `nanrenbao-contribute` 投稿 `beauty_images`（pending）。
7. `recorder.py` 记录到 `prompt-log.jsonl`（供下次回流）。
8. 选人理由 + 结果记工作日志。
