#!/bin/bash
#
# Setup cron jobs for Kuaishou report and multi-brand daily runs
# 设置快手日报 + 多品牌日更的定时任务
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_DIR="$PROJECT_DIR/.automation/.local"
HARNESS_LOCAL_DIR="$PROJECT_DIR/.harness/.local"
REPORT_SCRIPT="$PROJECT_DIR/.automation/scripts/daily_kuaishou_report.js"
REPORT_RUNNER="$PROJECT_DIR/.automation/scripts/run-daily-report.sh"
PROFILE_RUNNER="$PROJECT_DIR/.harness/scripts/run-daily-app-cron.sh"
REPORT_LOG_FILE="$LOCAL_DIR/logs/daily_report.log"
NANRENBAO_LOG_FILE="$HARNESS_LOCAL_DIR/logs/daily-app-cron/nanrenbao.log"
ELDER_LOVE_LOG_FILE="$HARNESS_LOCAL_DIR/logs/daily-app-cron/elder-love.log"
PARENT_TOOLS_LOG_FILE="$HARNESS_LOCAL_DIR/logs/daily-app-cron/parent-tools.log"
WOMANAI_LOG_FILE="$HARNESS_LOCAL_DIR/logs/daily-app-cron/womanai.log"
HEALTH_CHECK_LOG_FILE="$LOCAL_DIR/logs/cron-health-check/runner.log"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "Daily Automation - Cron Setup"
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
mkdir -p "$LOCAL_DIR/logs"
mkdir -p "$HARNESS_LOCAL_DIR/logs/daily-app-cron" "$HARNESS_LOCAL_DIR/state/daily-app-runs"

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
echo "Report runner: $REPORT_RUNNER"
echo "Profile runner: $PROFILE_RUNNER"
echo "Report log file: $REPORT_LOG_FILE"
echo "Email: $email"

# Create cron commands
REPORT_CRON_CMD="0 6 * * * cd \"$PROJECT_DIR\" && KUAISHOU_EMAIL_TO=\"$email\" \"$REPORT_RUNNER\" >> \"$REPORT_LOG_FILE\" 2>&1"
NANRENBAO_CRON_CMD="0 7 * * * cd \"$PROJECT_DIR\" && HARNESS_MODE=production HARNESS_CRON_LOG_FILE=\"$NANRENBAO_LOG_FILE\" \"$PROFILE_RUNNER\" nanrenbao >> \"$NANRENBAO_LOG_FILE\" 2>&1"
ELDER_LOVE_CRON_CMD="0 8 * * * cd \"$PROJECT_DIR\" && HARNESS_MODE=production HARNESS_CRON_LOG_FILE=\"$ELDER_LOVE_LOG_FILE\" \"$PROFILE_RUNNER\" elder-love >> \"$ELDER_LOVE_LOG_FILE\" 2>&1"
PARENT_TOOLS_CRON_CMD="0 9 * * * cd \"$PROJECT_DIR\" && HARNESS_MODE=production HARNESS_CRON_LOG_FILE=\"$PARENT_TOOLS_LOG_FILE\" \"$PROFILE_RUNNER\" parent-tools >> \"$PARENT_TOOLS_LOG_FILE\" 2>&1"
WOMANAI_CRON_CMD="0 10 * * * cd \"$PROJECT_DIR\" && HARNESS_MODE=production HARNESS_CRON_LOG_FILE=\"$WOMANAI_LOG_FILE\" \"$PROFILE_RUNNER\" womanai >> \"$WOMANAI_LOG_FILE\" 2>&1"
HEALTH_CHECK_CRON_CMD="0 20 * * * cd \"$PROJECT_DIR\" && \"$PROJECT_DIR/.automation/scripts/run-cron-health-check.sh\" >> \"$HEALTH_CHECK_LOG_FILE\" 2>&1"

echo ""
echo "Cron commands:"
echo "$REPORT_CRON_CMD"
echo "$NANRENBAO_CRON_CMD"
echo "$ELDER_LOVE_CRON_CMD"
echo "$PARENT_TOOLS_CRON_CMD"
echo "$WOMANAI_CRON_CMD"
echo "$HEALTH_CHECK_CRON_CMD"
echo ""

