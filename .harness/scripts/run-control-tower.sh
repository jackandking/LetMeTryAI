#!/bin/bash
# 男人宝飞轮 · 控制塔：每日只读巡检 + 合并日报 + 告警
# 调度：com.letmetry.flywheel-control-tower.plist（每日 09:30，于 evolve 之后）
# 本脚本只做"检查/报告/告警"，不触发任何生产动作。
set -u
REPO="/Users/jak/LetMeTryAI"
SCRIPT="$REPO/.harness/scripts/nanrenbao-control-tower.mjs"
NODE="/Users/jak/.workbuddy/binaries/node/versions/22.22.2-6/bin/node"
LOG="$REPO/.automation/reports/control-tower.cron.log"

export PATH="/Users/jak/.workbuddy/binaries/node/versions/22.22.2-6/bin:$PATH"
cd "$REPO" || exit 1
mkdir -p "$REPO/.automation/reports"

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$TS === run ===" >> "$LOG"
"$NODE" "$SCRIPT" >> "$LOG" 2>&1
echo "$TS === done (exit=$?) ===" >> "$LOG"
