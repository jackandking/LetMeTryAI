/**
 * Tests for elder-love scams feature - 老人容易上哪些当
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('elder-love Scams Feature - 老人容易上哪些当', () => {
  describe('Main Scams Page', () => {
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
      expect(htmlContent).toContain('老人容易上哪些当');
    });

    it('should include required scripts', () => {
      expect(htmlContent).toContain('util.js');
      expect(htmlContent).toContain('app.js');
    });

    it('should have upload form elements', () => {
      expect(htmlContent).toContain('scamName');
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

    it('should have scams display section', () => {
      expect(htmlContent).toContain('scamsList');
    });

    it('should have back link to parent page', () => {
      expect(htmlContent).toContain('返回');
    });

    it('should have sections in correct order: scams, vote, upload', () => {
      // Find the positions of each section
      const scamsPosition = htmlContent.indexOf('class="section scams-section"');
      const votePosition = htmlContent.indexOf('class="section vote-section"');
      const uploadPosition = htmlContent.indexOf('class="section upload-section"');
      
      // Verify all sections exist
      expect(scamsPosition).toBeGreaterThan(-1);
      expect(votePosition).toBeGreaterThan(-1);
      expect(uploadPosition).toBeGreaterThan(-1);
      
      // Verify correct order: scams < vote < upload
      expect(scamsPosition).toBeLessThan(votePosition);
      expect(votePosition).toBeLessThan(uploadPosition);
    });

    it('should have warning/alert themed design', () => {
      expect(htmlContent).toContain('🚨');
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
      expect(htmlContent).toContain('投票最容易上当十大骗局');
    });

    it('should include required scripts', () => {
      expect(htmlContent).toContain('util.js');
      expect(htmlContent).toContain('vote.js');
    });

    it('should have voting section', () => {
      expect(htmlContent).toContain('votingSection');
      expect(htmlContent).toContain('scamGallery');
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
      expect(appContent).toContain('scamsConfig');
      expect(appContent).toContain('scamsKey');
    });

    it('should use unique storage key', () => {
      expect(appContent).toContain('elder-love-scams');
    });

    it('should have initialization function', () => {
      expect(appContent).toContain('initializePage');
    });

    it('should have form submission handler', () => {
      expect(appContent).toContain('handleFormSubmit');
    });

    it('should have save scams function', () => {
      expect(appContent).toContain('saveScams');
      expect(appContent).toContain('updateKeyValueStore');
    });

    it('should have load scams function', () => {
      expect(appContent).toContain('loadScams');
      expect(appContent).toContain('readKeyValueStore');
    });

    it('should have display scams function', () => {
      expect(appContent).toContain('displayScams');
      expect(appContent).toContain('createScamCard');
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
      expect(voteContent).toContain('numberOfScams');
    });

    it('should use unique storage key', () => {
      expect(voteContent).toContain('elder-love-scams');
    });

    it('should have initialization function', () => {
      expect(voteContent).toContain('initializeVoting');
    });

    it('should have load scams function', () => {
      expect(voteContent).toContain('loadScamsAndSetupVoting');
      expect(voteContent).toContain('readKeyValueStore');
    });

    it('should have random selection function', () => {
      expect(voteContent).toContain('getRandomScams');
    });

    it('should have scam selection handler', () => {
      expect(voteContent).toContain('selectScam');
    });

    it('should have ad display function', () => {
      expect(voteContent).toContain('showAd');
    });

    it('should use ks.navigateTo for Kuaishou ad display', () => {
      expect(voteContent).toContain('ks.navigateTo');
      expect(voteContent).toContain('/pages/showRewardedVideoAd/showRewardedVideoAd');
      expect(voteContent).toContain('result_page_id=elder-love/scams');
    });

    it('should not use deprecated ks.showAd API', () => {
      expect(voteContent).not.toContain('ks.showAd');
    });

    it('should check for finishedAd parameter for result display', () => {
      expect(voteContent).toContain("urlParams.get('finishedAd')");
      expect(voteContent).toContain("finishedAd === 'true'");
    });

    it('should support backward compatibility with showResults parameter', () => {
      expect(voteContent).toContain("urlParams.get('showResults')");
    });

    it('should have save vote function', () => {
      expect(voteContent).toContain('saveVote');
      expect(voteContent).toContain('updateKeyValueStore');
    });

    it('should have display results function', () => {
      expect(voteContent).toContain('displayResults');
      expect(voteContent).toContain('displayResultsList');
    });

    it('should check for 5 random scams', () => {
      expect(voteContent).toContain('numberOfScams: 5');
    });

    it('should display video links in voting options', () => {
      expect(voteContent).toContain('video-link-btn');
      expect(voteContent).toContain('查看案例');
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

    it('should have grid layout for scams', () => {
      expect(cssContent).toContain('grid-template-columns');
    });

    it('should have form styling', () => {
      expect(cssContent).toContain('.form-group');
      expect(cssContent).toContain('.submit-btn');
    });

    it('should have card styling', () => {
      expect(cssContent).toContain('.scam-card');
    });

    it('should have appropriate font sizes for elderly', () => {
      expect(cssContent).toContain('font-size: 18px');
    });

    it('should have warning color scheme', () => {
      expect(cssContent).toContain('#e74c3c');
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

    it('should have scam gallery styling', () => {
      expect(cssContent).toContain('.scam-gallery');
      expect(cssContent).toContain('.scam-container');
    });

    it('should have results styling', () => {
      expect(cssContent).toContain('.results-section');
      expect(cssContent).toContain('.winner-section');
    });

    it('should have selected state styling', () => {
      expect(cssContent).toContain('.selected');
    });

    it('should have video link button styling', () => {
      expect(cssContent).toContain('.video-link-btn');
    });
  });

  describe('Admin Page', () => {
    let htmlContent;

    beforeAll(() => {
      const htmlPath = join(__dirname, 'admin.html');
      htmlContent = readFileSync(htmlPath, 'utf-8');
    });

    it('should have valid HTML structure', () => {
      expect(htmlContent).toContain('<!DOCTYPE html>');
      expect(htmlContent).toContain('<html lang="zh-CN">');
    });

    it('should have proper title', () => {
      expect(htmlContent).toContain('骗局案例管理页面');
    });

    it('should have stats display', () => {
      expect(htmlContent).toContain('totalScams');
      expect(htmlContent).toContain('totalVotes');
    });

    it('should have table for scams', () => {
      expect(htmlContent).toContain('scamsTable');
      expect(htmlContent).toContain('scamsTableBody');
    });

    it('should have delete functionality', () => {
      expect(htmlContent).toContain('deleteScam');
    });
  });

  describe('Integration with Main Page', () => {
    let mainPageContent;

    beforeAll(() => {
      const mainPagePath = join(__dirname, '..', 'index.html');
      mainPageContent = readFileSync(mainPagePath, 'utf-8');
    });

    it('should have link to scams page in main elder-love page', () => {
      expect(mainPageContent).toContain('老人容易上哪些当');
      expect(mainPageContent).toContain('scams/');
    });

    it('should describe scams feature correctly', () => {
      expect(mainPageContent).toContain('分享常见骗局案例');
      expect(mainPageContent).toContain('投票最容易上当十大骗局');
    });
  });
});
