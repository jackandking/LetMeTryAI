#!/bin/bash
#
# Setup daily cron job for Kuaishou report
# 设置每天早上6点的定时任务
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
REPORT_SCRIPT="$PROJECT_DIR/scripts/daily_kuaishou_report.js"
LOG_FILE="$PROJECT_DIR/logs/daily_report.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Kuaishou Daily Report - Cron Setup"
echo "=========================================="
echo ""

# Check if running on macOS or Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
    CRON_SERVICE="com.vix.cron"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
else
    echo -e "${RED}Error: Unsupported platform: $OSTYPE${NC}"
    exit 1
fi

echo "Detected platform: $PLATFORM"

# Create log directory
mkdir -p "$PROJECT_DIR/logs"

# Get user email
default_email="jackandking@163.com"
read -p "Enter recipient email [$default_email]: " email
email=${email:-$default_email}

# Get node path
NODE_PATH=$(which node)
if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}Error: Node.js not found in PATH${NC}"
    exit 1
fi

echo "Node path: $NODE_PATH"
echo "Report script: $REPORT_SCRIPT"
echo "Log file: $LOG_FILE"
echo "Email: $email"

# Create cron command
# Run at 6:00 AM every day
CRON_CMD="0 6 * * * cd \"$PROJECT_DIR\" && KUAISHOU_EMAIL_TO=\"$email\" \"$NODE_PATH\" \"$REPORT_SCRIPT\" >> \"$LOG_FILE\" 2>&1"

echo ""
echo "Cron command:"
echo "$CRON_CMD"
echo ""

# Check existing crontab
existing_crontab=$(crontab -l 2>/dev/null || true)

if echo "$existing_crontab" | grep -q "daily_kuaishou_report.js"; then
    echo -e "${YELLOW}Warning: Cron job already exists!${NC}"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    # Remove existing entry
    existing_crontab=$(echo "$existing_crontab" | grep -v "daily_kuaishou_report.js")
fi

# Add new cron job
new_crontab="$existing_crontab
# Kuaishou Daily Report - Added $(date)
$CRON_CMD
"

echo "$new_crontab" | crontab -

echo -e "${GREEN}✓ Cron job installed successfully!${NC}"
echo ""
echo "Schedule: Every day at 6:00 AM"
echo "Recipient: $email"
echo "Log file: $LOG_FILE"
echo ""

# Test run option
read -p "Do you want to run a test now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running test..."
    cd "$PROJECT_DIR"
    KUAISHOU_EMAIL_TO="$email" "$NODE_PATH" "$REPORT_SCRIPT" 2>&1 | tee -a "$LOG_FILE"
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
