#!/bin/bash
# 男人宝飞轮 ⑤：每日综合度量日报（daily-kuaishou-report.js）
# 产出 kuaishou_report_<date>.{json,csv} + account_history.jsonl 到
# .harness/.local/exports/metrics/kuaishou/daily（控制塔 ③ 粉丝趋势与 ⑤ 日报在此读取）
# 依赖：daren.kuaishou.com cookie（.harness/.local/auth/kuaishou_auth.json）。
#   cookie 过期时脚本会退出并报 "Kuaishou session expired"，需用户重授权：
#   node .harness/scripts/ks-api-poc.js --sniff
set -u
REPO="/Users/jak/LetMeTryAI"
SCRIPT="$REPO/.harness/scripts/daily-kuaishou-report.js"
NODE="/Users/jak/.workbuddy/binaries/node/versions/22.22.2-6/bin/node"
LOGDIR="$REPO/.harness/.local/exports/metrics/kuaishou/daily"
LOG="$LOGDIR/daily-report.cron.log"

# WorkBuddy 升级 node 后带版本号的绝对路径会失效：回退到已装的最新版本，再退到 PATH
if [ ! -x "$NODE" ]; then
  NODE="$(ls -1 /Users/jak/.workbuddy/binaries/node/versions/*/bin/node 2>/dev/null | sort | tail -1)"
fi
if [ ! -x "$NODE" ]; then NODE="$(command -v node 2>/dev/null || true)"; fi
if [ ! -x "$NODE" ]; then echo "node not found (check WorkBuddy node install)" >&2; exit 1; fi

export PATH="$(dirname "$NODE"):$PATH"
cd "$REPO" || exit 1
mkdir -p "$LOGDIR"

TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
echo "$TS === run ===" >> "$LOG"
"$NODE" "$SCRIPT" >> "$LOG" 2>&1
echo "$TS === done (exit=$?) ===" >> "$LOG"
