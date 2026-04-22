#!/bin/bash
#
# Cron Health Check — daily体检过去24小时的定时任务运行情况
# 结果保存本地 + 发送邮件
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR_OVERRIDE:-$(cd "$SCRIPT_DIR/../.." && pwd)}"
RUNTIME_DIR="${RUNTIME_DIR_OVERRIDE:-$PROJECT_DIR/.harness/.local}"
LOG_DIR="$RUNTIME_DIR/logs"
REPORT_DIR="$LOG_DIR/cron-health-check"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DATE_STR="$(date +%Y-%m-%d)"
REPORT_FILE="$REPORT_DIR/${DATE_STR}.txt"
NODE_BIN="${DAILY_NODE_BIN:-$(command -v node)}"
PYTHON_BIN="${DAILY_PYTHON_BIN:-$(command -v python3)}"
EMAIL_TO="${HEALTH_CHECK_EMAIL_TO:-jackandking@163.com}"
EMAIL_SUBJECT="[Cron体检] ${DATE_STR} 定时任务健康报告"

mkdir -p "$REPORT_DIR"

LOG_FILE="$LOG_DIR/cron-health-check-${TIMESTAMP}.log"
# Unify all output into a single log file
exec > "$LOG_FILE" 2>&1

# ───────────────────────────────────────────────────────────────
# Helper functions
# ───────────────────────────────────────────────────────────────

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

write_section() {
    local title="$1"
    local status="$2"
    local details="$3"
    {
        echo ""
        echo "## $title"
        echo "状态: $status"
        if [[ -n "$details" ]]; then
            echo "详情:"
            printf '%b\n' "$details" | sed 's/^/  /'
        fi
    } >> "$REPORT_FILE"
}

# ───────────────────────────────────────────────────────────────
# 扫描过去24小时的日志文件
# ───────────────────────────────────────────────────────────────

find_logs() {
    local pattern="$1"
    find "$PROJECT_DIR/.automation/.local/logs" "$PROJECT_DIR/.harness/.local/logs" \
        -name "$pattern" -type f -mtime -1 2>/dev/null | sort
}

count_errors() {
    local file="$1"
    if [[ -f "$file" ]]; then
        grep -cE "ERROR|FAIL|fail|Failed|failed|Exception|exception" "$file" 2>/dev/null || echo 0
    else
        echo 0
    fi
}

has_success() {
    local file="$1"
    if [[ -f "$file" ]]; then
        grep -qE "completed successfully|✓|done|Completed( in|$)" "$file" 2>/dev/null && echo "yes" || echo "no"
    else
        echo "no"
    fi
}

# ───────────────────────────────────────────────────────────────
# 生成报告头部
# ───────────────────────────────────────────────────────────────

{
    echo "========================================"
    echo "Cron 健康检查报告"
    echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S %z')"
    echo "检查范围: 过去24小时"
    echo "项目目录: $PROJECT_DIR"
    echo "========================================"
} > "$REPORT_FILE"

OVERALL_STATUS="✅ 健康"
ISSUES=""

# ───────────────────────────────────────────────────────────────
# 1. Kuaishou 日报 (00:00)
# ───────────────────────────────────────────────────────────────

log_info "Checking Kuaishou daily report..."
REPORT_LOGS=$(find_logs "daily[\-_]report-*.log")
if [[ -n "$REPORT_LOGS" ]]; then
    LATEST_REPORT_LOG=$(echo "$REPORT_LOGS" | tail -1)
    ERRORS=$(count_errors "$LATEST_REPORT_LOG")
    SUCCESS=$(has_success "$LATEST_REPORT_LOG")
    if [[ "$SUCCESS" == "yes" && "$ERRORS" -eq 0 ]]; then
        write_section "Kuaishou 日报 (00:00)" "✅ 成功" "日志: $(basename "$LATEST_REPORT_LOG")"
    elif [[ "$SUCCESS" == "yes" && "$ERRORS" -gt 0 ]]; then
        write_section "Kuaishou 日报 (00:00)" "⚠️ 成功（有警告）" "日志: $(basename "$LATEST_REPORT_LOG")\n错误/警告数: $ERRORS"
        OVERALL_STATUS="⚠️ 部分异常"
    else
        write_section "Kuaishou 日报 (00:00)" "❌ 异常" "日志: $(basename "$LATEST_REPORT_LOG")\n错误数: $ERRORS"
        OVERALL_STATUS="⚠️ 部分异常"
        ISSUES="${ISSUES}Kuaishou日报异常; "
    fi
