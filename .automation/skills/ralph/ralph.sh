#!/bin/bash

# Ralph - Autonomous AI Coding Loop
# Usage: ./ralph.sh [max_iterations] [--tool amp|claude]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PRD_FILE="${SCRIPT_DIR}/prd.json"
PROGRESS_FILE="${SCRIPT_DIR}/progress.txt"

# Default settings
MAX_ITERATIONS=${1:-10}
TOOL="${2:-amp}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[RALPH]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if [ ! -f "$PRD_FILE" ]; then
        error "prd.json not found at $PRD_FILE"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        error "jq is required but not installed. Run: brew install jq"
        exit 1
    fi
    
    log "✓ Prerequisites met"
}

# Get next uncompleted story
get_next_story() {
    jq -r '[.stories[] | select(.passes == false)] | sort_by(.priority) | .[0] // empty' "$PRD_FILE"
}

# Count remaining stories
count_remaining() {
    jq '[.stories[] | select(.passes == false)] | length' "$PRD_FILE"
}

# Get branch name
get_branch() {
    jq -r '.branchName' "$PRD_FILE"
}

# Update story status
mark_story_complete() {
    local story_id="$1"
    local tmp_file="${PRD_FILE}.tmp"
    
    jq --arg id "$story_id" '(.stories[] | select(.id == $id)).passes = true' "$PRD_FILE" > "$tmp_file"
    mv "$tmp_file" "$PRD_FILE"
    
    log "Marked story $story_id as complete"
}

# Append to progress log
log_progress() {
    local message="$1"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $message" >> "$PROGRESS_FILE"
}

# Initialize progress file
init_progress() {
    if [ ! -f "$PROGRESS_FILE" ]; then
        local title=$(jq -r '.title' "$PRD_FILE")
        echo "# Ralph Build Progress" > "$PROGRESS_FILE"
        echo "Started: $(date '+%Y-%m-%d %H:%M:%S')" >> "$PROGRESS_FILE"
        echo "Feature: $title" >> "$PROGRESS_FILE"
        echo "" >> "$PROGRESS_FILE"
        echo "## Codebase Patterns" >> "$PROGRESS_FILE"
        echo "(Document patterns discovered during build)" >> "$PROGRESS_FILE"
        echo "" >> "$PROGRESS_FILE"
        echo "## Completed Stories" >> "$PROGRESS_FILE"
    fi
}

# Run quality checks
run_quality_checks() {
    log "Running quality checks..."
    
    local has_error=0
    
    # TypeScript check
    if [ -f "package.json" ] && grep -q "typecheck" package.json; then
        log "Running typecheck..."
        if ! npm run typecheck; then
            error "TypeScript check failed"
            has_error=1
        fi
    fi
    
    # Tests
    if [ -f "package.json" ] && grep -q '"test"' package.json; then
        log "Running tests..."
        if ! npm test; then
            error "Tests failed"
            has_error=1
        fi
    fi
    
    return $has_error
}

# Main iteration
run_iteration() {
    local iteration="$1"
    local story=$(get_next_story)
    
    if [ -z "$story" ] || [ "$story" = "null" ]; then
        log "No more stories to complete!"
        return 0
    fi
    
    local story_id=$(echo "$story" | jq -r '.id')
    local story_title=$(echo "$story" | jq -r '.title')
    local story_desc=$(echo "$story" | jq -r '.description')
    
    log "=== Iteration $iteration ==="
    log "Story: $story_title (ID: $story_id)"
    log "Description: $story_desc"
    
    # Check dependencies
    local deps=$(echo "$story" | jq -r '.dependsOn // empty | join(", ")')
    if [ -n "$deps" ] && [ "$deps" != "null" ]; then
        log "Dependencies: $deps"
        
        # Check if all dependencies are complete
        for dep in $(echo "$story" | jq -r '.dependsOn[]'); do
            local dep_passes=$(jq -r --arg id "$dep" '.stories[] | select(.id == $id) | .passes' "$PRD_FILE")
            if [ "$dep_passes" != "true" ]; then
                warn "Dependency $dep not complete, skipping story"
                return 1
            fi
        done
    fi
    
    # Get branch name and ensure we're on it
    local branch=$(get_branch)
    log "Working on branch: $branch"
    
    # Generate prompt for AI tool
    local prompt_file="${SCRIPT_DIR}/.current_prompt.md"
    cat > "$prompt_file" << EOF
# Ralph Task: $story_title

## Current Story
ID: $story_id
Title: $story_title
Description: $story_desc

## Acceptance Criteria
$(echo "$story" | jq -r '.acceptanceCriteria[] | "- [ ] " + .')

## Context
- Read progress.txt for codebase patterns
- Check prd.json for overall context
- Run quality checks after implementation
- Commit with descriptive message when done

## Instructions
1. Implement this single story completely
2. Run quality checks (typecheck, tests)
3. If checks pass, commit changes
4. Update progress.txt with learnings
5. Mark story as complete

Quality gates MUST pass before marking complete.
EOF

    log "Prompt generated at $prompt_file"
    log "Ready for AI execution..."
    
    # Here you would invoke your AI tool
    # For manual mode, pause and let user run their AI tool
    warn "Manual mode: Run your AI tool with the prompt above"
    warn "After completion, run: ./ralph.sh continue"
    
    return 2  # Special code for manual continuation
}

# Show status
show_status() {
    local total=$(jq '.stories | length' "$PRD_FILE")
    local remaining=$(count_remaining)
    local completed=$((total - remaining))
    local title=$(jq -r '.title' "$PRD_FILE")
    
    echo ""
    echo "=== Ralph Status ==="
    echo "Feature: $title"
    echo "Progress: $completed/$total stories complete"
    echo "Remaining: $remaining"
    echo ""
    
    if [ $remaining -gt 0 ]; then
        echo "Next story:"
        local next=$(get_next_story)
        echo "  ID: $(echo "$next" | jq -r '.id')"
        echo "  Title: $(echo "$next" | jq -r '.title')"
    else
        echo "✓ All stories complete!"
    fi
    echo ""
}

# Main loop
main() {
    log "🚂 Ralph Autonomous Coding Loop"
    log "Max iterations: $MAX_ITERATIONS"
    
    check_prerequisites
    init_progress
    
    # Handle continue mode
    if [ "$1" = "continue" ] || [ "$1" = "status" ]; then
        show_status
        exit 0
    fi
    
    # Show initial status
    show_status
    
    local iteration=0
    while [ $iteration -lt $MAX_ITERATIONS ]; do
        iteration=$((iteration + 1))
        
        local remaining=$(count_remaining)
        if [ "$remaining" -eq 0 ]; then
            log "✅ All stories complete!"
            log_progress "Build complete - all $iteration iterations"
            exit 0
        fi
        
        local result
        run_iteration $iteration
        result=$?
        
        if [ $result -eq 0 ]; then
            log "Story completed successfully"
        elif [ $result -eq 2 ]; then
            log "Pausing for manual execution"
            exit 0
        else
            error "Story could not be completed"
            log_progress "Failed at iteration $iteration"
        fi
        
        # In automated mode, we'd invoke the AI tool here
        # For now, we pause for manual execution
        break
    done
    
    if [ $iteration -ge $MAX_ITERATIONS ]; then
        warn "Max iterations ($MAX_ITERATIONS) reached"
        log_progress "Stopped at max iterations"
    fi
}

main "$@"
