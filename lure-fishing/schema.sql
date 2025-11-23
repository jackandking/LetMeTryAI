-- Database schema for lure-fishing feature
-- This table stores fishing records with photo, location, and catch information

USE letmetryai;

-- Create lure_fishing_records table
CREATE TABLE IF NOT EXISTS lure_fishing_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    photo_url VARCHAR(255) NOT NULL COMMENT 'Filename of the uploaded fishing photo',
    location VARCHAR(255) NOT NULL COMMENT 'Geographic location of the fishing spot',
    catch_date DATE NOT NULL COMMENT 'Date when the fish was caught',
    temperature DECIMAL(5, 2) NOT NULL COMMENT 'Temperature in Celsius at the time of catch',
    catch_count INT NOT NULL DEFAULT 0 COMMENT 'Number of fish caught',
    notes TEXT COMMENT 'Additional notes about the fishing record',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
    
    INDEX idx_catch_date (catch_date),
    INDEX idx_temperature (temperature),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Stores fishing records for the lure-fishing application';
