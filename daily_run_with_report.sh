#!/bin/bash
# Daily Run Script with Kuaishou Report
# 日常任务 + 快手数据报告

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$SCRIPT_DIR}"
LOG_FILE="${LOG_FILE:-$PROJECT_DIR/logs/daily_run.log}"

if ! command -v node >/dev/null 2>&1; then
    echo "Error: node not found in PATH" >&2
    exit 1
fi

NODE_BIN="$(command -v node)"

# Create logs directory
mkdir -p "$(dirname "$LOG_FILE")"

echo "========================================" >> "$LOG_FILE"
echo "Daily Run Started: $(date)" >> "$LOG_FILE"
echo "Project Dir: $PROJECT_DIR" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Step 1: Run existing daily tasks
echo "[$(date)] Step 1: Running daily tasks..." >> "$LOG_FILE"
"$PROJECT_DIR/daily_run.sh" >> "$LOG_FILE" 2>&1
echo "[$(date)] Daily tasks completed" >> "$LOG_FILE"

# Step 2: Generate and send Kuaishou report
echo "[$(date)] Step 2: Generating Kuaishou report..." >> "$LOG_FILE"

cd "$PROJECT_DIR"
export KUAISHOU_EMAIL_TO="${KUAISHOU_EMAIL_TO:-jackandking@163.com}"
export HEADLESS="${HEADLESS:-true}"

"$NODE_BIN" "$PROJECT_DIR/scripts/daily_kuaishou_report.js" >> "$LOG_FILE" 2>&1

echo "[$(date)] Kuaishou report sent successfully" >> "$LOG_FILE"
echo "[$(date)] Daily run completed" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
