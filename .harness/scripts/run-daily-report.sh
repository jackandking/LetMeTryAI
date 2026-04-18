#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR_OVERRIDE:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

REPORT_SCRIPT="${DAILY_REPORT_SCRIPT:-$PROJECT_DIR/.harness/scripts/daily-kuaishou-report.js}"
NODE_BIN="${DAILY_NODE_BIN:-$(command -v node)}"
GIT_BIN="${DAILY_GIT_BIN:-$(command -v git)}"
EMAIL_TO="${KUAISHOU_EMAIL_TO:-jackandking@163.com}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$PROJECT_DIR/.harness/.local/logs/daily-report-${TIMESTAMP}.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Unify all output into a single log file
exec > "$LOG_FILE" 2>&1

echo "[run-daily-report] started_at=$(date -u '+%Y-%m-%dT%H:%M:%SZ')"
echo "[run-daily-report] project_dir=$PROJECT_DIR"
echo "[run-daily-report] report_script=$REPORT_SCRIPT"
echo "[run-daily-report] node_bin=$NODE_BIN"
echo "[run-daily-report] git_bin=$GIT_BIN"
echo "[run-daily-report] email_to=$EMAIL_TO"

if [[ -z "$NODE_BIN" ]]; then
    echo "[run-daily-report] ERROR: node not found in PATH" >&2
    exit 1
fi

if [[ -z "$GIT_BIN" ]]; then
    echo "[run-daily-report] ERROR: git not found in PATH" >&2
    exit 1
fi

cd "$PROJECT_DIR"

echo "[run-daily-report] running git pull --ff-only"
"$GIT_BIN" pull --ff-only

echo "[run-daily-report] running daily-kuaishou-report.js"
exec env KUAISHOU_EMAIL_TO="$EMAIL_TO" LETMETRY_RUNTIME_DIR="$PROJECT_DIR/.harness/.local" "$NODE_BIN" "$REPORT_SCRIPT"
