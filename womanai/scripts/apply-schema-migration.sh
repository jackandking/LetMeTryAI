#!/bin/bash
# Apply schema migration for womanai handsome_images table using curl
# Adds view_count and deleted columns with proper indexes

API="https://letmetry.cloud/mysql/query"

echo "🚀 Starting womanai handsome_images schema migration"
echo "============================================================"

# Function to execute SQL via curl
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo ""
    echo "$description..."
    # Only show first 100 chars if SQL is long
    if [ ${#sql} -gt 100 ]; then
        echo "SQL: ${sql:0:100}..."
    else
        echo "SQL: $sql"
    fi
    
    response=$(curl -s -X POST "$API" \
        -H "Content-Type: application/json" \
        -d "{\"sql\":$(printf '%s' "$sql" | jq -Rs .)}" \
        -w "\n%{http_code}")
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo "✅ Success (HTTP $http_code)"
        if echo "$body" | jq -e '.affectedRows' >/dev/null 2>&1; then
            affected=$(echo "$body" | jq -r '.affectedRows')
            echo "   Affected rows: $affected"
        fi
        return 0
    else
        echo "⚠️  Response not OK (HTTP $http_code)"
        echo "   Result: $body"
        return 1
    fi
}

# Step 1: Add view_count column
execute_sql \
    "ALTER TABLE handsome_images ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed'" \
    "Step 1: Adding view_count column"
step1=$?

# Step 2: Add deleted column
execute_sql \
    "ALTER TABLE handsome_images ADD COLUMN IF NOT EXISTS deleted TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Logical delete flag: 0=visible,1=deleted'" \
    "Step 2: Adding deleted column"
step2=$?

# Step 3: Add index for view_count (check first if it exists)
echo ""
echo "Step 3: Checking for view_count index..."
check_idx_response=$(curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d '{"sql":"SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '\''handsome_images'\'' AND INDEX_NAME = '\''idx_view_count'\''"}')

idx_count=$(echo "$check_idx_response" | jq -r '.[0].count // 0' 2>/dev/null)

step3=0
if [ "$idx_count" = "0" ]; then
    execute_sql \
        "ALTER TABLE handsome_images ADD INDEX idx_view_count (view_count)" \
        "Step 3: Adding index for view_count"
    step3=$?
else
    echo "✅ Index idx_view_count already exists, skipping"
fi

# Step 4: Check if unique index exists
echo ""
echo "Step 4: Checking for unique index on image_url..."
check_response=$(curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d '{"sql":"SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '\''handsome_images'\'' AND INDEX_NAME = '\''idx_image_url'\''"}')

index_count=$(echo "$check_response" | jq -r '.[0].count // 0' 2>/dev/null)

step4=0
if [ "$index_count" = "0" ]; then
    execute_sql \
        "ALTER TABLE handsome_images ADD UNIQUE INDEX idx_image_url (image_url(255))" \
        "Step 4: Adding unique index on image_url"
    step4=$?
else
    echo "✅ Unique index already exists, skipping"
fi

# Step 5: Set default values for existing records
execute_sql \
    "UPDATE handsome_images SET view_count = 0 WHERE view_count IS NULL" \
    "Step 5: Setting default view_count values"
step5=$?

execute_sql \
    "UPDATE handsome_images SET deleted = 0 WHERE deleted IS NULL" \
    "Step 6: Setting default deleted values"
step6=$?

# Step 7: Verify migration
echo ""
echo "Step 7: Verifying migration..."
verify_response=$(curl -s -X POST "$API" \
    -H "Content-Type: application/json" \
    -d '{"sql":"SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '\''handsome_images'\'' AND COLUMN_NAME IN ('\''view_count'\'', '\''deleted'\'') ORDER BY ORDINAL_POSITION"}')

if echo "$verify_response" | jq -e '. | length > 0' >/dev/null 2>&1; then
    echo "✅ Success"
    echo ""
    echo "📊 Verified columns:"
    echo "$verify_response" | jq -r '.[] | "   - \(.COLUMN_NAME): \(.DATA_TYPE) (default: \(.COLUMN_DEFAULT), nullable: \(.IS_NULLABLE))"'
    step7=0
else
    echo "⚠️  Verification failed"
    step7=1
fi

# Summary
echo ""
echo "============================================================"
echo "📝 Migration Summary:"
total_steps=7
success_steps=$((7 - step1 - step2 - step3 - step4 - step5 - step6 - step7))
echo "   ✅ $success_steps/$total_steps steps completed successfully"

if [ $success_steps -eq $total_steps ]; then
    echo ""
    echo "🎉 Migration completed successfully!"
    echo ""
    echo "The handsome_images table now has:"
    echo "   • view_count column for tracking popularity"
    echo "   • deleted column for logical deletion"
    echo "   • idx_view_count index for performance"
    echo "   • idx_image_url unique index (if not already present)"
    exit 0
else
    echo ""
    echo "⚠️  Some steps failed. Please review the output above."
    exit 1
fi
