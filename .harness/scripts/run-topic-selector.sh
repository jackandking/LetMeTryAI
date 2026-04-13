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

cd "$HARNESS_DIR"

echo "[run-topic-selector] profile=$PROFILE_ID"
echo "[run-topic-selector] mode=$HARNESS_MODE"

EXIT_CODE=0
if [[ -x "$HARNESS_DIR/node_modules/.bin/tsx" ]]; then
    "$HARNESS_DIR/node_modules/.bin/tsx" scripts/daily-topic-selector.ts "$PROFILE_ID" || EXIT_CODE=$?
else
    npx --yes tsx scripts/daily-topic-selector.ts "$PROFILE_ID" || EXIT_CODE=$?
fi

if [[ "$EXIT_CODE" -ne 0 ]]; then
    echo "[run-topic-selector] FAILED with exit code $EXIT_CODE"
    exit "$EXIT_CODE"
fi

echo "[run-topic-selector] completed successfully"
