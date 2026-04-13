#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

usage() {
    cat <<'EOF'
Usage: .harness/scripts/run-daily-app-cron.sh <profile-id>

Runs one harness daily-app workflow for cron.
It writes structured run summaries to .harness/.local/state/daily-app-runs/<profile>.jsonl
and expects stdout/stderr to be redirected by cron into a per-profile log file.
EOF
}

PROFILE_ID="${1:-}"
if [[ -z "$PROFILE_ID" ]]; then
    usage >&2
    exit 1
fi

SAFE_PROFILE_ID="$(printf '%s' "$PROFILE_ID" | tr -c 'a-zA-Z0-9-' '-')"
LOG_DIR="$PROJECT_DIR/.harness/.local/logs/daily-app-cron"
LOG_FILE="${HARNESS_CRON_LOG_FILE:-$LOG_DIR/${SAFE_PROFILE_ID}.log}"

mkdir -p "$LOG_DIR"

export PROJECT_DIR
export HARNESS_MODE="${HARNESS_MODE:-production}"
export HARNESS_CRON_LOG_FILE="$LOG_FILE"

cd "$HARNESS_DIR"

echo "[run-daily-app-cron] profile=$PROFILE_ID"
echo "[run-daily-app-cron] mode=$HARNESS_MODE"
echo "[run-daily-app-cron] log_file=$HARNESS_CRON_LOG_FILE"

if [[ -x "$HARNESS_DIR/node_modules/.bin/tsx" ]]; then
    exec "$HARNESS_DIR/node_modules/.bin/tsx" scripts/run-daily-app-profile.ts "$PROFILE_ID"
fi

exec npx --yes tsx scripts/run-daily-app-profile.ts "$PROFILE_ID"
