#!/usr/bin/env python3
"""故事感实验批效果追踪（含去离群值稳健均值）
用法: python3 check-story-exp.py
对比: 实验组 = 各 story-feel 批（默认 batch28: db 838-842；batch29 跑完把 id 加进 EXP_IDS）
      对照组 = 同期普通批 batch27 (db 818-828)

稳健统计（排掉爆款干扰）:
  - 中位数 median: 对偏态分布稳健
  - 10% 截尾均值 trimmed mean: 去掉最高最低各 10% 后求均值
  - 去离群值基线: 对照组去掉 top-2 爆款后的均值
"""
import json
import urllib.request
import statistics

API = "https://letmetry.cn/mysql/query"

# 实验组：所有 story-feel 批的 mysql id 汇总（b28 命令IP批 / b29 秦淮八艳批 / b30 汉唐皇后批 / b31 才女名姝批）
EXP_IDS = [838, 839, 840, 841, 842,
           847, 848, 849, 850, 851,
           852, 853, 854, 855, 856,
           857, 858, 859, 860, 861]
BASELINE_IDS = list(range(818, 829))          # batch27 万圣令线批（最近一个普通对照批）


def query(sql):
    req = urllib.request.Request(
        API, data=json.dumps({"sql": sql}).encode(),
        headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.loads(r.read().decode())
    except Exception as e:
        return {"error": str(e)}


def views(ids):
    if not ids:
        return {}
    data = query(
        f"SELECT id, view_count, created_at FROM beauty_images "
        f"WHERE id IN ({','.join(map(str, ids))}) AND review_status='approved'")
    if isinstance(data, dict) and "error" in data:
        print("查询失败:", data["error"])
        return {}
    return {r["id"]: r for r in data}


def robust(vs):
    """返回 (中位数, 10%截尾均值)；样本<4 时截尾退化为中位数。"""
    if not vs:
        return (0.0, 0.0)
    vs = sorted(vs)
    med = statistics.median(vs)
    n = len(vs)
    if n < 4:
        return (med, med)
    k = max(1, int(round(n * 0.1)))
    trimmed = vs[k:n - k]
    return (med, sum(trimmed) / len(trimmed))


def summarize(rows, label, show_each=True):
    vs = [r["view_count"] for r in rows.values()]
    if not vs:
        print(f"{label}: 无数据")
        return
    avg = sum(vs) / len(vs)
    med, tmean = robust(vs)
    if show_each:
        print(f"{label}: n={len(vs)} 总={sum(vs)} 均值={avg:.1f} 中位={med:.1f} "
              f"截尾均值={tmean:.1f} 最高={max(vs)}")
    else:
        print(f"{label}: n={len(vs)} 均值={avg:.1f} 中位={med:.1f} 截尾均值={tmean:.1f} 最高={max(vs)}")
    return avg, med, tmean


def main():
    exp = views(EXP_IDS)
    base = views(BASELINE_IDS)
    names = {838: "碧瑶·满月井", 839: "龙葵·剑炉", 840: "林月如·锁妖塔",
             841: "阿宝·离魂化鸟", 842: "霍小玉·夜宴断钗",
             847: "柳如是·扁舟儒装", 848: "顾横波·眉楼执盏", 849: "卞玉京·空庭断琴",
             850: "马湘兰·画舫写兰", 851: "寇白门·勒马闯营",
             852: "卫子夫·平阳歌舞", 853: "窦漪房·深宫倚窗", 854: "阴丽华·新野桃林",
             855: "独孤伽罗·二圣临朝", 856: "长孙皇后·朝服进谏",
             857: "朱淑真·灯下词成", 858: "管道升·墨竹初成", 859: "冯小怜·戎装冬猎",
             860: "赵合德·椒房初入", 861: "娥皇·湘水泣竹"}
    print("=== 实验组（故事感批 batch28+29+30+31）===")
    for i in EXP_IDS:
        r = exp.get(i)
        if r:
            print(f"  {i} {names.get(i, '')}: views={r['view_count']} ({r['created_at']})")
        else:
            print(f"  {i} {names.get(i, '')}: 未查到")
    print("=== 对照组（batch27 万圣令线批 818-828）===")
    for i in sorted(base):
        print(f"  {i}: views={base[i]['view_count']}")

    print("\n--- 整体对比（含稳健统计）---")
    e_avg, e_med, e_t = summarize(exp, "实验组")
    b_avg, b_med, b_t = summarize(base, "对照组")
    if b_avg:
        print(f"\n实验组/对照组 均值比: {e_avg / b_avg:.2f}x")
        print(f"实验组/对照组 中位比: {e_med / b_med:.2f}x  (中位对偏态更稳)")
        print(f"实验组/对照组 截尾均值比: {e_t / b_t:.2f}x")

    # 去离群值基线：对照组去掉 top-2 爆款后对比
    bvs = sorted(r["view_count"] for r in base.values())
    if len(bvs) > 4:
        base_ex = bvs[:-2]  # 去掉最高 2 个
        base_ex_avg = sum(base_ex) / len(base_ex)
        evs = [r["view_count"] for r in exp.values()]
        exp_avg = sum(evs) / len(evs)
        print(f"\n对照组去 top-2 爆款后: n={len(base_ex)} 均值={base_ex_avg:.1f} "
              f"(原均值被 {bvs[-1]}/{bvs[-2]} 拉高)")
        print(f"实验组均值 {exp_avg:.1f} vs 去爆款对照组均值 {base_ex_avg:.1f} "
              f"→ 比={exp_avg / base_ex_avg:.2f}x")

    # 全站近 20 条参考
    recent = query("SELECT id, view_count, created_at FROM beauty_images "
                   "WHERE review_status='approved' AND source_type='skill' "
                   "ORDER BY id DESC LIMIT 20")
    if isinstance(recent, list) and recent:
        print()
        summarize({r["id"]: r for r in recent}, "全站近20条参考")


if __name__ == "__main__":
    main()
