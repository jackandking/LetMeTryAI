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

# Topic Deduplication Check for nanrenbao
if [[ "$PROFILE_ID" == "nanrenbao" ]]; then
    echo ""
    echo "[run-daily-profile] Checking recent topics for nanrenbao..."
    
    # Get recent topics (last 3 days)
    recent_apps=$(git log --since="3 days ago" --name-status --diff-filter=A -- "*/app.js" 2>/dev/null | \
        grep "^A" | \
        awk '{print $2}' | \
        xargs -I {} dirname {} | \
        sort -u | \
        grep -v "^\.$" | \
        grep -v "node_modules" | \
        grep -v "templates" || true)
    
    if [[ -n "$recent_apps" ]]; then
        echo "[run-daily-profile] Recent nanrenbao apps (3 days):"
        echo "$recent_apps" | while read -r app; do
            if [[ -f "$app/index.html" ]]; then
                title=$(grep -o '<title>[^<]*</title>' "$app/index.html" 2>/dev/null | sed 's/<title>//;s/<\/title>//' | head -1)
                echo "  - $app: ${title:-"N/A"}"
            fi
        done
        
        # Check for duplicate keywords
        sports_count=$(echo "$recent_apps" | grep -c -E "(球星|球员|足球|篮球|NBA|sport|baller)" || true)
        military_count=$(echo "$recent_apps" | grep -c -E "(战机|坦克|军事|装备|fighter|jet|tank)" || true)
        
        echo ""
        if [[ "$sports_count" -ge 2 ]]; then
            echo "⚠️  WARNING: $sports_count sports-related apps in last 3 days"
            echo "    Consider choosing a different category (military, tech, car, outdoor)"
        fi
        if [[ "$military_count" -ge 2 ]]; then
            echo "⚠️  WARNING: $military_count military-related apps in last 3 days"
            echo "    Consider choosing a different category"
        fi
        
        # Export for daily-orchestrator.js to use
        export NANRENBAO_RECENT_APPS="$recent_apps"
        export NANRENBAO_SPORTS_COUNT="$sports_count"
        export NANRENBAO_MILITARY_COUNT="$military_count"
    fi
    
    echo ""
    echo "[run-daily-profile] Topic diversity hint:"
    echo "  Rotating categories: 军事装备 → 科技数码 → 汽车机械 → 户外探险 → 历史军事 → 游戏电竞 → 收藏爱好"
    echo ""
fi

exec ./daily_run.sh
