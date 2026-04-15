#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
HARNESS_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
LOCAL_ENV="$HARNESS_DIR/.local/state/kuaishou-follow/cron.env"
DEFAULT_ENV="$HARNESS_DIR/.env"
LOG_DIR="$HARNESS_DIR/.local/logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="$LOG_DIR/kuaishou-follow-worker-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

if [ -f "$DEFAULT_ENV" ]; then
  set -a
  . "$DEFAULT_ENV"
  set +a
fi

if [ -f "$LOCAL_ENV" ]; then
  set -a
  . "$LOCAL_ENV"
  set +a
fi

cd "$HARNESS_DIR"
exec npm run kuaishou:follow -- run-hourly >> "$LOG_FILE" 2>&1
