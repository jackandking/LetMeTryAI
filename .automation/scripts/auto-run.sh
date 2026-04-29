#!/bin/bash
#
# auto-run.sh — Auto evolution loop (data-driven, action-oriented)
#
# Runs from newharness directory. Observes prod data, optimizes allocation.
# Implements: OBSERVE → OPTIMIZE → SYNC
#
# Usage:
#   cd /Users/weiping/newharness/LetMeTryAI && .automation/scripts/auto-run.sh
#
# Environment:
#   PROD_DIR  — path to prod directory (default: /Users/weiping/prod/LetMeTryAI)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_DIR="${PROD_DIR:-/Users/weiping/prod/LetMeTryAI}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$REPO_DIR/.automation/.local/logs"
LOG_FILE="$LOG_DIR/auto-run-${TIMESTAMP}.log"
STATE_DIR="$REPO_DIR/.automation/.local/state"

mkdir -p "$LOG_DIR" "$STATE_DIR"

exec > >(tee -a "$LOG_FILE") 2>&1

echo "============================================"
echo "[auto-run] Started at $(date -Iseconds)"
echo "[auto-run] REPO_DIR=$REPO_DIR"
echo "[auto-run] PROD_DIR=$PROD_DIR"
echo "============================================"

if [[ "$REPO_DIR" == *"/prod/"* ]]; then
  echo "[auto-run] ERROR: refusing to run from prod directory"
  exit 1
fi

cd "$REPO_DIR"
git fetch origin main --quiet 2>/dev/null || true
git checkout main --quiet 2>/dev/null || true
git pull origin main --quiet 2>/dev/null || true

# ============================================================
# PHASE 1: OBSERVE — collect performance data
# ============================================================
echo ""
echo "[auto-run] === OBSERVE ==="

echo "[auto-run] Analyzing topic performance..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/topic-performance-analyzer.js" 2>&1 || {
  echo "[auto-run] Topic performance analysis failed (non-fatal)"
}

echo "[auto-run] Analyzing mount data..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/mount-data-analyzer.js" 2>&1 || {
  echo "[auto-run] Mount data analysis failed (non-fatal)"
}

echo "[auto-run] Collecting ad revenue data..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/ad-data-collector.js" 2>&1 || {
  echo "[auto-run] Ad data collection failed (non-fatal)"
}

# ============================================================
# PHASE 2: OPTIMIZE — make data-driven changes
# ============================================================
echo ""
echo "[auto-run] === OPTIMIZE ==="

# Rebalance category order within profiles
echo "[auto-run] Running category rebalancer..."
node "$REPO_DIR/.automation/scripts/category-rebalancer.js" 2>&1 || {
  echo "[auto-run] Category rebalancer failed (non-fatal)"
}

# Allocate daily slots based on revenue/app
echo "[auto-run] Running profile frequency allocator..."
node "$REPO_DIR/.automation/scripts/profile-frequency-allocator.js" 2>&1 || {
  echo "[auto-run] Profile frequency allocator failed (non-fatal)"
}

# Commit any config changes
CHANGED_FILES=$(git -C "$REPO_DIR" diff --name-only .harness/config/profiles/ .automation/.local/state/profile-slots.json 2>/dev/null || true)
if [[ -n "$CHANGED_FILES" ]]; then
  echo "[auto-run] Changes detected, committing..."
  cd "$REPO_DIR"
  git add .harness/config/profiles/ .automation/.local/state/profile-slots.json 2>/dev/null || true
  git commit -m "auto: optimize profile allocation based on revenue data" || true
  git push origin main --quiet 2>/dev/null || {
    echo "[auto-run] Failed to push changes (non-fatal)"
  }
fi

# ============================================================
# SYNC
# ============================================================
echo ""
echo "[auto-run] === SYNC ==="
git pull origin main --quiet 2>/dev/null || true
echo "[auto-run] Synced with origin/main"

echo ""
echo "============================================"
echo "[auto-run] Completed at $(date -Iseconds)"
echo "[auto-run] Log: $LOG_FILE"
echo "============================================"
