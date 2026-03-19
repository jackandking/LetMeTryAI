#!/bin/bash
#
# Vote App Image Generator - Generate themed images for options
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$(dirname "$SCRIPT_DIR")")")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    cat << EOF
Usage: $0 <app-directory> <brand-profile> [options-csv]

Generate themed images for vote app options.

Arguments:
    app-directory    App directory name
    brand-profile    Brand ID: nanrenbao, parent-tools, elder-love, womanai
    options-csv      Comma-separated option labels (auto-detected if not provided)

Examples:
    $0 fighter-jets nanrenbao "F-22,J-20,Su-57"
    $0 healthy-breakfast-choice elder-love
EOF
}

log() {
    echo -e "${BLUE}[image-gen]${NC} $*"
}

log_error() {
    echo -e "${RED}[image-gen]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[image-gen]${NC} $*"
}

# Parse arguments
APP_DIR="${1:-}"
BRAND_PROFILE="${2:-}"
OPTIONS_CSV="${3:-}"

if [[ -z "$APP_DIR" || -z "$BRAND_PROFILE" ]]; then
    usage
    exit 1
fi

if [[ ! -d "$PROJECT_DIR/$APP_DIR" ]]; then
    log_error "App directory not found: $PROJECT_DIR/$APP_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Auto-detect options if not provided
if [[ -z "$OPTIONS_CSV" ]]; then
    log "Auto-detecting options from index.html..."
    # Try to extract option labels from various patterns
    OPTIONS_CSV=$(grep -oE '<span>[^<]+</span>' "$APP_DIR/index.html" 2>/dev/null | \
        sed 's/<span>//;s/<\/span>//' | \
        tr '\n' ',' | \
        sed 's/,$//' | \
        head -c 500 || echo "")
    
    if [[ -z "$OPTIONS_CSV" ]]; then
        # Try alt text from images
        OPTIONS_CSV=$(grep -oE 'alt="[^"]+"' "$APP_DIR/index.html" 2>/dev/null | \
            sed 's/alt="//;s/"$//' | \
            grep -v "svg" | \
            tr '\n' ',' | \
            sed 's/,$//' | \
            head -c 500 || echo "")
    fi
fi

if [[ -z "$OPTIONS_CSV" ]]; then
    log_error "Could not detect options. Please provide options as CSV."
    exit 1
fi

log "Options: $OPTIONS_CSV"

# Create images directory
IMAGES_DIR="$APP_DIR/images"
mkdir -p "$IMAGES_DIR"

# Generate prompts based on brand
generate_prompt() {
    local option="$1"
    local brand="$2"
    
    case "$brand" in
        nanrenbao)
            # Military/Tech style
            if echo "$option" | grep -qiE "(战机|jet|fighter|f-|j-|su-)"; then
                echo "战斗机产品图，${option}，专业航空摄影风格，白色干净背景，高清细节，军事装备主图风格，正面视角"
            elif echo "$option" | grep -qiE "(坦克|tank)"; then
                echo "坦克产品图，${option}，专业军事摄影风格，白色干净背景，高清细节，陆战装备主图风格"
            elif echo "$option" | grep -qiE "(芯片|chip|cpu|ai)"; then
                echo "科技芯片产品图，${option}，科技产品摄影风格，白色背景，专业灯光，高清细节，半导体设备"
            else
                echo "军事装备产品图，${option}，专业摄影风格，白色干净背景，高清细节，装备主图风格"
            fi
            ;;
        parent-tools)
            # Education style
            echo "教育场景插画，${option}，温馨家庭教育风格，柔和蓝色调，儿童友好设计，扁平插画风格"
            ;;
        elder-love)
            # Lifestyle style
            if echo "$option" | grep -qiE "(早餐|食物|粥|food)"; then
                echo "健康早餐插画，${option}，温馨早餐场景，暖色调，美食摄影风格，柔和光线"
            else
                echo "退休生活插画，${option}，温暖养老风格，舒适氛围，柔和暖色调，生活场景"
            fi
            ;;
        womanai)
            # Beauty style
            if echo "$option" | grep -qiE "(口红|唇|lip)"; then
                echo "口红产品图，${option}，时尚美妆风格，精美细节，柔和灯光，美妆产品摄影，白色背景"
            else
                echo "美妆产品图，${option}，时尚美妆风格，精美细节，柔和打光，产品摄影"
            fi
            ;;
        *)
            # Default
            echo "产品图，${option}，专业摄影风格，白色背景，高清细节"
            ;;
    esac
}

# Generate images
log "=========================================="
log "Generating images for: $APP_DIR"
log "Brand: $BRAND_PROFILE"
log "=========================================="

# Convert CSV to array
IFS=',' read -ra OPTIONS <<< "$OPTIONS_CSV"

for i in "${!OPTIONS[@]}"; do
    option="${OPTIONS[$i]}"
    option_clean=$(echo "$option" | tr -d ' ' | tr '[:upper:]' '[:lower:]')
    
    # Generate safe filename
    filename=$(echo "$option_clean" | sed 's/[^a-z0-9]/-/g' | sed 's/-\+/-/g' | sed 's/^-//;s/-$//')
    if [[ -z "$filename" ]]; then
        filename="option-$((i+1))"
    fi
    
    output_path="$IMAGES_DIR/${filename}.svg"
    
    log "[$((i+1))/${#OPTIONS[@]}] $option"
    
    # Skip if already exists
    if [[ -f "$output_path" ]]; then
        log "  ✓ Already exists, skipping"
        continue
    fi
    
    # Generate prompt
    prompt=$(generate_prompt "$option" "$BRAND_PROFILE")
    log "  Prompt: $prompt"
    
    # For now, create placeholder SVG
    # In production, this would call AI image generator
    cat > "$output_path" << EOF
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3498db"/>
      <stop offset="100%" stop-color="#2980b9"/>
    </linearGradient>
  </defs>
  <rect width="400" height="400" fill="url(#grad)"/>
  <text x="50%" y="50%" text-anchor="middle" font-size="24" font-family="Arial, sans-serif" fill="white" font-weight="bold">$option</text>
</svg>
EOF
    
    log_success "  Created: $output_path"
done

log "=========================================="
log_success "Image generation complete!"
log "Images saved to: $IMAGES_DIR"
log "Note: These are placeholder SVGs. Replace with AI-generated images."
