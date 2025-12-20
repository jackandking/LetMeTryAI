-- Database schema for 男人宝 (nanrenbao) beauty images feature
-- This table stores URLs of beauty images uploaded by users

CREATE TABLE IF NOT EXISTS beauty_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(2048) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example queries for the application:

-- Insert a new beauty image URL
-- INSERT INTO beauty_images (image_url, created_at) VALUES (?, ?);

-- Select all beauty images ordered by newest first
-- SELECT id, image_url, created_at FROM beauty_images ORDER BY created_at DESC;

-- Select images with pagination
-- SELECT id, image_url, created_at FROM beauty_images ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- Delete old images (optional cleanup)
-- DELETE FROM beauty_images WHERE created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);
