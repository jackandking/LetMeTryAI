#!/bin/bash
set -euo pipefail

export PATH="$PATH:/Users/weiping/.nvm/versions/node/v22.22.0/bin"

PROJECT_DIR="${PROJECT_DIR:-/Users/weiping/LetMeTryAI}"
SOURCE_PROJECT_DIR="$PROJECT_DIR"
export COPILOT_BIN="${COPILOT_BIN:-/Users/weiping/.nvm/versions/node/v22.22.0/bin/copilot}"
export DAILY_COPILOT_MODEL="${DAILY_COPILOT_MODEL:-gpt-5-mini}"
export DAILY_PROFILE_ID="${DAILY_PROFILE_ID:-nanrenbao}"
export DAILY_PYTHON_BIN="${DAILY_PYTHON_BIN:-/usr/local/bin/python3}"

setup_temp_worktree_if_needed() {
    if [[ "${DAILY_ALLOW_DIRTY_WORKTREE:-false}" == "true" || "${DAILY_TEMP_WORKTREE:-false}" == "true" ]]; then
        return
    fi

    cd "$SOURCE_PROJECT_DIR"

    local dirty_output
    dirty_output="$(git --no-pager status --short)"
    if [[ -z "$dirty_output" ]]; then
        return
    fi

    local current_branch
    current_branch="$(git rev-parse --abbrev-ref HEAD)"
    if [[ "$current_branch" == "HEAD" ]]; then
        echo "Failure reason: Working tree is dirty and current checkout is detached; set DAILY_ALLOW_DIRTY_WORKTREE=true or switch to a branch" >&2
        exit 1
    fi

    DAILY_TEMP_WORKTREE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/letmetry-daily-worktree.XXXXXX")"
    DAILY_TEMP_ARTIFACT_DIR="$(mktemp -d "${TMPDIR:-/tmp}/letmetry-daily-artifacts.XXXXXX")"

    cleanup_daily_temp() {
        git -C "$SOURCE_PROJECT_DIR" worktree remove --force "$DAILY_TEMP_WORKTREE_DIR" >/dev/null 2>&1 || true
        rm -rf "$DAILY_TEMP_ARTIFACT_DIR"
    }

    trap cleanup_daily_temp EXIT

    echo "Main worktree is dirty; running daily pipeline in temporary clean worktree: $DAILY_TEMP_WORKTREE_DIR"
    git -C "$SOURCE_PROJECT_DIR" worktree add --detach "$DAILY_TEMP_WORKTREE_DIR" HEAD >/dev/null
    rsync -a --delete \
        --exclude='.git' \
        --exclude='node_modules' \
        --exclude='.agent_history' \
        --exclude='.minimax' \
        "$SOURCE_PROJECT_DIR/" "$DAILY_TEMP_WORKTREE_DIR/" >/dev/null
    if [[ -d "$SOURCE_PROJECT_DIR/node_modules" && ! -e "$DAILY_TEMP_WORKTREE_DIR/node_modules" ]]; then
        ln -s "$SOURCE_PROJECT_DIR/node_modules" "$DAILY_TEMP_WORKTREE_DIR/node_modules"
    fi

    export PROJECT_DIR="$DAILY_TEMP_WORKTREE_DIR"
    export DAILY_ALLOW_DIRTY_WORKTREE="true"
    export DAILY_TEMP_WORKTREE="true"
    export DAILY_GIT_PUSH_BRANCH="${DAILY_GIT_PUSH_BRANCH:-$current_branch}"
    export EMAIL_DRAFT_PATH="${EMAIL_DRAFT_PATH:-$DAILY_TEMP_ARTIFACT_DIR/email_draft.txt}"
    export DAILY_LOG_DIR="${DAILY_LOG_DIR:-$DAILY_TEMP_ARTIFACT_DIR/logs}"
    export KUAISHOU_AUTH_FILE="${KUAISHOU_AUTH_FILE:-$SOURCE_PROJECT_DIR/kuaishou_auth.json}"
}

setup_temp_worktree_if_needed

cd "$PROJECT_DIR"
export EMAIL_DRAFT_PATH="${EMAIL_DRAFT_PATH:-$PROJECT_DIR/email_draft.txt}"

# Deterministic daily pipeline:
# 1. Copilot only returns structured topic JSON.
# 2. Local orchestrator creates directories/files, updates metadata, validates.
# 3. Only after validation passes do git/deploy/publish/report continue.
node scripts/daily-orchestrator.js
