-- Database schema for 男人宝 (nanrenbao) beauty images feature
-- This table stores URLs of beauty images uploaded by users

CREATE TABLE IF NOT EXISTS beauty_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(2048) NOT NULL,
    view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed',
    deleted TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Logical delete flag: 0=visible,1=deleted',
    review_status VARCHAR(20) DEFAULT 'pending' NOT NULL COMMENT 'Content review state: pending/approved/rejected',
    review_reason VARCHAR(255) DEFAULT NULL COMMENT 'Review note or rejection reason',
    reviewed_at DATETIME DEFAULT NULL COMMENT 'Time when review was completed',
    reviewed_by VARCHAR(64) DEFAULT NULL COMMENT 'Reviewer identity',
    source_type VARCHAR(32) DEFAULT 'legacy' NOT NULL COMMENT 'Submission source: legacy/url/local_file',
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Time when the image was submitted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_view_count (view_count),
    INDEX idx_review_status (review_status),
    INDEX idx_review_deleted (review_status, deleted),
    UNIQUE INDEX idx_image_url (image_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: UNIQUE index uses first 255 characters of image_url due to MySQL key length limits

-- For existing tables, run these ALTER statements:
-- ALTER TABLE beauty_images ADD COLUMN view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed';
-- ALTER TABLE beauty_images ADD INDEX idx_view_count (view_count);
-- ALTER TABLE beauty_images ADD UNIQUE INDEX idx_image_url (image_url(255));
-- ALTER TABLE beauty_images ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending' NOT NULL COMMENT 'Content review state: pending/approved/rejected';
-- ALTER TABLE beauty_images ADD COLUMN review_reason VARCHAR(255) DEFAULT NULL COMMENT 'Review note or rejection reason';
-- ALTER TABLE beauty_images ADD COLUMN reviewed_at DATETIME DEFAULT NULL COMMENT 'Time when review was completed';
-- ALTER TABLE beauty_images ADD COLUMN reviewed_by VARCHAR(64) DEFAULT NULL COMMENT 'Reviewer identity';
-- ALTER TABLE beauty_images ADD COLUMN source_type VARCHAR(32) DEFAULT 'legacy' NOT NULL COMMENT 'Submission source: legacy/url/local_file';
-- ALTER TABLE beauty_images ADD COLUMN submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Time when the image was submitted';
-- ALTER TABLE beauty_images ADD INDEX idx_review_status (review_status);
-- ALTER TABLE beauty_images ADD INDEX idx_review_deleted (review_status, deleted);
-- UPDATE beauty_images SET submitted_at = created_at WHERE submitted_at IS NULL;
-- UPDATE beauty_images SET review_status = 'approved', review_reason = '整改前存量内容恢复展示', reviewed_at = NOW(), reviewed_by = 'migration-backfill' WHERE source_type = 'legacy' AND review_status = 'pending';

-- 遮蔽度门禁（2026-10-20）：coverage_pct 估算衣着覆盖比例(0-100)。
-- 欣赏美女页(appreciate.html)对未激活「后宫」的用户隐藏 coverage_pct < 50 的图；
-- NULL=未知（如 legacy 存量投稿）不拦截。快手落地页(beauty-scratch.html)与刮刮乐
-- (scratch-lottery.html)不做此过滤。新投稿由 contribute.cjs 从 DNA.coverage_pct
-- （缺省按 wardrobe 关键词估算）自动写入。
-- ALTER TABLE beauty_images ADD COLUMN coverage_pct TINYINT UNSIGNED DEFAULT NULL COMMENT '遮蔽度%(衣着覆盖估算,0-100); NULL=未知不拦截; <50 仅后宫激活用户可见';

-- Example queries for the application:

-- Insert a new beauty image URL
-- INSERT INTO beauty_images (image_url, created_at, review_status, submitted_at, source_type) VALUES (?, ?, 'pending', ?, ?);

-- Select all beauty images ordered by most popular (highest view count) first
-- SELECT id, image_url, view_count, created_at FROM beauty_images WHERE deleted = 0 AND review_status = 'approved' ORDER BY view_count DESC, created_at DESC;

-- Select images with pagination, sorted by popularity
-- SELECT id, image_url, view_count, created_at FROM beauty_images WHERE deleted = 0 AND review_status = 'approved' ORDER BY view_count DESC, created_at DESC LIMIT ? OFFSET ?;

-- Increment view count when user unlocks an image
-- UPDATE beauty_images SET view_count = view_count + 1 WHERE image_url = ?;

-- Approve pending submissions
-- UPDATE beauty_images SET review_status = 'approved', review_reason = NULL, reviewed_at = NOW(), reviewed_by = ? WHERE id IN (...);

-- Reject pending submissions
-- UPDATE beauty_images SET review_status = 'rejected', review_reason = ?, reviewed_at = NOW(), reviewed_by = ? WHERE id IN (...);

-- Delete old images (optional cleanup)
-- DELETE FROM beauty_images WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
