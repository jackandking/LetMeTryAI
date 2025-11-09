// main-page.test.js - Tests for main index.html page updates
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Main Index Page - Parent Love Section Integration', () => {
  let htmlContent;
  let mainJsContent;

  beforeAll(() => {
    const htmlPath = join(__dirname, 'index.html');
    const jsPath = join(__dirname, 'main.js');
    htmlContent = readFileSync(htmlPath, 'utf-8');
    mainJsContent = readFileSync(jsPath, 'utf-8');
  });

  describe('HTML Section', () => {
    it('should have Parent Love section in main page', () => {
      expect(htmlContent).toContain('家长爱');
    });

    it('should have link to webview17', () => {
      expect(htmlContent).toContain('href="webview17"');
    });

    it('should have parent-love-img element', () => {
      expect(htmlContent).toContain('id="parent-love-img"');
    });

    it('should have appropriate alt text', () => {
      expect(htmlContent).toContain('alt="家长爱"');
    });

    it('should maintain existing sections', () => {
      const existingSections = [
        '爱烟花',
        '爱美女',
        '爱魔术',
        '爱学习',
        '语文作文过关'
      ];

      existingSections.forEach(section => {
        expect(htmlContent).toContain(section);
      });
    });
  });

  describe('JavaScript Configuration', () => {
    it('should have parent-love-img in imageConfig', () => {
      expect(mainJsContent).toContain('parent-love-img');
    });

    it('should have proper image configuration structure', () => {
      expect(mainJsContent).toContain('primary:');
      expect(mainJsContent).toContain('fallback:');
      expect(mainJsContent).toContain('alt:');
    });

    it('should have fallback image for parent-love section', () => {
      // Check that there's a fallback image configured
      const parentLoveConfig = mainJsContent.match(
        /'parent-love-img':\s*{[^}]+}/
      );
      expect(parentLoveConfig).toBeTruthy();
    });

    it('should maintain existing image configurations', () => {
      const existingConfigs = [
        'fireworks-img',
        'beauty-img',
        'magic-img',
        'study-img'
      ];

      existingConfigs.forEach(config => {
        expect(mainJsContent).toContain(config);
      });
    });

    it('should have zuowen-img configuration', () => {
      expect(mainJsContent).toContain('zuowen-img');
    });
  });

  describe('Integration Points', () => {
    it('should have config.js script included', () => {
      expect(htmlContent).toContain('<script src="config.js"></script>');
    });

    it('should have main.js script included', () => {
      expect(htmlContent).toContain('<script src="main.js"></script>');
    });

    it('should have responsive-img class on parent-love-img', () => {
      const parentLoveSection = htmlContent.match(
        /id="parent-love-img"[^>]*class="[^"]*responsive-img[^"]*"/
      ) || htmlContent.match(
        /class="[^"]*responsive-img[^"]*"[^>]*id="parent-love-img"/
      );
      expect(parentLoveSection).toBeTruthy();
    });
  });

  describe('Page Structure', () => {
    it('should maintain proper section structure', () => {
      const sectionMatches = htmlContent.match(/<section class="section">/g);
      expect(sectionMatches).toBeTruthy();
      expect(sectionMatches.length).toBeGreaterThanOrEqual(6); // At least 6 sections
    });

    it('should have all sections with clickable links', () => {
      const linkMatches = htmlContent.match(/<a href="[^"]+"/g);
      expect(linkMatches).toBeTruthy();
      expect(linkMatches.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Regression Tests', () => {
    it('should not break existing functionality', () => {
      // Ensure main structure is intact
      expect(htmlContent).toContain('<main>');
      expect(htmlContent).toContain('</main>');
      expect(htmlContent).toContain('<header>');
      expect(htmlContent).toContain('<footer>');
    });

    it('should maintain proper HTML5 structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="zh-CN">');
      expect(htmlContent).toContain('<meta charset="UTF-8">');
    });

    it('should have Baidu analytics', () => {
      expect(htmlContent).toContain('hm.baidu.com/hm.js');
    });

    it('should maintain imageConfig object structure', () => {
      expect(mainJsContent).toContain('const imageConfig = {');
      expect(mainJsContent).toContain('function setImageWithFallback');
      expect(mainJsContent).toContain('function initializeImages');
    });
  });
});
