# 背影杀 (Back View Killer) Feature

## 📖 Overview

The "背影杀" (Back View Killer) is an interactive feature that displays pairs of beauty images - a back view and a front view. Users can click on the back view to flip and reveal the front view, creating an engaging guessing game experience.

## ✨ Features

### User Features
- **Flip Card Interaction**: Click on back view images to reveal the front view with a smooth 3D flip animation
- **Points System Integration**: 
  - Costs 1 point to flip and view the front image
  - Once unlocked, can view for free for 3 days
  - Earn 20 points for uploading new back view killer pairs
- **Popularity Display**: See how many people have already flipped each image
- **Ad Integration**: Watch ads to earn points when running low
- **Image Preview**: Preview both images before uploading

### Admin Features
- Easy upload interface for adding new back/front image pairs
- Duplicate detection to prevent the same images from being uploaded multiple times
- Database initialization tools

## 🗄️ Database Schema

The feature uses the `back_view_images` table:

```sql
CREATE TABLE IF NOT EXISTS back_view_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    back_image_url VARCHAR(2048) NOT NULL,
    front_image_url VARCHAR(2048) NOT NULL,
    click_count INT DEFAULT 0 NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at),
    INDEX idx_click_count (click_count),
    UNIQUE INDEX idx_back_image (back_image_url(255)),
    UNIQUE INDEX idx_front_image (front_image_url(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 🚀 Setup

### 1. Database Initialization

Choose one of the following methods:

**Method A: Browser-Based (Recommended for End Users)**
1. Open `nanrenbao/init-back-view-killer-db.html` in a browser
2. Click the "初始化数据库" button
3. Wait for confirmation that the table was created

**Method B: Node.js Script (For Developers)**
```bash
cd nanrenbao/scripts
node init-back-view-killer-db.js
```

**Method C: Direct SQL (For Database Admins)**
```bash
# Run the SQL schema file directly
mysql -h letmetry.cloud -u username -p database_name < nanrenbao/back-view-killer-schema.sql
```

### 2. Access the Feature

Navigate to: `https://yourdomain.com/nanrenbao/back-view-killer.html`

Or access from the nanrenbao homepage: `nanrenbao/index.html`

## 📁 File Structure

```
nanrenbao/
├── back-view-killer.html              # Main page with flip cards
├── back-view-killer-upload.html       # Upload page for new image pairs
├── back-view-killer-schema.sql        # Database schema definition
├── back-view-killer.test.js           # Test suite
├── init-back-view-killer-db.html      # Browser-based DB initialization
└── scripts/
    └── init-back-view-killer-db.js    # Node.js DB initialization script
```

## 🎮 User Flow

### Viewing Images
1. User visits `back-view-killer.html`
2. Sees grid of back view images ordered by popularity (click count)
3. Clicks on a back view to flip it
4. System checks if user has enough points (1 point required)
5. If yes:
   - Deduct 1 point
   - Show front view with smooth flip animation
   - Increment click count in database
   - Store unlock timestamp (free viewing for 3 days)
6. If no:
   - Show "insufficient points" message
   - Offer option to watch ad to earn points

### Uploading New Pairs
1. User clicks "上传" button in header
2. Navigates to upload page
3. Enters URLs for both back and front images
4. System validates URLs and shows live previews
5. Checks for duplicate images
6. If valid and unique:
   - Insert into database
   - Award 20 points to user
   - Redirect back to main page

## 💎 Points Economy

| Action | Points Change |
|--------|--------------|
| Upload new image pair | +20 points |
| View front image (first time) | -1 point |
| View front image (within 3 days) | Free |
| Watch full ad | +10 points |
| Watch partial ad | +3 points |
| Daily visit | +5 points |
| New user bonus | +3 points |

## 🔧 Technical Details

### Frontend
- **Flip Animation**: Pure CSS 3D transforms with `transform-style: preserve-3d`
- **State Management**: Uses localStorage to track viewed images and unlock timestamps
- **Image Loading**: Error handling with fallback to hide failed images
- **Responsive Design**: Mobile-first with grid layout

### Backend Integration
- **API Endpoint**: Uses centralized `window.API_ENDPOINTS.MYSQL_QUERY`
- **Query Parameter**: Correctly uses `sql` parameter (not `query`)
- **Parameterized Queries**: Uses `params` array for SQL injection prevention

### Points System Integration
- Reuses existing `points-system.js` for consistency
- 3-day unlock period tracked using `PointsSystem.canViewImage()` and `PointsSystem.viewImage()`
- Click count stored separately in database for global statistics

## 🧪 Testing

Run tests with:
```bash
node run-tests.js
```

Tests cover:
- Database schema validation
- HTML page existence and structure
- Configuration usage (centralized config.js)
- Points system integration
- Upload functionality
- SQL parameter format (uses `sql`, not `query`)

## 🎨 Styling

The feature uses the same design language as the rest of nanrenbao:
- **Colors**: Purple gradient theme (#667eea to #764ba2)
- **Animations**: Smooth transitions and hover effects
- **Typography**: Clean, readable Chinese typography
- **Mobile**: Fully responsive with mobile-optimized layouts

## 🔒 Security Considerations

1. **URL Validation**: Uses `url-validator.js` to validate image URLs
2. **Duplicate Prevention**: Checks for existing URLs before insertion
3. **SQL Injection**: Uses parameterized queries with `params` array
4. **XSS Prevention**: No user HTML content, only URLs stored
5. **Rate Limiting**: Relies on API endpoint rate limiting

## 🐛 Troubleshooting

### Images not loading?
- Check that image URLs are accessible and valid
- Verify CORS settings allow loading from external domains
- Check browser console for specific error messages

### Points not deducting?
- Verify `points-system.js` is loaded correctly
- Check localStorage for `nanrenbao_points` key
- Clear localStorage and refresh to reset points system

### Database table not found?
- Run one of the initialization methods above
- Verify database connection is working
- Check that SQL was executed successfully

## 📝 Future Enhancements

Potential improvements for future versions:
- [ ] Batch upload support for multiple image pairs
- [ ] User voting/rating system for images
- [ ] Social sharing of favorite flips
- [ ] Leaderboard for most popular images
- [ ] Admin panel for moderation
- [ ] Image compression/optimization
- [ ] CDN integration for faster loading

## 📞 Support

For issues or questions:
1. Check the test suite: `nanrenbao/back-view-killer.test.js`
2. Review the API documentation: https://letmetry.cloud/api-docs
3. Check browser console for error messages
4. Verify database initialization completed successfully

---

**Happy Flipping!** 💃✨
