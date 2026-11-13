#!/bin/zsh
# 飞轮 batch25: r807-r810 潘金莲主题（金瓶梅/水浒传）投稿+自动审批
# 场景：帘下回眸(dudou)/对镜理妆(gown)/秋千架下(dudou)/雪夜烹茶(gown)
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch25-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 807-lianxia 808-jingzhuo 809-qiuqian 810-xueye; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH25 DONE" | tee -a "$LOG"
