#!/bin/zsh
# 飞轮 batch29: r843-r847 画面故事感实验批（story-feel exp, 秦淮八艳）投稿+自动审批
# 柳如是(扁舟儒装)/顾横波(眉楼执盏)/卞玉京(乱后空庭抚断琴)/马湘兰(画舫写兰)/寇白门(夜色勒马)
# 实验变量：决定性瞬间+情绪微表情+动机光源+叙事道具+动态+前景景深+色彩故事线
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch29-storyexp-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 843-liuruoshi 844-guhengbo 845-biyujing 846-maxianglan 847-koubaimen; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 故事感实验批（决定性瞬间/动机光源/叙事道具/动态/前景景深/色彩故事线） | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
  sleep 3
done
echo "BATCH29 STORY-EXP DONE" | tee -a "$LOG"
