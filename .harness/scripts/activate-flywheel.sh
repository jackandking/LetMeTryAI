#!/bin/bash
# 男人宝飞轮 · 一次性激活脚本
#
# ⚠️ 必须在【终端.app】里跑（真实 Aqua 登录会话）。
#    WorkBuddy 的沙箱进程非 Aqua 会话派生，无法 bootstrap gui domain，即使提权也无解。
#    在真实终端里 launchctl load / bootstrap 通常直接就能跑通。
#    日报发信已改为 smtp.163.com 直发（不再依赖本机 postfix/postdrop）。
#
#   bash ~/LetMeTryAI/.harness/scripts/activate-flywheel.sh
#
# 做三件事：
#   1) 把三个 LaunchAgent 装进 gui domain 并验证
#   2) 跑一次控制塔（会经 smtp.163.com 发日报到 jackandking@163.com，验证直发链路）
#   3) 探一下 ⑤ daily-kuaishou-report 的 cookie 状态
set +e
H="$HOME"
DOM="gui/$(id -u)"
REPO="$H/LetMeTryAI"
AGENTS=(com.letmetry.flywheel-control-tower com.letmetry.daily-kuaishou-report com.letmetry.promo-video)

echo "================ 1. 加载每日调度 ================"
for p in "${AGENTS[@]}"; do
  PLIST="$H/Library/LaunchAgents/$p.plist"
  if launchctl print "$DOM/$p" >/dev/null 2>&1; then
    echo "  ✓ $p 已在 gui domain"
  else
    launchctl load "$PLIST" >/dev/null 2>&1
    if ! launchctl print "$DOM/$p" >/dev/null 2>&1; then
      launchctl bootstrap "$DOM" "$PLIST" >/dev/null 2>&1
    fi
    if launchctl print "$DOM/$p" >/dev/null 2>&1; then
      echo "  ✓ $p 已加载"
    else
      echo "  ✗ $p 加载失败（可能需要 sudo 或 plist 权限）"
    fi
  fi
done
echo "--- gui domain 里的 letmetry 服务（应有 6 个）---"
launchctl print "$DOM" 2>&1 | grep -i letmetry

echo
echo "================ 2. 验证 163 SMTP 直发 ================"
TOKF="$H/.automation/.local/auth/vault_agent_token_smtp"
echo "Vault token: $([ -f "$TOKF" ] && echo present || echo 'MISSING（需先注册并批准专用 agent）')"
echo "跑一次控制塔（会经 smtp.163.com 发日报到 jackandking@163.com）..."
bash "$REPO/.harness/scripts/run-control-tower.sh"
echo "--- 邮件结果 ---"
grep -E "已通过|直发失败|sendmail 失败|Agent Mail 推送失败" "$REPO/.automation/reports/control-tower.cron.log" | tail -5
echo "--- 报告文件 ---"
ls -1t "$REPO/.automation/reports/"nanrenbao-control-tower-*.md | head -1

echo
echo "================ 3. ⑤ cookie 状态 ================"
node "$REPO/.harness/scripts/daily-kuaishou-report.js" 2>&1 | tail -4

echo
echo "================ 排障提示 ================"
echo "· 日报发件人 letmetryx@163.com，凭据来自 Vault 三个 slug："
echo "    smtp-outbound-address / smtp-outbound-host / smtp-outbound-authcode"
echo "  运行时经 $TOKF (600) 取值、只用内存，不落仓库；脚本直连 smtp.163.com:465。"
echo "  → 无需本机 postfix/sendmail，WorkBuddy 沙箱的 postdrop 限制也不再影响。"
echo "· 若 2 报 'Vault 未授权'：专用 agent 还没被 Owner 批准（一次性）。"
echo "  批准后可用下面命令核对 scope（只列 slug，不回显值）："
echo "    curl -s -H \"Authorization: Bearer \$(cat $TOKF)\" https://letmetry.cn/api/vault/secrets"
echo "· ⚠️ 授权码绝不写入本仓库，也不要贴进任何日志/对话。"
echo "· 若 3 报 'Kuaishou session expired'（预期，cookie 已过期）："
echo "    node $REPO/.harness/scripts/ks-api-poc.js --sniff   # 浏览器扫码重登"
echo "· ④ 自有视频默认锁住：确认素材不擦边后，把"
echo "    $REPO/.harness/scripts/promo/promo-video.config.json 里 safe/enabled 置 true"
echo "· 随时撤销调度： launchctl bootout $DOM/<label>"
