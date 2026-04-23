#!/bin/bash
#
# evolve.sh — 手动触发 LetMeTryAI 进化引擎
#
# 用法:
#   cd /Users/weiping/LetMeTryAI && .kimi/scripts/evolve.sh [mode]
#
# 模式:
#   full      — 完整进化循环（观测→诊断→行动→记录）
#   observe   — 只观测和诊断，不采取行动
#   diagnose  — 只诊断，输出结论
#   act       — 直接执行待办行动（跳过观测）
#   stats     — 只输出指标看板
#
# 这个脚本也可以被 cron 调用实现自动进化。
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MODE="${1:-full}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="$REPO_DIR/.kimi/logs"
LOG_FILE="$LOG_DIR/evolve-${TIMESTAMP}.log"

mkdir -p "$LOG_DIR"

# 统一输出到日志 + 终端
exec > >(tee -a "$LOG_FILE") 2>&1

echo "═══════════════════════════════════════"
echo "  LetMeTryAI 进化引擎 — ${MODE} 模式"
echo "  时间: $(date -Iseconds)"
echo "  日志: $LOG_FILE"
echo "═══════════════════════════════════════"

# ============================================================
# 阶段 0: 加载上下文
# ============================================================
echo ""
echo "📚 [0/4] 加载上下文..."

SESSION_MEMORY="$REPO_DIR/.kimi/SESSION_MEMORY.md"
EVOLUTION_STATE="$REPO_DIR/.kimi/EVOLUTION_STATE.md"
HARNESS_LOG="$REPO_DIR/.harness/.local/logs/harness.log"
FOLLOW_DAILY_DIR="$REPO_DIR/.harness/.local/state/kuaishou-follow/daily-runs"
DAILY_APP_RUNS_DIR="$REPO_DIR/.harness/.local/state/daily-app-runs"

if [[ -f "$SESSION_MEMORY" ]]; then
  echo "  ✓ SESSION_MEMORY.md 加载成功"
else
  echo "  ⚠ SESSION_MEMORY.md 不存在"
fi

if [[ -f "$EVOLUTION_STATE" ]]; then
  echo "  ✓ EVOLUTION_STATE.md 加载成功"
else
  echo "  ⚠ EVOLUTION_STATE.md 不存在"
fi

# ============================================================
# 阶段 1: 观测（OBSERVE）
# ============================================================
if [[ "$MODE" == "full" || "$MODE" == "observe" || "$MODE" == "stats" ]]; then
  echo ""
  echo "📊 [1/4] 观测阶段..."

  # 1.1 读取最近发布的任务
  echo ""
  echo "  —— 最近发布的任务 ——"
  if [[ -d "$DAILY_APP_RUNS_DIR" ]]; then
    for f in "$DAILY_APP_RUNS_DIR"/*.jsonl; do
      [[ -f "$f" ]] || continue
      profile=$(basename "$f" .jsonl)
      total=$(wc -l < "$f" | tr -d ' ')
      recent=$(tail -3 "$f" 2>/dev/null || true)
      echo "    $profile: 总计 ${total} 次运行"
      if [[ -n "$recent" ]]; then
        echo "$recent" | while read -r line; do
          appId=$(echo "$line" | grep -o '"appId":"[^"]*"' | cut -d'"' -f4 || echo "N/A")
          success=$(echo "$line" | grep -o '"success":[^,}]*' | cut -d':' -f2 || echo "?")
          echo "      → $appId (success=$success)"
        done
      fi
    done
  else
    echo "    daily-app-runs 目录不存在"
  fi

  # 1.2 读取快手 follow 数据
  echo ""
  echo "  —— 快手挂载数据（最近7天）——"
  if [[ -d "$FOLLOW_DAILY_DIR" ]]; then
    recent_files=$(ls -1 "$FOLLOW_DAILY_DIR"/*.json 2>/dev/null | sort | tail -7)
    if [[ -n "$recent_files" ]]; then
      for f in $recent_files; do
        date_key=$(basename "$f" .json)
        app_count=$(cat "$f" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); console.log(d.ingestion?.appCount || 0)" 2>/dev/null || echo "?")
        queue_added=$(cat "$f" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); console.log(d.ingestion?.queueAdded || 0)" 2>/dev/null || echo "?")
        hourly_runs=$(cat "$f" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); console.log(d.hourlyRuns?.length || 0)" 2>/dev/null || echo "?")
        echo "    $date_key: $app_count apps, $queue_added 新达人入队, $hourly_runs 轮 follow"
      done
    else
      echo "    无 recent daily-runs 数据"
    fi
  else
    echo "    daily-runs 目录不存在"
  fi

  # 1.3 读取 harness 日志错误
  echo ""
  echo "  —— Harness 日志最近错误 ——"
  if [[ -f "$HARNESS_LOG" ]]; then
    errors=$(grep -c '"level":"error"' "$HARNESS_LOG" 2>/dev/null || echo "0")
    warns=$(grep -c '"level":"warn"' "$HARNESS_LOG" 2>/dev/null || echo "0")
    echo "    错误: $errors, 警告: $warns (总计)"
    recent_errors=$(grep '"level":"error"' "$HARNESS_LOG" 2>/dev/null | tail -3)
    if [[ -n "$recent_errors" ]]; then
      echo "$recent_errors" | while read -r line; do
        msg=$(echo "$line" | node -e "const d=JSON.parse(require('fs').readFileSync(0,'utf-8')); console.log(d.message || '')" 2>/dev/null || echo "parse error")
        echo "      ⚠ $msg"
      done
    fi
  else
    echo "    harness.log 不存在"
  fi

  # 1.4 统计 pending errors
  echo ""
  echo "  —— Pending Learnings ——"
  PENDING_COUNT=0
  if [[ -f "$REPO_DIR/.learnings/index.jsonl" ]]; then
    PENDING_COUNT=$(grep -c '"status":"pending"' "$REPO_DIR/.learnings/index.jsonl" 2>/dev/null || echo "0")
  fi
  echo "    Pending errors: $PENDING_COUNT"

  # 1.5 统计 skill 健康状态
  echo ""
  echo "  —— Skill 健康状态 ——"
  SKILL_DIR="$REPO_DIR/.agents/skills"
  if [[ -d "$SKILL_DIR" ]]; then
    for skill_md in "$SKILL_DIR"/*/SKILL.md; do
      [[ -f "$skill_md" ]] || continue
      skill_name=$(basename "$(dirname "$skill_md")")
      # 简单检查是否有引用不存在的文件（以 backtick 或括号中的路径）
      # 这里只做存在性检查
      echo "    $skill_name: SKILL.md 存在"
    done
  fi
