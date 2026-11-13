#!/bin/zsh
# 飞轮 batch27: r819-r828 妖鬼名场面·万圣节令线 投稿+自动审批
# 梅三娘(画皮)/老鼠精(无底洞)/杏仙(荆棘岭)/辛十四娘/小翠/婴宁/姑获鸟(夜行游女)/九尾狐(青丘)/石矶娘娘(白骨洞)/侠女
# 选角：194 个已用角色外全新；高认知 IP+可演名场面（转化数据结论）；10-31 万圣夜前 7 天发布
cd ~/LetMeTryAI/nanrenbao/flywheel || exit 1
NODE=/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node
LOG=flywheel-batch27-$(date +%Y%m%d-%H%M).log
echo "log: $LOG"
for spec in 819-meisanniang 820-laoshujing 821-xingxian 822-xinshisiniang 823-xiaocui 824-yingning 825-guhuoniao 826-jiuweihu 827-shiji 828-xianv; do
  dna="$PWD/dna-$spec.json"
  img="$PWD/images/r$spec.png"
  up=$($NODE -e "console.log(require('$dna').prompt_text)")
  subj=$($NODE -e "console.log(require('$dna').subject)")
  echo "=== r$spec | $subj ===" | tee -a "$LOG"
  $NODE flywheel.cjs --image "$img" --table beauty --source-id "portrait-prompt-studio-$spec" --dna-file "$dna" --source-prompt "$subj | 饱满曲线基线 | 着衣合规·AI生成水印·原创虚构脸" --user-prompt "$up" 2>&1 | tee -a "$LOG"
done
echo "BATCH27 DONE" | tee -a "$LOG"
