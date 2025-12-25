-- Database schema for 背影杀 (Back View Killer) feature
-- This table stores pairs of beauty images (back view and front view)

CREATE TABLE IF NOT EXISTS back_view_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    back_image_url VARCHAR(2048) NOT NULL COMMENT 'URL of the back view image',
    front_image_url VARCHAR(2048) NOT NULL COMMENT 'URL of the front view image',
    click_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times the back view has been clicked to reveal front',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_click_count (click_count),
    UNIQUE INDEX idx_back_image (back_image_url(255)),
    UNIQUE INDEX idx_front_image (front_image_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example queries for the application:

-- Insert a new image pair
-- INSERT INTO back_view_images (back_image_url, front_image_url) VALUES (?, ?);

-- Select all image pairs ordered by most popular (highest click count) first
-- SELECT id, back_image_url, front_image_url, click_count, created_at 
-- FROM back_view_images 
-- ORDER BY click_count DESC, created_at DESC;

-- Increment click count when user reveals front image
-- UPDATE back_view_images SET click_count = click_count + 1 WHERE id = ?;

-- Get a specific image pair
-- SELECT id, back_image_url, front_image_url, click_count 
-- FROM back_view_images 
-- WHERE id = ?;
