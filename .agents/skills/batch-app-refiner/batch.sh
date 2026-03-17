#!/bin/bash
#
# Batch App Refiner - Orchestrate refinement of multiple apps
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
REFINER_DIR="$SCRIPT_DIR/../vote-app-refiner"
IMAGE_GEN_DIR="$SCRIPT_DIR/../vote-app-image-gen"
LOG_FILE="$PROJECT_DIR/logs/batch-refine.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    cat << EOF
Usage: $0 <apps-file|apps-csv> [brand] [options]

Refine multiple vote apps in batches.

Arguments:
    apps-file    File containing app list (one per line: "directory brand")
    apps-csv     Comma-separated app directories
    brand        Default brand for all apps (if not specified in file)
    options      Additional options: --batch-size=N --skip-images --dry-run

Examples:
    $0 apps.txt
    $0 "fighter-jets,tank-kings,drone-kings" nanrenbao
    $0 apps.txt nanrenbao --batch-size=5
EOF
}

log() {
    echo -e "${BLUE}[batch]${NC} $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[batch]${NC} $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[batch]${NC} $*" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "${YELLOW}[batch]${NC} $*" | tee -a "$LOG_FILE"
}

# Parse arguments
INPUT="${1:-}"
DEFAULT_BRAND="${2:-}"
shift 2 2>/dev/null || true

# Parse options
BATCH_SIZE=3
SKIP_IMAGES=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --batch-size=*)
            BATCH_SIZE="${1#*=}"
            shift
            ;;
        --skip-images)
            SKIP_IMAGES=true
            shift
            ;;
        --dry-run)
            DRY_RUN=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

if [[ -z "$INPUT" ]]; then
    usage
    exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")"

cd "$PROJECT_DIR"

log "========================================"
log "Batch App Refiner"
log "========================================"
log "Batch size: $BATCH_SIZE"
log "Skip images: $SKIP_IMAGES"
log "Dry run: $DRY_RUN"
log ""

# Parse input into array of apps
APPS=()

if [[ -f "$INPUT" ]]; then
    log "Reading apps from file: $INPUT"
    while IFS= read -r line || [[ -n "$line" ]]; do
        # Skip comments and empty lines
        [[ "$line" =~ ^[[:space:]]*# ]] && continue
        [[ -z "${line// /}" ]] && continue
        
        # Parse directory and brand
        read -r dir brand <<< "$line"
        brand="${brand:-$DEFAULT_BRAND}"
        
        if [[ -d "$PROJECT_DIR/$dir" ]]; then
            APPS+=("$dir:$brand")
        else
            log_warn "Directory not found: $dir"
        fi
    done < "$INPUT"
else
    # Parse as CSV
    log "Parsing apps from CSV: $INPUT"
    IFS=',' read -ra DIRS <<< "$INPUT"
    for dir in "${DIRS[@]}"; do
        dir=$(echo "$dir" | xargs) # trim
        if [[ -d "$PROJECT_DIR/$dir" ]]; then
            APPS+=("$dir:${DEFAULT_BRAND:-}")
        else
            log_warn "Directory not found: $dir"
        fi
    done
fi

TOTAL=${#APPS[@]}

if [[ $TOTAL -eq 0 ]]; then
    log_error "No valid apps found!"
    exit 1
fi

log "Found $TOTAL apps to refine"
log ""

if [[ "$DRY_RUN" == "true" ]]; then
    log "DRY RUN - Apps that would be processed:"
    for app in "${APPS[@]}"; do
        IFS=':' read -r dir brand <<< "$app"
        log "  - $dir ($brand)"
    done
    exit 0
fi

# Process in batches
BATCH_COUNT=$(((TOTAL + BATCH_SIZE - 1) / BATCH_SIZE))
SUCCESS_COUNT=0
FAIL_COUNT=0

for ((batch_num = 1; batch_num <= BATCH_COUNT; batch_num++)); do
    log "----------------------------------------"
    log "Batch $batch_num/$BATCH_COUNT"
    log "----------------------------------------"
    
    start_idx=$(((batch_num - 1) * BATCH_SIZE))
    end_idx=$((start_idx + BATCH_SIZE - 1))
    [[ $end_idx -ge $TOTAL ]] && end_idx=$((TOTAL - 1))
    
    # Process batch in parallel
    PIDS=()
    for ((i = start_idx; i <= end_idx; i++)); do
        IFS=':' read -r dir brand <<< "${APPS[$i]}"
        idx=$((i - start_idx + 1))
        batch_size=$((end_idx - start_idx + 1))
        
        log "[$idx/$batch_size] $dir - Starting..."
        
        # Run refinement in background
        (
            APP_LOG="$PROJECT_DIR/logs/refine-${dir}.log"
            
            # Step 1: Refine code
            if [[ -x "$REFINER_DIR/refine.sh" ]]; then
                "$REFINER_DIR/refine.sh" "$dir" "$brand" >> "$APP_LOG" 2>&1
                REFINE_STATUS=$?
            else
                log_error "Refiner not found: $REFINER_DIR/refine.sh"
                REFINE_STATUS=1
            fi
            
            # Step 2: Generate images (if enabled)
            if [[ "$SKIP_IMAGES" == "false" && $REFINE_STATUS -eq 0 ]]; then
                if [[ -x "$IMAGE_GEN_DIR/generate.sh" ]]; then
                    "$IMAGE_GEN_DIR/generate.sh" "$dir" "$brand" >> "$APP_LOG" 2>&1 || true
                fi
            fi
            
            exit $REFINE_STATUS
        ) &
        
        PIDS+=($!)
    done
    
    # Wait for all processes in batch
    BATCH_SUCCESS=0
    BATCH_FAIL=0
    for pid in "${PIDS[@]}"; do
        if wait $pid; then
            ((BATCH_SUCCESS++)) || true
        else
            ((BATCH_FAIL++)) || true
        fi
    done
    
    SUCCESS_COUNT=$((SUCCESS_COUNT + BATCH_SUCCESS))
    FAIL_COUNT=$((FAIL_COUNT + BATCH_FAIL))
    
    log "Batch $batch_num complete: $BATCH_SUCCESS success, $BATCH_FAIL failed"
    
    # Git commit after each batch
    if [[ $BATCH_SUCCESS -gt 0 ]]; then
        log "Committing batch $batch_num..."
        
        # Stage changes
        for ((i = start_idx; i <= end_idx; i++)); do
            IFS=':' read -r dir brand <<< "${APPS[$i]}"
            git add "$dir" 2>/dev/null || true
        done
        
        # Commit
        if git commit -m "refine(batch-$batch_num): refine $BATCH_SUCCESS apps" >> "$LOG_FILE" 2>&1; then
            log_success "Committed batch $batch_num"
        else
            log_warn "Nothing to commit for batch $batch_num"
        fi
    fi
done

# Final summary
log ""
log "========================================"
log "Batch Refinement Complete"
log "========================================"
log "Total: $TOTAL apps"
log_success "Success: $SUCCESS_COUNT apps"
[[ $FAIL_COUNT -gt 0 ]] && log_error "Failed: $FAIL_COUNT apps"
log "See logs: $LOG_FILE"
log "========================================"

# Push if there were successful refinements
if [[ $SUCCESS_COUNT -gt 0 ]]; then
    log "Pushing changes..."
    if git push origin main >> "$LOG_FILE" 2>&1; then
        log_success "Changes pushed to origin"
    else
        log_error "Failed to push changes"
    fi
fi

exit 0
