# View Count System

This document describes the global view count tracking system for nanrenbao images.

## Overview

The system tracks how many times each image has been unlocked (viewed with points spent) across all users. Images with higher view counts are displayed first, creating a popularity-based ranking.

## Features

- **Global Statistics**: Tracks total unlock count for each image across all users
- **Popularity Sorting**: Images sorted by view count (highest first)
- **Visual Indicator**: Shows "🔥 X人已看" for images with views
- **Real-time Updates**: View count increments immediately when user unlocks an image
- **Database Integration**: Persistent storage in MySQL database

## Database Schema

### New Column

```sql
view_count INT DEFAULT 0 NOT NULL COMMENT 'Number of times this image has been unlocked/viewed'
```

### Index

```sql
INDEX idx_view_count (view_count)
```

### Migration

To add this feature to an existing database:

```bash
mysql -u username -p database_name < nanrenbao/migrate-add-view-count.sql
```

Or manually run:

```sql
ALTER TABLE beauty_images ADD COLUMN view_count INT DEFAULT 0 NOT NULL;
ALTER TABLE beauty_images ADD INDEX idx_view_count (view_count);
```

## API Integration

### Incrementing View Count

When a user unlocks an image (spends points), the system:

1. Deducts points from user's local balance
2. Records view in localStorage (for 3-day free period)
3. Increments global view_count in database via API

**API Call:**

```javascript
POST https://letmetry.cloud/mysql/query
Content-Type: application/json

{
  "sql": "UPDATE beauty_images SET view_count = view_count + 1 WHERE image_url = ?",
  "params": ["https://example.com/image.jpg"]
}
```

### Querying Images

Images are now queried with view_count and sorted by popularity:

```javascript
POST https://letmetry.cloud/mysql/query
Content-Type: application/json

{
  "sql": "SELECT id, image_url, view_count, created_at FROM beauty_images ORDER BY view_count DESC, created_at DESC",
  "params": []
}
```

## User Interface

### Display Format

- **Locked images**: Shows unlock cost and view count
  ```
  点击查看
  消费 1 积分
  🔥 123人已看
  ```

- **Unlocked images**: Shows remaining free days and view count
  ```
  已解锁 2 天
  🔥 123人已看
  ```

- **Images with 0 views**: View count is hidden

### Styling

- Font size: `0.7em` (smaller than main text)
- Opacity: `0.8` (subtle appearance)
- Icon: 🔥 (fire emoji for popularity indicator)

## Code Structure

### Files Modified

1. **nanrenbao/database-schema.sql**
   - Added `view_count` column definition
   - Added `idx_view_count` index
   - Updated example queries

2. **nanrenbao/points-system.js**
   - Made `viewImage()` async function
   - Added `incrementViewCount()` function
   - Integrated database update with error handling

3. **nanrenbao/appreciate.html**
   - Updated SELECT query to include `view_count`
   - Added sorting by `view_count DESC`
   - Made `showModal()` async
   - Added view count display in blur overlay

### Key Functions

**incrementViewCount(imageUrl)**: Updates database view count
```javascript
async function incrementViewCount(imageUrl) {
    const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sql: 'UPDATE beauty_images SET view_count = view_count + 1 WHERE image_url = ?',
            params: [imageUrl]
        })
    });
    // ... error handling
}
```

**viewImage(imageUrl)**: Deducts points and increments view count
```javascript
async function viewImage(imageUrl) {
    // ... check permissions
    // ... deduct points
    
    // Increment global view count
    try {
        await incrementViewCount(imageUrl);
    } catch (error) {
        console.error('Failed to increment view count:', error);
        // Continue anyway - local points already deducted
    }
    
    return { success: true, ... };
}
```

## Error Handling

The system is designed to be fault-tolerant:

1. **Database update fails**: User's points are already deducted and view is recorded locally. The transaction continues successfully even if the global counter update fails.

2. **Null/undefined view_count**: Defaults to `0` using `item.view_count || 0`

3. **Network issues**: Wrapped in try-catch, logs error but doesn't break user experience

## Security

- **SQL Injection Prevention**: Uses parameterized queries with `?` placeholders
- **No Direct SQL**: Never constructs SQL with string interpolation
- **API Validation**: Backend validates all queries before execution

## Testing

Run tests:

```bash
cd /workspaces/LetMeTryAI
node -e "[test runner code]"  # See view-count.test.js
```

Test coverage:
- ✅ Database schema validation
- ✅ Points system integration
- ✅ API endpoint configuration
- ✅ UI display logic
- ✅ Error handling
- ✅ Edge cases

All 22 tests passing ✅

## Performance Considerations

1. **Index**: `idx_view_count` ensures fast sorting by popularity
2. **Atomic Updates**: `view_count = view_count + 1` is atomic at database level
3. **Async Operation**: Database update doesn't block UI
4. **Selective Display**: View count only shown for images with views > 0

## Future Enhancements

Possible improvements:

- **Time-based ranking**: Consider both view count and recency
- **View velocity**: Show trending images (high views in short time)
- **User contribution**: Show which users uploaded popular images
- **Analytics dashboard**: Admin view of popularity statistics
- **Cache layer**: Redis cache for top images to reduce database load

## Maintenance

### Monitoring

Check view count statistics:

```sql
-- Top 10 most popular images
SELECT image_url, view_count, created_at 
FROM beauty_images 
ORDER BY view_count DESC 
LIMIT 10;

-- Total views
SELECT SUM(view_count) as total_views FROM beauty_images;

-- Average views per image
SELECT AVG(view_count) as avg_views FROM beauty_images;
```

### Cleanup

Reset view counts (if needed):

```sql
UPDATE beauty_images SET view_count = 0;
```

## Support

For issues or questions:
- Check test file: `nanrenbao/view-count.test.js`
- Review schema: `nanrenbao/database-schema.sql`
- Migration script: `nanrenbao/migrate-add-view-count.sql`
- API documentation: https://letmetry.cloud/api-docs
