# Lure Fishing Application

This is a photo upload and tracking application for lure fishing enthusiasts. Users can upload photos of their catches, record location and temperature data, and view statistics.

## Features

- Photo upload and preview
- GPS location tracking
- Temperature recording
- Catch count tracking
- Notes for each fishing session
- Temperature-based statistics
- Photo gallery of fishing records

## Database Setup

Before using the application, you must create the required database table. Run the following command:

```bash
mysql -u [username] -p letmetryai < lure-fishing/schema.sql
```

Or manually execute the SQL in `schema.sql` file.

### Table Schema

The `lure_fishing_records` table contains:

- `id` - Auto-incrementing primary key
- `photo_url` - Filename of the uploaded fishing photo
- `location` - Geographic location (latitude/longitude string)
- `catch_date` - Date when the fish was caught
- `temperature` - Temperature in Celsius at the time of catch
- `catch_count` - Number of fish caught
- `notes` - Optional additional notes
- `created_at` - Timestamp when the record was created

Indexes are created on `catch_date`, `temperature`, and `created_at` for efficient querying.

## Usage

1. **Upload a photo**: Click to select a fishing photo
2. **Get location**: Click the "获取位置" button to get your current GPS location
3. **Fill in details**: 
   - Select the date
   - Enter temperature
   - Enter number of fish caught
   - Add optional notes
4. **Submit**: Click "提交成果" to save the record

## API Endpoints

The application uses the following API endpoints (configured in `config.js`):

- `FILE_UPLOAD` - For uploading photos
- `MYSQL_INSERT` - For inserting fishing records
- `MYSQL_QUERY` - For retrieving fishing records

## Files

- `index.html` - Main application page
- `main.js` - Application logic and API calls
- `styles.css` - Application styles
- `schema.sql` - Database schema
- `README.md` - This file
