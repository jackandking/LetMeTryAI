#!/bin/bash
#
# auto-run.sh — Unified entry point for the auto evolution loop
#
# Runs from newharness directory. Reads prod data, decides whether to act.
# Implements: OBSERVE → DIAGNOSE → PROPOSE → VERIFY → PROMOTE
#
# Usage:
#   cd /Users/weiping/newharness/LetMeTryAI && .automation/scripts/auto-run.sh
#
# Environment:
#   PROD_DIR  — path to prod directory (default: /Users/weiping/prod/LetMeTryAI)
#   AUTO_MODE — "full" (default) or "observe-only" (skip propose/verify/promote)
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_DIR="${PROD_DIR:-/Users/weiping/prod/LetMeTryAI}"
AUTO_MODE="${AUTO_MODE:-full}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$REPO_DIR/.automation/.local/logs"
LOG_FILE="$LOG_DIR/auto-run-${TIMESTAMP}.log"
STATE_DIR="$REPO_DIR/.automation/.local/state"
OBSERVATIONS_FILE="$STATE_DIR/auto-observations.jsonl"

mkdir -p "$LOG_DIR" "$STATE_DIR"

# Redirect all output to log file + stdout
exec > >(tee -a "$LOG_FILE") 2>&1

echo "============================================"
echo "[auto-run] Started at $(date -Iseconds)"
echo "[auto-run] REPO_DIR=$REPO_DIR"
echo "[auto-run] PROD_DIR=$PROD_DIR"
echo "[auto-run] AUTO_MODE=$AUTO_MODE"
echo "============================================"

# Safety: refuse to run from prod
if [[ "$REPO_DIR" == *"/prod/"* ]]; then
  echo "[auto-run] ERROR: refusing to run from prod directory"
  exit 1
fi

# Ensure we're on main and up to date
cd "$REPO_DIR"
git fetch origin main --quiet 2>/dev/null || true
git checkout main --quiet 2>/dev/null || true
git pull origin main --quiet 2>/dev/null || true

# ============================================================
# PHASE 1: OBSERVE — collect data from prod + check regression
# ============================================================
echo ""
echo "[auto-run] === OBSERVE ==="

# Check for regression from previous auto-promote
echo "[auto-run] Running regression check..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/auto-monitor.js" check-and-rollback 2>&1 || {
  echo "[auto-run] Regression detected and rollback attempted"
}

# Analyze topic performance from Kuaishou data
echo "[auto-run] Analyzing topic performance..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/topic-performance-analyzer.js" 2>&1 || {
  echo "[auto-run] Topic performance analysis failed (non-fatal)"
}

# Analyze mount data (PLC click/enter metrics from kuaishou-follow exports)
echo "[auto-run] Analyzing mount data..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/mount-data-analyzer.js" 2>&1 || {
  echo "[auto-run] Mount data analysis failed (non-fatal)"
}

# Collect ad revenue data from mini-program API
echo "[auto-run] Collecting ad revenue data..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/ad-data-collector.js" 2>&1 || {
  echo "[auto-run] Ad data collection failed (non-fatal)"
}

# Rebalance profile categories based on performance data
echo "[auto-run] Running category rebalancer..."
node "$REPO_DIR/.automation/scripts/category-rebalancer.js" 2>&1 || {
  echo "[auto-run] Category rebalancer failed (non-fatal)"
}

# If rebalancer changed profile configs, commit and push
if [[ -n "$(git -C "$REPO_DIR" diff --name-only .harness/config/profiles/ 2>/dev/null)" ]]; then
  echo "[auto-run] Category rebalancer made changes, committing..."
  cd "$REPO_DIR"
  git add .harness/config/profiles/
  git commit -m "auto: rebalance profile categories based on Kuaishou performance data" || true
  git push origin main --quiet 2>/dev/null || {
    echo "[auto-run] Failed to push rebalance changes (non-fatal)"
  }
  echo "[auto-run] Rebalanced categories pushed to main"
fi

OBSERVE_RESULT=""
FAILURES=0
TOTAL_RUNS=0
ERRORS=""

