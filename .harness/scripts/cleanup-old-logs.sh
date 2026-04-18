#!/bin/bash
set -euo pipefail
#
# Cleanup old log files, keeping the last 30 days.
# Data files under .local/state/ are intentionally left untouched.
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

LOG_DIRS=(
  "$PROJECT_DIR/.automation/.local/logs"
  "$PROJECT_DIR/.automation/.local/logs/daily-orchestrator"
  "$PROJECT_DIR/.harness/.local/logs"
  "$PROJECT_DIR/.harness/.local/logs/daily-app-cron"
)

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$PROJECT_DIR/.harness/.local/logs/cleanup-old-logs-${TIMESTAMP}.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Unify all output into a single log file
exec > "$LOG_FILE" 2>&1

echo "[cleanup-old-logs] started at $(date -Iseconds)"

for dir in "${LOG_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    count=$(find "$dir" -maxdepth 1 -name "*.log" -type f -mtime +30 2>/dev/null | wc -l | tr -d ' ')
    if [ "$count" -gt 0 ]; then
      find "$dir" -maxdepth 1 -name "*.log" -type f -mtime +30 -delete
      echo "[cleanup-old-logs] deleted $count old log files from $dir"
    else
      echo "[cleanup-old-logs] no old logs to clean in $dir"
    fi
  else
    echo "[cleanup-old-logs] directory does not exist: $dir"
  fi
done

echo "[cleanup-old-logs] completed at $(date -Iseconds)"
