-- Migration script to add review workflow fields to beauty_images
-- Run against the production database before enabling approved-only public queries.

ALTER TABLE beauty_images
    ADD COLUMN review_status VARCHAR(20) DEFAULT 'pending' NOT NULL COMMENT 'Content review state: pending/approved/rejected';

ALTER TABLE beauty_images
    ADD COLUMN review_reason VARCHAR(255) DEFAULT NULL COMMENT 'Review note or rejection reason';

ALTER TABLE beauty_images
    ADD COLUMN reviewed_at DATETIME DEFAULT NULL COMMENT 'Time when review was completed';

ALTER TABLE beauty_images
    ADD COLUMN reviewed_by VARCHAR(64) DEFAULT NULL COMMENT 'Reviewer identity';

ALTER TABLE beauty_images
    ADD COLUMN source_type VARCHAR(32) DEFAULT 'legacy' NOT NULL COMMENT 'Submission source: legacy/url/local_file';

ALTER TABLE beauty_images
    ADD COLUMN submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Time when the image was submitted';

ALTER TABLE beauty_images
    ADD INDEX idx_review_status (review_status);

ALTER TABLE beauty_images
    ADD INDEX idx_review_deleted (review_status, deleted);

UPDATE beauty_images
SET submitted_at = created_at
WHERE submitted_at IS NULL;
