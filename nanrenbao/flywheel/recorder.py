#!/usr/bin/env python3
"""
prompt_recorder.py — 飞轮第①段：记录提示词演化轨迹。

用法:
  python3 prompt_recorder.py \
      --source-id "studio-001" \
      --source-prompt "Cinematic back-view portrait, elegant dress, golden hour..." \
      --user-prompt "改成夜晚霓虹、红裙、更长发" \
      --dna '{"subject":"女性","scene":"夜景","lighting":"霓虹","style":"电影感","wardrobe":"红裙"}' \
      [--image-url "https://..."] [--db-id 566] [--table beauty]

每行写入 flywheel/prompt-log.jsonl（NDJSON），供后续按站内浏览/翻转量
加权、统计哪些 DNA 维度更受欢迎，逐步进化提示词。
"""
import argparse, json, os, datetime

LOG_PATH = os.path.join(os.path.dirname(__file__), "prompt-log.jsonl")


def record(source_id, source_prompt, user_prompt, dna, image_url, db_id, table):
    rec = {
        "ts": datetime.datetime.now().isoformat(timespec="seconds"),
        "source_id": source_id,
        "source_prompt": source_prompt,
        "user_prompt": user_prompt,
        "dna": dna if isinstance(dna, dict) else json.loads(dna or "{}"),
        "image_url": image_url,
        "db_id": db_id,
        "table": table,
    }
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    return rec


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-id", default="")
    ap.add_argument("--source-prompt", default="")
    ap.add_argument("--user-prompt", default="")
    ap.add_argument("--dna", default="{}")
    ap.add_argument("--image-url", default="")
    ap.add_argument("--db-id", type=int, default=None)
    ap.add_argument("--table", default="beauty")
    args = ap.parse_args()

    rec = record(args.source_id, args.source_prompt, args.user_prompt,
                 args.dna, args.image_url, args.db_id, args.table)
    print("✅ 已记录提示词演化轨迹:")
    print(json.dumps(rec, ensure_ascii=False, indent=2))
    print(f"\n累计记录行数: {sum(1 for _ in open(LOG_PATH, encoding='utf-8'))}")


if __name__ == "__main__":
    main()
