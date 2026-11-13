#!/bin/zsh
# 飞轮 20 连跑: r758-r777 投稿+自动审批
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch20-r3-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 758-mulan 759-azhu 760-azi 761-zhongling 762-yilin 763-qifang 764-lingshuanghua 765-liwenxiu 766-bixiao 767-wangguiren 768-zhizhujing 769-wanshenggongzhu 770-menglijun 771-shisanmei 772-hongfunv 773-xunguan 774-nvying 775-yanshuinv 776-xianfuren 777-tangguichen; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH20-R3 DONE" | tee -a "$LOG"
