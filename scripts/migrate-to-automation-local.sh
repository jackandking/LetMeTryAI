#!/bin/bash
set -euo pipefail

# migrate-to-automation-local.sh
# Purpose: assistively move runtime artifacts into .automation-local
# Usage: run interactively; the script does dry-run and prompts before any destructive action.

echo "=== Migration helper: move runtime artifacts into .automation-local ==="

# Dry-run: list tracked candidates
echo "\n[1] Tracked candidate runtime files:" 
git ls-files | grep -E '(^|/)(kuaishou_auth.json|processed_ids.txt|email_draft.txt|email_report.txt|metrics/|logs/|file-.*\\.png|file-.*\\.input|.*\\.log|.*\\.csv|.*\\.json)$' || true

# Dry-run: list untracked candidates
echo "\n[2] Untracked candidate runtime files:" 
git ls-files --others --exclude-standard | grep -E '(^|/)(kuaishou_auth.json|processed_ids.txt|email_draft.txt|email_report.txt|metrics/|logs/|file-.*\\.png|file-.*\\.input|.*\\.log|.*\\.csv|.*\\.json)$' || true

echo "\nReview above lists. Press Enter to continue (will create a backup branch but won't move files until you confirm), or Ctrl+C to abort." 
read -r

# Backup branch
BACKUP_BRANCH="backup/move-runtime-$(date +%Y%m%d%H%M%S)"
echo "Creating backup branch: $BACKUP_BRANCH"
git checkout -b "$BACKUP_BRANCH"

# Ensure target skeleton exists
mkdir -p .automation-local/{config,auth,state,logs,exports,screenshots,tmp}

# Show tracked files again and confirm removal from index
TRACKED=$(git ls-files | grep -E '(^|/)(kuaishou_auth.json|processed_ids.txt|email_draft.txt|email_report.txt|metrics/|logs/|file-.*\\.png|file-.*\\.input|.*\\.log|.*\\.csv|.*\\.json)$' || true)

if [[ -z "$TRACKED" ]]; then
  echo "No tracked runtime candidates found." 
else
  echo "\nTracked files to untrack and move:" 
  printf "%s\n" "$TRACKED"
  read -p "Confirm git rm --cached + move these files to .automation-local (y/N)? " CONF
  if [[ "$CONF" == "y" || "$CONF" == "Y" ]]; then
    while IFS= read -r f; do
      # create target dir preserving relative path
      targ_dir=".automation-local/$(dirname "$f")"
      mkdir -p "$targ_dir"
      git rm --cached --ignore-unmatch "$f" || true
      if [[ -e "$f" ]]; then
        echo "Moving $f -> $targ_dir/"
        mv -v "$f" "$targ_dir/" || true
      fi
    done <<< "$TRACKED"
  else
    echo "Skipped untracking/moving tracked files." 
  fi
fi

# Handle untracked files
UNTRACKED=$(git ls-files --others --exclude-standard | grep -E '(^|/)(kuaishou_auth.json|processed_ids.txt|email_draft.txt|email_report.txt|metrics/|logs/|file-.*\\.png|file-.*\\.input|.*\\.log|.*\\.csv|.*\\.json)$' || true)
if [[ -z "$UNTRACKED" ]]; then
  echo "\nNo untracked candidate files found." 
else
  echo "\nUntracked candidate files:" 
  printf "%s\n" "$UNTRACKED"
  read -p "Move these untracked files into .automation-local (y/N)? " CONF2
  if [[ "$CONF2" == "y" || "$CONF2" == "Y" ]]; then
    while IFS= read -r f; do
      targ_dir=".automation-local/$(dirname "$f")"
      mkdir -p "$targ_dir"
      if [[ -e "$f" ]]; then
        echo "Moving $f -> $targ_dir/"
        mv -v "$f" "$targ_dir/" || true
      fi
    done <<< "$UNTRACKED"
  else
    echo "Skipped moving untracked files." 
  fi
fi

# Ensure .gitignore has entry
if ! grep -q '^.automation-local/' .gitignore 2>/dev/null; then
  echo '.automation-local/' >> .gitignore
  git add .gitignore
fi

# Stage changes and commit (only if there are changes)
if ! git diff --quiet || ! git ls-files --others --exclude-standard | grep -q '.' ; then
  git add -A
  echo "Committing migration changes"
  git commit -m "chore: move runtime artifacts to .automation-local and stop tracking them

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>" || true
else
  echo "No changes to commit."
fi

# Recommendation: run tests
echo "\nRecommendation: run project tests now (e.g., npm test). If issues, restore from backup branch: git checkout master && git reset --hard $BACKUP_BRANCH"

echo "Done."
