#!/bin/bash
#
# Setup ALL cron jobs for the LetMeTryAI project
# Covers both harness (prod) and auto (newharness) jobs
#
# Usage:
#   bash .automation/scripts/setup-cron.sh
#
# Directories:
#   PROD_DIR    — harness cron jobs (content generation, publishing, reporting)
#   AUTO_DIR    — auto cron jobs (self-evolution, monitoring, analysis)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=========================================="
echo "LetMeTryAI - Complete Cron Setup"
echo "=========================================="
echo ""

# --- Detect platform ---
if [[ "$OSTYPE" == "darwin"* ]]; then
    PLATFORM="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    PLATFORM="linux"
else
    echo -e "${RED}Error: Unsupported platform: $OSTYPE${NC}"
    exit 1
fi
echo "Platform: $PLATFORM"

# --- Detect directories ---
# Try to auto-detect prod and auto directories based on common layouts
CURRENT_USER=$(whoami)
HOME_DIR=$(eval echo ~$CURRENT_USER)

# Default directory layout
default_prod="$HOME_DIR/prod/LetMeTryAI"
default_auto="$HOME_DIR/newharness/LetMeTryAI"

echo ""
echo -e "${BLUE}Directory configuration:${NC}"

if [[ -d "$default_prod" ]]; then
    read -p "Prod directory [$default_prod]: " PROD_DIR
    PROD_DIR=${PROD_DIR:-$default_prod}
else
    read -p "Prod directory (harness jobs): " PROD_DIR
fi

if [[ -d "$default_auto" ]]; then
    read -p "Auto directory [$default_auto]: " AUTO_DIR
    AUTO_DIR=${AUTO_DIR:-$default_auto}
else
    read -p "Auto directory (evolution jobs): " AUTO_DIR
fi

# Validate directories
for dir_name in PROD_DIR AUTO_DIR; do
    dir_val="${!dir_name}"
    if [[ ! -d "$dir_val/.git" ]]; then
        echo -e "${RED}Error: $dir_name ($dir_val) is not a git repository${NC}"
        exit 1
    fi
done

echo ""
echo "Prod directory: $PROD_DIR"
echo "Auto directory: $AUTO_DIR"

# --- Get email ---
default_email="jackandking@163.com"
read -p "Recipient email [$default_email]: " EMAIL
EMAIL=${EMAIL:-$default_email}

# --- Verify node ---
NODE_PATH=$(which node 2>/dev/null || echo "")
if [ -z "$NODE_PATH" ]; then
    echo -e "${RED}Error: Node.js not found in PATH${NC}"
    exit 1
fi
echo "Node: $NODE_PATH"

# --- Create log directories ---
mkdir -p "$PROD_DIR/.automation/.local/logs"
mkdir -p "$PROD_DIR/.harness/.local/logs/daily-app-cron"
mkdir -p "$PROD_DIR/.harness/.local/state/daily-app-runs"
mkdir -p "$AUTO_DIR/.automation/.local/logs"

echo ""
echo "=========================================="
echo "Cron jobs to install:"
echo "=========================================="

# --- Build crontab ---
read -r -d '' CRONTAB_CONTENT << CRONTAB_EOF || true
SHELL=/bin/bash
PATH=$HOME_DIR/.local/bin:$(dirname "$NODE_PATH"):/usr/local/bin:/usr/bin:/bin
HOME=$HOME_DIR

# ============================================================
# HARNESS JOBS (prod directory: $PROD_DIR)
# ============================================================

# Kuaishou Daily Report - 06:00
0 6 * * * cd "$PROD_DIR" && KUAISHOU_EMAIL_TO="$EMAIL" "$PROD_DIR/.harness/scripts/run-daily-report.sh"

# Daily Topic Selection - pre-select topics before app creation
5 0 * * * cd "$PROD_DIR" && .harness/scripts/run-topic-selector.sh nanrenbao
10 0 * * * cd "$PROD_DIR" && .harness/scripts/run-topic-selector.sh elder-love
15 0 * * * cd "$PROD_DIR" && .harness/scripts/run-topic-selector.sh parent-tools
20 0 * * * cd "$PROD_DIR" && .harness/scripts/run-topic-selector.sh womanai

# Daily App Run - 4 profiles (primary slots)
0 1 * * * cd "$PROD_DIR" && .harness/scripts/run-daily-app-cron.sh nanrenbao
0 2 * * * cd "$PROD_DIR" && .harness/scripts/run-daily-app-cron.sh elder-love
0 3 * * * cd "$PROD_DIR" && .harness/scripts/run-daily-app-cron.sh parent-tools
0 4 * * * cd "$PROD_DIR" && .harness/scripts/run-daily-app-cron.sh womanai

