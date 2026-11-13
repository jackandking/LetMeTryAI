#!/bin/zsh
# 标题单变量实验：635 白晶晶同图重传 4 次（同像素、新 URL、新 id），自动审批
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=title-exp-submit-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
IMG=/tmp/exp-imgs/635-baijingjing.jpg
DNA=/tmp/dna-635-baijingjing.json
for i in 1 2 3 4; do
  echo "=== copy#$i ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$IMG" --table beauty --source-id "title-exp-635-copy$i" --dna-file "$DNA" --source-prompt "标题单变量实验：白晶晶同图重传 copy$i" --user-prompt "same image, title A/B test" 2>&1 | tee -a "$LOG"
done
echo "TITLE_EXP_SUBMIT_DONE" | tee -a "$LOG"
