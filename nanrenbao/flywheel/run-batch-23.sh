#!/bin/zsh
# 飞轮 batch23: r787-r796 投稿+自动审批（仙/雅命名IP批：妙玉/青凤/铁心兰/水灵光/风四娘/朱七七/苏蓉蓉/琼霄/廉锦枫/周轻云）
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch23-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 787-miaoyu 788-qingfeng 789-tiexinlan 790-shuilingguang 791-fengsanniang 792-zhuqiqi 793-surongrong 794-qiongxiao 795-lianjinfeng 796-zhouqingyun; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH23 DONE" | tee -a "$LOG"