fi

# ============================================================
# 阶段 2: 诊断（DIAGNOSE）
# ============================================================
if [[ "$MODE" == "full" || "$MODE" == "observe" || "$MODE" == "diagnose" ]]; then
  echo ""
  echo "🔍 [2/4] 诊断阶段..."

  # 简单的启发式诊断
  ISSUES=""

  if [[ "$PENDING_COUNT" -gt 10 ]]; then
    ISSUES="${ISSUES}  • 系统层面: $PENDING_COUNT 个 pending errors 未修复，可能隐藏系统性问题\n"
  fi

  # 检查是否有 profile 连续失败
  if [[ -d "$DAILY_APP_RUNS_DIR" ]]; then
    for f in "$DAILY_APP_RUNS_DIR"/*.jsonl; do
      [[ -f "$f" ]] || continue
      profile=$(basename "$f" .jsonl)
      recent_fails=$(tail -3 "$f" 2>/dev/null | grep -c '"success":false' || true)
      if [[ "$recent_fails" -ge 2 ]]; then
        ISSUES="${ISSUES}  • $profile: 最近3次运行中有 $recent_fails 次失败\n"
      fi
    done
  fi

  if [[ -z "$ISSUES" ]]; then
    echo "  ✓ 未发现明显系统性问题"
  else
    echo "  发现的问题:"
    echo -e "$ISSUES"
  fi
fi

# ============================================================
# 阶段 3: 行动（ACT）
# ============================================================
if [[ "$MODE" == "full" || "$MODE" == "act" ]]; then
  echo ""
  echo "⚡ [3/4] 行动阶段..."

  # 如果有大量 pending errors，提示需要修复
  if [[ "$PENDING_COUNT" -gt 0 ]]; then
    echo "  → 检测到 $PENDING_COUNT 个 pending errors"
    echo "  → 建议运行: kimi --skill evolution-engine '修复所有 pending errors'"
  fi

  # 检查是否需要更新 EVOLUTION_STATE
  echo "  → 指标数据已收集，请手动更新 .kimi/EVOLUTION_STATE.md"

  echo "  ✓ 行动阶段完成（当前版本为观测+诊断，自动修复由 Kimi CLI 执行）"
fi

# ============================================================
# 阶段 4: 记录（RECORD）
# ============================================================
echo ""
echo "📝 [4/4] 记录阶段..."

echo ""
echo "═══════════════════════════════════════"
echo "  进化执行完成"
echo "  模式: $MODE"
echo "  日志: $LOG_FILE"
echo "═══════════════════════════════════════"

echo ""
echo "💡 下一步建议:"
echo "  1. 查看完整日志: cat $LOG_FILE"
echo "  2. 手动触发 Kimi 进化: kimi -p '.kimi/skills/evolution-engine/references/evolution-prompt.md'"
echo "  3. 更新状态文件: 编辑 .kimi/EVOLUTION_STATE.md"
