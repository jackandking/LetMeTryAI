#!/usr/bin/env python3
"""家长爱 · 每日迭代引擎。

读「最近一个完整 UTC 自然日」的 /api/track/summary，按 pl.<ideaId>.<topic> 约定
提取家长爱匿名信号，经样本量门槛与护栏过滤后聚合到创意 DNA 维度，产出 seeds 与日报。

三条硬约束：
1. fail-closed：零信号 / 样本不足 / 拉取失败时绝不编造 champion，seeds 保持不动。
2. 只读远端：仅 GET /api/track/summary，不调用任何写接口、不收集孩子身份。
3. 红线优先：命中护栏或文案红线时拦截该候选，增长指标不能覆盖红线。

用法：
    python3 daily.py                       # 正常跑（UTC 昨天）
    python3 daily.py --date 2026-11-15     # 指定日
    python3 daily.py --dry-run             # 只打印与写报告，不更新 seeds/state、不推送
    python3 daily.py --auto-push           # champion 变化时才 commit+push seeds.json
"""
import argparse
import datetime as dt
import html
import json
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

UTC = dt.timezone.utc
FLY = Path(__file__).resolve().parent
REPO = FLY.parent.parent
SEEDS_PATH = FLY / "seeds.json"
CONFIG_PATH = FLY / "config.json"
REDLINES_PATH = FLY / "redlines.json"
STATE_PATH = FLY / "state.json"
REPORT_DIR = FLY / "reports"


def load_json(path, default=None):
    """安全读 JSON；失败返回 default。"""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        print(f"[warn] 读取 {path.name} 失败: {exc}", file=sys.stderr)
        return default


def previous_utc_day():
    """返回最近一个完整 UTC 自然日（UTC 昨天）。"""
    return (dt.datetime.now(UTC) - dt.timedelta(days=1)).strftime("%Y-%m-%d")


