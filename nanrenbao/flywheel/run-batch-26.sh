#!/bin/zsh
# 飞轮 batch26: r811-r818 红楼梦金钗补全投稿+自动审批
# 宝钗(蘅芜苑)/元春(省亲)/探春(秋爽斋)/湘云(芍药圃)/迎春(紫菱洲)/惜春(藕香榭)/李纨(稻香村)/可卿(太虚幻境)
# 注：巧姐（十二钗中唯一未成年角色）按内容红线跳过；妙玉已于 787 先行上线
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch26-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 811-baochai 812-yuanchun 813-tanchun 814-xiangyun 815-yingchun 816-xichun 817-liwan 818-keqing; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH26 DONE" | tee -a "$LOG"
