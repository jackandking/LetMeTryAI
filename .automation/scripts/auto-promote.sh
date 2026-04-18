#!/bin/bash
#
# auto-promote.sh — Merge an auto-fix branch to main and update prod
#
# Usage:
#   .automation/scripts/auto-promote.sh <branch-name>
#
# Steps:
#   1. Merge branch to main (fast-forward only)
#   2. Push main to origin
#   3. Pull main on prod server
#
# Environment:
#   PROD_DIR       — path to prod directory (default: /Users/weiping/prod/LetMeTryAI)
#   AUTO_PROMOTE   — "true" to actually promote, anything else = dry-run
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROD_DIR="${PROD_DIR:-/Users/weiping/prod/LetMeTryAI}"
AUTO_PROMOTE="${AUTO_PROMOTE:-false}"
BRANCH="${1:-}"

if [[ -z "$BRANCH" ]]; then
  echo "Usage: auto-promote.sh <branch-name>"
  echo "Example: auto-promote.sh auto-fix/20260418-harden.log_redirection"
  exit 1
fi

echo "[auto-promote] Branch: $BRANCH"
echo "[auto-promote] Repo: $REPO_DIR"
echo "[auto-promote] Prod: $PROD_DIR"
echo "[auto-promote] Mode: $([ "$AUTO_PROMOTE" = "true" ] && echo "LIVE" || echo "DRY-RUN")"

cd "$REPO_DIR"

# Verify branch exists
if ! git rev-parse --verify "$BRANCH" >/dev/null 2>&1; then
  echo "[auto-promote] ERROR: Branch '$BRANCH' not found"
  exit 1
fi

# Verify we're on main
git checkout main --quiet
git pull origin main --quiet

# Show what would be merged
echo ""
echo "[auto-promote] Changes in $BRANCH:"
git log main.."$BRANCH" --oneline
echo ""
git diff --stat main.."$BRANCH"

if [[ "$AUTO_PROMOTE" != "true" ]]; then
  echo ""
  echo "[auto-promote] DRY-RUN: would merge $BRANCH to main and update prod"
  echo "[auto-promote] Set AUTO_PROMOTE=true to execute"
  exit 0
fi

# Snapshot metrics baseline before merge
echo ""
echo "[auto-promote] Snapshotting metrics baseline..."
PROD_DIR="$PROD_DIR" node "$REPO_DIR/.automation/scripts/auto-monitor.js" baseline 2>&1 || {
  echo "[auto-promote] WARNING: baseline snapshot failed, continuing anyway"
}

# Merge
echo ""
echo "[auto-promote] Merging $BRANCH to main..."
git merge "$BRANCH" --no-edit

# Push
echo "[auto-promote] Pushing main to origin..."
git push origin main

# Delete the branch locally and remotely
echo "[auto-promote] Cleaning up branch..."
git branch -d "$BRANCH" 2>/dev/null || true
git push origin --delete "$BRANCH" 2>/dev/null || true

# Update prod
echo "[auto-promote] Updating prod directory..."
if [[ -d "$PROD_DIR/.git" ]]; then
  cd "$PROD_DIR"
  git pull origin main --quiet
  echo "[auto-promote] Prod updated successfully"
else
  echo "[auto-promote] WARNING: Prod directory not accessible, skipping prod update"
fi

echo ""
echo "[auto-promote] Done. Changes are live in prod."