def fetch_summary(date_str, url):
    """只读拉取事件汇总。返回 (data, error)。"""
    req = urllib.request.Request(
        f"{url}?date={date_str}",
        headers={"User-Agent": "parent-love-flywheel/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            data = json.loads(resp.read().decode("utf-8"))
        if not isinstance(data, dict) or "apps" not in data:
            raise ValueError("返回结构缺少 apps 字段")
        return data, None
    except (urllib.error.URLError, ValueError, json.JSONDecodeError) as exc:
        return None, str(exc)


def rate(numerator, denominator):
    """计算比率，分母为 0 时返回 0。"""
    return round(numerator / denominator, 4) if denominator else 0.0


def check_copy(idea, redlines):
    """检查候选文案红线，返回 (field, term) 命中列表。"""
    hits = []
    fields = ("hook", "artifact", "share_line")
    kinds = ("scoring_words", "identity_words", "anxiety_words")
    for field in fields:
        text = str(idea.get(field, ""))
        for kind in kinds:
            for term in redlines.get(kind, []):
                if term in text:
                    hits.append((field, term))
    return hits


def evaluate(summary, config, seeds, redlines, date_str):
    """聚合信号、计算分数、生成维度榜与冠军候选。"""
    prefix = config["app_id_prefix"]
    thresholds = config["thresholds"]
    weights = config["weights"]
    guardrails = config["guardrails"]
    idea_by_id = {idea["id"]: idea for idea in seeds["ideas"]}

    raw = {}
    unmapped = []
    signal_total = 0
    for app_id, events in summary.get("apps", {}).items():
        if not app_id.startswith(prefix):
            continue
        parts = app_id.split(".")
        idea_id = parts[1] if len(parts) > 1 else ""
        count = sum(events.values() if isinstance(events, dict) else [])
        signal_total += count
        if idea_id not in idea_by_id:
            unmapped.append(app_id)
            continue
        slot = raw.setdefault(idea_id, {"app_ids": [], "events": {}})
        for event, n in (events.items() if isinstance(events, dict) else []):
            slot["events"][event] = slot["events"].get(event, 0) + n
        slot["app_ids"].append(app_id)

    rows = []
    for idea_id, slot in raw.items():
        events = slot["events"]
        page = events.get("page_load", 0)
        result = events.get("result_shown", 0)
        saved = events.get("card_saved", 0)
        share_tap = events.get("share_tap", 0)
        share_done = events.get("share_open_first_complete", 0)
        first = events.get("first_task_complete", 0)
        abort = events.get("abort", 0)
        negative = events.get("negative_feedback", 0)
        total = sum(events.values())

        metrics = {
            "result_shown": result,
            "artifact_save_rate": rate(saved, result),
            "share_completion": rate(share_done, share_tap),
            "first_task_completion": rate(first, page),
            "abort_rate": rate(abort, result),
            "negative_feedback": negative,
            "signal_events": total,
        }
        gaps = []
        if total < thresholds["min_signal_events"]:
            gaps.append(f"事件数 {total} < {thresholds['min_signal_events']}")
        if result < thresholds["min_result_shown"]:
            gaps.append(f"结果展示 {result} < {thresholds['min_result_shown']}")

        blockers = []
        if metrics["abort_rate"] > guardrails["max_abort_rate"]:
            blockers.append(f"中断率 {metrics['abort_rate']:.1%} 超红线")
        if guardrails["block_on_negative_feedback"] and negative > 0:
            blockers.append(f"出现 {negative} 条负反馈")
        copy_hits = check_copy(idea_by_id[idea_id], redlines)

        score = round(
            weights["artifact_save_rate"] * metrics["artifact_save_rate"]
            + weights["share_completion"] * metrics["share_completion"]
            + weights["first_task_completion"] * metrics["first_task_completion"],
            4,
        )
        rows.append({
            "idea_id": idea_id,
            "name": idea_by_id[idea_id]["name"],
            "app_ids": slot["app_ids"],
            "metrics": metrics,
            "score": score,
            "gaps": gaps,
            "blockers": blockers,
            "copy_hits": copy_hits,
        })

    qualified = [
        r for r in rows
        if not r["gaps"] and not r["blockers"] and not r["copy_hits"] and r["score"] > 0
    ]
    qualified.sort(key=lambda r: r["score"], reverse=True)

    leaderboard = {dim: {} for dim in seeds["dna_dimensions"]}
    for row in qualified:
        dna = idea_by_id[row["idea_id"]]["dna"]
        for dim, value in dna.items():
            if dim not in leaderboard:
                continue
            bucket = leaderboard[dim].setdefault(value, {"sum": 0.0, "n": 0})
            bucket["sum"] += row["score"]
            bucket["n"] += 1
    ranked_dimensions = {}
    for dim, values in leaderboard.items():
        items = [
            {
                "value": value,
                "score": round(stats["sum"] / stats["n"], 4),
                "n": stats["n"],
            }
            for value, stats in values.items()
        ]
        items.sort(key=lambda item: item["score"], reverse=True)
        ranked_dimensions[dim] = items[:5]

    champions = [
        {
            "idea_id": row["idea_id"],
            "name": row["name"],
            "score": row["score"],
            "metrics": row["metrics"],
            "app_ids": row["app_ids"],
            "dna": idea_by_id[row["idea_id"]]["dna"],
            "date": date_str,
        }
        for row in qualified[:3]
    ]
    return {
        "rows": rows,
        "champions": champions,
        "ranked_dimensions": ranked_dimensions,
        "signal_total": signal_total,
        "unmapped": unmapped,
    }


def pick_experiment(config, state):
    """零信号期按固定队列轮转，每天推进一个待验证假设。"""
    order = config["experiment_queue_order"]
    cursor = int(state.get("experiment_cursor", 0)) % len(order)
    return order[cursor], (cursor + 1) % len(order)


def inline(text):
    """行内 Markdown：粗体与代码。"""
    escaped = html.escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    return escaped


def render_table(rows):
    """把连续的 Markdown 表格行渲染为 HTML 表格。"""
    parsed = [[cell.strip() for cell in row.strip().strip("|").split("|")] for row in rows]
    if len(parsed) >= 2 and all(set(cell) <= set("-: ") for cell in parsed[1]):
        header, body = parsed[0], parsed[2:]
    else:
        header, body = parsed[0], parsed[1:]
    th = "".join(f"<th>{inline(cell)}</th>" for cell in header)
    trs = "".join(
        "<tr>" + "".join(f"<td>{inline(cell)}</td>" for cell in row) + "</tr>"
        for row in body
    )
    return f"<table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>"


def md_to_html(lines):
    """极简 Markdown 渲染：标题 / 表格 / 列表 / 引用 / 段落。"""
    out = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line:
            index += 1
            continue
        if line.startswith("### "):
            out.append(f"<h3>{inline(line[4:])}</h3>")
            index += 1
            continue
        if line.startswith("## "):
            out.append(f"<h2>{inline(line[3:])}</h2>")
            index += 1
            continue
        if line.startswith("# "):
            index += 1
            continue
        if line.startswith("|"):
            rows = []
            while index < len(lines) and lines[index].startswith("|"):
                rows.append(lines[index])
                index += 1
            out.append(render_table(rows))
            continue
        if line.startswith("- "):
            items = []
            while index < len(lines) and lines[index].startswith("- "):
                items.append(lines[index][2:])
                index += 1
            out.append("<ul>" + "".join(f"<li>{inline(item)}</li>" for item in items) + "</ul>")
            continue
        if line.startswith("> "):
            out.append(f"<blockquote>{inline(line[2:])}</blockquote>")
            index += 1
            continue
        out.append(f"<p>{inline(line)}</p>")
        index += 1
    return "\n".join(out)


def build_report(date_str, mode, result, config, seeds, idea, copy_hits, state, error):
    """生成 Markdown 与 HTML 日报。"""
    lines = [
        f"# 家长爱 · 每日迭代日报（{date_str}）",
        "",
        f"**模式**：{mode}　|　**数据源**：`{config['track_summary_url']}`（只读）",
        "",
    ]
    if error:
        lines += [f"> 拉取失败：{error}", "", "> FAIL-CLOSED：未写入 seeds，未推进实验队列。", ""]
    else:
        lines += [
            f"**家长爱信号**：{result['signal_total']} 条"
            f"（映射到创意 {len(result['rows'])} 个，未映射 {len(result['unmapped'])} 个）",
            "",
        ]

    lines += ["## 信号明细", ""]
    if result["rows"]:
        lines += [
            "| 创意 | appId | 事件 | 结果展示 | 存图率 | 分享完成 | 首任务完成 | 分数 | 状态 |",
            "|---|---|---:|---:|---:|---:|---:|---:|---|",
        ]
        for row in result["rows"]:
            status = "拦截: " + "；".join(row["blockers"] + [f"文案 {f}={t}" for f, t in row["copy_hits"]]) \
                if (row["blockers"] or row["copy_hits"]) else \
                ("样本不足: " + "；".join(row["gaps"]) if row["gaps"] else "合格")
            metrics = row["metrics"]
            lines.append(
                "| {name} | {apps} | {total} | {shown} | {save:.0%} | {share:.0%} | "
                "{first:.0%} | {score:.3f} | {status} |".format(
                    name=row["name"],
                    apps=", ".join(row["app_ids"]),
                    total=metrics["signal_events"],
                    shown=metrics["result_shown"],
                    save=metrics["artifact_save_rate"],
                    share=metrics["share_completion"],
                    first=metrics["first_task_completion"],
                    score=row["score"],
                    status=status,
                )
            )
    else:
        lines += ["| 创意 | appId | 事件 | 状态 |", "|---|---|---:|---|",
                  "| — | — | 0 | 零信号（家长爱尚未接入埋点或当日无访问） |"]
    lines.append("")

    if mode == "EVOLVE":
        lines += ["## 进化结果", "", "| 冠军 | 分数 | DNA |", "|---|---:|---|"]
        for champ in result["champions"]:
            lines.append(
                f"| {champ['name']}（{champ['idea_id']}） | {champ['score']:.3f} | "
                f"{json.dumps(champ['dna'], ensure_ascii=False)} |"
            )
        lines += ["", "### 胜出维度", ""]
        for dim, items in result["ranked_dimensions"].items():
            if items:
                top = "、".join(f"{item['value']}（{item['score']:.3f}）" for item in items[:3])
                lines.append(f"- **{dim}**：{top}")
        lines += ["", "## 今日动作", "", "1. 按冠军 DNA 扩产下一批卡片，一次只扩一个维度。",
                  "2. 保留对照：同话题的旧结果页不要立刻下线，比较存图率。",
                  "3. 明日回看：冠军是否连续两天领先，再决定是否全量铺开。"]
    else:
        lines += [
            "## 今日候选（实验队列，不是冠军）",
            "",
            f"**{idea['id']} · {idea['name']}** — {idea['hook']}",
            "",
            f"- 结果物：{idea['artifact']}",
            f"- 分享句式：{idea['share_line']}",
            f"- DNA：{json.dumps(idea['dna'], ensure_ascii=False)}",
            f"- 风险：{idea['risk']}",
            "",
            "### 红线复核",
            "",
        ]
        if copy_hits:
            lines += ["**未通过**，命中：" + "、".join(f"{field}={term}" for field, term in copy_hits),
                      "", "> 候选被拦截，不进入发布队列。先改文案再推进。"]
        else:
            lines += ["通过：未命中评分 / 身份 / 焦虑类红线。"]
        lines += [
            "",
            "## 今日动作",
            "",
            f"1. 把候选落成最小页面：`<meta name=\"pl-app\" content=\"pl.{idea['id']}.<topic>\">`。",
            "2. 结果容器加 `data-pl-result`，存图与分享按钮加 `data-pl-event`。",
            "3. 明天看 `result_shown → card_saved`：样本满 20 才允许进入数据进化模式。",
        ]

    lines += [
        "",
        "## 护栏与机制说明",
        "",
        f"- 存图率权重 {config['weights']['artifact_save_rate']}，分享完成 "
        f"{config['weights']['share_completion']}，首任务完成 {config['weights']['first_task_completion']}。",
        f"- 中断率红线 {config['guardrails']['max_abort_rate']:.0%}；出现负反馈直接拦截。",
        "- 零信号时只推进实验队列，不编造冠军；拉取失败时连队列也不推进（fail-closed）。",
        f"- 连续零信号天数：{state.get('consecutive_zero_days', 0)}；下次实验游标：{state.get('experiment_cursor', 0)}。",
        "",
    ]
    markdown = "\n".join(lines)

    body = md_to_html(lines)
    report_html = f"""<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>家长爱 · 每日迭代日报 {date_str}</title>
<style>
body{{margin:0;padding:32px;background:#f7f8fa;color:#1f2329;font:15px/1.7 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}}
.wrap{{max-width:1000px;margin:0 auto;background:#fff;border:1px solid #e5e6eb;border-radius:12px;padding:28px 34px}}
h1{{font-size:24px;margin:0 0 18px;color:#1f2329}}
p{{margin:6px 0;white-space:pre-wrap;word-break:break-word}}
code{{background:#f2f3f5;padding:2px 6px;border-radius:4px;font-size:13px}}
h2{{font-size:18px;margin:22px 0 10px;padding-left:10px;border-left:3px solid #1664ff}}
h3{{font-size:15px;margin:16px 0 8px;color:#4e5969}}
ul{{margin:6px 0;padding-left:22px}}
li{{margin:4px 0}}
blockquote{{margin:8px 0;padding:8px 14px;background:#fff7e8;border-left:3px solid #ff7d00;color:#874d00}}
table{{border-collapse:collapse;width:100%;margin:10px 0;font-size:13px}}
th,td{{border:1px solid #e5e6eb;padding:7px 10px;text-align:left;vertical-align:top}}
th{{background:#f2f3f5;font-weight:600;white-space:nowrap}}
.badge{{display:inline-block;padding:4px 12px;border-radius:20px;font-size:13px;font-weight:600;background:#e8f3ff;color:#1664ff}}
.badge.evolve{{background:#e8ffea;color:#0a8f3c}}
.badge.error{{background:#ffece8;color:#d92b2b}}
</style></head><body><div class="wrap">
<h1>家长爱 · 每日迭代日报 <span class="badge {'evolve' if mode == 'EVOLVE' else ('error' if error else '')}">{html.escape(mode)}</span></h1>
{body}
</div></body></html>"""
    return markdown, report_html


def save_report(date_str, markdown, report_html, dry_run):
    """日报写入本地 reports/（不进 git）。"""
    REPORT_DIR.mkdir(parents=True, exist_ok=True)
    suffix = ".dryrun" if dry_run else ""
    md_path = REPORT_DIR / f"{date_str}{suffix}.md"
    html_path = REPORT_DIR / f"{date_str}{suffix}.html"
    md_path.write_text(markdown, encoding="utf-8")
    html_path.write_text(report_html, encoding="utf-8")
    return md_path, html_path


def auto_push(seeds_path, champions):
    """仅在 champion 变化时 commit+push 指定文件；不碰工作区其它改动。"""
    rel = str(seeds_path.relative_to(REPO))
    rc, out, _ = git(["show", f"HEAD:{rel}"], REPO)
    old = []
    if rc == 0:
        try:
            old = json.loads(out).get("champion_seeds", [])
        except Exception:  # noqa: BLE001
            old = []
    signature = lambda items: json.dumps(items, sort_keys=True, ensure_ascii=False)
    if signature(old) == signature(champions):
        print("[auto-push] champion 未变化，跳过推送（工作区保持干净）")
        return False
    git(["add", rel], REPO)
    rc, _, err = git(["commit", "-m", "chore(parent-love): auto-update flywheel seeds"], REPO)
    if rc != 0:
        print(f"[auto-push] commit 失败: {err}", file=sys.stderr)
        return False
    rc, _, err = git(["push", "origin", "main"], REPO)
    if rc != 0:
        print(f"[auto-push] push 失败（未自动 rebase，避免触碰他人 WIP）: {err}", file=sys.stderr)
        return False
    print("[auto-push] 已推送，GH Pages 约 80s 后生效")
    return True


def git(args, cwd):
    """执行 git 子命令，返回 (returncode, stdout, stderr)。"""
    result = subprocess.run(["git", "-C", str(cwd)] + args, capture_output=True, text=True)
    return result.returncode, result.stdout.strip(), result.stderr.strip()


def main():
    """入口。"""
    parser = argparse.ArgumentParser(description="家长爱每日迭代引擎")
    parser.add_argument("--date", default=previous_utc_day(), help="统计日期（默认 UTC 昨天）")
    parser.add_argument("--dry-run", action="store_true", help="不更新 seeds/state、不推送")
    parser.add_argument("--auto-push", action="store_true", help="champion 变化时才推送 seeds.json")
    args = parser.parse_args()

    config = load_json(CONFIG_PATH, {})
    seeds = load_json(SEEDS_PATH, {})
    redlines = load_json(REDLINES_PATH, {})
    state = load_json(STATE_PATH, {})
    if not config or not seeds or not redlines:
        print("[fatal] config/seeds/redlines 读取失败", file=sys.stderr)
        return 2

    summary, error = fetch_summary(args.date, config["track_summary_url"])
    result = evaluate(summary or {}, config, seeds, redlines, args.date) if summary else {
        "rows": [], "champions": [], "ranked_dimensions": {}, "signal_total": 0, "unmapped": [],
    }

    has_qualified = bool(result["champions"])
    mode = "ERROR" if error else ("EVOLVE" if has_qualified else "EXPERIMENT")
    same_day = state.get("last_run_date") == args.date
    if mode == "EXPERIMENT":
        if same_day and state.get("current_experiment_id"):
            # 同一天重跑（例如 launchd 失败后重试）不重复推进队列
            idea_id = state["current_experiment_id"]
            next_cursor = state.get("experiment_cursor", 0)
        else:
            idea_id, next_cursor = pick_experiment(config, state)
    else:
        idea_id, next_cursor = (None, state.get("experiment_cursor", 0))

    idea = next((item for item in seeds["ideas"] if item["id"] == idea_id), None) if idea_id else None
    copy_hits = check_copy(idea, redlines) if idea else []
    markdown, report_html = build_report(args.date, mode, result, config, seeds, idea, copy_hits, state, error)
    md_path, html_path = save_report(args.date, markdown, report_html, args.dry_run)

    new_state = dict(state)
    new_state.update({
        "last_run_date": args.date,
        "last_run_at": dt.datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "mode": mode,
        "signal_total": result["signal_total"],
        "consecutive_zero_days": (
            0 if has_qualified
            else int(state.get("consecutive_zero_days", 0)) + (0 if same_day else 1)
        ),
        "last_champion_ids": [c["idea_id"] for c in result["champions"]],
        "experiment_cursor": next_cursor,
        "current_experiment_id": idea_id,
    })
    if error:
        new_state["last_error"] = error

    pushed = False
    if not args.dry_run:
        STATE_PATH.write_text(json.dumps(new_state, ensure_ascii=False, indent=2), encoding="utf-8")
        if has_qualified:
            seeds["updated_at"] = dt.datetime.now(UTC).isoformat().replace("+00:00", "Z")
            seeds["source"] = "daily.py"
            seeds["dimension_leaderboard"] = result["ranked_dimensions"]
            seeds["champion_seeds"] = result["champions"]
            for item in seeds["ideas"]:
                row = next((r for r in result["rows"] if r["idea_id"] == item["id"]), None)
                item["score"] = row["score"] if row else None
                item["app_ids"] = row["app_ids"] if row else []
                if row:
                    item["last_seen_date"] = args.date
            SEEDS_PATH.write_text(json.dumps(seeds, ensure_ascii=False, indent=2), encoding="utf-8")
            if args.auto_push:
                pushed = auto_push(SEEDS_PATH, result["champions"])

    print(f"[{mode}] {args.date} signals={result['signal_total']} champions={len(result['champions'])}")
    print(f"[report] {md_path}")
    print(f"[report] {html_path}")
    if args.dry_run:
        print("[dry-run] seeds/state 未更新")
    if pushed:
        print("[auto-push] seeds 已推送")
    return 2 if error else 0


if __name__ == "__main__":
    sys.exit(main())
