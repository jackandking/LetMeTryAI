#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
SOURCE_PROJECT_DIR="$PROJECT_DIR"
export LETMETRY_RUNTIME_DIR="${LETMETRY_RUNTIME_DIR:-$SOURCE_PROJECT_DIR/.automation/.local}"

find_latest_nvm_bin() {
    local nvm_root="$HOME/.nvm/versions/node"
    if [[ ! -d "$nvm_root" ]]; then
        return 1
    fi

    local latest_version
    latest_version="$(find "$nvm_root" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort -V | tail -n 1)"
    if [[ -z "$latest_version" ]]; then
        return 1
    fi

    printf '%s/bin\n' "$nvm_root/$latest_version"
}

ensure_runtime_path() {
    if command -v node >/dev/null 2>&1 && command -v copilot >/dev/null 2>&1; then
        return
    fi

    local nvm_bin
    if nvm_bin="$(find_latest_nvm_bin)" && [[ -d "$nvm_bin" ]]; then
        export PATH="$PATH:$nvm_bin"
    fi
}

ensure_runtime_path

if [[ -z "${COPILOT_BIN:-}" ]] && command -v copilot >/dev/null 2>&1; then
    export COPILOT_BIN="$(command -v copilot)"
fi

export DAILY_COPILOT_MODEL="${DAILY_COPILOT_MODEL:-gpt-5-mini}"
export DAILY_PROFILE_ID="${DAILY_PROFILE_ID:-nanrenbao}"
export DAILY_PYTHON_BIN="${DAILY_PYTHON_BIN:-$(command -v python3 || echo /usr/bin/python3)}"

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
    export DAILY_LOG_DIR="${DAILY_LOG_DIR:-$DAILY_TEMP_ARTIFACT_DIR/logs}"
}

setup_temp_worktree_if_needed

cd "$PROJECT_DIR"
mkdir -p "$LETMETRY_RUNTIME_DIR/state/email-drafts"
export EMAIL_DRAFT_PATH="${EMAIL_DRAFT_PATH:-$LETMETRY_RUNTIME_DIR/state/email-drafts/latest.txt}"
export KUAISHOU_AUTH_FILE="${KUAISHOU_AUTH_FILE:-$LETMETRY_RUNTIME_DIR/auth/kuaishou_auth.json}"

# Deterministic daily pipeline:
# 1. Copilot only returns structured topic JSON.
# 2. Local orchestrator creates directories/files, updates metadata, validates.
# 3. Only after validation passes do git/deploy/publish/report continue.
node .automation/scripts/daily-orchestrator.js
