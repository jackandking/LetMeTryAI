#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "========== Cron Test =========="
echo "Date: $(date)"
echo "PWD: $(pwd)"
echo "USER: $(whoami)"
echo "PATH: $PATH"
echo "HOME: $HOME"
echo "SHELL: $SHELL"
which node
node --version 2>&1
ls -la "$SCRIPT_DIR/scripts/daily_kuaishou_report.js"
