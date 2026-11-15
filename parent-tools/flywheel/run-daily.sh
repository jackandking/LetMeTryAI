#!/bin/bash
# 家长爱飞轮：每日机械层（launchd 调用）
# 只读拉信号 -> 聚合 -> 写 seeds/state/日报；仅 champion 变化时 commit+push。
set -u
REPO="/Users/jak/LetMeTryAI"
FLY="$REPO/parent-tools/flywheel"
PY="/Users/jak/.workbuddy/binaries/python/versions/3.13.12/bin/python3"
[ -x "$PY" ] || PY="$(command -v python3)"
LOG="$FLY/daily.cron.log"

cd "$REPO" || exit 1
mkdir -p "$FLY"

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OUT=$(PYTHONUNBUFFERED=1 "$PY" "$FLY/daily.py" --auto-push 2>&1)
RC=$?

echo "$TS === run (rc=$RC) ===" >> "$LOG"
echo "$OUT" >> "$LOG"
echo "$OUT"
exit "$RC"
