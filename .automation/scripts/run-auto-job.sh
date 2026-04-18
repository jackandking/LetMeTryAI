#!/bin/bash
#
# run-auto-job.sh — Generic wrapper for auto cron jobs
#
# Handles: timestamped log files, execution timing, error capture
# Scripts stay pure (stdout/stderr), this wrapper manages logging.
#
# Usage:
#   run-auto-job.sh <job-name> [ENV=val...] <command...>
#
# Examples:
#   run-auto-job.sh log-scanner PROD_DIR=/path/to/prod node .automation/scripts/log-scanner-to-learning.js
#   run-auto-job.sh circuit-breaker PROD_DIR=/path/to/prod node .automation/scripts/circuit-breaker.js
#   run-auto-job.sh auto-run .automation/scripts/auto-run.sh
#

set -euo pipefail

JOB_NAME="${1:?Usage: run-auto-job.sh <job-name> [ENV=val...] <command...>}"
shift

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOG_DIR="$REPO_DIR/.automation/.local/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/${JOB_NAME}-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

# Extract ENV=val arguments, pass the rest as command
while [[ $# -gt 0 && "$1" == *=* && "$1" != */* ]]; do
  export "$1"
  shift
done

# Run the command, capture output to timestamped log
echo "[${JOB_NAME}] started at $(date -Iseconds)" > "$LOG_FILE"
echo "[${JOB_NAME}] command: $*" >> "$LOG_FILE"
echo "---" >> "$LOG_FILE"

START_TIME=$(date +%s)
EXIT_CODE=0
"$@" >> "$LOG_FILE" 2>&1 || EXIT_CODE=$?
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo "---" >> "$LOG_FILE"
echo "[${JOB_NAME}] finished at $(date -Iseconds) (${DURATION}s, exit=${EXIT_CODE})" >> "$LOG_FILE"

exit $EXIT_CODE
