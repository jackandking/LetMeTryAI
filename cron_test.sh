#!/bin/bash
echo "========== Cron Test =========="
echo "Date: $(date)"
echo "PWD: $(pwd)"
echo "USER: $(whoami)"
echo "PATH: $PATH"
echo "HOME: $HOME"
echo "SHELL: $SHELL"
which node
node --version 2>&1
ls -la /Users/weiping/LetMeTryAI/scripts/daily_kuaishou_report.js
