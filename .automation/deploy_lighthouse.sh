#!/usr/bin/env bash
# 把 LetMeTryAI 静态站同步到 Lighthouse（letmetryai.cn 自 2026-11-07 起解析至 43.143.241.181）
# 背景：ICP 备案整改要求备案域名解析至腾讯云大陆服务器，GitHub Pages 不再承载线上流量。
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
