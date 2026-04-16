#!/bin/bash
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HARNESS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_DIR="$(cd "$HARNESS_DIR/.." && pwd)"

usage() {
    cat <<'EOF'
Usage: .harness/scripts/run-topic-selector.sh <profile-id>

Runs the standalone daily topic selector for a profile.
Fetches trending topics, generates AI candidates, applies keyword dedup,
and pushes the selected topic to the manual topic queue.
EOF
}

PROFILE_ID="${1:-}"
if [[ -z "$PROFILE_ID" ]]; then
    usage >&2
    exit 1
fi

export PROJECT_DIR
export HARNESS_MODE="${HARNESS_MODE:-production}"

REPORT_TO="${TOPIC_SELECTOR_REPORT_TO:-jackandking@163.com}"
PYTHON_BIN="${DAILY_PYTHON_BIN:-$(command -v python3 || echo /usr/bin/python3)}"
SEND_EMAIL_SCRIPT="$PROJECT_DIR/.automation/scripts/send_email.py"

RUN_LOG_DIR="$PROJECT_DIR/.harness/.local/logs"
mkdir -p "$RUN_LOG_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
RUN_LOG_FILE="$RUN_LOG_DIR/daily-topic-selector-${PROFILE_ID}-${TIMESTAMP}.log"

cd "$HARNESS_DIR"

echo "[run-topic-selector] profile=$PROFILE_ID"
echo "[run-topic-selector] mode=$HARNESS_MODE"
echo "[run-topic-selector] report_to=$REPORT_TO"

EXIT_CODE=0
if [[ -x "$HARNESS_DIR/node_modules/.bin/tsx" ]]; then
    "$HARNESS_DIR/node_modules/.bin/tsx" scripts/daily-topic-selector.ts "$PROFILE_ID" 2>&1 | tee "$RUN_LOG_FILE" || EXIT_CODE=$?
else
    npx --yes tsx scripts/daily-topic-selector.ts "$PROFILE_ID" 2>&1 | tee "$RUN_LOG_FILE" || EXIT_CODE=$?
fi

# Build report email body
EMAIL_BODY_FILE="$(mktemp)"
if [[ "$EXIT_CODE" -ne 0 ]]; then
    cat > "$EMAIL_BODY_FILE" <<EOF
Topic Selector Report — $PROFILE_ID
Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Status: FAILED (exit code $EXIT_CODE)

Log file: $RUN_LOG_FILE

--- Last 80 lines of output ---
$(tail -n 80 "$RUN_LOG_FILE" 2>/dev/null || cat "$RUN_LOG_FILE" 2>/dev/null)
EOF
else
    cat > "$EMAIL_BODY_FILE" <<EOF
Topic Selector Report — $PROFILE_ID
Date: $(date -u '+%Y-%m-%d %H:%M:%S UTC')
Status: SUCCESS

Log file: $RUN_LOG_FILE

--- Output ---
$(cat "$RUN_LOG_FILE" 2>/dev/null)
EOF
fi

# Send email report (best effort)
if [[ -f "$SEND_EMAIL_SCRIPT" ]]; then
    EMAIL_SUBJECT="[Topic Selector] ${PROFILE_ID} — $([ "$EXIT_CODE" -eq 0 ] && echo 'SUCCESS' || echo 'FAILED')"
    echo "[run-topic-selector] Sending email report to $REPORT_TO ..."
    "$PYTHON_BIN" "$SEND_EMAIL_SCRIPT" "$EMAIL_SUBJECT" "$REPORT_TO" "$EMAIL_BODY_FILE" >/dev/null 2>&1 || {
        echo "[run-topic-selector] WARNING: Failed to send email report" >&2
    }
else
    echo "[run-topic-selector] WARNING: send_email.py not found at $SEND_EMAIL_SCRIPT" >&2
fi

rm -f "$EMAIL_BODY_FILE"

if [[ "$EXIT_CODE" -ne 0 ]]; then
    echo "[run-topic-selector] FAILED with exit code $EXIT_CODE"
    exit "$EXIT_CODE"
fi

echo "[run-topic-selector] completed successfully"
