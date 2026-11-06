#!/bin/bash
# 男人宝飞轮 · 一次性激活脚本
#
# ⚠️ 必须在【终端.app】里跑（真实 Aqua 登录会话）。
#    WorkBuddy 的沙箱进程无法 bootstrap gui domain、也无法执行 setgid 的 postdrop，
#    即使提权也无解。在真实终端里这两件事通常直接就能跑通。
#
#   bash ~/LetMeTryAI/.harness/scripts/activate-flywheel.sh
#
# 做三件事：
#   1) 把三个 LaunchAgent 装进 gui domain 并验证
#   2) 跑一次控制塔（会往 jackandking@163.com 发日报，验证 sendmail 是否可用）
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
echo "================ 2. 验证 sendmail ================"
echo "postfix main.cf: $([ -f /etc/postfix/main.cf ] && echo present || echo MISSING)"
echo "postdrop: $(ls -l /usr/sbin/postdrop 2>&1 | awk '{print $1, $3, $4}')"
echo "跑一次控制塔（会发日报到 jackandking@163.com）..."
bash "$REPO/.harness/scripts/run-control-tower.sh"
echo "--- 邮件结果 ---"
grep -E "已通过|sendmail 失败|Agent Mail 推送失败" "$REPO/.automation/reports/control-tower.cron.log" | tail -4
echo "--- 报告文件 ---"
ls -1t "$REPO/.automation/reports/"nanrenbao-control-tower-*.md | head -1

echo
echo "================ 3. ⑤ cookie 状态 ================"
node "$REPO/.harness/scripts/daily-kuaishou-report.js" 2>&1 | tail -4

echo
echo "================ 排障提示 ================"
echo "· 若 2 里仍报 'postdrop: Operation not permitted' 或 'Connection refused'："
echo "    sudo postfix set-permissions && sudo postfix start"
echo "    sudo postfix status"
echo "· 发件人现为 $H/LetMeTryAI/nanrenbao/privacy.html 公开的 letmetryx@163.com。"
echo "  本机 postfix 直投 @163.com 会被 SPF 拦（163 域名只认自家服务器）。"
echo "  要正常送达，需给 postfix 配 163 SMTP relay（smtp.163.com:465 + 授权码）："
echo "    sudo postconf -e 'relayhost = [smtp.163.com]:465'"
echo "    sudo postconf -e 'smtp_sasl_auth_enable = yes'"
echo "    sudo postconf -e 'smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd'"
echo "    # sasl_passwd 内容: [smtp.163.com]:465    letmetryx@163.com:<授权码，从 Vault 取>"
echo "    sudo postmap /etc/postfix/sasl_passwd && sudo postfix reload"
echo "  ⚠️ 授权码绝不写入本仓库；用 Vault slug 或本机 600 权限文件注入。"
echo "· 若 3 报 'Kuaishou session expired'（预期，cookie 已过期）："
echo "    node $REPO/.harness/scripts/ks-api-poc.js --sniff   # 浏览器扫码重登"
echo "· ④ 自有视频默认锁住：确认素材不擦边后，把"
echo "    $REPO/.harness/scripts/promo/promo-video.config.json 里 safe/enabled 置 true"
echo "· 随时撤销调度： launchctl bootout $DOM/<label>"
