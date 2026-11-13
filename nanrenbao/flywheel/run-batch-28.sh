#!/bin/zsh
# 飞轮 batch28: r829-r833 画面故事感实验批（story-feel exp）投稿+自动审批
# 碧瑶(满月井)/龙葵(剑炉)/林月如(锁妖塔)/阿宝(离魂化鸟)/霍小玉(夜宴断钗)
# 实验变量：决定性瞬间+情绪微表情+动机光源+叙事道具+动态+前景景深+色彩故事线
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch28-storyexp-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 829-biyao 830-longkui 831-linyueru 832-abao 833-huoxiaoyu; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 故事感实验批（决定性瞬间/动机光源/叙事道具/动态/前景景深/色彩故事线） | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
  sleep 3
done
echo "BATCH28 STORY-EXP DONE" | tee -a "$LOG"
