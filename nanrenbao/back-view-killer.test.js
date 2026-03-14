/**
 * Tests for Back View Killer feature
 */

describe('Back View Killer Schema', () => {
    it('should have correct table structure', () => {
        const fs = require('fs');
        const schemaPath = './nanrenbao/back-view-killer-schema.sql';
        const schemaExists = fs.existsSync(schemaPath);
        expect(schemaExists).toBe(true);

        if (schemaExists) {
            const schema = fs.readFileSync(schemaPath, 'utf8');
            expect(schema).toContain('CREATE TABLE IF NOT EXISTS back_view_images');
            expect(schema).toContain('back_image_url VARCHAR(2048)');
            expect(schema).toContain('front_image_url VARCHAR(2048)');
            expect(schema).toContain('click_count INT DEFAULT 0');
        }
    });
});

describe('Back View Killer Main Page', () => {
    it('should exist', () => {
        const fs = require('fs');
        const exists = fs.existsSync('./nanrenbao/back-view-killer.html');
        expect(exists).toBe(true);
    });

    it('should use centralized configuration', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        expect(content).toContain('src="../config.js"');
        expect(content).toContain('src="points-system.js"');
        expect(content).toContain('window.API_ENDPOINTS.MYSQL_QUERY');
    });

    it('should have flip card functionality', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        expect(content).toContain('flip-card');
        expect(content).toContain('flip-card-inner');
        expect(content).toContain('flip-card-front');
        expect(content).toContain('flip-card-back');
    });

    it('should have upload button in header', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        expect(content).toContain('back-view-killer-upload.html');
        expect(content).toContain('上传');
    });

    it('should have points system integration', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        expect(content).toContain('PointsSystem.canViewImage');
        expect(content).toContain('PointsSystem.viewImage');
        expect(content).toContain('PointsSystem.getPoints');
    });

    it('should have ad integration', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        expect(content).toContain('showAdForPoints');
        expect(content).toContain('handleAdReturn');
    });

    it('should query back_view_images table', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        expect(content).toContain('FROM back_view_images');
        expect(content).toContain('ORDER BY click_count DESC');
    });

    it('should increment click count on flip', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        expect(content).toContain('UPDATE back_view_images SET click_count = click_count + 1');
    });
});

describe('Back View Killer Upload Page', () => {
    it('should exist', () => {
        const fs = require('fs');
        const exists = fs.existsSync('./nanrenbao/back-view-killer-upload.html');
        expect(exists).toBe(true);
    });

    it('should use centralized configuration', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('src="../config.js"');
        expect(content).toContain('src="points-system.js"');
        expect(content).toContain('window.API_ENDPOINTS.MYSQL_QUERY');
    });

    it('should have input fields for both images', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('backImageUrl');
        expect(content).toContain('frontImageUrl');
        expect(content).toContain('背影照片');
        expect(content).toContain('正面照片');
    });

    it('should show 20 points reward', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('20');
        expect(content).toContain('积分');
    });

    it('should have preview functionality', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('backPreview');
        expect(content).toContain('frontPreview');
        expect(content).toContain('preview-container');
    });

    it('should have inline URL validation', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('window.isValidImageUrl');
        expect(content).toContain('isValidImageUrl(');
    });

    it('should have local file upload support', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('backFileInput');
        expect(content).toContain('frontFileInput');
        expect(content).toContain('选择本地文件');
        expect(content).toContain('accept="image/*"');
    });

    it('should use UUID for filenames', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('generateUUID');
        expect(content).toContain('crypto.randomUUID');
        expect(content).not.toContain('sha1Hex');
    });

    it('should have image compression function', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('compressImageFile');
        expect(content).toContain('maxWidth');
        expect(content).toContain('maxHeight');
    });

    it('should enforce 500KB file size limit in compressImageFile', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('MAX_FILE_SIZE');
        expect(content).toContain('500 * 1024');
        expect(content).toContain('MIN_QUALITY');
        expect(content).toContain('QUALITY_STEP');
        // Iterative quality reduction logic
        expect(content).toContain('blob.size > MAX_FILE_SIZE');
        expect(content).toContain('attempt');
    });

    it('should use reduced default dimensions in compressImageFile', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        // Default maxWidth/maxHeight should be 800/1440 (reduced from 1080/1920)
        expect(content).toContain('maxWidth = 800');
        expect(content).toContain('maxHeight = 1440');
    });

    it('should enforce 500KB file size limit in exportCanvasToFile', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        // exportCanvasToFile should also have iterative compression with shared constants
        expect(content).toContain('QUALITY_STEP');
        expect(content).toContain('MAX_DIM');
    });

    it('should check for duplicate images', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('SELECT id, back_image_url, front_image_url FROM back_view_images WHERE');
        expect(content).toContain('IN (?, ?)');
        expect(content).toContain('图片已存在');
    });

    it('should insert into back_view_images table', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('INSERT INTO back_view_images');
        expect(content).toContain('back_image_url');
        expect(content).toContain('front_image_url');
    });

    it('should award 20 points on successful upload', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        expect(content).toContain('BACK_VIEW_UPLOAD_POINTS = 20');
        expect(content).toContain('PointsSystem.addPoints(BACK_VIEW_UPLOAD_POINTS)');
    });
});

describe('Nanrenbao Index Integration', () => {
    it('should have link to back view killer', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/index.html', 'utf8');
        expect(content).toContain('back-view-killer.html');
        expect(content).toContain('背影杀');
    });
});

describe('Back View Killer - SQL Parameter Format', () => {
    it('should use sql parameter (not query) in main page', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        
        // Check for correct parameter name
        const sqlParamCount = (content.match(/sql:/g) || []).length;
        expect(sqlParamCount).toBeGreaterThan(0);
        
        // Should NOT use 'query:' parameter
        expect(content).not.toContain('query:');
    });

    it('should use sql parameter (not query) in upload page', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        
        // Check for correct parameter name
        const sqlParamCount = (content.match(/sql:/g) || []).length;
        expect(sqlParamCount).toBeGreaterThan(0);
        
        // Should NOT use 'query:' parameter
        expect(content).not.toContain('query:');
    });

    it('should use params array for parameterized queries', () => {
        const fs = require('fs');
        const mainContent = fs.readFileSync('./nanrenbao/back-view-killer.html', 'utf8');
        const uploadContent = fs.readFileSync('./nanrenbao/back-view-killer-upload.html', 'utf8');
        
        expect(mainContent).toContain('params:');
        expect(uploadContent).toContain('params:');
    });
});

describe('Back View Killer - Database Initialization', () => {
    it('should have database initialization page', () => {
        const fs = require('fs');
        const exists = fs.existsSync('./nanrenbao/init-back-view-killer-db.html');
        expect(exists).toBe(true);
    });

    it('should have database initialization script', () => {
        const fs = require('fs');
        const exists = fs.existsSync('./nanrenbao/scripts/init-back-view-killer-db.js');
        expect(exists).toBe(true);
    });

    it('initialization page should use centralized config', () => {
        const fs = require('fs');
        const content = fs.readFileSync('./nanrenbao/init-back-view-killer-db.html', 'utf8');
        expect(content).toContain('src="../config.js"');
        expect(content).toContain('window.API_ENDPOINTS.MYSQL_QUERY');
    });
});
