#!/bin/bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

REPORT_TO="${HOT_TASK_RECIPIENT:-jackandking@163.com}"
LOG_FILE="${HOT_TASK_PROMO_LOG_FILE:-$PROJECT_DIR/.harness/.local/logs/hot-task-promo.log}"

cd "$PROJECT_DIR"

mkdir -p "$(dirname "$LOG_FILE")"

echo "[run-hot-task-promo] starting at $(date -Iseconds)"
echo "[run-hot-task-promo] recipient=$REPORT_TO"

EXIT_CODE=0
node .harness/scripts/run-hot-task-promo.mjs --recipient "$REPORT_TO" >> "$LOG_FILE" 2>&1 || EXIT_CODE=$?

if [[ "$EXIT_CODE" -ne 0 ]]; then
    echo "[run-hot-task-promo] FAILED with exit code $EXIT_CODE"
    exit "$EXIT_CODE"
fi

echo "[run-hot-task-promo] completed successfully"
