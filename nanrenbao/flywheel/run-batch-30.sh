#!/bin/zsh
# 飞轮 batch30: r852-r856 画面故事感实验批（story-feel exp）投稿+自动审批
# 卫子夫(平阳歌舞)/窦漪房(深宫失明)/阴丽华(新野初见)/独孤伽罗(二圣临朝)/长孙皇后(朝服进谏)
# 实验变量：决定性瞬间+情绪微表情+动机光源+叙事道具+动态+前景景深+色彩故事线
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch30-storyexp-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 852-weiziwu 853-douyifang 854-yinlihua 855-dugujiaruo 856-zhangsunhuanghou; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 故事感实验批（决定性瞬间/动机光源/叙事道具/动态/前景景深/色彩故事线） | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
  sleep 3
done
echo "BATCH30 STORY-EXP DONE" | tee -a "$LOG"
