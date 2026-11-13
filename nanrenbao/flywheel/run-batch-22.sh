#!/bin/zsh
# 飞轮 batch22: r758-r767 投稿+自动审批（仙/雅命名IP批：嫦娥/林朝英/黄衫女子/小昭/苏樱/林诗音/练霓裳/冰川天女/崔莺莺/李英琼）
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch22-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 758-change 759-linzhaojing 760-huangshannvzi 761-xiaozhao 762-suying 763-linshiyin 764-liannichang 765-bingchuantiannv 766-cuiyingying 767-liyingqiong; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH22 DONE" | tee -a "$LOG"
