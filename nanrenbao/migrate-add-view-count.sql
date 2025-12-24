-- Migration script to add view_count column to beauty_images table
-- Run this script on the production database to add view count tracking
-- ✅ EXECUTED: 2025-12-24 - Successfully added to production

-- Add view_count column with default value 0
-- Note: MySQL doesn't support IF NOT EXISTS for ADD COLUMN
-- Check if column exists first: DESCRIBE beauty_images;
ALTER TABLE beauty_images 
ADD COLUMN view_count INT DEFAULT 0 NOT NULL 
COMMENT 'Number of times this image has been unlocked/viewed';

-- Add index on view_count for efficient sorting
ALTER TABLE beauty_images 
ADD INDEX idx_view_count (view_count);

-- Verify the changes
DESCRIBE beauty_images;

-- Show sample data with new column
SELECT id, image_url, view_count, created_at 
FROM beauty_images 
ORDER BY view_count DESC, created_at DESC 
LIMIT 10;
