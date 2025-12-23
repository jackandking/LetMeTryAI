-- Database schema for 女人爱 (womanai) handsome men images feature
-- This table stores URLs of handsome men images uploaded by users

CREATE TABLE IF NOT EXISTS handsome_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(2048) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    UNIQUE INDEX idx_image_url (image_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Note: UNIQUE index uses first 255 characters of image_url due to MySQL key length limits
-- For existing tables: ALTER TABLE handsome_images ADD UNIQUE INDEX idx_image_url (image_url(255));

-- Example queries for the application:

-- Insert a new handsome man image URL
-- INSERT INTO handsome_images (image_url, created_at) VALUES (?, ?);

-- Select all handsome men images ordered by newest first
-- SELECT id, image_url, created_at FROM handsome_images ORDER BY created_at DESC;

-- Select images with pagination
-- SELECT id, image_url, created_at FROM handsome_images ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- Delete old images (optional cleanup)
-- DELETE FROM handsome_images WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