else
    write_section "Kuaishou 日报 (00:00)" "❌ 未找到日志" "过去24小时内未检测到日报日志文件"
    OVERALL_STATUS="⚠️ 部分异常"
    ISSUES="${ISSUES}Kuaishou日报缺失; "
fi

# ───────────────────────────────────────────────────────────────
# 2. Topic Selector (00:30-00:45)
# ───────────────────────────────────────────────────────────────

log_info "Checking topic selectors..."
TOPIC_SELECTOR_LOGS=$(find_logs "daily-topic-selector-*.log")
if [[ -n "$TOPIC_SELECTOR_LOGS" ]]; then
    TOPIC_FAILED=0
    TOPIC_OK=0
    TOPIC_DETAILS=""
    while IFS= read -r log; do
        basename_log=$(basename "$log")
        if grep -qE "FAILED|failed|ERROR" "$log" 2>/dev/null; then
            TOPIC_FAILED=$((TOPIC_FAILED + 1))
            TOPIC_DETAILS="${TOPIC_DETAILS}${basename_log}: 失败\n"
        elif grep -qE "completed successfully|✓|\[done\] Selected=" "$log" 2>/dev/null; then
            TOPIC_OK=$((TOPIC_OK + 1))
            TOPIC_DETAILS="${TOPIC_DETAILS}${basename_log}: 成功\n"
        else
            TOPIC_DETAILS="${TOPIC_DETAILS}${basename_log}: 未知\n"
        fi
    done <<< "$TOPIC_SELECTOR_LOGS"

    if [[ "$TOPIC_FAILED" -eq 0 ]]; then
        write_section "Topic Selector (00:30-00:45)" "✅ 正常" "$TOPIC_DETAILS"
    else
        write_section "Topic Selector (00:30-00:45)" "❌ $TOPIC_FAILED 个失败" "$TOPIC_DETAILS"
        OVERALL_STATUS="⚠️ 部分异常"
        ISSUES="${ISSUES}TopicSelector失败; "
    fi
else
    write_section "Topic Selector (00:30-00:45)" "⚠️ 未找到日志" ""
fi

# ───────────────────────────────────────────────────────────────
# 3. Harness Daily Run (01:00-04:00)
# ───────────────────────────────────────────────────────────────

log_info "Checking harness daily runs..."
HARNESS_FAILED=0
HARNESS_OK=0
HARNESS_DETAILS=""
for brand in nanrenbao elder-love parent-tools womanai; do
    # New harness writes to daily-app-cron/<brand>.log
    CRON_LOG="$PROJECT_DIR/.harness/.local/logs/daily-app-cron/${brand}.log"
    if [[ -f "$CRON_LOG" ]]; then
        mtime_check=$(find "$CRON_LOG" -mtime -1 2>/dev/null)
        if [[ -n "$mtime_check" ]]; then
            LOG="$CRON_LOG"
        fi
    fi
    if [[ -z "$LOG" ]]; then
        # Fallback: old naming pattern
        LOG=$(find_logs "daily-run-${brand}-*.log" | tail -1)
    fi
    if [[ -n "$LOG" ]]; then
        basename_log=$(basename "$LOG")
        if grep -qE "completed successfully" "$LOG" 2>/dev/null; then
            HARNESS_OK=$((HARNESS_OK + 1))
            selected=$(grep "completed: selected=" "$LOG" 2>/dev/null | tail -1 | sed 's/.*selected=//' || echo "N/A")
            HARNESS_DETAILS="${HARNESS_DETAILS}${brand}: 成功 (selected=${selected})\n"
        else
            HARNESS_FAILED=$((HARNESS_FAILED + 1))
            HARNESS_DETAILS="${HARNESS_DETAILS}${brand}: 失败\n"
        fi
    else
        HARNESS_FAILED=$((HARNESS_FAILED + 1))
        HARNESS_DETAILS="${HARNESS_DETAILS}${brand}: 未找到日志\n"
    fi
    # Reset LOG for next iteration
    LOG=""
done

if [[ "$HARNESS_FAILED" -eq 0 ]]; then
    write_section "Harness Daily Run (01:00-04:00)" "✅ 全部成功" "$HARNESS_DETAILS"
