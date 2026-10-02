#!/usr/bin/env python3
"""run-evolve.sh 的辅助：记录运行结果，并在推送时写 evolution-state.json + 本机通知 + 待发邮件草稿。

- last-run.json       : 本地人工查看用（pushed / champions / ts）
- evolution-state.json: 仅推送时更新并 push 到 GitHub，供云端 agent 邮件任务识别"何时变化"
- pending-email.json  : 推送时的邮件正文草稿（human 可读），便于 agent 直接发送
"""
import argparse
import datetime
import json
import os
import subprocess


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pushed", type=int, required=True)
    ap.add_argument("--fly", required=True)
    ap.add_argument("--repo", required=True)
    args = ap.parse_args()

    fly = args.fly
    repo = args.repo
    ts = datetime.datetime.utcnow().isoformat() + "Z"

    seeds_path = os.path.join(repo, "nanrenbao", "seeds.json")
    try:
        seeds = json.load(open(seeds_path, encoding="utf-8"))
    except Exception:
        seeds = {}
    champions = seeds.get("champion_seeds", [])

    last = {
        "pushed_at": ts if args.pushed else None,
        "pushed": bool(args.pushed),
        "champion_count": len(champions),
        "champions": champions,
        "source": "local-launchd",
    }
    open(os.path.join(fly, "last-run.json"), "w", encoding="utf-8").write(
        json.dumps(last, ensure_ascii=False, indent=2)
    )

    if not args.pushed:
        print("[record] 无推送，last-run 已更新")
        return

    # 推送时：写 evolution-state.json 并 push（GitHub 中介，供云端邮件任务读取）
    state = {
        "pushed_at": ts,
        "champion_count": len(champions),
        "champions": champions,
    }
    state_path = os.path.join(repo, "nanrenbao", "evolution-state.json")
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)

    rel = os.path.relpath(state_path, repo)
    subprocess.run(["git", "-C", repo, "pull", "--rebase", "--autostash", "origin", "main"], check=False)
    subprocess.run(["git", "-C", repo, "add", rel], check=False)
    subprocess.run(
        ["git", "-C", repo, "commit", "-m", "chore(flywheel): update evolution-state (pushed_at)"],
        check=False,
    )
    rc = subprocess.run(["git", "-C", repo, "push", "origin", "main"], check=False).returncode
    if rc != 0:  # 分叉再兜底一次
        subprocess.run(["git", "-C", repo, "pull", "--rebase", "--autostash", "origin", "main"], check=False)
        subprocess.run(["git", "-C", repo, "push", "origin", "main"], check=False)

    # 本机 macOS 通知
    try:
        subprocess.run(
            [
                "osascript",
                "-e",
                f'display notification "飞轮 seeds 已更新：{len(champions)} 个冠军 DNA" with title "男人宝飞轮"',
            ],
            check=False,
        )
    except Exception:
        pass

    # 待发邮件草稿（human 可读）
    lines = [
        f"男人宝飞轮：seeds.json 已自动更新（{ts}）",
        f"冠军 DNA 数量：{len(champions)}",
        "",
        "胜出维度组合：",
    ]
    for c in champions:
        title = c.get("title", "?")
        dna = c.get("dna", {})
        lines.append(f"- {title}: {json.dumps(dna, ensure_ascii=False)}")
    lines.append("")
    lines.append("（该更新已自动 push 到 GitHub，GH Pages 约 80s 后生效；skill 运行时 fetch 即生效，无需重发）")
    draft = {
        "pushed_at": ts,
        "summary": "\n".join(lines),
        "champions": champions,
    }
    with open(os.path.join(fly, "pending-email.json"), "w", encoding="utf-8") as f:
        json.dump(draft, f, ensure_ascii=False, indent=2)

    print(f"[record] 已推送 {ts}，{len(champions)} 个冠军，state+邮件草稿已生成")


if __name__ == "__main__":
    main()
