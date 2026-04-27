#!/bin/bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

REPORT_TO="${KUAISHOU_FOLLOW_REPORT_TO:-jackandking@163.com}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${SUCCESS_STORY_LOG_FILE:-$PROJECT_DIR/.harness/.local/logs/daily-success-story-${TIMESTAMP}.log}"

cd "$PROJECT_DIR"

mkdir -p "$(dirname "$LOG_FILE")"

# Load environment
if [ -f "$HARNESS_DIR/.local/state/kuaishou-follow/cron.env" ]; then
  set -a
  . "$HARNESS_DIR/.local/state/kuaishou-follow/cron.env"
  set +a
fi

if [ -f "$HARNESS_DIR/.env" ]; then
  set -a
  . "$HARNESS_DIR/.env"
  set +a
fi

exec >> "$LOG_FILE" 2>&1

echo "[run-daily-success-story] starting at $(date -Iseconds)"
echo "[run-daily-success-story] recipient=$REPORT_TO"

EXIT_CODE=0
node .harness/scripts/daily-success-story.mjs --recipient "$REPORT_TO" --publish-video "$@" || EXIT_CODE=$?

if [[ "$EXIT_CODE" -ne 0 ]]; then
    echo "[run-daily-success-story] FAILED with exit code $EXIT_CODE"
    exit "$EXIT_CODE"
fi

echo "[run-daily-success-story] completed successfully"
