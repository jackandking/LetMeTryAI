#!/usr/bin/env bash
# 把 LetMeTryAI 静态站同步到 Lighthouse（letmetryai.cn 自 2026-11-07 起解析至 43.143.241.181）
# 背景：ICP 备案整改要求备案域名解析至腾讯云大陆服务器，GitHub Pages 不再承载线上流量。
#
# ⚠️ 2026-11-07 起已由 .github/workflows/deploy-lighthouse.yml 接管：push main 自动部署
#    git 跟踪的内容。本脚本降级为两个用途：
#      a) 同步未纳入 git 的图片资产（nanrenbao/flywheel 下约 475 个文件 / 534MB）；
#      b) CI 故障时的手动兜底。
#    注意：CI 的 rsync 刻意不带 --delete 以保护这些图片；本脚本默认同样不带。
#
#    ⚠️ 服务器 nginx 前置条件（2026-11-08 踩坑）：GitHub Pages 会把无扩展名 URL
#       映射到同名 .html（/nanrenbao/admin → admin.html），nginx 默认不会。
#       try_files 必须含 $uri.html，并为带尾斜杠路径加 /$1.html 兜底，
#       否则旧书签、外部链接全部 404。配置见服务器 /etc/nginx/conf.d/letmetryai.conf。
# 用法：
#   bash .automation/deploy_lighthouse.sh            # 同步
#   bash .automation/deploy_lighthouse.sh --dry-run # 只看会传什么
#   bash .automation/deploy_lighthouse.sh --delete  # 同步并删除服务器上多余文件
set -euo pipefail
cd "$(dirname "$0")/.."

excludes=(
  --exclude='.git' --exclude='.automation' --exclude='.harness'
  --exclude='node_modules' --exclude='.workbuddy' --exclude='.kimi'
  --exclude='.minimax' --exclude='.agents' --exclude='.learnings'
  --exclude='.github' --exclude='.gitignore'
  --exclude='.eslintrc.js' --exclude='.prettierrc.js'
)

args=(-az "${excludes[@]}")
for opt in "$@"; do
  case "$opt" in
    --dry-run) args+=(--dry-run) ;;
    --delete)  args+=(--delete) ;;
    *) echo "未知参数: $opt" >&2; exit 1 ;;
  esac
done

rsync "${args[@]}" --stats ./ lws:/www/wwwroot/letmetryai.cn/
