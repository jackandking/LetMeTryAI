// webview17/index.test.js - Tests for Parent's Love section
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Parent Love Section - webview17', () => {
  let htmlContent;

  beforeAll(() => {
    const htmlPath = join(__dirname, 'index.html');
    htmlContent = readFileSync(htmlPath, 'utf-8');
  });

  describe('HTML Structure', () => {
    it('should have proper HTML structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="zh-CN">');
      expect(htmlContent).toContain('</html>');
    });

    it('should have proper meta tags', () => {
      expect(htmlContent).toContain('<meta charset="UTF-8">');
      expect(htmlContent).toContain('<meta name="viewport"');
      expect(htmlContent).toContain('<meta name="baidu_union_verify"');
    });

    it('should have correct page title', () => {
      expect(htmlContent).toContain('<title>家长爱 - 周末带孩子好去处</title>');
    });

    it('should have favicon reference', () => {
      expect(htmlContent).toContain('/icons/favicon.ico');
    });
  });

  describe('Content Sections', () => {
    it('should have main header with title', () => {
      expect(htmlContent).toContain('家长爱');
      expect(htmlContent).toContain('周末带上小学男孩干什么好');
    });

    it('should have introduction section', () => {
      expect(htmlContent).toContain('为什么周末陪伴很重要');
      expect(htmlContent).toContain('父亲的陪伴对男孩的成长至关重要');
    });

    it('should have all activity categories', () => {
      const categories = [
        '户外运动',
        '科技探索',
        '文化艺术',
        '动手实践',
        '冒险探索',
        '益智游戏'
      ];

      categories.forEach(category => {
        expect(htmlContent).toContain(category);
      });
    });

    it('should have specific activity suggestions', () => {
      const activities = [
        '踢足球、打篮球',
        '科技馆、博物馆',
        '参观图书馆',
        '木工制作',
        '露营野炊',
        '下棋'
      ];

      activities.forEach(activity => {
        expect(htmlContent).toContain(activity);
      });
    });

    it('should have parenting tips section', () => {
      expect(htmlContent).toContain('爸爸们的陪伴小贴士');
      expect(htmlContent).toContain('放下手机，全心投入');
      expect(htmlContent).toContain('安全第一');
      expect(htmlContent).toContain('重在过程，不在结果');
    });

    it('should have age-appropriate activity suggestions', () => {
      expect(htmlContent).toContain('不同年龄段的活动建议');
      expect(htmlContent).toContain('一二年级（6-8岁）');
      expect(htmlContent).toContain('三四年级（8-10岁）');
      expect(htmlContent).toContain('五六年级（10-12岁）');
    });
  });

  describe('Styling', () => {
    it('should have embedded CSS styles', () => {
      expect(htmlContent).toContain('<style>');
      expect(htmlContent).toContain('</style>');
    });

    it('should have responsive design elements', () => {
      expect(htmlContent).toContain('@media');
      expect(htmlContent).toContain('max-width');
    });

    it('should have grid layout for activities', () => {
      expect(htmlContent).toContain('activities-grid');
      expect(htmlContent).toContain('activity-card');
    });
  });

  describe('Analytics', () => {
    it('should have Baidu analytics script', () => {
      expect(htmlContent).toContain('hm.baidu.com/hm.js');
      expect(htmlContent).toContain('_hmt');
    });
  });

  describe('Content Quality', () => {
    it('should have multiple activity suggestions per category', () => {
      const ulMatches = htmlContent.match(/<ul>/g);
      expect(ulMatches).toBeTruthy();
      expect(ulMatches.length).toBeGreaterThanOrEqual(6); // At least 6 categories
    });

    it('should have multiple tips for parents', () => {
      const tipMatches = htmlContent.match(/class="tip"/g);
      expect(tipMatches).toBeTruthy();
      expect(tipMatches.length).toBeGreaterThanOrEqual(5);
    });

    it('should have footer with copyright', () => {
      expect(htmlContent).toContain('&copy; 2025 人人爱');
    });
  });

  describe('Target Audience', () => {
    it('should be focused on fathers and elementary school boys', () => {
      expect(htmlContent).toContain('父亲');
      expect(htmlContent).toContain('爸爸');
      expect(htmlContent).toContain('小学');
      expect(htmlContent).toContain('男孩');
    });

    it('should have parent-child bonding emphasis', () => {
      expect(htmlContent).toContain('陪伴');
      expect(htmlContent).toContain('父子');
      expect(htmlContent).toContain('亲子');
    });
  });
});
