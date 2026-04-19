#!/bin/bash
#
# sync-prod.sh — H00: Sync prod to latest origin/main before daily harness jobs
#
# Handles:
#   - Fast-forward pull (normal case)
#   - Unpushed local commits (push first, then pull)
#   - Diverged branches (rebase, abort + alert on conflict)
#   - Uncommitted changes (stash, pull, unstash)
#
# Runs at 00:00 daily, before H01 (00:05)
#

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$PROJECT_DIR/.harness/.local/logs"
LOG_FILE="$LOG_DIR/sync-prod-${TIMESTAMP}.log"
ALERT_EMAIL="${KUAISHOU_EMAIL_TO:-jackandking@163.com}"
SEND_EMAIL="$PROJECT_DIR/.harness/scripts/send-email.py"
PYTHON_BIN="${DAILY_PYTHON_BIN:-$(command -v python3 || echo /usr/bin/python3)}"

mkdir -p "$LOG_DIR"
exec > "$LOG_FILE" 2>&1

echo "[sync-prod] started at $(date -Iseconds)"
cd "$PROJECT_DIR"

# Step 1: Check for uncommitted changes
DIRTY=$(git status --porcelain 2>/dev/null | head -5)
STASHED=false
if [[ -n "$DIRTY" ]]; then
  echo "[sync-prod] Uncommitted changes detected, stashing..."
  git stash push -m "sync-prod auto-stash $TIMESTAMP" --quiet
  STASHED=true
fi

# Step 2: Check for unpushed local commits
LOCAL=$(git rev-parse HEAD 2>/dev/null)
git fetch origin main --quiet 2>/dev/null
REMOTE=$(git rev-parse origin/main 2>/dev/null)
BASE=$(git merge-base HEAD origin/main 2>/dev/null)

if [[ "$LOCAL" == "$REMOTE" ]]; then
  echo "[sync-prod] Already up to date"
elif [[ "$LOCAL" == "$BASE" ]]; then
  # Local is behind remote — fast-forward
  echo "[sync-prod] Fast-forwarding to origin/main..."
  git pull origin main --quiet
  echo "[sync-prod] Synced OK"
elif [[ "$REMOTE" == "$BASE" ]]; then
  # Local is ahead — push first
  echo "[sync-prod] Local is ahead of remote, pushing..."
  git push origin main --quiet && echo "[sync-prod] Pushed OK" || {
    echo "[sync-prod] Push failed — will retry tomorrow"
  }
else
  # Diverged — try rebase
  echo "[sync-prod] Branches diverged, attempting rebase..."
  if git pull --rebase origin main --quiet 2>/dev/null; then
    echo "[sync-prod] Rebase succeeded, pushing..."
    git push origin main --quiet && echo "[sync-prod] Pushed OK" || echo "[sync-prod] Push after rebase failed"
  else
    echo "[sync-prod] CONFLICT detected — aborting rebase"
    git rebase --abort 2>/dev/null

    # Send alert
    ALERT_FILE=$(mktemp)
    cat > "$ALERT_FILE" <<EOF
[sync-prod] Git conflict in prod directory

Time: $(date -Iseconds)
Directory: $PROJECT_DIR
Local HEAD: $LOCAL
Remote HEAD: $REMOTE
Merge base: $BASE

Action required: SSH to server and resolve manually.
  ssh weiping@192.168.1.6
  cd $PROJECT_DIR
  git status

Log: $LOG_FILE
EOF
    if [[ -f "$SEND_EMAIL" ]]; then
      "$PYTHON_BIN" "$SEND_EMAIL" "[Alert] Prod git conflict needs manual fix" "$ALERT_EMAIL" "$ALERT_FILE" 2>/dev/null || true
    fi
    rm -f "$ALERT_FILE"
    echo "[sync-prod] Alert email sent to $ALERT_EMAIL"
  fi
fi

# Step 3: Restore stashed changes
if [[ "$STASHED" == "true" ]]; then
  echo "[sync-prod] Restoring stashed changes..."
  git stash pop --quiet 2>/dev/null || {
    echo "[sync-prod] WARNING: stash pop failed — changes remain in stash"
  }
fi

echo "[sync-prod] completed at $(date -Iseconds)"
