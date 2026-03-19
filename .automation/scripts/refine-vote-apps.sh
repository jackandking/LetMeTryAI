#!/bin/bash
#
# Daily Vote App Refinement Script
# 自动优化前一天新建的投票应用
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"
LOG_FILE="$PROJECT_DIR/.automation/.local/logs/refine-vote-apps.log"
REPORT_FILE="$PROJECT_DIR/.automation/.local/logs/refine-report-latest.txt"

# Email configuration
EMAIL_TO="${REFINE_EMAIL_TO:-jackandking@163.com}"
EMAIL_SUBJECT_PREFIX="[VoteApp优化]"

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

# Send email report
send_email_report() {
    local date_str
    date_str=$(date '+%Y-%m-%d')
    
    if [[ ! -f "$REPORT_FILE" ]]; then
        log_error "Report file not found: $REPORT_FILE"
        return 1
    fi
    
    # Check if Python and send_email.py exist
    if [[ -f "$PROJECT_DIR/.automation/scripts/send_email.py" ]] && command -v python3 >/dev/null 2>&1; then
        log_info "Sending email report to $EMAIL_TO..."
        local subject="$EMAIL_SUBJECT_PREFIX 每日优化报告 $date_str"
        if python3 "$PROJECT_DIR/.automation/scripts/send_email.py" "$subject" "$EMAIL_TO" "$REPORT_FILE" >> "$LOG_FILE" 2>&1; then
            log_success "Email sent successfully"
            return 0
        else
            log_error "Failed to send email"
            return 1
        fi
    else
        log_info "Email sending skipped (send_email.py not available)"
        return 0
    fi
}

# Build email report
build_report() {
    local total_apps="$1"
    local success_count="$2"
    local fail_count="$3"
    local apps_list="$4"
    local errors="$5"
    
    local date_str
    date_str=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > "$REPORT_FILE" << EOF
VoteApp 每日优化报告
===================

报告时间: $date_str
项目目录: $PROJECT_DIR

优化概况
--------
总检测应用: $total_apps
优化成功: $success_count
优化失败: $fail_count

应用列表
--------
$apps_list

错误信息
--------
$errors

详细日志
--------
请查看服务器日志文件: $LOG_FILE

---
此邮件由 LetMeTryAI 自动发送
EOF
}

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
    
    # Try to find app in metadata and check tags
    if [[ -f "$PROJECT_DIR/apps-metadata.json" ]]; then
        # Extract all tags for this app
        local tags
        tags=$(grep -A 30 '"id": "'$app_id'"' "$PROJECT_DIR/apps-metadata.json" | grep -A 20 '"tags":' | grep -o '"[^"]*"' | tr '\n' ' ')
        
        # Check for brand indicators in tags
        if echo "$tags" | grep -qi "nanrenbao\|男人宝\|男性\|体育\|足球\|球星"; then
            echo "nanrenbao"
            return
        elif echo "$tags" | grep -qi "parent-tools\|家长爱\|教育\|作业\|孩子"; then
            echo "parent-tools"
            return
        elif echo "$tags" | grep -qi "elder-love\|爱老人\|老人\|退休\|养生"; then
            echo "elder-love"
            return
        elif echo "$tags" | grep -qi "womanai\|女人爱\|女性\|美妆\|口红"; then
            echo "womanai"
            return
        fi
        
        # Try by directory name matching
        case "$app_id" in
            *nanrenbao*|*man*|*sport*|*football*|*ball*|*nba*) echo "nanrenbao" ;;
            *parent*|*child*|*homework*|*school*) echo "parent-tools" ;;
            *elder*|*retire*|*old*|*breakfast*) echo "elder-love" ;;
            *woman*|*female*|*lipstick*|*beauty*) echo "womanai" ;;
            *)
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
                ;;
        esac
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
        # Copy template JS
        cp "$theme_dir/app.js" "$app_dir/app.js"
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
        
        # Send "no new apps" report
        build_report "0" "0" "0" "无新应用" "N/A"
        send_email_report
        
        log "=========================================="
        exit 0
    fi
    
    local app_count
    app_count=$(echo "$new_apps" | wc -l | tr -d ' ')
    
    log_info "Found $app_count new app(s):"
    echo "$new_apps" | while read -r app; do
        log_info "  - $app"
    done
    
    # Process each app
    local success_count=0
    local fail_count=0
    local apps_list=""
    local errors=""
    
    while IFS= read -r app_dir; do
        if [[ -n "$app_dir" && -d "$app_dir" ]]; then
            local app_name
            app_name=$(basename "$app_dir")
            apps_list="$apps_list\n- $app_name"
            
            if refine_app "$app_dir"; then
                ((success_count++)) || true
            else
                ((fail_count++)) || true
                errors="$errors\n- $app_name: 优化失败"
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
            errors="$errors\n- Git push failed"
        fi
    fi
    
    # Build and send report
    build_report "$app_count" "$success_count" "$fail_count" "$apps_list" "$errors"
    send_email_report
    
    log "=========================================="
    log "Refinement Complete: $success_count succeeded, $fail_count failed"
    log "=========================================="
}

main "$@"
