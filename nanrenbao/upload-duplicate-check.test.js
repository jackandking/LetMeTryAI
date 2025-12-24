/**
 * Tests for duplicate image upload detection
 */

describe('Upload Duplicate Detection', () => {
  describe('Duplicate Check Query', () => {
    it('should check for existing image URL before upload', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('SELECT id FROM beauty_images WHERE image_url = ?');
    });

    it('should use parameterized query for duplicate check', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('params: [url]');
    });

    it('should use MYSQL_QUERY endpoint for checking', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('window.API_ENDPOINTS.MYSQL_QUERY');
    });
  });

  describe('Duplicate Detection Logic', () => {
    it('should check if existing images array has length > 0', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('existingImages.length > 0');
    });

    it('should show error message for duplicate image', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('该图片已存在');
      expect(content).toContain('请勿重复上传');
    });

    it('should return early if duplicate is found', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Check that after showing duplicate error, function returns
      const duplicateCheckSection = content.match(/if \(existingImages && existingImages\.length > 0\)[\s\S]*?return;/);
      expect(duplicateCheckSection).toBeTruthy();
    });
  });

  describe('Button State During Check', () => {
    it('should show "检查中..." while checking for duplicates', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('submitBtn.textContent = \'检查中...\'');
    });

    it('should re-enable button after duplicate detection', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // After duplicate error, button should be re-enabled
      const duplicateSection = content.match(/该图片已存在[\s\S]*?submitBtn\.disabled = false/);
      expect(duplicateSection).toBeTruthy();
    });

    it('should reset button text after duplicate detection', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      const duplicateSection = content.match(/该图片已存在[\s\S]*?submitBtn\.textContent = '提交上传'/);
      expect(duplicateSection).toBeTruthy();
    });
  });

  describe('Upload Flow After Duplicate Check', () => {
    it('should change button text to "上传中..." after duplicate check passes', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // After duplicate check passes, should show "上传中..."
      expect(content).toContain('submitBtn.textContent = \'上传中...\'');
    });

    it('should use INSERT query with parameters', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('INSERT INTO beauty_images (image_url, created_at) VALUES (?, ?)');
    });

    it('should check affectedRows for successful insert', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('result.affectedRows > 0');
    });
  });

  describe('Error Message Display', () => {
    it('should use warning emoji in duplicate message', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('⚠️');
    });

    it('should display error type message for duplicate', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Check that duplicate message is shown as error type
      const duplicateErrorCall = content.match(/showMessage\(['"]⚠️ 该图片已存在，请勿重复上传['"],\s*['"]error['"]\)/);
      expect(duplicateErrorCall).toBeTruthy();
    });
  });

  describe('Points Award Logic', () => {
    it('should only award points if upload is successful', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Points should be awarded after checking affectedRows > 0
      const pointsAwardSection = content.match(/if \(result\.affectedRows > 0\)[\s\S]*?PointsSystem\.awardUploadPoints\(\)/);
      expect(pointsAwardSection).toBeTruthy();
    });

    it('should not award points for duplicate uploads', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Duplicate check should return before reaching points award
      const flow = content.indexOf('该图片已存在');
      const pointsAward = content.indexOf('PointsSystem.awardUploadPoints()');
      
      expect(flow).toBeLessThan(pointsAward);
      expect(content).toContain('return;'); // Returns before points award
    });
  });

  describe('API Endpoint Usage', () => {
    it('should use MYSQL_QUERY instead of MYSQL_INSERT', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Should use MYSQL_QUERY for both check and insert
      const queryEndpoints = content.match(/window\.API_ENDPOINTS\.MYSQL_QUERY/g);
      expect(queryEndpoints).toBeTruthy();
      expect(queryEndpoints.length).toBeGreaterThanOrEqual(2);
    });

    it('should not use deprecated MYSQL_INSERT endpoint', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).not.toContain('API_ENDPOINTS.MYSQL_INSERT');
    });
  });

  describe('User Experience', () => {
    it('should provide clear feedback during each stage', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('检查中...');
      expect(content).toContain('上传中...');
      expect(content).toContain('提交上传');
    });

    it('should maintain button state consistency', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Button should be disabled during check and upload
      expect(content).toContain('submitBtn.disabled = true');
      
      // Button should be re-enabled in finally block
      expect(content).toContain('submitBtn.disabled = false');
    });
  });

  describe('Error Handling', () => {
    it('should handle check request errors', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      expect(content).toContain('try {');
      expect(content).toContain('catch (error)');
      expect(content).toContain('finally {');
    });

    it('should restore button state on error', () => {
      const fs = require('fs');
      const content = fs.readFileSync('./nanrenbao/upload.html', 'utf8');
      
      // Finally block should restore button
      const finallyBlock = content.match(/finally \{[\s\S]*?submitBtn\.disabled = false[\s\S]*?submitBtn\.textContent = '提交上传'[\s\S]*?\}/);
      expect(finallyBlock).toBeTruthy();
    });
  });
});
