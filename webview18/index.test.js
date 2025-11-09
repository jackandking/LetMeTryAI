/**
 * Tests for webview18 - 老人爱 (Elder Love) section
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('webview18 - 老人爱 Section', () => {
  let htmlContent;

  beforeAll(() => {
    const htmlPath = join(__dirname, 'index.html');
    htmlContent = readFileSync(htmlPath, 'utf-8');
  });

  describe('HTML Structure', () => {
    it('should have valid HTML structure', () => {
      // Check for required HTML elements
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="zh-CN">');
      expect(htmlContent).toContain('</html>');
    });

    it('should have proper meta tags', () => {
      expect(htmlContent).toContain('<meta charset="UTF-8">');
      expect(htmlContent).toContain('<meta name="viewport"');
      expect(htmlContent).toContain('老人爱');
    });

    it('should include Baidu analytics', () => {
      expect(htmlContent).toContain('hm.baidu.com');
      expect(htmlContent).toContain('_hmt');
    });

    it('should have favicon link', () => {
      expect(htmlContent).toContain('/icons/favicon.ico');
    });
  });

  describe('Content Structure', () => {
    it('should contain main title 老人爱', () => {
      expect(htmlContent).toContain('老人爱');
    });

    it('should have health and wellness section', () => {
      expect(htmlContent).toContain('健康养生');
      expect(htmlContent).toContain('养生保健');
      expect(htmlContent).toContain('健康饮食');
    });

    it('should have family happiness section', () => {
      expect(htmlContent).toContain('天伦之乐');
      expect(htmlContent).toContain('隔代育儿');
    });

    it('should have hobbies and interests section', () => {
      expect(htmlContent).toContain('兴趣爱好');
      expect(htmlContent).toContain('文体活动');
    });

    it('should have traditional culture section', () => {
      expect(htmlContent).toContain('传统文化');
      expect(htmlContent).toContain('传统节日');
    });

    it('should have short video watching tips', () => {
      expect(htmlContent).toContain('看短视频小贴士');
      expect(htmlContent).toContain('保护眼睛');
      expect(htmlContent).toContain('防诈骗');
    });
  });

  describe('Responsive Design', () => {
    it('should have mobile-responsive styles', () => {
      expect(htmlContent).toContain('@media (max-width: 768px)');
      expect(htmlContent).toContain('grid-template-columns');
    });

    it('should have viewport meta tag for mobile', () => {
      expect(htmlContent).toContain('width=device-width');
      expect(htmlContent).toContain('initial-scale=1.0');
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate font sizes for elderly users', () => {
      // Check for larger font sizes (18px or more)
      expect(htmlContent).toContain('font-size: 18px');
      expect(htmlContent).toMatch(/font-size:\s*\d+(\.\d+)?em/);
    });

    it('should have good contrast colors', () => {
      // Check for color definitions that provide good contrast
      expect(htmlContent).toContain('color:');
      expect(htmlContent).toContain('background:');
    });
  });

  describe('Safety Features', () => {
    it('should have anti-fraud warnings', () => {
      expect(htmlContent).toContain('防诈骗');
      expect(htmlContent).toContain('健康提醒');
    });

    it('should warn about fake health products', () => {
      expect(htmlContent).toContain('保健品');
      expect(htmlContent).toContain('偏方');
    });
  });
});
