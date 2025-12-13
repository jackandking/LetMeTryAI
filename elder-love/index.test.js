/**
 * Tests for elder-love - 老人爱 (Elder Love) section
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('elder-love - 老人爱 Section', () => {
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

    it('should have simplified life section', () => {
      expect(htmlContent).toContain('精彩生活');
      expect(htmlContent).toContain('快乐每一天');
    });

    it('should have cooking feature link', () => {
      expect(htmlContent).toContain('爱做饭');
      expect(htmlContent).toContain('cooking/');
      expect(htmlContent).toContain('分享拿手好菜');
    });

    it('should have earning money feature link', () => {
      expect(htmlContent).toContain('爱赚钱');
      expect(htmlContent).toContain('earning-money/');
      expect(htmlContent).toContain('分享赚钱小技巧');
    });

    it('should have health warning section', () => {
      expect(htmlContent).toContain('健康提醒');
      expect(htmlContent).toContain('保健品');
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
    it('should have health warnings', () => {
      expect(htmlContent).toContain('健康提醒');
    });

    it('should warn about fake health products', () => {
      expect(htmlContent).toContain('保健品');
      expect(htmlContent).toContain('偏方');
    });

    it('should warn about phone scams', () => {
      expect(htmlContent).toContain('推销电话');
      expect(htmlContent).toContain('陌生链接');
    });
  });
});
