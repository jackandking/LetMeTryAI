#!/bin/bash
set -uo pipefail

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

# Unify all output into the per-run log file
exec > "$LOG_FILE" 2>&1

export PROJECT_DIR
export HARNESS_MODE="${HARNESS_MODE:-production}"
export HARNESS_CRON_LOG_FILE="$LOG_FILE"

cd "$HARNESS_DIR"

echo "[run-daily-app-cron] profile=$PROFILE_ID"
echo "[run-daily-app-cron] mode=$HARNESS_MODE"
echo "[run-daily-app-cron] log_file=$HARNESS_CRON_LOG_FILE"

EXIT_CODE=0
if [[ -x "$HARNESS_DIR/node_modules/.bin/tsx" ]]; then
    "$HARNESS_DIR/node_modules/.bin/tsx" scripts/run-daily-app-profile.ts "$PROFILE_ID" || EXIT_CODE=$?
else
    npx --yes tsx scripts/run-daily-app-profile.ts "$PROFILE_ID" || EXIT_CODE=$?
fi

if [[ "$EXIT_CODE" -ne 0 ]]; then
    echo "[run-daily-app-cron] FAILED with exit code $EXIT_CODE"

    REPORT_TO="${DAILY_REPORT_TO:-${KUAISHOU_EMAIL_TO:-jackandking@163.com}}"
    if [[ -n "$REPORT_TO" ]]; then
        SUBJECT="[Alert] DailyAppAgent failed for $PROFILE_ID"
        BODY="Profile: $PROFILE_ID\nTime: $(date -Iseconds)\nExit code: $EXIT_CODE\n\nLog file: $LOG_FILE\n\nTail:\n$(tail -n 20 "$LOG_FILE" 2>/dev/null || echo 'N/A')"

        if command -v mail >/dev/null 2>&1; then
            echo -e "$BODY" | mail -s "$SUBJECT" "$REPORT_TO" && echo "[run-daily-app-cron] Alert email sent via mail command"
        else
            echo "[run-daily-app-cron] Could not send alert email (mail command not available)"
        fi
    fi

    exit "$EXIT_CODE"
fi

echo "[run-daily-app-cron] completed successfully"
