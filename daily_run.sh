#!/bin/bash
export PATH=$PATH:/Users/weiping/.nvm/versions/node/v22.22.0/bin

PROJECT_DIR="/Users/weiping/LetMeTryAI"
COPILOT_BIN="/Users/weiping/.nvm/versions/node/v22.22.0/bin/copilot"
EMAIL_DRAFT_PATH="$PROJECT_DIR/email_draft.txt"
DEFAULT_MODEL="gpt-5-mini"
COPILOT_MODEL="${DAILY_COPILOT_MODEL:-$DEFAULT_MODEL}"

cd "$PROJECT_DIR"

# Daily run skill mapping:
# - idea-to-launch: primary orchestration for topic -> scaffold -> deploy -> publish -> report
# - brand-profiles/topic-selector: audience-aware topic selection
# - voting-app-scaffold: fighter-jets-style app generation
# - kuaishou-publisher: Kuaishou Spark Plan publication
# - report-sender: daily summary delivery
# - kuaishou-crawler: optional reference data collection
PROMPT=$(cat <<EOF
帮我搜一下今天的 [科技/军事/体育] 热点，挑一个适合做投票的话题（例如：男人减速带）。

请显式复用项目里现有的 skills：
- 整体流程优先使用 idea-to-launch，把“选题、生成、部署检查、快手发布、发报告”串成一条链。
- 选题时优先使用 brand-profiles + topic-selector，按不同小程序的人群策略做筛选，不要把女人爱、爱老人、家长爱硬套成男人宝逻辑。
- 生成投票页时优先使用 voting-app-scaffold，按 fighter-jets 模式产出 app 配置、HTML 选项和 metadata。
- 发布到快手星火计划时，优先使用 kuaishou-publisher；如需页面级排障或补充自动化细节，可复用 kuaishou-scraper。
- 发送日报总结时，优先使用 report-sender。
- 如果需要抓取快手现有任务/数据做参考，可复用 kuaishou-crawler。

执行要求：
1. 开发：按 fighter-jets 模式做出来，并注册 metadata。
2. 部署：务必先提交并推送到 GitHub，确保线上链接可访问。
3. 发布：最后运行 publish-kuaishou-task.js 脚本自动发布到快手星火计划。
4. 总结：将总结保存为 $EMAIL_DRAFT_PATH，并运行 /usr/local/bin/python3 $PROJECT_DIR/send_email.py '[Copilot Report] Daily Update' jackandking@163.com $EMAIL_DRAFT_PATH 发送邮件。
EOF
)

"$COPILOT_BIN" --model "$COPILOT_MODEL" --yolo -p "$PROMPT"
