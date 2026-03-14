#!/bin/bash
# Daily Run Script with Kuaishou Report
# 日常任务 + 快手数据报告

set -e

PROJECT_DIR="/Users/weiping/LetMeTryAI"
LOG_FILE="$PROJECT_DIR/logs/daily_run.log"
NODE_PATH="/Users/weiping/.nvm/versions/node/v22.22.0/bin"

# Create logs directory
mkdir -p "$PROJECT_DIR/logs"

echo "========================================" >> "$LOG_FILE"
echo "Daily Run Started: $(date)" >> "$LOG_FILE"
echo "========================================" >> "$LOG_FILE"

# Step 1: Run existing daily tasks
echo "[$(date)] Step 1: Running daily tasks..." >> "$LOG_FILE"
export PATH=$PATH:$NODE_PATH

# Your existing copilot task (commented out for safety, uncomment when ready)
# $NODE_PATH/copilot --yolo -p "帮我搜一下今天的 [科技/军事/体育] 热点..."

echo "[$(date)] Daily tasks completed" >> "$LOG_FILE"

# Step 2: Generate and send Kuaishou report
echo "[$(date)] Step 2: Generating Kuaishou report..." >> "$LOG_FILE"

cd "$PROJECT_DIR"
export KUAISHOU_EMAIL_TO="jackandking@163.com"
export HEADLESS="true"

$NODE_PATH/node "$PROJECT_DIR/scripts/daily_kuaishou_report.js" >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "[$(date)] Kuaishou report sent successfully" >> "$LOG_FILE"
else
    echo "[$(date)] ERROR: Kuaishou report failed" >> "$LOG_FILE"
fi

echo "[$(date)] Daily run completed" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
