#!/bin/zsh
# 飞轮 batch31: r857-r861 画面故事感实验批（story-feel exp）投稿+自动审批
# 朱淑真(灯下断肠词)/管道升(墨竹我侬)/冯小怜(戎装冬猎)/赵合德(初入未央)/娥皇(湘水泣竹)
# 实验变量：决定性瞬间+情绪微表情+动机光源+叙事道具+动态+前景景深+色彩故事线
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch31-storyexp-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 857-zhushuzhen 858-guandaosheng 859-fengxiaolian 860-zhaohede 861-ehuang; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 故事感实验批（决定性瞬间/动机光源/叙事道具/动态/前景景深/色彩故事线） | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
  sleep 3
done
echo "BATCH31 STORY-EXP DONE" | tee -a "$LOG"
