#!/bin/bash
#
# Add daily vote app refinement cron job
# 添加入夜自动优化投票应用的定时任务
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REFINE_SCRIPT="$PROJECT_DIR/.automation/scripts/refine-vote-apps.sh"
LOG_FILE="$PROJECT_DIR/.automation/.local/logs/refine-vote-apps.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "Vote App Refinement - Cron Setup"
echo "=========================================="
echo ""

# Check if refine script exists
if [[ ! -f "$REFINE_SCRIPT" ]]; then
    echo -e "${RED}Error: Refine script not found: $REFINE_SCRIPT${NC}"
    exit 1
fi

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
else
    echo -e "${RED}Error: Unsupported platform: $OSTYPE${NC}"
    exit 1
fi

echo "Detected platform: $PLATFORM"
echo "Project directory: $PROJECT_DIR"
echo "Refine script: $REFINE_SCRIPT"
echo "Log file: $LOG_FILE"
echo ""

# Create log directory
mkdir -p "$PROJECT_DIR/.automation/.local/logs"

# Cron schedule options
echo "Select schedule for the refinement job:"
echo ""
echo "1) 00:05 daily (5 minutes after midnight, after Kuaishou report)"
echo "2) 00:30 daily (30 minutes after midnight)"
echo "3) 01:00 daily (1 hour after midnight)"
echo "4) Custom (you'll enter custom cron expression)"
echo ""
read -p "Enter choice [1-4, default: 1]: " choice
choice=${choice:-1}

case "$choice" in
    1) CRON_TIME="5 0 * * *" ;;
    2) CRON_TIME="30 0 * * *" ;;
    3) CRON_TIME="0 1 * * *" ;;
    4) 
        read -p "Enter custom cron expression (e.g., '0 2 * * *' for 2 AM): " custom_cron
        CRON_TIME="$custom_cron"
        ;;
    *) CRON_TIME="5 0 * * *" ;;
esac

echo ""
echo "Selected schedule: $CRON_TIME"
echo ""

# Create cron command
CRON_CMD="$CRON_TIME cd \"$PROJECT_DIR\" && \"$REFINE_SCRIPT\" >> \"$LOG_FILE\" 2>&1"

echo "Cron command:"
echo "$CRON_CMD"
echo ""

# Check existing crontab
existing_crontab=$(crontab -l 2>/dev/null || true)

if echo "$existing_crontab" | grep -q "refine-vote-apps.sh"; then
    echo -e "${YELLOW}Warning: Refinement cron job already exists!${NC}"
    echo ""
    read -p "Do you want to replace it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    # Remove existing entry
    existing_crontab=$(echo "$existing_crontab" | grep -v "refine-vote-apps.sh")
fi

# Add new cron job
new_crontab="$existing_crontab

# Daily Vote App Refinement - Added $(date +%Y-%m-%d)
# Automatically refines vote apps created in the last 24 hours
$CRON_CMD
"

echo "$new_crontab" | crontab -

echo -e "${GREEN}✓ Cron job installed successfully!${NC}"
echo ""
echo "Schedule: $CRON_TIME"
echo "Log file: $LOG_FILE"
echo ""

# Test run option
echo "Do you want to run a test now?"
echo "(This will check for new apps but won't commit/push without confirmation)"
read -p "Run test? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Running test..."
    echo "=========================================="
    cd "$PROJECT_DIR"
    # Run in dry-run mode (would need to implement --dry-run flag)
    bash "$REFINE_SCRIPT" 2>&1 | head -50
fi

echo ""
echo "=========================================="
echo "To manage the cron job:"
echo "  View: crontab -l"
echo "  Edit: crontab -e"
echo "  Remove: crontab -r (removes all jobs)"
echo ""
echo "To check logs:"
echo "  tail -f $LOG_FILE"
echo "=========================================="