else
    write_section "Harness Daily Run (01:00-04:00)" "❌ $HARNESS_FAILED 个异常" "$HARNESS_DETAILS"
    OVERALL_STATUS="⚠️ 部分异常"
    ISSUES="${ISSUES}HarnessDailyRun异常; "
fi

# ───────────────────────────────────────────────────────────────
# 4. Automation Daily Run (07:00-10:00)
# ───────────────────────────────────────────────────────────────

log_info "Checking automation daily runs..."
AUTO_FAILED=0
AUTO_OK=0
AUTO_DETAILS=""
for brand in nanrenbao elder-love parent-tools womanai; do
    # Legacy .automation daily-run logs are no longer maintained.
    # Harness daily-app-cron now handles all app generation.
    # Check harness state for confirmation instead of stale logs.
    STATE_FILE="$PROJECT_DIR/.harness/.local/state/daily-app-runs/${brand}.jsonl"
    if [[ -f "$STATE_FILE" ]]; then
        latest=$(tail -1 "$STATE_FILE" 2>/dev/null || true)
        if echo "$latest" | grep -q '"success":true' 2>/dev/null; then
            AUTO_OK=$((AUTO_OK + 1))
            app_id=$(echo "$latest" | grep -o '"appId":"[^"]*"' | head -1 | sed 's/.*:"//;s/"$//' || echo "N/A")
            AUTO_DETAILS="${AUTO_DETAILS}${brand}: 成功 (appId=${app_id})\n"
        elif echo "$latest" | grep -q '"success":false' 2>/dev/null; then
            AUTO_FAILED=$((AUTO_FAILED + 1))
            AUTO_DETAILS="${AUTO_DETAILS}${brand}: 失败\n"
        else
            AUTO_OK=$((AUTO_OK + 1))
            AUTO_DETAILS="${AUTO_DETAILS}${brand}: 成功（通过state确认）\n"
        fi
    else
        AUTO_FAILED=$((AUTO_FAILED + 1))
        AUTO_DETAILS="${AUTO_DETAILS}${brand}: 未找到state\n"
    fi
done

if [[ "$AUTO_FAILED" -eq 0 ]]; then
    write_section "Automation Daily Run (07:00-10:00)" "✅ 全部成功" "$AUTO_DETAILS"
else
    write_section "Automation Daily Run (07:00-10:00)" "❌ $AUTO_FAILED 个异常" "$AUTO_DETAILS"
    OVERALL_STATUS="⚠️ 部分异常"
    ISSUES="${ISSUES}AutomationDailyRun异常; "
fi

# ───────────────────────────────────────────────────────────────
# 5. Hot Task (11:00-11:30)
# ───────────────────────────────────────────────────────────────

log_info "Checking hot task logs..."
HOT_IMG_LOG=$(find_logs "daily-hot-task-image-gen-*.log" | tail -1)
HOT_PROMO_LOG=$(find_logs "hot-task-promo-*.log" | tail -1)

HOT_DETAILS=""
if [[ -n "$HOT_IMG_LOG" ]]; then
    if grep -qE "error|ERROR|fail|Fail" "$HOT_IMG_LOG" 2>/dev/null; then
        HOT_DETAILS="${HOT_DETAILS}配图生成: 异常 ($(basename "$HOT_IMG_LOG"))\n"
        OVERALL_STATUS="⚠️ 部分异常"
        ISSUES="${ISSUES}HotTask配图异常; "
    else
        HOT_DETAILS="${HOT_DETAILS}配图生成: 正常 ($(basename "$HOT_IMG_LOG"))\n"
    fi
else
    HOT_DETAILS="${HOT_DETAILS}配图生成: 未找到日志\n"
fi

if [[ -n "$HOT_PROMO_LOG" ]]; then
    if grep -qE "completed successfully" "$HOT_PROMO_LOG" 2>/dev/null; then
        HOT_DETAILS="${HOT_DETAILS}推广邮件: 正常 ($(basename "$HOT_PROMO_LOG"))\n"
    else
        HOT_DETAILS="${HOT_DETAILS}推广邮件: 异常 ($(basename "$HOT_PROMO_LOG"))\n"
        OVERALL_STATUS="⚠️ 部分异常"
        ISSUES="${ISSUES}HotTask推广异常; "
    fi
else
    HOT_DETAILS="${HOT_DETAILS}推广邮件: 未找到日志\n"
fi

