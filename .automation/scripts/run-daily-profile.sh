#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="${PROJECT_DIR_OVERRIDE:-$(cd "$SCRIPT_DIR/../.." && pwd)}"

usage() {
    cat <<'EOF'
Usage: .automation/scripts/run-daily-profile.sh <profile-id>

Runs the existing single-profile daily pipeline with per-profile runtime paths.

Environment overrides:
  DAILY_COPILOT_MODEL   Copilot model to use (default: gpt-5-mini)
  DAILY_REPORT_TO       Report recipient
  DAILY_REPORT_SUBJECT  Report subject
  DAILY_LOG_DIR         Per-profile orchestrator log directory
  EMAIL_DRAFT_PATH      Per-profile latest email draft path
  KUAISHOU_AUTH_FILE    Shared or per-profile auth state path
EOF
}

PROFILE_ID="${1:-}"
if [[ -z "$PROFILE_ID" ]]; then
    usage >&2
    exit 1
fi

SAFE_PROFILE_ID="$(printf '%s' "$PROFILE_ID" | tr -c 'a-zA-Z0-9-' '-')"
if [[ -z "$SAFE_PROFILE_ID" ]]; then
    echo "Invalid profile id: $PROFILE_ID" >&2
    exit 1
fi

cd "$PROJECT_DIR"

mkdir -p "$PROJECT_DIR/.automation/.local/logs" "$PROJECT_DIR/.automation/.local/state/email-drafts"

export DAILY_PROFILE_ID="$PROFILE_ID"
export DAILY_COPILOT_MODEL="${DAILY_COPILOT_MODEL:-gpt-5-mini}"
export DAILY_LOG_DIR="${DAILY_LOG_DIR:-$PROJECT_DIR/.automation/.local/logs/daily-orchestrator/$SAFE_PROFILE_ID}"
export EMAIL_DRAFT_PATH="${EMAIL_DRAFT_PATH:-$PROJECT_DIR/.automation/.local/state/email-drafts/${SAFE_PROFILE_ID}-latest.txt}"
export KUAISHOU_AUTH_FILE="${KUAISHOU_AUTH_FILE:-$PROJECT_DIR/.automation/.local/auth/kuaishou_auth.json}"
export DAILY_REPORT_SUBJECT="${DAILY_REPORT_SUBJECT:-[Copilot Report] ${PROFILE_ID} Daily Update}"

mkdir -p "$DAILY_LOG_DIR"

echo "[run-daily-profile] profile=$DAILY_PROFILE_ID model=$DAILY_COPILOT_MODEL"
echo "[run-daily-profile] log_dir=$DAILY_LOG_DIR"
echo "[run-daily-profile] email_draft=$EMAIL_DRAFT_PATH"

git pull --ff-only

# Topic Deduplication Check for all profiles
echo ""
echo "[run-daily-profile] Checking recent topics for $PROFILE_ID..."

# Get recent topics (last 3 days)
recent_apps=$(git log --since="3 days ago" --name-status --diff-filter=A -- "*/app.js" 2>/dev/null | \
    grep "^A" | \
    awk '{print $2}' | \
    xargs -I {} dirname {} | \
    sort -u | \
    grep -v "^\.$" | \
    grep -v "node_modules" | \
    grep -v "templates" || true)

