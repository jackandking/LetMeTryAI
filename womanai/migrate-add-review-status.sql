-- Migration: add review workflow fields to womanai handsome_images
-- Run against letmetryai database before enabling approved-only public queries.
--
-- 与男人宝 migrate-add-review-status.sql 同构，区别：
--   1. 表名 handsome_images
--   2. 无 coverage_pct 列（女人宝无后宫门禁）
--   3. 存量 24 行全部回填 approved，避免上线后前台空白

ALTER TABLE handsome_images
    ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending' NOT NULL COMMENT 'Content review state: pending/approved/rejected';

ALTER TABLE handsome_images
    ADD COLUMN review_reason VARCHAR(255) DEFAULT NULL COMMENT 'Review note or rejection reason';

ALTER TABLE handsome_images
    ADD COLUMN reviewed_at DATETIME DEFAULT NULL COMMENT 'Time when review was completed';

ALTER TABLE handsome_images
    ADD COLUMN reviewed_by VARCHAR(64) DEFAULT NULL COMMENT 'Reviewer identity';

ALTER TABLE handsome_images
    ADD COLUMN source_type VARCHAR(32) DEFAULT 'legacy' NOT NULL COMMENT 'Submission source: legacy/url/local_file/automation';

ALTER TABLE handsome_images
    ADD COLUMN submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Time when the image was submitted';

ALTER TABLE handsome_images
    ADD INDEX idx_review_status (review_status);

ALTER TABLE handsome_images
    ADD INDEX idx_review_deleted (review_status, deleted);

UPDATE handsome_images
SET submitted_at = created_at
WHERE submitted_at IS NULL;

-- 存量回填为 approved：上线审核门禁后仍可展示（已存在的历史内容）。
-- source_type = 'legacy' 作为回填标记，仅回填此前 pending 的行。
UPDATE handsome_images
SET review_status = 'approved',
    review_reason = '整改前存量内容恢复展示',
    reviewed_at = NOW(),
    reviewed_by = 'migration-backfill'
WHERE source_type = 'legacy' AND review_status = 'pending';
