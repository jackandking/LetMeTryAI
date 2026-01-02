-- Database schema for 女人爱 (womanai) handsome men images feature
-- This table stores URLs of handsome men images uploaded by users

CREATE TABLE IF NOT EXISTS handsome_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(2048) NOT NULL,
    view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed',
    deleted TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Logical delete flag: 0=visible,1=deleted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_view_count (view_count),
    UNIQUE INDEX idx_image_url (image_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: UNIQUE index uses first 255 characters of image_url due to MySQL key length limits

-- For existing tables, run these ALTER statements:
-- ALTER TABLE handsome_images ADD COLUMN view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed';
-- ALTER TABLE handsome_images ADD COLUMN deleted TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Logical delete flag: 0=visible,1=deleted';
-- ALTER TABLE handsome_images ADD INDEX idx_view_count (view_count);
-- ALTER TABLE handsome_images ADD UNIQUE INDEX idx_image_url (image_url(255));

-- Example queries for the application:

-- Insert a new handsome man image URL
-- INSERT INTO handsome_images (image_url, created_at) VALUES (?, ?);

-- Select all handsome men images ordered by most popular (highest view count) first
-- SELECT id, image_url, view_count, created_at FROM handsome_images WHERE deleted = 0 ORDER BY view_count DESC, created_at DESC;

-- Select images with pagination, sorted by popularity
-- SELECT id, image_url, view_count, created_at FROM handsome_images WHERE deleted = 0 ORDER BY view_count DESC, created_at DESC LIMIT ? OFFSET ?;

-- Increment view count when user unlocks an image
-- UPDATE handsome_images SET view_count = view_count + 1 WHERE image_url = ?;

-- Delete old images (optional cleanup)
-- DELETE FROM handsome_images WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