if [[ -n "$recent_apps" ]]; then
    echo "[run-daily-profile] Recent apps (3 days):"
    echo "$recent_apps" | while read -r app; do
        if [[ -f "$app/index.html" ]]; then
            title=$(grep -o '<title>[^<]*</title>' "$app/index.html" 2>/dev/null | sed 's/<title>//;s/<\/title>//' | head -1)
            echo "  - $app: ${title:-"N/A"}"
        fi
    done
    
    # Profile-specific duplicate category checks
    case "$PROFILE_ID" in
        nanrenbao|man)
            # 男人宝: 避免体育和军事过度重复
            sports_count=$(echo "$recent_apps" | grep -c -E "(球星|球员|足球|篮球|NBA|sport|baller)" || true)
            military_count=$(echo "$recent_apps" | grep -c -E "(战机|坦克|军事|装备|fighter|jet|tank)" || true)
            
            echo ""
            if [[ "$sports_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $sports_count sports-related apps in last 3 days"
                echo "    Consider: military, tech, car, outdoor, history, gaming, collectibles"
            fi
            if [[ "$military_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $military_count military-related apps in last 3 days"
                echo "    Consider: tech, car, outdoor, history, gaming, collectibles"
            fi
            
            export PROFILE_SPORTS_COUNT="$sports_count"
            export PROFILE_MILITARY_COUNT="$military_count"
            echo ""
            echo "[run-daily-profile] Topic diversity hint:"
            echo "  Rotating: 军事装备 → 科技数码 → 汽车机械 → 户外探险 → 历史军事 → 游戏电竞 → 收藏爱好"
            ;;
            
        womanai|woman)
            # 女人爱: 避免美妆和时尚过度重复
            beauty_count=$(echo "$recent_apps" | grep -c -E "(口红|美妆|护肤|化妆|显白|色号|眼影|粉底)" || true)
            fashion_count=$(echo "$recent_apps" | grep -c -E "(穿搭|时尚|服装|包包|鞋子|配饰|潮流)" || true)
            
            echo ""
            if [[ "$beauty_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $beauty_count beauty-related apps in last 3 days"
                echo "    Consider: fashion, celebrity, lifestyle, relationships, entertainment"
            fi
            if [[ "$fashion_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $fashion_count fashion-related apps in last 3 days"
                echo "    Consider: beauty, celebrity, lifestyle, relationships, entertainment"
            fi
            
            export PROFILE_BEAUTY_COUNT="$beauty_count"
            export PROFILE_FASHION_COUNT="$fashion_count"
            echo ""
            echo "[run-daily-profile] Topic diversity hint:"
            echo "  Rotating: 美妆护肤 → 时尚穿搭 → 明星话题 → 情感共鸣 → 生活方式 → 娱乐八卦"
            ;;
            
        parent-tools|parent)
            # 家长爱: 避免教育和作业类过度重复
            education_count=$(echo "$recent_apps" | grep -c -E "(教育|学习|作业|课外班|培训|成绩|考试|补习)" || true)
            growth_count=$(echo "$recent_apps" | grep -c -E "(成长|习惯|性格|能力|兴趣|才艺|早教)" || true)
            
            echo ""
            if [[ "$education_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $education_count education-related apps in last 3 days"
                echo "    Consider: family life, practical tools, parenting communication"
            fi
            if [[ "$growth_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $growth_count growth-related apps in last 3 days"
                echo "    Consider: education, family activities, practical decisions"
            fi
            
            export PROFILE_EDUCATION_COUNT="$education_count"
            export PROFILE_GROWTH_COUNT="$growth_count"
            echo ""
            echo "[run-daily-profile] Topic diversity hint:"
            echo "  Rotating: 教育学习 → 家庭生活 → 实用工具 → 成长决策 → 亲子沟通"
            ;;
            
        elder-love|elder)
            # 爱老人: 避免养生和健康过度重复
            health_count=$(echo "$recent_apps" | grep -c -E "(养生|健康|保健|医疗|疾病|体检|长寿|体检)" || true)
            morning_count=$(echo "$recent_apps" | grep -c -E "(晨练|锻炼|运动|健身|太极|广场舞|散步)" || true)
            
            echo ""
            if [[ "$health_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $health_count health-related apps in last 3 days"
                echo "    Consider: nostalgia, family, hobbies, entertainment, practical life"
            fi
            if [[ "$morning_count" -ge 2 ]]; then
                echo "⚠️  WARNING: $morning_count exercise-related apps in last 3 days"
                echo "    Consider: health tips, nostalgia, family, hobbies, lifestyle"
            fi
            
            export PROFILE_HEALTH_COUNT="$health_count"
            export PROFILE_MORNING_COUNT="$morning_count"
            echo ""
            echo "[run-daily-profile] Topic diversity hint:"
            echo "  Rotating: 健康养生 → 怀旧回忆 → 家庭生活 → 实用生活 → 文娱休闲"
            ;;
            
        *)
            # Generic check for other profiles
            echo ""
            echo "[run-daily-profile] No specific deduplication rules for $PROFILE_ID"
            ;;
    esac
    
    # Export common variable for all profiles
    export PROFILE_RECENT_APPS="$recent_apps"
fi

echo ""

exec "$SCRIPT_DIR/daily_run.sh"
