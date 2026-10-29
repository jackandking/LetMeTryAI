#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
portrait-character-selector — 数据驱动的「下一个人物」选择器

读取 nanrenbao 飞轮的本地日志 (prompt-log.jsonl) 与线上胜出种子 (seeds.json)，
按既定方法论产出：
  1. 最近几次实际用了哪些人物（题材分布）
  2. 什么赢了（胜出 DNA 规律）
  3. 当前盲区（gap）
  4. 下一个人物候选榜（已排除内卷 IP，按胜出极端 + 盲区补位打分）

用法:
  python3 select_character.py [--log PATH] [--seeds URL] [--top N] [--no-network]
默认:
  --log   ~/LetMeTryAI/nanrenbao/flywheel/prompt-log.jsonl
  --seeds https://letmetryai.cn/nanrenbao/seeds.json
  --top   5
"""
import argparse
import json
import os
import sys
import urllib.request
from collections import Counter, defaultdict

DEFAULT_LOG = os.path.expanduser("~/LetMeTryAI/nanrenbao/flywheel/prompt-log.jsonl")
DEFAULT_SEEDS = "https://letmetryai.cn/nanrenbao/seeds.json"

# ---------------------------------------------------------------------------
# 1. 题材聚类：把 wardrobe 关键词归到可解释的题材桶
# ---------------------------------------------------------------------------
def bucket(w):
    w = (w or "").lower()
    if any(k in w for k in ["旗袍", "qipao", "中式", "汉", "唐装"]):
        return "旗袍/中式"
    if any(k in w for k in ["比基尼", "bikini", "泳", "beach", "水", "湿"]):
        return "泳装/水系列"
    if any(k in w for k in ["dudou", "肚兜", "robe", "translucent", "sheer",
                            "gauze", "纱", "古装", "仙", "reinterpret", "飘纱"]):
        return "古装高透 reinterpret"
    if any(k in w for k in ["西装", "urban", "neon", "都市", "霓虹", "风衣", "职场"]):
        return "都市/现代"
    return "其他:" + w[:18]

# ---------------------------------------------------------------------------
# 2. 高辨识度人物池（候选库）—— 方法论核心资产
#    轴(axis) 决定它服务「胜出极端」还是「盲区补位」
#      win_xian : 仙气极端（数据证明赢）
#      win_ya   : 雅致极端（数据证明赢）
#      gap_city : 补「都市/现代」盲区
#      gap_west : 补「西方 IP」盲区
#      gap_back : 可做背影杀变体
#    recognition: 高 / 中
# ---------------------------------------------------------------------------
CANDIDATE_POOL = [
    # —— 仙气极端（数据证明赢）——
    {"name": "白素贞", "franchise": "白蛇传", "recognition": "高", "axis": "win_xian",
     "signature": "白素袍·蛇仙·清冷温婉", "reinterpret": "白 dudou + 单条高透白纱，保留蛇形银饰",
     "context": "西湖烟雨断桥·油纸伞斜倚·雷峰塔远影·水波倒影"},
    {"name": "小龙女", "franchise": "神雕侠侣", "recognition": "高", "axis": "win_xian",
     "signature": "素白麻袍·古墓派·不食烟火", "reinterpret": "素 dudou + 白纱，冷白肤调",
     "context": "古墓寒玉台·玉蜂环绕·终南山雪松·素白纱幔帷帐"},
    {"name": "七仙女", "franchise": "神话/天仙配", "recognition": "高", "axis": "win_xian",
     "signature": "彩衣仙女·下凡", "reinterpret": "单色 dudou + 飘彩纱",
     "context": "云海霞光·凌霄花枝·银河垂落·绸缎流霞"},
    {"name": "白骨精", "franchise": "西游记", "recognition": "高", "axis": "win_xian",
     "signature": "白骨·妖媚·变化", "reinterpret": "白 dudou + 骨链饰，妖媚冷光",
     "context": "月下荒寺残垣·骷髅幻影青烟·白骨折扇·妖紫雾"},
    {"name": "白晶晶", "franchise": "大话西游", "recognition": "中", "axis": "win_xian",
     "signature": "紫霞姐妹·蜘蛛精·清丽", "reinterpret": "浅紫 dudou + 薄纱，与紫霞联动",
     "context": "盘丝洞蛛网轻垂·月华·紫晶"},
    {"name": "青霞仙子", "franchise": "大话西游", "recognition": "中", "axis": "win_xian",
     "signature": "仙/魔双身·蓝调", "reinterpret": "蓝 dudou + 蓝纱",
     "context": "仙魔双身光晕·蓝调星河·宝镜"},
    # —— 雅致极端（数据证明赢）——
    {"name": "王语嫣", "franchise": "天龙八部", "recognition": "高", "axis": "win_ya",
     "signature": "神仙姐姐·绿衣·书卷气", "reinterpret": "绿 dudou + 绿纱，温婉",
     "context": "琅嬛玉洞书阁·曼陀罗花·太湖石盆景"},
    {"name": "东方不败", "franchise": "笑傲江湖", "recognition": "高", "axis": "win_ya",
     "signature": "红衣·绣花·雌雄莫辨", "reinterpret": "红 dudou + 红纱，凌厉；定稿构图：葵花宝典摊开持于髋前作前景道具（dudou 保留其下）+ 另一手高举带线绣花针发射姿态",
     "context": "葵花宝典古籍摊开·绣花针悬丝·红绸垂落·黑木崖窗棂"},
    {"name": "貂蝉", "franchise": "三国", "recognition": "高", "axis": "win_ya",
     "signature": "四大美女·舞姿·闭月", "reinterpret": "金 dudou + 金纱，华美",
     "context": "月下拜月台·铜镜烛台·连环计灯影·闭月花"},
    {"name": "西施", "franchise": "春秋", "recognition": "高", "axis": "win_ya",
     "signature": "四大美女·浣纱·沉鱼", "reinterpret": "素 dudou + 浣纱质薄纱",
     "context": "浣纱溪石·沉鱼涟漪·越国苎萝竹·素纱"},
    {"name": "杨贵妃", "franchise": "唐", "recognition": "高", "axis": "win_ya",
     "signature": "华贵·牡丹·丰腴", "reinterpret": "华贵 dudou + 牡丹金饰",
     "context": "华清宫温泉雾·牡丹花丛·霓裳谱卷·金步摇镜台"},
    {"name": "王昭君", "franchise": "西汉", "recognition": "高", "axis": "win_ya",
     "signature": "四大美女·出塞·落雁·琵琶", "reinterpret": "素 dudou + 胡风红纱",
     "context": "塞外大漠·琵琶·落雁·旌旗"},
    {"name": "阿珂", "franchise": "鹿鼎记", "recognition": "中", "axis": "win_ya",
     "signature": "明艳·侠女", "reinterpret": "艳色 dudou + 飘纱",
     "context": "江湖客栈木窗·明艳灯·刀光",
     "iconic_action": "持剑回身（九难弟子剑法起手）+ 明艳侧目"},
    # —— 西方高辨识（补盲区）——
    {"name": "神奇女侠", "franchise": "Wonder Woman", "recognition": "高", "axis": "gap_west",
     "signature": "铠甲·真言套索·金饰", "reinterpret": "极小战甲 dudou + 金冠饰",
     "context": "希腊神殿石柱·真言套索盘绕·盾纹",
     "iconic_action": "双臂交叉用神力手镯格挡（经典弹反/闪弹动作）+ 真言套索垂落身侧"},
    {"name": "黑寡妇", "franchise": "Black Widow", "recognition": "高", "axis": "gap_west",
     "signature": "紧身战衣·红发", "reinterpret": "黑 dudou + 战术绑带",
     "context": "战术控制台·寡妇蛰腕刺·红发光",
     "iconic_action": "侧身战术抬手（寡妇蛰腕刺蓄势）+ 红发甩动"},
    {"name": "劳拉·克劳馥", "franchise": "古墓丽影", "recognition": "高", "axis": "gap_west",
     "signature": "麻花辫·探险·工装", "reinterpret": "土黄 dudou + 探险绑带",
     "context": "古墓石雕残壁·探险地图卷·火把",
     "iconic_action": "一手攀抓岩壁/举火把、麻花辫甩动（探险姿态）"},
    # —— 都市/现代（补盲区，原创类目）——
    {"name": "原创·都市霓虹独立女性", "franchise": "原创", "recognition": "中", "axis": "gap_city",
     "signature": "霓虹·电影感·现代都会", "reinterpret": "现代极简内衣 + 都市光影，吃 seed C",
     "context": "霓虹玻璃幕墙·车流光轨·都市夜景"},
    {"name": "原创·职场精英女性", "franchise": "原创", "recognition": "中", "axis": "gap_city",
     "signature": "西装内·知性·冷调", "reinterpret": "西装内 dudou + 解构衬衫感",
     "context": "写字楼百叶窗光影·档案架·冷调"},
]

# 数据证明的胜出极端（用于打分权重）
WINNING_EXTREMES = {"win_xian", "win_ya"}
GAP_AXES = {"gap_city", "gap_west", "gap_back"}

# 已知 IP 名（含已跑过 + 候选池），用于精确的「同 IP 内卷」检测
KNOWN_IPS = [
    "紫霞仙子", "白晶晶", "青霞仙子", "春三十娘", "孙悟空", "至尊宝",
    "赵灵儿", "林月如", "王语嫣", "阿紫", "阿朱", "阿珂",
    "孙尚香", "黄蓉", "王熙凤", "任盈盈", "东方不败", "女儿国国王",
    "聂小倩", "燕赤霞", "柳飘飘", "尹天仇", "林黛玉", "薛宝钗",
    "玉兔精", "嫦娥", "妲己", "白素贞", "小青", "小龙女", "七仙女",
    "白骨精", "貂蝉", "西施", "杨贵妃", "杨玉环", "Catwoman", "神奇女侠",
    "黑寡妇", "劳拉", "王祖贤",
]


def load_log(path):
    recs = []
    if not os.path.exists(path):
        return recs
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                recs.append(json.loads(line))
            except Exception:
                pass
    return recs


def load_seeds(url):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=20) as r:
            return json.loads(r.read().decode("utf-8"))
    except Exception as e:
        return {"_error": str(e)}


def subject_text(rec):
    d = rec.get("dna", {}) or {}
    return " ".join([
        str(d.get("subject", "")),
        str(d.get("wardrobe", "")),
        str(rec.get("source_prompt", "")),
        str(rec.get("user_prompt", "")),
    ])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--log", default=DEFAULT_LOG)
    ap.add_argument("--seeds", default=DEFAULT_SEEDS)
    ap.add_argument("--top", type=int, default=5)
    ap.add_argument("--no-network", action="store_true")
    args = ap.parse_args()

    recs = load_log(args.log)
    print("=" * 72)
    print("飞轮「下一个人物」选择报告")
    print("=" * 72)
    print(f"日志条数: {len(recs)}  (来源: {args.log})")

    if not recs:
        print("⚠️ 未找到日志，仅基于内置人物池给出候选。")
        recs = []

    # ---- 题材分布 ----
    buckets = Counter()
    table_cnt = Counter()
    recent = []
    for r in recs:
        d = r.get("dna", {}) or {}
        buckets[bucket(d.get("wardrobe", ""))] += 1
        table_cnt[r.get("table", "?")] += 1
        subj = d.get("subject", "") or ""
        recent.append((r.get("ts", "")[:16], r.get("table", ""),
                       str(r.get("db_id", "")), subj[:34],
                       (d.get("wardrobe", "") or "")[:26]))

    print("\n【1】最近几次实际人物 / 题材分布")
    print("-" * 72)
    print(f"{'时间':<17}{'表':<7}{'id':<6}subject / 题材")
    print("-" * 72)
    for ts, tbl, dbid, subj, w in recent[-15:]:
        print(f"{ts:<17}{tbl:<7}{dbid:<6}{subj} | {w}")
    print("\n题材桶计数:")
    for k, v in buckets.most_common():
        print(f"  {k:<22}{v}")
    print("表分布:", dict(table_cnt))

    # ---- 同 IP 内卷预警（按已知 IP 名子串匹配，避免通用前缀噪声）----
    print("\n【2】同 IP 内卷预警（出现 ≥ 2 次）")
    print("-" * 72)
    ip_hits = Counter()
    for r in recs:
        blob = subject_text(r).lower()
        for ip in KNOWN_IPS:
            if ip.lower() in blob:
                ip_hits[ip] += 1
    over = [(k, v) for k, v in ip_hits.most_common() if v >= 2]
    if over:
        for k, v in over:
            flag = " ⚠️ 边际递减" if v >= 3 else " 注意"
            print(f"  {k:<10}{v} 次{flag}")
    else:
        print("  无显著内卷")

    # ---- 胜出规律 ----
    winners = []
    if not args.no_network:
        seeds = load_seeds(args.seeds)
        if "_error" in seeds:
            print(f"\n【3】胜出种子获取失败: {seeds['_error']}（跳过大，仅用日志）")
        else:
            champs = seeds.get("champion_seeds", []) or seeds.get("champions", [])
            print(f"\n【3】胜出规律（线上冠军 {len(champs)} 条）")
            print("-" * 72)
            for c in sorted(champs, key=lambda x: -(x.get("view_count", 0) or 0))[:8]:
                s = c.get("dna", {}) or {}
                vc = c.get("view_count", 0)
                winners.append((vc, s.get("wardrobe", "")[:30], s.get("subject", "")[:24]))
                print(f"  👑 views {vc:<4} | {(s.get('subject','') or '')[:24]} | {(s.get('wardrobe','') or '')[:30]}")
    else:
        print("\n【3】已跳过线上种子（--no-network）")

    # ---- 盲区 ----
    print("\n【4】当前盲区（gap）")
    print("-" * 72)
    gaps = []
    if table_cnt.get("back_view", 0) == 0 and table_cnt.get("back", 0) == 0:
        gaps.append("back_view 表 0 条 —— 站内「背影杀」玩法未利用")
    elif table_cnt.get("back_view", 0) + table_cnt.get("back", 0) <= 2:
        gaps.append("back_view 表极少 —— 可给胜出 IP 做背影变体")
    if buckets.get("都市/现代", 0) == 0:
        gaps.append("都市/现代 0 条 —— seed C 电影感霓虹未利用")
    if not any(b.startswith("西方") or "west" in b.lower() for b in buckets):
        gaps.append("西方 IP 几乎空白（仅 Catwoman 类）")
    non_asian = sum(1 for r in recs if not ("亚洲" in (r.get('dna',{}).get('subject','') or "")))
    if len(recs) and non_asian / len(recs) < 0.1:
        gaps.append("画像单一（几乎全是亚洲青年女性）—— 无男性/情侣/年龄层")
    if over:
        gaps.append("同 IP 多变体内卷 —— 停止在单 IP 上做古装/泳装/高透三变体")
    for g in gaps:
        print("  • " + g)
    if not gaps:
        print("  （无明显盲区）")

    # ---- 候选榜 ----
    print("\n【5】下一个人物候选榜（已排除内卷 IP）")
    print("-" * 72)
    used_keys = []
    for r in recs:
        used_keys.append(subject_text(r).lower())

    scored = []
    for c in CANDIDATE_POOL:
        blob = (c["name"] + c["franchise"]).lower()
        is_used = any(blob in k or c["name"].lower() in k for k in used_keys)
        if is_used:
            continue
        score = 2 if c["recognition"] == "高" else 1
        why = []
        if c["axis"] in WINNING_EXTREMES:
            score += 2
            why.append("命中胜出极端(仙/雅)")
        if c["axis"] in GAP_AXES:
            score += 1
            why.append("补盲区")
        scored.append((score, c, why))

    scored.sort(key=lambda x: -x[0])
    for i, (score, c, why) in enumerate(scored[:args.top], 1):
        axis_label = {"win_xian": "仙气", "win_ya": "雅致", "gap_city": "都市盲区",
                      "gap_west": "西方盲区", "gap_back": "背影"}.get(c["axis"], c["axis"])
        print(f"  {i}. {c['name']}（{c['franchise']}） | 辨识度{c['recognition']} | 轴:{axis_label} | 分{score}")
        print(f"     标志: {c['signature']}")
        print(f"     reinterpret: {c['reinterpret']}")
        print(f"     标识背景/道具(context): {c.get('context', '')}")
        print(f"     经典动作(action): {c.get('iconic_action', '')}")
        if why:
            print(f"     推荐理由: {'; '.join(why)}")

    print("\n" + "=" * 72)
    print("下一步: 从候选榜选 1 个 → 套基线(饱满曲线+超写实+柔光+高透极小遮蔽)")
    print("→ 写 DNA JSON → 出图 → nanrenbao-contribute 投稿。红线: 着衣/艺术化/非性化。")
    print("=" * 72)


if __name__ == "__main__":
    main()
