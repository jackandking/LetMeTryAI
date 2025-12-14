/**
 * Tests for elder-love cooking feature - 爱做饭
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('elder-love Cooking Feature - 爱做饭', () => {
  describe('Main Cooking Page', () => {
    let htmlContent;

    beforeAll(() => {
      const htmlPath = join(__dirname, 'index.html');
      htmlContent = readFileSync(htmlPath, 'utf-8');
    });

    it('should have valid HTML structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="zh-CN">');
      expect(htmlContent).toContain('</html>');
    });

    it('should have proper title', () => {
      expect(htmlContent).toContain('爱做饭');
    });

    it('should include required scripts', () => {
      expect(htmlContent).toContain('util.js');
      expect(htmlContent).toContain('app.js');
    });

    it('should have upload form elements', () => {
      expect(htmlContent).toContain('dishName');
      expect(htmlContent).toContain('videoLink');
      expect(htmlContent).toContain('description');
      expect(htmlContent).toContain('form');
    });

    it('should have hint about auto-extraction', () => {
      expect(htmlContent).toContain('自动提取链接');
    });

    it('should have link to voting page', () => {
      expect(htmlContent).toContain('vote.html');
      expect(htmlContent).toContain('投票');
    });

    it('should have dishes display section', () => {
      expect(htmlContent).toContain('dishesList');
    });

    it('should have back link to parent page', () => {
      expect(htmlContent).toContain('返回');
    });
  });

  describe('Voting Page', () => {
    let htmlContent;

    beforeAll(() => {
      const htmlPath = join(__dirname, 'vote.html');
      htmlContent = readFileSync(htmlPath, 'utf-8');
    });

    it('should have valid HTML structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="zh-CN">');
    });

    it('should have proper title', () => {
      expect(htmlContent).toContain('投票十大家常菜');
    });

    it('should include required scripts', () => {
      expect(htmlContent).toContain('util.js');
      expect(htmlContent).toContain('vote.js');
    });

    it('should have voting section', () => {
      expect(htmlContent).toContain('votingSection');
      expect(htmlContent).toContain('dishGallery');
    });

    it('should have show results button', () => {
      expect(htmlContent).toContain('showResultBtn');
      expect(htmlContent).toContain('看完广告显示结果');
    });

    it('should have results section', () => {
      expect(htmlContent).toContain('resultsContainer');
      expect(htmlContent).toContain('winnerSection');
      expect(htmlContent).toContain('resultsSection');
    });

    it('should have retry button', () => {
      expect(htmlContent).toContain('retryVote');
      expect(htmlContent).toContain('再来一次');
    });
  });

  describe('Application JavaScript', () => {
    let appContent;

    beforeAll(() => {
      const jsPath = join(__dirname, 'app.js');
      appContent = readFileSync(jsPath, 'utf-8');
    });

    it('should have configuration object', () => {
      expect(appContent).toContain('cookingConfig');
      expect(appContent).toContain('dishesKey');
    });

    it('should have initialization function', () => {
      expect(appContent).toContain('initializePage');
    });

    it('should have form submission handler', () => {
      expect(appContent).toContain('handleFormSubmit');
    });

    it('should have save dishes function', () => {
      expect(appContent).toContain('saveDishes');
      expect(appContent).toContain('updateKeyValueStore');
    });

    it('should have load dishes function', () => {
      expect(appContent).toContain('loadDishes');
      expect(appContent).toContain('readKeyValueStore');
    });

    it('should have display dishes function', () => {
      expect(appContent).toContain('displayDishes');
      expect(appContent).toContain('createDishCard');
    });

    it('should have URL extraction function', () => {
      expect(appContent).toContain('extractUrl');
      expect(appContent).toContain('urlPattern');
    });

    it('should export extractUrl function', () => {
      expect(appContent).toContain('window.extractUrl');
    });
  });

  describe('Voting JavaScript', () => {
    let voteContent;

    beforeAll(() => {
      const jsPath = join(__dirname, 'vote.js');
      voteContent = readFileSync(jsPath, 'utf-8');
    });

    it('should have configuration object', () => {
      expect(voteContent).toContain('voteConfig');
      expect(voteContent).toContain('numberOfDishes');
    });

    it('should have initialization function', () => {
      expect(voteContent).toContain('initializeVoting');
    });

    it('should have load dishes function', () => {
      expect(voteContent).toContain('loadDishesAndSetupVoting');
      expect(voteContent).toContain('readKeyValueStore');
    });

    it('should have random selection function', () => {
      expect(voteContent).toContain('getRandomDishes');
    });

    it('should have dish selection handler', () => {
      expect(voteContent).toContain('selectDish');
    });

    it('should have ad display function', () => {
      expect(voteContent).toContain('showAd');
    });

    it('should have save vote function', () => {
      expect(voteContent).toContain('saveVote');
      expect(voteContent).toContain('updateKeyValueStore');
    });

    it('should have display results function', () => {
      expect(voteContent).toContain('displayResults');
      expect(voteContent).toContain('displayResultsList');
    });

    it('should check for 5 random dishes', () => {
      expect(voteContent).toContain('numberOfDishes: 5');
    });
  });

  describe('CSS Styling', () => {
    let cssContent;

    beforeAll(() => {
      const cssPath = join(__dirname, 'styles.css');
      cssContent = readFileSync(cssPath, 'utf-8');
    });

    it('should have responsive design', () => {
      expect(cssContent).toContain('@media (max-width: 768px)');
    });

    it('should have grid layout for dishes', () => {
      expect(cssContent).toContain('grid-template-columns');
    });

    it('should have form styling', () => {
      expect(cssContent).toContain('.form-group');
      expect(cssContent).toContain('.submit-btn');
    });

    it('should have card styling', () => {
      expect(cssContent).toContain('.dish-card');
    });

    it('should have appropriate font sizes for elderly', () => {
      expect(cssContent).toContain('font-size: 18px');
    });
  });

  describe('Voting CSS Styling', () => {
    let cssContent;

    beforeAll(() => {
      const cssPath = join(__dirname, 'vote-styles.css');
      cssContent = readFileSync(cssPath, 'utf-8');
    });

    it('should have responsive design', () => {
      expect(cssContent).toContain('@media (max-width: 768px)');
    });

    it('should have dish gallery styling', () => {
      expect(cssContent).toContain('.dish-gallery');
      expect(cssContent).toContain('.dish-container');
    });

    it('should have results styling', () => {
      expect(cssContent).toContain('.results-section');
      expect(cssContent).toContain('.winner-section');
    });

    it('should have selected state styling', () => {
      expect(cssContent).toContain('.selected');
    });
  });

  describe('Integration with Main Page', () => {
    let mainPageContent;

    beforeAll(() => {
      const mainPagePath = join(__dirname, '..', 'index.html');
      mainPageContent = readFileSync(mainPagePath, 'utf-8');
    });

    it('should have link to cooking page in main elder-love page', () => {
      expect(mainPageContent).toContain('爱做饭');
      expect(mainPageContent).toContain('cooking/');
    });

    it('should have cooking image in main page', () => {
      expect(mainPageContent).toContain('https://pic.rmb.bdstatic.com/bjh/240916/dump/3388441280b82fdb67e23700b0d3d21f.jpeg');
    });
    
    it('should have link to earning-money page in main elder-love page', () => {
      expect(mainPageContent).toContain('爱赚钱');
      expect(mainPageContent).toContain('earning-money/');
    });
  });
});
