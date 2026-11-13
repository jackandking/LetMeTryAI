#!/bin/zsh
# 飞轮 20 连跑: r718-r737 投稿+自动审批
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch20-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 718-nvwa 719-jingwei 720-longnv 721-yaoji 722-zhenmi 723-dengzhuangyu 724-longjigongzhu 725-huximei 726-luochanv 727-yumianhuli 728-xiezijing 729-limochou 730-guoxiang 731-chengying 732-gongsunlv 733-liannishang 734-huoqingtong 735-ajiu 736-fanlihua 737-fuhao; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH20 DONE" | tee -a "$LOG"
