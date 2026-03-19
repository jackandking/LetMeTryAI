#!/bin/bash
#
# Check for duplicate topics before creating new vote apps
# 在创建新投票应用前检查主题是否重复
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    cat << EOF
Usage: $0 [OPTIONS] <topic_name>

Check if a topic is similar to recently created apps.

Options:
    -b, --brand <brand>     Brand profile (nanrenbao, parent-tools, elder-love, womanai)
    -d, --days <days>       Check past N days (default: 7)
    -t, --threshold <n>     Similarity threshold 0-1 (default: 0.6)
    -h, --help              Show this help

Examples:
    $0 "最强球星PK"
    $0 -b nanrenbao "二战最强坦克"
    $0 -d 14 -t 0.5 "豪华跑车排行"
EOF
}

# Default values
BRAND=""
DAYS=7
THRESHOLD=0.6
TOPIC=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -b|--brand)
            BRAND="$2"
            shift 2
            ;;
        -d|--days)
            DAYS="$2"
            shift 2
            ;;
        -t|--threshold)
            THRESHOLD="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        -*)
            echo -e "${RED}Unknown option: $1${NC}"
            usage
            exit 1
            ;;
        *)
            TOPIC="$1"
            shift
            ;;
    esac
done

if [[ -z "$TOPIC" ]]; then
    echo -e "${RED}Error: Topic name is required${NC}"
    usage
    exit 1
fi

echo -e "${BLUE}Checking for duplicate topics...${NC}"
echo "Topic: $TOPIC"
echo "Brand: ${BRAND:-"any"}"
echo "Days: $DAYS"
echo "Threshold: $THRESHOLD"
echo ""

cd "$PROJECT_DIR"

# Get recent app names from git log
get_recent_topics() {
    local brand_filter=""
    if [[ -n "$BRAND" ]]; then
        # Filter by brand if specified
        case "$BRAND" in
            nanrenbao) brand_filter="男人宝\|球星\|坦克\|战机\|汽车\|装备" ;;
            parent-tools) brand_filter="家长爱\|作业\|孩子\|学习\|教育" ;;
            elder-love) brand_filter="爱老人\|退休\|养生\|健康\|早餐" ;;
            womanai) brand_filter="女人爱\|口红\|美妆\|护肤\|穿搭" ;;
        esac
    fi
    
    # Get app names from git log
    git log --since="$DAYS days ago" --name-status --diff-filter=A -- "*/app.js" 2>/dev/null | \
        grep "^A" | \
        awk '{print $2}' | \
        xargs -I {} dirname {} | \
        while read -r dir; do
            # Get app name from index.html title or directory name
            if [[ -f "$dir/index.html" ]]; then
                name=$(grep -o '<title>[^<]*</title>' "$dir/index.html" 2>/dev/null | sed 's/<title>//;s/<\/title>//' | head -1)
                if [[ -n "$name" ]]; then
                    echo "$name"
                else
                    basename "$dir"
                fi
            else
                basename "$dir"
            fi
        done | sort -u
}

# Calculate similarity between two strings
calculate_similarity() {
    local str1="$1"
    local str2="$2"
    
    # Convert to lowercase and extract unique characters
    local chars1=$(echo "$str1" | tr '[:upper:]' '[:lower:]' | grep -o . | sort -u | tr -d '\n')
    local chars2=$(echo "$str2" | tr '[:upper:]' '[:lower:]' | grep -o . | sort -u | tr -d '\n')
    
    # Count common characters
    local common=$(echo "$chars1$chars2" | grep -o . | sort | uniq -d | wc -l)
    local total=$(echo "$chars1$chars2" | grep -o . | sort -u | wc -l)
    
    if [[ $total -eq 0 ]]; then
        echo "0"
        return
    fi
    
    # Calculate similarity
    echo "scale=2; $common / $total" | bc
}

# Check for keyword overlap
check_keyword_overlap() {
    local topic1="$1"
    local topic2="$2"
    
    # Define keyword groups that indicate similarity
    local keyword_groups=(
        "球星:球员:足球:篮球:NBA:世界杯"
        "PK:对决:对战:VS:较量"
        "排行:排名:榜单:TOP"
        "坦克:战机:航母:军舰:武器:装备"
        "汽车:跑车:豪车:车辆"
        "手机:电脑:数码:科技"
    )
    
    for group in "${keyword_groups[@]}"; do
        IFS=':' read -ra keywords <<< "$group"
        local has_in_topic1=false
        local has_in_topic2=false
        
        for kw in "${keywords[@]}"; do
            if echo "$topic1" | grep -qi "$kw"; then
                has_in_topic1=true
            fi
            if echo "$topic2" | grep -qi "$kw"; then
                has_in_topic2=true
            fi
        done
        
        # If both topics have keywords from the same group
        if [[ "$has_in_topic1" == "true" && "$has_in_topic2" == "true" ]]; then
            echo "1"
            return
        fi
    done
    
    echo "0"
}

# Main check
main() {
RECENT_TOPICS=$(get_recent_topics)

if [[ -z "$RECENT_TOPICS" ]]; then
    echo -e "${GREEN}✓ No recent topics found. Safe to create.${NC}"
    exit 0
fi

echo -e "${BLUE}Recent topics (${DAYS} days):${NC}"
echo "$RECENT_TOPICS" | head -20
echo ""

# Check each recent topic
DUPLICATE_FOUND=false
HIGHEST_SIMILARITY=0
MOST_SIMILAR=""

while IFS= read -r recent_topic; do
    [[ -z "$recent_topic" ]] && continue
    
    # Check keyword overlap first
    local keyword_match=$(check_keyword_overlap "$TOPIC" "$recent_topic")
    
    # Calculate similarity
    local similarity=$(calculate_similarity "$TOPIC" "$recent_topic")
    
    # Track highest similarity
    if (( $(echo "$similarity > $HIGHEST_SIMILARITY" | bc -l) )); then
        HIGHEST_SIMILARITY=$similarity
        MOST_SIMILAR="$recent_topic"
    fi
    
    # Check if duplicate
    if [[ "$keyword_match" == "1" ]] || (( $(echo "$similarity >= $THRESHOLD" | bc -l) )); then
        echo -e "${YELLOW}⚠ Potential duplicate found:${NC}"
        echo "  New topic: $TOPIC"
        echo "  Existing:  $recent_topic"
        echo "  Similarity: $similarity"
        echo ""
        DUPLICATE_FOUND=true
    fi
done <<< "$RECENT_TOPICS"

# Summary
echo "========================================"
if [[ "$DUPLICATE_FOUND" == "true" ]]; then
    echo -e "${RED}✗ DUPLICATE DETECTED${NC}"
    echo "Most similar: $MOST_SIMILAR (similarity: $HIGHEST_SIMILARITY)"
    echo ""
    echo -e "${YELLOW}Recommendation:${NC}"
    echo "1. Choose a different topic category"
    echo "2. Wait a few more days"
    echo "3. Use a more specific angle"
    exit 1
else
    echo -e "${GREEN}✓ NO DUPLICATE FOUND${NC}"
    echo "Highest similarity: $HIGHEST_SIMILARITY with '$MOST_SIMILAR'"
    echo ""
    echo -e "${GREEN}Safe to proceed with topic creation.${NC}"
    exit 0
fi
}

main "$@"
