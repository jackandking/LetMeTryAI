#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$PROJECT_DIR/.harness/.local/logs/daily-hot-task-image-gen-${TIMESTAMP}.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Unify all output into a single log file
exec > "$LOG_FILE" 2>&1

echo "[run-daily-hot-task-image-gen] starting at $(date -Iseconds)"

cd "$PROJECT_DIR"
"${DAILY_NODE_BIN:-$(command -v node)}" .harness/scripts/daily-hot-task-image-gen.mjs "$@"

echo "[run-daily-hot-task-image-gen] completed successfully"
