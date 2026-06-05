/**
 * Integration tests for nanrenbao (男人宝) feature
 */

import { createRequire } from 'module';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

describe('nanrenbao 男人宝 Integration Tests', () => {
    describe('Page Structure', () => {
        it('should have required HTML files', () => {
            const fs = require('fs');
            const path = require('path');
            const baseDir = path.join(__dirname);

            const requiredFiles = [
                'index.html',
                'appreciate.html',
                'upload.html',
                'styles.css',
                'url-validator.js'
            ];

            requiredFiles.forEach(file => {
                const filePath = path.join(baseDir, file);
                expect(fs.existsSync(filePath)).toBe(true);
            });
        });

        it('should have proper HTML structure in index.html', () => {
            const fs = require('fs');
            const path = require('path');
            const indexPath = path.join(__dirname, 'index.html');
            const content = fs.readFileSync(indexPath, 'utf-8');

            // Check for required elements
            expect(content).toContain('男人宝');
            expect(content).toContain('欣赏美女');
            expect(content).toContain('上传美女（维护中）');
            expect(content).toContain('appreciate.html');
            expect(content).toContain('上传入口暂时关闭');
        });

        it('should have proper HTML structure in appreciate.html', () => {
            const fs = require('fs');
            const path = require('path');
            const appreciatePath = path.join(__dirname, 'appreciate.html');
            const content = fs.readFileSync(appreciatePath, 'utf-8');

            // Check for required elements
            expect(content).toContain('欣赏美女');
            expect(content).toContain('gallery');
            expect(content).toContain('API_ENDPOINTS.MYSQL_QUERY');
        });

        it('should have proper HTML structure in upload.html', () => {
            const fs = require('fs');
            const path = require('path');
            const uploadPath = path.join(__dirname, 'upload.html');
            const content = fs.readFileSync(uploadPath, 'utf-8');

            // Check for required elements
            expect(content).toContain('上传美女（维护中）');
            expect(content).toContain('imageUrl');
            expect(content).toContain('window.API_ENDPOINTS.MYSQL_QUERY');
            expect(content).toContain('整改公告');
            expect(content).toContain('UPLOAD_DISABLED');
        });
    });

    describe('Configuration Integration', () => {
        it('should use centralized configuration', () => {
            const fs = require('fs');
            const path = require('path');
            
            const appreciatePath = path.join(__dirname, 'appreciate.html');
            const appreciateContent = fs.readFileSync(appreciatePath, 'utf-8');
            
            const uploadPath = path.join(__dirname, 'upload.html');
            const uploadContent = fs.readFileSync(uploadPath, 'utf-8');

            // Check that both pages use config.js
            expect(appreciateContent).toContain('src="../config.js"');
            expect(uploadContent).toContain('src="../config.js"');

            // Check that they use window.API_ENDPOINTS
            expect(appreciateContent).toContain('window.API_ENDPOINTS');
            expect(uploadContent).toContain('window.API_ENDPOINTS');

            // Ensure no hardcoded URLs
            expect(appreciateContent).not.toContain('letmetryai.cn');
            expect(uploadContent).not.toContain('letmetryai.cn');
        });

        it('should reference correct API endpoints', () => {
            const fs = require('fs');
            const path = require('path');
            
            const appreciatePath = path.join(__dirname, 'appreciate.html');
            const appreciateContent = fs.readFileSync(appreciatePath, 'utf-8');
            
            const uploadPath = path.join(__dirname, 'upload.html');
            const uploadContent = fs.readFileSync(uploadPath, 'utf-8');

            // Check for proper API endpoint usage
            expect(appreciateContent).toContain('MYSQL_QUERY');
            expect(uploadContent).toContain('MYSQL_QUERY');
        });
    });

    describe('Security Features', () => {
        it('should enforce HTTPS in upload validation', () => {
            const fs = require('fs');
            const path = require('path');
            const validatorPath = path.join(__dirname, 'url-validator.js');
            const content = fs.readFileSync(validatorPath, 'utf-8');

            // Check for HTTPS validation
            expect(content).toContain("protocol !== 'https:'");
            expect(content).toContain('仅支持HTTPS链接');
        });

        it('should validate allowed domains', () => {
            const fs = require('fs');
            const path = require('path');
            const validatorPath = path.join(__dirname, 'url-validator.js');
            const content = fs.readFileSync(validatorPath, 'utf-8');

            // Check for domain validation
            expect(content).toContain('allowedDomains');
            expect(content).toContain('不支持的图片来源');
        });

        it('should include Baidu analytics', () => {
            const fs = require('fs');
            const path = require('path');
            
            const requiredPages = ['index.html', 'appreciate.html', 'upload.html'];
            
            requiredPages.forEach(page => {
                const pagePath = path.join(__dirname, page);
                const content = fs.readFileSync(pagePath, 'utf-8');
                expect(content).toContain('hm.baidu.com/hm.js');
            });
        });
    });

    describe('User Experience Features', () => {
        it('should have image preview in upload page', () => {
            const fs = require('fs');
            const path = require('path');
            const uploadPath = path.join(__dirname, 'upload.html');
            const content = fs.readFileSync(uploadPath, 'utf-8');

            expect(content).toContain('preview');
            expect(content).toContain('previewImage');
        });

        it('should have back navigation links', () => {
            const fs = require('fs');
            const path = require('path');
            
            const appreciatePath = path.join(__dirname, 'appreciate.html');
            const appreciateContent = fs.readFileSync(appreciatePath, 'utf-8');
            
            const uploadPath = path.join(__dirname, 'upload.html');
            const uploadContent = fs.readFileSync(uploadPath, 'utf-8');

            expect(appreciateContent).toContain('返回');
            expect(appreciateContent).toContain('index.html');
            expect(uploadContent).toContain('返回');
            expect(uploadContent).toContain('index.html');
        });

        it('should have responsive design styles', () => {
            const fs = require('fs');
            const path = require('path');
            const stylesPath = path.join(__dirname, 'styles.css');
            const content = fs.readFileSync(stylesPath, 'utf-8');

            expect(content).toContain('@media');
            expect(content).toContain('max-width');
        });
    });

    describe('Image Error Handling', () => {
        it('should hide images when they fail to load', () => {
            const fs = require('fs');
            const path = require('path');
            const appreciatePath = path.join(__dirname, 'appreciate.html');
            const content = fs.readFileSync(appreciatePath, 'utf-8');

            // Check that img.onerror is implemented
            expect(content).toContain('img.onerror');
            
            // Check that it hides the container on error
            expect(content).toContain("div.style.display = 'none'");
            
            // Ensure it doesn't show placeholder image anymore
            expect(content).not.toContain('data:image/svg+xml');
        });

        it('should log failed image URLs for debugging', () => {
            const fs = require('fs');
            const path = require('path');
            const appreciatePath = path.join(__dirname, 'appreciate.html');
            const content = fs.readFileSync(appreciatePath, 'utf-8');

            // Check that error logging is present
            expect(content).toContain('console.log');
            expect(content).toContain('图片加载失败');
        });
    });
});
