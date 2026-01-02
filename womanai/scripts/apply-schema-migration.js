#!/usr/bin/env node
/**
 * Apply schema migration for womanai handsome_images table
 * Adds view_count and deleted columns with proper indexes
 */

const API = 'https://letmetry.cloud/mysql/query';

async function executeSQL(sql, description) {
  console.log(`\n${description}...`);
  console.log(`SQL: ${sql.substring(0, 100)}${sql.length > 100 ? '...' : ''}`);
  
  try {
    const response = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql, params: [] })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Success');
      if (result.affectedRows !== undefined) {
        console.log(`   Affected rows: ${result.affectedRows}`);
      }
      return { success: true, result };
    } else {
      console.log('⚠️  Response not OK');
      console.log('   Result:', JSON.stringify(result, null, 2));
      return { success: false, result };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function applyMigration() {
  console.log('🚀 Starting womanai handsome_images schema migration');
  console.log('=' .repeat(60));
  
  // Step 1: Add view_count column
  const step1 = await executeSQL(
    "ALTER TABLE handsome_images ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed'",
    'Step 1: Adding view_count column'
  );
  
  // Step 2: Add deleted column
  const step2 = await executeSQL(
    "ALTER TABLE handsome_images ADD COLUMN IF NOT EXISTS deleted TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Logical delete flag: 0=visible,1=deleted'",
    'Step 2: Adding deleted column'
  );
  
  // Step 3: Add index for view_count
  const step3 = await executeSQL(
    "ALTER TABLE handsome_images ADD INDEX IF NOT EXISTS idx_view_count (view_count)",
    'Step 3: Adding index for view_count'
  );
  
  // Step 4: Check if unique index exists
  console.log('\nStep 4: Checking for unique index on image_url...');
  const checkIndex = await executeSQL(
    "SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'handsome_images' AND INDEX_NAME = 'idx_image_url'",
    'Checking existing unique index'
  );
  
  let step4 = { success: true };
  if (checkIndex.success && checkIndex.result && checkIndex.result[0]?.count === 0) {
    // Index doesn't exist, create it
    step4 = await executeSQL(
      "ALTER TABLE handsome_images ADD UNIQUE INDEX idx_image_url (image_url(255))",
      'Step 4: Adding unique index on image_url'
    );
  } else {
    console.log('✅ Unique index already exists, skipping');
  }
  
  // Step 5: Set default values for existing records
  const step5 = await executeSQL(
    "UPDATE handsome_images SET view_count = 0 WHERE view_count IS NULL",
    'Step 5: Setting default view_count values'
  );
  
  const step6 = await executeSQL(
    "UPDATE handsome_images SET deleted = 0 WHERE deleted IS NULL",
    'Step 6: Setting default deleted values'
  );
  
  // Step 7: Verify migration
  console.log('\nStep 7: Verifying migration...');
  const verify = await executeSQL(
    "SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT, IS_NULLABLE, COLUMN_COMMENT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'handsome_images' AND COLUMN_NAME IN ('view_count', 'deleted') ORDER BY ORDINAL_POSITION",
    'Verification query'
  );
  
  if (verify.success && verify.result) {
    console.log('\n📊 Verified columns:');
    verify.result.forEach(col => {
      console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (default: ${col.COLUMN_DEFAULT}, nullable: ${col.IS_NULLABLE})`);
      if (col.COLUMN_COMMENT) {
        console.log(`     Comment: ${col.COLUMN_COMMENT}`);
      }
    });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📝 Migration Summary:');
  const steps = [step1, step2, step3, step4, step5, step6, verify];
  const successCount = steps.filter(s => s.success).length;
  console.log(`   ✅ ${successCount}/${steps.length} steps completed successfully`);
  
  if (successCount === steps.length) {
    console.log('\n🎉 Migration completed successfully!');
    console.log('\nThe handsome_images table now has:');
    console.log('   • view_count column for tracking popularity');
    console.log('   • deleted column for logical deletion');
    console.log('   • idx_view_count index for performance');
    console.log('   • idx_image_url unique index (if not already present)');
    return 0;
  } else {
    console.log('\n⚠️  Some steps failed. Please review the output above.');
    return 1;
  }
}

// Run migration
applyMigration()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
