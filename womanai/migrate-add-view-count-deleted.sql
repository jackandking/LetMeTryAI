-- Migration script to add view_count and deleted columns to handsome_images table
-- Run this SQL script to update existing handsome_images table

-- Add view_count column if it doesn't exist
ALTER TABLE handsome_images 
ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed';

-- Add deleted column if it doesn't exist
ALTER TABLE handsome_images 
ADD COLUMN IF NOT EXISTS deleted TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Logical delete flag: 0=visible,1=deleted';

-- Add index for view_count if it doesn't exist
ALTER TABLE handsome_images 
ADD INDEX IF NOT EXISTS idx_view_count (view_count);

-- Add unique index on image_url if it doesn't exist
-- Using a procedure to handle the case where the index already exists
DELIMITER $$

CREATE PROCEDURE add_unique_index_if_not_exists()
BEGIN
    DECLARE index_exists INT DEFAULT 0;
    
    SELECT COUNT(*) INTO index_exists 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'handsome_images' 
        AND INDEX_NAME = 'idx_image_url';
    
    IF index_exists = 0 THEN
        ALTER TABLE handsome_images ADD UNIQUE INDEX idx_image_url (image_url(255));
    END IF;
END$$

DELIMITER ;

CALL add_unique_index_if_not_exists();
DROP PROCEDURE IF EXISTS add_unique_index_if_not_exists;

-- Set default values for existing records
UPDATE handsome_images SET view_count = 0 WHERE view_count IS NULL;
UPDATE handsome_images SET deleted = 0 WHERE deleted IS NULL;

-- Verify migration
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    DATA_TYPE,
    COLUMN_DEFAULT,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'handsome_images' 
    AND COLUMN_NAME IN ('view_count', 'deleted')
ORDER BY ORDINAL_POSITION;
