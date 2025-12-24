/**
 * Tests for global view count functionality
 * Tests database schema, API integration, and sorting
 */

const assert = require('assert');

describe('View Count System', () => {
    describe('Database Schema', () => {
        it('should have view_count column in schema definition', () => {
            const fs = require('fs');
            const schema = fs.readFileSync('./nanrenbao/database-schema.sql', 'utf8');
            
            assert(schema.includes('view_count'), 'Schema should include view_count column');
            assert(schema.includes('INT DEFAULT 0'), 'view_count should be INT with DEFAULT 0');
            assert(schema.includes('idx_view_count'), 'Should have index on view_count');
        });

        it('should have ALTER statement for existing tables', () => {
            const fs = require('fs');
            const schema = fs.readFileSync('./nanrenbao/database-schema.sql', 'utf8');
            
            assert(schema.includes('ALTER TABLE beauty_images ADD COLUMN view_count'), 
                'Should have ALTER statement to add view_count');
            assert(schema.includes('ALTER TABLE beauty_images ADD INDEX idx_view_count'), 
                'Should have ALTER statement to add index');
        });

        it('should have UPDATE query example for incrementing count', () => {
            const fs = require('fs');
            const schema = fs.readFileSync('./nanrenbao/database-schema.sql', 'utf8');
            
            assert(schema.includes('UPDATE beauty_images SET view_count = view_count + 1'), 
                'Should have UPDATE query example');
        });

        it('should sort by view_count DESC in SELECT examples', () => {
            const fs = require('fs');
            const schema = fs.readFileSync('./nanrenbao/database-schema.sql', 'utf8');
            
            assert(schema.includes('ORDER BY view_count DESC'), 
                'Should sort by view_count in SELECT examples');
        });
    });

    describe('Points System Integration', () => {
        let PointsSystem;
        
        beforeEach(() => {
            // Reset module cache to get fresh instance
            delete require.cache[require.resolve('./nanrenbao/points-system.js')];
            PointsSystem = require('./nanrenbao/points-system.js');
        });

        it('should have viewImage as async function', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes('async function viewImage'), 
                'viewImage should be async function');
        });

        it('should have incrementViewCount function', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes('async function incrementViewCount'), 
                'Should have incrementViewCount function');
            assert(code.includes('UPDATE beauty_images SET view_count = view_count + 1'), 
                'Should use UPDATE query to increment count');
        });

        it('should call incrementViewCount when points are deducted', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            // Check that incrementViewCount is called in viewImage
            const viewImageFunc = code.substring(
                code.indexOf('async function viewImage'),
                code.indexOf('async function incrementViewCount')
            );
            
            assert(viewImageFunc.includes('await incrementViewCount'), 
                'viewImage should call incrementViewCount');
        });

        it('should handle database errors gracefully', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            // Check for try-catch around incrementViewCount
            const viewImageFunc = code.substring(
                code.indexOf('async function viewImage'),
                code.indexOf('async function incrementViewCount')
            );
            
            assert(viewImageFunc.includes('try') && viewImageFunc.includes('catch'), 
                'Should have error handling for incrementViewCount');
            assert(viewImageFunc.includes('Continue anyway'), 
                'Should continue even if database update fails');
        });
    });

    describe('Appreciate Page Integration', () => {
        it('should query view_count from database', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('SELECT id, image_url, view_count, created_at'), 
                'Should SELECT view_count in query');
        });

        it('should sort by view_count DESC', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('ORDER BY view_count DESC'), 
                'Should sort by view_count DESC');
            assert(html.includes('ORDER BY view_count DESC, created_at DESC'), 
                'Should use created_at as secondary sort');
        });

        it('should display view count on images', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('item.view_count'), 
                'Should access view_count from item data');
            assert(html.includes('人已看'), 
                'Should display "人已看" text for view count');
        });

        it('should show fire emoji for popular images', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('🔥'), 
                'Should use fire emoji for view count indicator');
        });

        it('should show view count in both locked and unlocked states', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            // Check for viewCountText being used in both states
            const blurOverlaySection = html.substring(
                html.indexOf('blurOverlay.className = \'blur-overlay\''),
                html.indexOf('imageWrapper.appendChild(img)')
            );
            
            assert(blurOverlaySection.includes('viewCountText'), 
                'Should define viewCountText variable');
            
            // Count occurrences of viewCountText usage
            const matches = blurOverlaySection.match(/\$\{viewCountText\}/g);
            assert(matches && matches.length >= 2, 
                'Should use viewCountText in both locked and unlocked states');
        });

        it('should make showModal async to handle database update', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('async function showModal'), 
                'showModal should be async function');
            assert(html.includes('await PointsSystem.viewImage'), 
                'Should await viewImage call');
        });
    });

    describe('API Integration', () => {
        it('should use correct SQL parameter name', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes("sql: 'UPDATE beauty_images"), 
                'Should use sql parameter');
            assert(code.includes('params: [imageUrl]'), 
                'Should use params array');
        });

        it('should use parameterized query to prevent SQL injection', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes('WHERE image_url = ?'), 
                'Should use ? placeholder for parameter');
            assert(!code.includes('WHERE image_url = ${'), 
                'Should not use string interpolation in SQL');
        });

        it('should use correct API endpoint', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes('MYSQL_QUERY'), 
                'Should use MYSQL_QUERY endpoint');
            assert(code.includes('https://letmetry.cloud/mysql/query'), 
                'Should have correct endpoint URL as fallback');
        });
    });

    describe('User Experience', () => {
        it('should show view count only if greater than 0', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('viewCount > 0'), 
                'Should check if view count is greater than 0');
        });

        it('should show popularity with fire emoji', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('🔥'), 
                'Should use fire emoji for popular content indicator');
        });

        it('should style view count with smaller font and opacity', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const viewCountSection = html.substring(
                html.indexOf('viewCountText'),
                html.indexOf('if (viewStatus.needsPayment)')
            );
            
            assert(viewCountSection.includes('font-size: 0.7em'), 
                'Should use smaller font for view count');
            assert(viewCountSection.includes('opacity: 0.8'), 
                'Should use opacity for subtle display');
        });
    });

    describe('Edge Cases', () => {
        it('should handle null or undefined view_count', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('item.view_count || 0'), 
                'Should default to 0 if view_count is null/undefined');
        });

        it('should not break existing functionality if database update fails', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            // Check that points are deducted before database update
            const viewImageFunc = code.substring(
                code.indexOf('async function viewImage'),
                code.indexOf('async function incrementViewCount')
            );
            
            const addPointsIndex = viewImageFunc.indexOf('addPoints(-');
            const incrementIndex = viewImageFunc.indexOf('await incrementViewCount');
            
            assert(addPointsIndex > 0 && incrementIndex > 0, 
                'Both operations should exist');
            assert(addPointsIndex < incrementIndex, 
                'Points should be deducted before database update');
        });
    });
});
