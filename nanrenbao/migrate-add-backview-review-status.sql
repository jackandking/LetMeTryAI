-- Add moderation fields for user-submitted back-view image pairs.
ALTER TABLE back_view_images
    ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending' NOT NULL COMMENT 'Content review state: pending/approved/rejected',
    ADD COLUMN review_reason VARCHAR(255) DEFAULT NULL COMMENT 'Review note or rejection reason',
    ADD COLUMN reviewed_at DATETIME DEFAULT NULL,
    ADD COLUMN reviewed_by VARCHAR(64) DEFAULT NULL,
    ADD COLUMN source_type VARCHAR(32) DEFAULT 'legacy' NOT NULL COMMENT 'Submission source: legacy/local_file',
    ADD COLUMN submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ADD INDEX idx_backview_review_status (review_status);

-- Keep existing back-view content visible; new submissions default to pending.
UPDATE back_view_images
SET review_status = 'approved',
    review_reason = '存量内容恢复展示',
    reviewed_at = NOW(),
    reviewed_by = 'migration-backfill'
WHERE source_type = 'legacy' AND review_status = 'pending';
