#!/usr/bin/env python3
"""evolve.py - 男人宝投稿飞轮：DNA 维度聚合加权器。

读线上 approved 且互动量>0 的 skill 投稿，按 DNA 维度聚合浏览量，
输出胜出维度与冠军种子到 seeds.json（单一真相源，部署在 letmetryai.cn/nanrenbao，GitHub Pages 静态文件）。

纯只读（/mysql/query 白名单）+ 本地产出，不碰任何写接口，不需 DB 凭据。
"""
import argparse
import datetime
import json
import sys
import urllib.error
import urllib.request

UTC = datetime.timezone.utc

API = "https://letmetry.cn/mysql/query"
TABLES = [("beauty_images", "view_count"), ("back_view_images", "click_count")]  # (表, 互动量列名)
DIMENSIONS = ["style", "lighting", "wardrobe", "mood", "composition", "camera"]
MIN_VIEWS = 1  # 只看有真实浏览的行

# 内置兜底种子：与 portrait-prompt-studio 的内置兜底一致。
# 无 champion 信号时，seeds.json 仍携带这些，skill fetch 到也能直接用。
FALLBACK_SEEDS = [
    {
        "id": "A", "name": "背影杀",
        "prompt": "Cinematic back-view portrait of an elegant woman in a flowing dress, long hair, soft golden-hour light, mysterious silhouette, shallow depth of field, fashion editorial, tasteful, no face visible",
        "dna": {"subject": "女性", "scene": "户外黄昏", "lighting": "黄金时刻", "composition": "背影", "style": "时尚大片", "mood": "神秘", "wardrobe": "长裙", "camera": "85mm", "negative": "face visible, nudity, vulgar"},
    },
    {
        "id": "B", "name": "极简棚拍写真",
        "prompt": "Minimalist studio portrait, soft single-source lighting, clean background, confident pose, high-end fashion editorial, muted color palette, elegant",
        "dna": {"subject": "女性", "scene": "棚拍", "lighting": "柔光单灯", "composition": "半身", "style": "极简时尚", "mood": "从容", "wardrobe": "简约", "camera": "85mm"},
    },
    {
        "id": "C", "name": "电影感霓虹夜景",
        "prompt": "Neon-lit night street portrait, cinematic color grading, rim light, atmospheric haze, fashion film still, artistic",
        "dna": {"subject": "人物", "scene": "夜景街道", "lighting": "霓虹轮廓光", "composition": "环境人像", "style": "电影感", "mood": "氛围", "wardrobe": "都市", "camera": "35mm"},
    },
    {
        "id": "D", "name": "胶片质感自然光",
        "prompt": "35mm film grain portrait, natural window light, warm tones, candid intimate mood, analog photography aesthetic",
        "dna": {"subject": "人物", "scene": "室内自然光", "lighting": "窗光", "style": "胶片", "mood": "自然", "camera": "35mm"},
    },
]


def query(sql):
    req = urllib.request.Request(
        API,
        data=json.dumps({"sql": sql}).encode(),
        headers={"Content-Type": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        return {"error": e.read().decode()[:200]}
    except Exception as e:  # noqa: BLE001
        return {"error": str(e)}


def fetch_rows(table, col):
    sql = (
        f"SELECT id, {col}, prompt_dna FROM {table} "
        f"WHERE review_status='approved' AND source_type='skill' "
        f"AND prompt_dna IS NOT NULL AND {col} >= {MIN_VIEWS} "
        f"ORDER BY {col} DESC"
    )
    data = query(sql)
    if isinstance(data, dict) and "error" in data:
        return None, data["error"]  # 该表跳过（如缺 view_count 列）
    return data, None


def main():
    ap = argparse.ArgumentParser(description="男人宝飞轮 DNA 聚合加权器")
    ap.add_argument("--out", default="seeds.json", help="输出 JSON 路径")
    ap.add_argument("--top", type=int, default=5, help="每个维度/冠军保留前 N")
    args = ap.parse_args()

    leaderboard = {d: {} for d in DIMENSIONS}  # dim -> {value: {sum, n}}
    champions = []  # 有浏览的胜出行

    for table, col in TABLES:
        rows, err = fetch_rows(table, col)
        if err:
            print(f"[skip] {table}.{col}: {err}", file=sys.stderr)
            continue
        for row in rows:
            try:
                dna = json.loads(row["prompt_dna"])
            except Exception:  # noqa: BLE001
                continue
            vc = int(row.get(col) or 0)
            champions.append(
                {
                    "table": table,
                    "id": row["id"],
                    "view_count": vc,
                    "dna": dna,
                    "prompt_text": dna.get("prompt_text"),
                }
            )
            for d in DIMENSIONS:
                v = dna.get(d)
                if v is None:
                    continue
                bucket = leaderboard[d].setdefault(v, {"sum": 0, "n": 0})
                bucket["sum"] += vc
                bucket["n"] += 1

    ranked = {}
    for d, vals in leaderboard.items():
        items = []
        for v, s in vals.items():
            items.append(
                {
                    "value": v,
                    "sum": s["sum"],
                    "n": s["n"],
                    "avg": round(s["sum"] / s["n"], 1),
                }
            )
        items.sort(key=lambda x: x["avg"], reverse=True)
        ranked[d] = items[: args.top]

    champions.sort(key=lambda x: x["view_count"], reverse=True)
    champions = champions[: args.top]

    out = {
        "version": 1,
        "updated_at": datetime.datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "source": "evolve.py",
        "note": "胜出 DNA 维度与冠军种子；skill 运行时 fetch 失败回退内置兜底。",
        "dimension_leaderboard": ranked,
        "champion_seeds": champions,
        "fallback_seeds": FALLBACK_SEEDS,
    }
    with open(args.out, "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(
        f"wrote {args.out}: {len(champions)} champions, "
        f"{sum(len(v) for v in ranked.values())} ranked dimension values"
    )


if __name__ == "__main__":
    main()
