#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

usage() {
    cat <<'EOF'
Usage: scripts/run-daily-profile.sh <profile-id>

Runs the existing single-profile daily pipeline with per-profile runtime paths.

Environment overrides:
  DAILY_COPILOT_MODEL   Copilot model to use (default: gpt-5-mini)
  DAILY_REPORT_TO       Report recipient
  DAILY_REPORT_SUBJECT  Report subject
  DAILY_LOG_DIR         Per-profile orchestrator log directory
  EMAIL_DRAFT_PATH      Per-profile latest email draft path
  KUAISHOU_AUTH_FILE    Shared or per-profile auth state path
EOF
}

PROFILE_ID="${1:-}"
if [[ -z "$PROFILE_ID" ]]; then
    usage >&2
    exit 1
fi

SAFE_PROFILE_ID="$(printf '%s' "$PROFILE_ID" | tr -c 'a-zA-Z0-9-' '-')"
if [[ -z "$SAFE_PROFILE_ID" ]]; then
    echo "Invalid profile id: $PROFILE_ID" >&2
    exit 1
fi

cd "$PROJECT_DIR"

mkdir -p "$PROJECT_DIR/logs" "$PROJECT_DIR/.runtime/email-drafts"

export DAILY_PROFILE_ID="$PROFILE_ID"
export DAILY_COPILOT_MODEL="${DAILY_COPILOT_MODEL:-gpt-5-mini}"
export DAILY_LOG_DIR="${DAILY_LOG_DIR:-$PROJECT_DIR/logs/daily-orchestrator/$SAFE_PROFILE_ID}"
export EMAIL_DRAFT_PATH="${EMAIL_DRAFT_PATH:-$PROJECT_DIR/.runtime/email-drafts/${SAFE_PROFILE_ID}-latest.txt}"
export KUAISHOU_AUTH_FILE="${KUAISHOU_AUTH_FILE:-$PROJECT_DIR/.runtime/kuaishou_auth.json}"
export DAILY_REPORT_SUBJECT="${DAILY_REPORT_SUBJECT:-[Copilot Report] ${PROFILE_ID} Daily Update}"

mkdir -p "$DAILY_LOG_DIR"

echo "[run-daily-profile] profile=$DAILY_PROFILE_ID model=$DAILY_COPILOT_MODEL"
echo "[run-daily-profile] log_dir=$DAILY_LOG_DIR"
echo "[run-daily-profile] email_draft=$EMAIL_DRAFT_PATH"

git pull --ff-only
exec ./daily_run.sh
