#!/bin/bash
# 男人宝飞轮 · 控制塔：每日只读巡检 + 合并日报 + 告警
# 调度：com.letmetry.flywheel-control-tower.plist（每日 09:30，于 evolve 之后）
# 本脚本只做"检查/报告/告警"，不触发任何生产动作。
set -u
REPO="/Users/jak/LetMeTryAI"
SCRIPT="$REPO/.harness/scripts/nanrenbao-control-tower.mjs"
NODE="/Users/jak/.workbuddy/binaries/node/versions/22.22.2-6/bin/node"
LOG="$REPO/.automation/reports/control-tower.cron.log"

# WorkBuddy 升级 node 后带版本号的绝对路径会失效：回退到已装的最新版本，再退到 PATH
if [ ! -x "$NODE" ]; then
  NODE="$(ls -1 /Users/jak/.workbuddy/binaries/node/versions/*/bin/node 2>/dev/null | sort | tail -1)"
fi
if [ ! -x "$NODE" ]; then NODE="$(command -v node 2>/dev/null || true)"; fi
if [ ! -x "$NODE" ]; then echo "node not found (check WorkBuddy node install)" >&2; exit 1; fi

export PATH="$(dirname "$NODE"):$PATH"
cd "$REPO" || exit 1
mkdir -p "$REPO/.automation/reports"

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$TS === run ===" >> "$LOG"
"$NODE" "$SCRIPT" >> "$LOG" 2>&1
echo "$TS === done (exit=$?) ===" >> "$LOG"
