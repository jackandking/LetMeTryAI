#!/bin/zsh
# 飞轮 20 连跑: r738-r757 投稿+自动审批
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch21-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 738-xiaolongnv 739-wangyuyan 740-muwanqing 741-liqiushui 742-daiqisi 743-yinsusu 744-ningzhongze 745-lanfenghuang 746-munianci 747-meichaofeng 748-hetieshou 749-shuisheng 750-yuanziyi 751-miaoruolan 752-baisuzhen 753-yunxiao 754-lianxing 755-luxueqi 756-zixuan 757-liumengli; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH21 DONE" | tee -a "$LOG"
