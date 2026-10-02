#!/bin/bash
# 男人宝飞轮：每日本地运行 evolve --auto-push
# 仅当 champion 变化时才 commit+push 到 GitHub（触发 GH Pages 重建）
# 推送成功时：记录 last-run.json + 写 evolution-state.json(供云端邮件任务读) + 本机通知 + 写待发邮件草稿
set -u
REPO="/Users/jak/LetMeTryAI"
FLY="$REPO/nanrenbao/flywheel"
PY="/Users/jak/.workbuddy/binaries/python/versions/3.13.12/bin/python3"
LOG="$FLY/evolve.cron.log"

export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o BatchMode=yes"

cd "$REPO" || exit 1
mkdir -p "$FLY"

OUT=$(PYTHONUNBUFFERED=1 "$PY" "$FLY/evolve.py" --out "$REPO/nanrenbao/seeds.json" --auto-push 2>&1)
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$TS === run ===" >> "$LOG"
echo "$OUT" >> "$LOG"

if echo "$OUT" | grep -q "已推送"; then
  PUSHED=1
else
  PUSHED=0
fi

"$PY" "$FLY/record-run.py" --pushed "$PUSHED" --fly "$FLY" --repo "$REPO" >> "$LOG" 2>&1
echo "$TS === done (pushed=$PUSHED) ===" >> "$LOG"
