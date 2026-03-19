#!/bin/bash
#
# Vote App Refiner - Refactor a single vote app using Copilot CLI
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"
COPILOT_BIN="${COPILOT_BIN:-$(command -v copilot || echo '/usr/local/bin/copilot')}"
MODEL="${DAILY_COPILOT_MODEL:-gpt-5-mini}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    cat << EOF
Usage: $0 <app-directory> [brand-profile] [reference-app]

Refactor a vote app using Copilot CLI.

Arguments:
    app-directory    App directory name (e.g., fighter-jets)
    brand-profile    Brand ID: nanrenbao, parent-tools, elder-love, womanai
    reference-app    Reference app for layout (default: spring-whitening-lipstick)

Examples:
    $0 fighter-jets nanrenbao
    $0 homework-routine parent-tools spring-whitening-lipstick
EOF
}

log() {
    echo -e "${BLUE}[refiner]${NC} $*"
}

log_error() {
    echo -e "${RED}[refiner]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[refiner]${NC} $*"
}

# Parse arguments
APP_DIR="${1:-}"
BRAND_PROFILE="${2:-}"
REFERENCE_APP="${3:-spring-whitening-lipstick}"

if [[ -z "$APP_DIR" ]]; then
    usage
    exit 1
fi

if [[ ! -d "$PROJECT_DIR/$APP_DIR" ]]; then
    log_error "App directory not found: $PROJECT_DIR/$APP_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Auto-detect brand if not specified
if [[ -z "$BRAND_PROFILE" ]]; then
    log "Auto-detecting brand from index.html..."
    if [[ -f "$APP_DIR/index.html" ]]; then
        RADIO_NAME=$(grep -o 'name="[^"]*"' "$APP_DIR/index.html" | head -1 | sed 's/name="//;s/"$//')
        case "$RADIO_NAME" in
            "nanrenbao") BRAND_PROFILE="nanrenbao" ;;
            "parent-tools") BRAND_PROFILE="parent-tools" ;;
            "elder-love") BRAND_PROFILE="elder-love" ;;
            "womanai") BRAND_PROFILE="womanai" ;;
            *) BRAND_PROFILE="nanrenbao" ;;
        esac
        log "Detected brand: $BRAND_PROFILE"
    fi
fi

# Get theme directory
THEME_DIR="$PROJECT_DIR/.automation/scripts/templates"
case "$BRAND_PROFILE" in
    nanrenbao) THEME="sport-blue" ;;
    parent-tools) THEME="edu-blue" ;;
    elder-love) THEME="warm-gold" ;;
    womanai) THEME="coral-pink" ;;
    *) THEME="sport-blue" ;;
esac

log "=========================================="
log "Refining: $APP_DIR"
log "Brand: $BRAND_PROFILE"
log "Theme: $THEME"
log "Reference: $REFERENCE_APP"
log "=========================================="

# Extract original content
log "Extracting original content..."
TITLE=$(grep -o '<title>[^<]*</title>' "$APP_DIR/index.html" | head -1 | sed 's/<title>//;s/<\/title>//')
QUESTION=$(grep -o 'questionText[^>]*>[^<]*' "$APP_DIR/index.html" | head -1 | sed 's/.*>//')
OPTIONS=$(grep -o '<span>[^<]*</span>' "$APP_DIR/index.html" | sed 's/<span>//;s/<\/span>//' | tr '\n' ',' | sed 's/,$//')

log "Title: $TITLE"
log "Question: ${QUESTION:-"(extracting...)"}"

# Backup original files
BACKUP_DIR="$APP_DIR/.refine-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp "$APP_DIR/index.html" "$BACKUP_DIR/" 2>/dev/null || true
cp "$APP_DIR/styles.css" "$BACKUP_DIR/" 2>/dev/null || true
cp "$APP_DIR/app.js" "$BACKUP_DIR/" 2>/dev/null || true
log "Backup created: $BACKUP_DIR"

# Method 1: Try using Copilot CLI
if command -v copilot >/dev/null 2>&1; then
    log "Using Copilot CLI with model: $MODEL"
    
    # Refactor index.html
    log "Refactoring index.html..."
    PROMPT="Refactor the vote app index.html to use modern card-based layout.
    
Original content to preserve:
- Title: $TITLE
- Question: $QUESTION
- Options: $OPTIONS

Requirements:
1. Use semantic HTML5 structure
2. Add container, page-header, options-grid classes
3. Each option should be an option-card with card-image, card-content
4. Include check-indicator for selected state
5. Keep all original text content exactly
6. Use proper accessibility attributes

Output the complete HTML file."
    
    if $COPILOT_BIN "$PROMPT" > "$APP_DIR/index.html.new" 2>/dev/null; then
        if [[ -s "$APP_DIR/index.html.new" ]]; then
            mv "$APP_DIR/index.html.new" "$APP_DIR/index.html"
            log_success "index.html refactored"
        fi
    else
        log_error "Copilot failed for index.html, using template fallback"
        rm -f "$APP_DIR/index.html.new"
    fi
    
    # Refactor styles.css
    log "Refactoring styles.css..."
    if [[ -f "$THEME_DIR/$THEME/styles.css" ]]; then
        cp "$THEME_DIR/$THEME/styles.css" "$APP_DIR/styles.css"
        log_success "styles.css applied from theme"
    fi
    
    # Refactor app.js
    log "Refactoring app.js..."
    if [[ -f "$THEME_DIR/$THEME/app.js" ]]; then
        # Extract config from original
        CONFIG=$(grep -A 30 "questionConfig =" "$BACKUP_DIR/app.js" 2>/dev/null || echo "")
        
        # Copy template JS
        cp "$THEME_DIR/$THEME/app.js" "$APP_DIR/app.js"
        
        log_success "app.js applied from theme"
    fi
else
    # Method 2: Fallback to template copy
    log "Copilot CLI not available, using template fallback"
    
    if [[ -f "$THEME_DIR/$THEME/styles.css" ]]; then
        cp "$THEME_DIR/$THEME/styles.css" "$APP_DIR/styles.css"
        log_success "styles.css copied from template"
    fi
    
    if [[ -f "$THEME_DIR/$THEME/app.js" ]]; then
        cp "$THEME_DIR/$THEME/app.js" "$APP_DIR/app.js"
        log_success "app.js copied from template"
    fi
fi

# Validation
log "Validating output..."
ERRORS=0

if ! grep -q "options-grid" "$APP_DIR/index.html" 2>/dev/null; then
    log_error "index.html missing options-grid class"
    ((ERRORS++)) || true
fi

if ! grep -q "option-card" "$APP_DIR/index.html" 2>/dev/null; then
    log_error "index.html missing option-card class"
    ((ERRORS++)) || true
fi

if ! grep -q "option-label" "$APP_DIR/app.js" 2>/dev/null; then
    log_error "app.js still using jet-label instead of option-label"
    ((ERRORS++)) || true
fi

log "=========================================="
if [[ $ERRORS -eq 0 ]]; then
    log_success "Refinement complete!"
    log "Backup available at: $BACKUP_DIR"
    exit 0
else
    log_error "Refinement completed with $ERRORS warnings"
    log "Review files and restore from backup if needed: $BACKUP_DIR"
    exit 1
fi