# Extra slots for high-revenue profiles (controlled by profile-slots.json)
0 5 * * * cd "$PROD_DIR" && HARNESS_EXTRA_SLOT=1 .harness/scripts/run-daily-app-cron.sh nanrenbao
0 6 * * * cd "$PROD_DIR" && HARNESS_EXTRA_SLOT=1 .harness/scripts/run-daily-app-cron.sh womanai

# Hot Task - AI image generation for top task - 11:00
0 11 * * * cd "$PROD_DIR" && .harness/scripts/run-daily-hot-task-image-gen.sh

# Hot Task - promo video generation and email - 11:30
30 11 * * * cd "$PROD_DIR" && .harness/scripts/run-hot-task-promo.sh

# Kuaishou follow workflow - ingest daily 14:00, worker every 5 min
0 14 * * * cd "$PROD_DIR/.harness" && ./scripts/run-kuaishou-follow-ingest.sh
5 * * * * cd "$PROD_DIR/.harness" && ./scripts/run-kuaishou-follow-worker.sh

# Daily Success Story - top video promo (after ingestion) - 07:30
30 7 * * * cd "$PROD_DIR" && .harness/scripts/run-daily-success-story.sh

# Daily Cron Health Check - 20:00
0 20 * * * cd "$PROD_DIR" && "$PROD_DIR/.harness/scripts/run-cron-health-check.sh"

# Weekly log cleanup - keep last 30 days - Sunday 03:00
0 3 * * 0 "$PROD_DIR/.harness/scripts/cleanup-old-logs.sh"

# ============================================================
# AUTO JOBS (newharness directory: $AUTO_DIR)
# ============================================================

# Circuit breaker - daily 20:30
30 20 * * * cd "$AUTO_DIR" && node .automation/scripts/circuit-breaker.js >> .automation/.local/logs/circuit-breaker-\$(date +\%Y\%m\%d-\%H\%M\%S).log 2>&1

# Log scanner to learnings - daily 21:00
0 21 * * * cd "$AUTO_DIR" && node .automation/scripts/log-scanner-to-learning.js >> .automation/.local/logs/log-scanner-\$(date +\%Y\%m\%d-\%H\%M\%S).log 2>&1

# Auto-fix agent - Saturday 03:00
0 3 * * 6 cd "$AUTO_DIR" && node .automation/scripts/auto-fix-agent.js >> .automation/.local/logs/auto-fix-\$(date +\%Y\%m\%d-\%H\%M\%S).log 2>&1

# Weekly self-improvement report - Saturday 05:00
0 5 * * 6 cd "$AUTO_DIR" && node .automation/scripts/self-improvement-orchestrator.js >> .automation/.local/logs/self-improvement-\$(date +\%Y\%m\%d-\%H\%M\%S).log 2>&1

# Analyze prompt experiments - Saturday 06:00
0 6 * * 6 cd "$AUTO_DIR" && node .automation/scripts/analyze-prompt-experiments.js >> .automation/.local/logs/analyze-prompt-experiments-\$(date +\%Y\%m\%d-\%H\%M\%S).log 2>&1

# Skill health check - 1st of month 04:00
0 4 1 * * cd "$AUTO_DIR" && node .automation/scripts/skill-health-check.js >> .automation/.local/logs/skill-health-check-\$(date +\%Y\%m\%d-\%H\%M\%S).log 2>&1
CRONTAB_EOF

echo "$CRONTAB_CONTENT"
echo ""

# --- Confirm and install ---
read -p "Install these cron jobs? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo "$CRONTAB_CONTENT" | crontab -

echo ""
echo -e "${GREEN}✓ All cron jobs installed successfully!${NC}"
echo ""
echo "Summary:"
echo "  Harness jobs (prod):  16 entries"
echo "  Auto jobs (newharness): 6 entries"
echo "  Email: $EMAIL"
echo ""
echo "=========================================="
echo "To manage:"
echo "  View:   crontab -l"
echo "  Edit:   crontab -e"
echo "  Remove: crontab -r (removes ALL jobs)"
echo ""
echo "Prod logs:  $PROD_DIR/.harness/.local/logs/"
echo "Auto logs:  $AUTO_DIR/.automation/.local/logs/"
echo "=========================================="