# Check existing crontab
existing_crontab=$(crontab -l 2>/dev/null || true)

if echo "$existing_crontab" | grep -Eq "daily_kuaishou_report.js|run-daily-profile.sh|run-daily-app-cron.sh|daily_run.sh|run-cron-health-check.sh"; then
    echo -e "${YELLOW}Warning: Related cron jobs already exist!${NC}"
    echo ""
    read -p "Do you want to update it? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 0
    fi
    # Remove existing app/report entries for this repo before reinstalling.
    existing_crontab=$(echo "$existing_crontab" | grep -v "daily_kuaishou_report.js" | grep -v "run-daily-profile.sh" | grep -v "run-daily-app-cron.sh" | grep -v "daily_run.sh" | grep -v "run-cron-health-check.sh")
fi

# Add new cron jobs
new_crontab="$existing_crontab
# Kuaishou Daily Report - Added $(date)
$REPORT_CRON_CMD
# Daily App Run - nanrenbao
$NANRENBAO_CRON_CMD
# Daily App Run - elder-love
$ELDER_LOVE_CRON_CMD
# Daily App Run - parent-tools
$PARENT_TOOLS_CRON_CMD
# Daily App Run - womanai
$WOMANAI_CRON_CMD
# Daily Cron Health Check
$HEALTH_CHECK_CRON_CMD
"

echo "$new_crontab" | crontab -

echo -e "${GREEN}✓ Cron jobs installed successfully!${NC}"
echo ""
echo "Schedules:"
echo "  - Kuaishou report: every day at 6:00 AM"
echo "  - Nanrenbao harness run: every day at 7:00 AM"
echo "  - Elder Love harness run: every day at 8:00 AM"
echo "  - Parent Tools harness run: every day at 9:00 AM"
echo "  - Womanai harness run: every day at 10:00 AM"
echo "  - Cron health check: every day at 8:00 PM"
echo "Recipient: $email"
echo "Report log file: $REPORT_LOG_FILE"
echo "Nanrenbao log file: $NANRENBAO_LOG_FILE"
echo "Elder Love log file: $ELDER_LOVE_LOG_FILE"
echo "Parent Tools log file: $PARENT_TOOLS_LOG_FILE"
echo "Womanai log file: $WOMANAI_LOG_FILE"
echo "Health check log file: $HEALTH_CHECK_LOG_FILE"
echo "Run summaries: $HARNESS_LOCAL_DIR/state/daily-app-runs/*.jsonl"
echo ""

# Test run option
read -p "Do you want to run a nanrenbao test now? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Running test..."
    cd "$PROJECT_DIR"
    HARNESS_MODE=production HARNESS_CRON_LOG_FILE="$NANRENBAO_LOG_FILE" "$PROFILE_RUNNER" nanrenbao 2>&1 | tee -a "$NANRENBAO_LOG_FILE"
fi

echo ""
echo "=========================================="
echo "To manage the cron job:"
echo "  View: crontab -l"
echo "  Edit: crontab -e"
echo "  Remove: crontab -r (removes all jobs)"
echo ""
echo "To check logs:"
echo "  tail -f $REPORT_LOG_FILE"
echo "  tail -f $NANRENBAO_LOG_FILE"
echo "  tail -f $ELDER_LOVE_LOG_FILE"
echo "  tail -f $PARENT_TOOLS_LOG_FILE"
echo "  tail -f $WOMANAI_LOG_FILE"
echo "  tail -f $HEALTH_CHECK_LOG_FILE"
echo "  tail -n 5 $HARNESS_LOCAL_DIR/state/daily-app-runs/nanrenbao.jsonl"
echo "  tail -n 5 $HARNESS_LOCAL_DIR/state/daily-app-runs/elder-love.jsonl"
echo "  tail -n 5 $HARNESS_LOCAL_DIR/state/daily-app-runs/parent-tools.jsonl"
echo "  tail -n 5 $HARNESS_LOCAL_DIR/state/daily-app-runs/womanai.jsonl"
echo "=========================================="