write_section "Hot Task (11:00-11:30)" "ℹ️ 见详情" "$HOT_DETAILS"

# ───────────────────────────────────────────────────────────────
# 6. Kuaishou Follow (14:00 / 每5分钟)
# ───────────────────────────────────────────────────────────────

log_info "Checking Kuaishou follow health..."
FOLLOW_HEALTH=""
FOLLOW_STATUS="✅ 正常"
FOLLOW_HEALTH_CODE=0
if [[ -x "$NODE_BIN" ]]; then
    FOLLOW_HEALTH=$($NODE_BIN "$SCRIPT_DIR/kuaishou-follow-health-check.js" "$PROJECT_DIR" 2>&1) || FOLLOW_HEALTH_CODE=$?
fi

FOLLOW_INGEST_LOG=$(find_logs "kuaishou-follow-ingest-*.log" | tail -1)
FOLLOW_WORKER_LOGS=$(find_logs "kuaishou-follow-worker-*.log")

FOLLOW_DETAILS=""
if [[ -n "$FOLLOW_INGEST_LOG" ]]; then
    FOLLOW_DETAILS="${FOLLOW_DETAILS}Daily Ingest: $(basename "$FOLLOW_INGEST_LOG")\n"
else
    FOLLOW_DETAILS="${FOLLOW_DETAILS}Daily Ingest: 未找到日志\n"
fi

if [[ -n "$FOLLOW_WORKER_LOGS" ]]; then
    WORKER_COUNT=$(echo "$FOLLOW_WORKER_LOGS" | wc -l | tr -d ' ')
    FOLLOW_DETAILS="${FOLLOW_DETAILS}Worker 运行次数: ${WORKER_COUNT} (过去24h)\n"
    LATEST_WORKER=$(echo "$FOLLOW_WORKER_LOGS" | tail -1)
    if grep -qE "queue-empty|Attempted:" "$LATEST_WORKER" 2>/dev/null; then
        FOLLOW_DETAILS="${FOLLOW_DETAILS}最新 Worker: $(basename "$LATEST_WORKER")\n"
    else
        FOLLOW_DETAILS="${FOLLOW_DETAILS}最新 Worker: 异常 ($(basename "$LATEST_WORKER"))\n"
    fi
else
    FOLLOW_DETAILS="${FOLLOW_DETAILS}Worker: 未找到日志\n"
fi

if [[ -n "$FOLLOW_HEALTH" ]]; then
    FOLLOW_DETAILS="${FOLLOW_DETAILS}\n${FOLLOW_HEALTH}\n"
fi

if [[ "$FOLLOW_HEALTH_CODE" -eq 2 ]]; then
    FOLLOW_STATUS="❌ 严重"
    OVERALL_STATUS="⚠️ 部分异常"
    ISSUES="${ISSUES}KuaishouFollow严重异常; "
elif [[ "$FOLLOW_HEALTH_CODE" -eq 1 ]]; then
    FOLLOW_STATUS="⚠️ 降级"
    OVERALL_STATUS="⚠️ 部分异常"
    ISSUES="${ISSUES}KuaishouFollow降级; "
fi

write_section "Kuaishou Follow (14:00/每5分钟)" "$FOLLOW_STATUS" "$FOLLOW_DETAILS"

# ───────────────────────────────────────────────────────────────
# 7. 异常摘要
# ───────────────────────────────────────────────────────────────

{
    echo ""
    echo "========================================"
    echo "总体状态: $OVERALL_STATUS"
    if [[ -n "$ISSUES" ]]; then
        echo "需要关注的问题: $ISSUES"
    else
        echo "过去24小时内未发现明显异常。"
    fi
    echo "========================================"
} >> "$REPORT_FILE"

# ───────────────────────────────────────────────────────────────
# 保存并发送邮件
# ───────────────────────────────────────────────────────────────

log_info "Report saved to: $REPORT_FILE"
log_info "Sending email to $EMAIL_TO ..."

if [[ -x "$PYTHON_BIN" ]]; then
    "$PYTHON_BIN" "$SCRIPT_DIR/send-email.py" "$EMAIL_SUBJECT" "$EMAIL_TO" "$REPORT_FILE" || {
        log_info "WARNING: Email sending failed"
        exit 1
    }
else
    log_info "ERROR: python3 not found, cannot send email"
    exit 1
fi

log_info "Health check completed. Overall: $OVERALL_STATUS"