# Check harness run results from prod
HARNESS_STATE_DIR="$PROD_DIR/.harness/.local/state/daily-app-runs"
if [[ -d "$HARNESS_STATE_DIR" ]]; then
  for profile_file in "$HARNESS_STATE_DIR"/*.jsonl; do
    [[ -f "$profile_file" ]] || continue
    profile_name=$(basename "$profile_file" .jsonl)
    # Read last 7 days of runs
    recent=$(tail -7 "$profile_file" 2>/dev/null || true)
    run_count=$(echo "$recent" | grep -c '"success"' || true)
    fail_count=$(echo "$recent" | grep -c '"success":false' || true)
    TOTAL_RUNS=$((TOTAL_RUNS + run_count))
    FAILURES=$((FAILURES + fail_count))
    if [[ $fail_count -gt 0 ]]; then
      ERRORS="$ERRORS  $profile_name: $fail_count failures in last 7 runs\n"
    fi
    echo "[auto-run] $profile_name: $run_count runs, $fail_count failures (last 7 days)"
  done
fi

# Check circuit breaker state
CB_FILE="$REPO_DIR/.automation/.local/state/CIRCUIT_BREAKER_ACTIVE"
CIRCUIT_BREAKER_ACTIVE="false"
if [[ -f "$CB_FILE" ]]; then
  CIRCUIT_BREAKER_ACTIVE="true"
  echo "[auto-run] WARNING: Circuit breaker is active!"
fi

# Record observation
OBSERVATION=$(cat <<OBSEOF
{"timestamp":"$(date -Iseconds)","totalRuns":$TOTAL_RUNS,"failures":$FAILURES,"circuitBreakerActive":$CIRCUIT_BREAKER_ACTIVE}
OBSEOF
)
echo "$OBSERVATION" >> "$OBSERVATIONS_FILE"
echo "[auto-run] Observation recorded"

# ============================================================
# PHASE 2: DIAGNOSE — decide whether to act
# ============================================================
echo ""
echo "[auto-run] === DIAGNOSE ==="

ACTION="none"
ACTION_REASON=""

# Don't act if circuit breaker is active
if [[ "$CIRCUIT_BREAKER_ACTIVE" == "true" ]]; then
  echo "[auto-run] Circuit breaker active — skipping all actions"
  ACTION="none"
  ACTION_REASON="circuit_breaker_active"

# Check if there are pending fix proposals
elif [[ -d "$REPO_DIR/.learnings/rules-pending" ]] && \
     [[ $(ls "$REPO_DIR/.learnings/rules-pending"/*.md 2>/dev/null | wc -l) -gt 0 ]]; then
  PENDING_COUNT=$(ls "$REPO_DIR/.learnings/rules-pending"/*.md 2>/dev/null | wc -l | tr -d ' ')
  echo "[auto-run] Found $PENDING_COUNT pending fix proposal(s)"
  ACTION="auto-fix"
  ACTION_REASON="pending_proposals"

# Check if there are learnings but no proposals yet → generate proposals first
elif [[ -d "$REPO_DIR/.learnings" ]] && \
     [[ $(find "$REPO_DIR/.learnings" -name "ERR-*.md" -mtime -7 2>/dev/null | wc -l) -gt 0 ]]; then
  LEARNING_COUNT=$(find "$REPO_DIR/.learnings" -name "ERR-*.md" -mtime -7 2>/dev/null | wc -l | tr -d ' ')
  echo "[auto-run] Found $LEARNING_COUNT recent learnings, no pending proposals — generating proposals"
  ACTION="generate-proposals"
  ACTION_REASON="learnings_without_proposals"

# If failure rate > 20%, run log scanner to diagnose
elif [[ $TOTAL_RUNS -gt 0 ]] && [[ $FAILURES -gt 0 ]]; then
  FAIL_RATE=$((FAILURES * 100 / TOTAL_RUNS))
  if [[ $FAIL_RATE -ge 20 ]]; then
    echo "[auto-run] High failure rate: ${FAIL_RATE}% — running diagnostics"
    ACTION="diagnose"
    ACTION_REASON="high_failure_rate"
  else
    echo "[auto-run] Failure rate acceptable: ${FAIL_RATE}%"
    ACTION="none"
  fi

else
  echo "[auto-run] No issues detected"
  ACTION="none"
fi

echo "[auto-run] Decision: ACTION=$ACTION REASON=$ACTION_REASON"

if [[ "$AUTO_MODE" == "observe-only" ]]; then
  echo "[auto-run] observe-only mode — skipping action phase"
  ACTION="none"
fi

# ============================================================
# PHASE 3: PROPOSE + VERIFY + PROMOTE
# ============================================================
echo ""
echo "[auto-run] === ACT ==="

case "$ACTION" in
  auto-fix)
    echo "[auto-run] Running auto-fix-agent..."
    AUTO_FIX_SKIP_TIME_CHECK=1 node "$REPO_DIR/.automation/scripts/auto-fix-agent.js" 2>&1 || {
      echo "[auto-run] auto-fix-agent exited with error (may be expected: time window, limits)"
    }
    ;;

  generate-proposals)
    echo "[auto-run] Running self-improvement to generate proposals..."
    node "$REPO_DIR/.automation/scripts/self-improvement-orchestrator.js" 2>&1 || true
    # If proposals were generated, try auto-fix immediately
    if [[ -d "$REPO_DIR/.learnings/rules-pending" ]] && \
       [[ $(ls "$REPO_DIR/.learnings/rules-pending"/*.md 2>/dev/null | wc -l) -gt 0 ]]; then
      PENDING=$(ls "$REPO_DIR/.learnings/rules-pending"/*.md 2>/dev/null | wc -l | tr -d ' ')
      echo "[auto-run] Generated $PENDING proposal(s), running auto-fix-agent..."
      node "$REPO_DIR/.automation/scripts/auto-fix-agent.js" 2>&1 || {
        echo "[auto-run] auto-fix-agent exited with error (may be expected: time window, limits)"
      }
    else
      echo "[auto-run] No proposals generated"
    fi
    ;;

  diagnose)
    echo "[auto-run] Running log scanner to generate learnings..."
    PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/log-scanner-to-learning.js" 2>&1 || true
    echo "[auto-run] Running self-improvement orchestrator to generate proposals..."
    node "$REPO_DIR/.automation/scripts/self-improvement-orchestrator.js" 2>&1 || true
    ;;

  none)
    echo "[auto-run] No action needed"
    ;;
esac

# ============================================================
# SYNC: pull prod updates to keep newharness fresh
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
