#!/bin/zsh
# 飞轮 batch24: r797-r806 投稿+自动审批（神话异相专线：羽民/鲛人/文鳐鱼/比翼鸟/犬封女/女娇/山鬼/螺女/绿衣女/阿英）
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch24-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 797-yumin 798-jiaoren 799-wenyaoyu 800-biyiniao 801-quanfengnv 802-nvjiao 803-shangui 804-luonv 805-lvyinv 806-aying; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH24 DONE" | tee -a "$LOG"
