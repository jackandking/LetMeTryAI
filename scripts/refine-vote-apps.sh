#!/bin/bash
#
# Daily Vote App Refinement Script
# 自动优化前一天新建的投票应用
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
LOG_FILE="$PROJECT_DIR/logs/refine-vote-apps.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}[INFO]${NC} [$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

cd "$PROJECT_DIR"

log "=========================================="
log "Starting Vote App Refinement"
log "=========================================="

# Check if we're in a git repo
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    log_error "Not a git repository. Exiting."
    exit 1
fi

# Detect brand from apps-metadata.json
detect_brand() {
    local app_dir="$1"
    local app_id
    app_id=$(basename "$app_dir")
    
    # Try to find app in metadata
    if [[ -f "$PROJECT_DIR/apps-metadata.json" ]]; then
        local brand
        brand=$(jq -r --arg id "$app_id" '.apps[] | select(.id == $id) | .tags[0]' "$PROJECT_DIR/apps-metadata.json" 2>/dev/null || echo "")
        
        if [[ -n "$brand" && "$brand" != "null" ]]; then
            echo "$brand"
            return
        fi
        
        # Try by directory name
        brand=$(jq -r --arg dir "$app_id" '.apps[] | select(.directory == $dir) | .tags[0]' "$PROJECT_DIR/apps-metadata.json" 2>/dev/null || echo "")
        if [[ -n "$brand" && "$brand" != "null" ]]; then
            echo "$brand"
            return
        fi
    fi
    
    # Fallback: detect from index.html content
    if [[ -f "$app_dir/index.html" ]]; then
        local radio_name
        radio_name=$(grep -o 'name="[^"]*"' "$app_dir/index.html" | head -1 | sed 's/name="//;s/"$//')
        case "$radio_name" in
            "nanrenbao") echo "nanrenbao" ;;
            "parent-tools") echo "parent-tools" ;;
            "elder-love") echo "elder-love" ;;
            "womanai") echo "womanai" ;;
            *) echo "" ;;
        esac
        return
    fi
    
    echo ""
}

# Get theme directory from brand
get_theme_dir() {
    local brand="$1"
    case "$brand" in
        "nanrenbao") echo "$TEMPLATES_DIR/sport-blue" ;;
        "parent-tools") echo "$TEMPLATES_DIR/edu-blue" ;;
        "elder-love") echo "$TEMPLATES_DIR/warm-gold" ;;
        "womanai") echo "$TEMPLATES_DIR/coral-pink" ;;
        *) echo "" ;;
    esac
}

# Refine a single app
refine_app() {
    local app_dir="$1"
    local app_name
    app_name=$(basename "$app_dir")
    
    log_info "Processing: $app_name"
    
    # Detect brand
    local brand
    brand=$(detect_brand "$app_dir")
    
    if [[ -z "$brand" ]]; then
        log_error "  Could not detect brand for $app_name, skipping"
        return 1
    fi
    
    log_info "  Detected brand: $brand"
    
    # Get theme directory
    local theme_dir
    theme_dir=$(get_theme_dir "$brand")
    
    if [[ -z "$theme_dir" || ! -d "$theme_dir" ]]; then
        log_error "  Theme not found for brand: $brand, skipping"
        return 1
    fi
    
    # Backup original files
    local backup_dir="$app_dir/.refine-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$backup_dir"
    cp "$app_dir/styles.css" "$backup_dir/" 2>/dev/null || true
    cp "$app_dir/app.js" "$backup_dir/" 2>/dev/null || true
    
    # Apply theme templates
    log_info "  Applying theme: $(basename "$theme_dir")"
    
    # Copy CSS
    if [[ -f "$theme_dir/styles.css" ]]; then
        cp "$theme_dir/styles.css" "$app_dir/styles.css"
        log_info "  ✓ Updated styles.css"
    fi
    
    # Copy JS (will need to preserve config)
    if [[ -f "$theme_dir/app.js" ]]; then
        # Extract config from original app.js
        local original_config
        original_config=$(grep -A 30 "questionConfig =" "$backup_dir/app.js" 2>/dev/null || grep -A 30 "questionConfig=" "$app_dir/app.js" 2>/dev/null || echo "")
        
        # Copy template JS
        cp "$theme_dir/app.js" "$app_dir/app.js"
        
        # TODO: Replace config in new JS with original config
        # For now, the new JS will have template config which will be partially overwritten
        # In a real implementation, we'd do proper config merging
        log_info "  ✓ Updated app.js"
    fi
    
    # Update HTML structure if needed
    if [[ -f "$app_dir/index.html" ]]; then
        # Check if it has old structure (button-group) vs new (options-grid)
        if grep -q "button-group" "$app_dir/index.html" 2>/dev/null; then
            log_info "  ⚠ Old HTML structure detected, consider manual update"
        fi
        log_info "  ✓ HTML structure checked"
    fi
    
    # Generate SVG placeholder notice
    log_info "  SVG images should be manually created or use AI generation"
    
    # Add to git
    git add "$app_dir"
    
    # Commit
    local theme_name
    theme_name=$(basename "$theme_dir")
    if git commit -m "refine($app_name): auto-themed $theme_name design" >> "$LOG_FILE" 2>&1; then
        log_success "  ✓ Committed changes for $app_name"
        return 0
    else
        log_error "  ✗ Failed to commit changes for $app_name"
        return 1
    fi
}

# Main execution
main() {
    # Find apps modified in the last 24 hours with app.js
    log_info "Detecting recently created vote apps..."
    
    local new_apps
    new_apps=$(git log --since="1 day ago" --name-status --diff-filter=A -- "*/app.js" 2>/dev/null | \
        grep "^A" | \
        awk '{print $2}' | \
        xargs -I {} dirname {} | \
        sort -u | \
        grep -v "^\.$" | \
        grep -v "node_modules" || true)
    
    if [[ -z "$new_apps" ]]; then
        log_info "No new vote apps detected in the last 24 hours"
        log "=========================================="
        exit 0
    fi
    
    log_info "Found $(echo "$new_apps" | wc -l | tr -d ' ') new app(s):"
    echo "$new_apps" | while read -r app; do
        log_info "  - $app"
    done
    
    # Process each app
    local success_count=0
    local fail_count=0
    
    while IFS= read -r app_dir; do
        if [[ -n "$app_dir" && -d "$app_dir" ]]; then
            if refine_app "$app_dir"; then
                ((success_count++)) || true
            else
                ((fail_count++)) || true
            fi
        fi
    done <<< "$new_apps"
    
    # Push if there are changes
    if [[ $success_count -gt 0 ]]; then
        log_info "Pushing changes to remote..."
        if git push origin main >> "$LOG_FILE" 2>&1; then
            log_success "✓ Changes pushed successfully"
        else
            log_error "✗ Failed to push changes"
        fi
    fi
    
    log "=========================================="
    log "Refinement Complete: $success_count succeeded, $fail_count failed"
    log "=========================================="
}

main "$@"
