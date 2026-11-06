#!/bin/bash
# 男人宝 ④ 自有账号宣传视频 · 隔天发安全模板流水线（launchd 包装）
# 调度：com.letmetry.promo-video.plist（每日 09:15；脚本内部控隔天频）
set -u
REPO="/Users/jak/LetMeTryAI"
NODE="/Users/jak/.workbuddy/binaries/node/versions/22.22.2-6/bin/node"
SCRIPT="$REPO/.harness/scripts/promo/run-promo-video.mjs"
LOGDIR="$REPO/.harness/.local/state/promo-video"
LOG="$LOGDIR/run.log"

export PATH="/Users/jak/.workbuddy/binaries/node/versions/22.22.2-6/bin:$PATH"
export PROMO_NODE="$NODE"
cd "$REPO" || exit 1
mkdir -p "$LOGDIR"

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$TS === run ===" >> "$LOG"
"$NODE" "$SCRIPT" >> "$LOG" 2>&1
echo "$TS === done (exit=$?) ===" >> "$LOG"
