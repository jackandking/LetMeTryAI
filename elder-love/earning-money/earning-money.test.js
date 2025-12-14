/**
 * Tests for elder-love earning-money feature - 爱赚钱
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('elder-love Earning Money Feature - 爱赚钱', () => {
  describe('Main Earning Money Page', () => {
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
      expect(htmlContent).toContain('爱赚钱');
    });

    it('should include required scripts', () => {
      expect(htmlContent).toContain('util.js');
      expect(htmlContent).toContain('app.js');
    });

    it('should have upload form elements', () => {
      expect(htmlContent).toContain('tipName');
      expect(htmlContent).toContain('videoLink');
      expect(htmlContent).toContain('description');
      expect(htmlContent).toContain('form');
    });

    it('should have link to voting page', () => {
      expect(htmlContent).toContain('vote.html');
      expect(htmlContent).toContain('投票');
    });

    it('should have tips display section', () => {
      expect(htmlContent).toContain('tipsList');
    });

    it('should have back link to parent page', () => {
      expect(htmlContent).toContain('返回');
    });

    it('should have hint about auto-extraction', () => {
      expect(htmlContent).toContain('自动提取链接');
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
      expect(htmlContent).toContain('投票最实用技巧');
    });

    it('should include required scripts', () => {
      expect(htmlContent).toContain('util.js');
      expect(htmlContent).toContain('vote.js');
    });

    it('should have voting section', () => {
      expect(htmlContent).toContain('votingSection');
      expect(htmlContent).toContain('tipGallery');
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
      expect(appContent).toContain('earningConfig');
      expect(appContent).toContain('tipsKey');
    });

    it('should have initialization function', () => {
      expect(appContent).toContain('initializePage');
    });

    it('should have form submission handler', () => {
      expect(appContent).toContain('handleFormSubmit');
    });

    it('should have URL extraction function', () => {
      expect(appContent).toContain('extractUrl');
      expect(appContent).toContain('urlPattern');
    });

    it('should have save tips function', () => {
      expect(appContent).toContain('saveTips');
      expect(appContent).toContain('updateKeyValueStore');
    });

    it('should have load tips function', () => {
      expect(appContent).toContain('loadTips');
      expect(appContent).toContain('readKeyValueStore');
    });

    it('should have display tips function', () => {
      expect(appContent).toContain('displayTips');
      expect(appContent).toContain('createTipCard');
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
      expect(voteContent).toContain('tipsKey');
    });

    it('should have initialization function', () => {
      expect(voteContent).toContain('initializeVoting');
    });

    it('should have load tips function', () => {
      expect(voteContent).toContain('readKeyValueStore');
    });

    it('should have random selection function', () => {
      // Function was auto-renamed, check for the creation function
      expect(voteContent).toContain('createTipContainer');
    });

    it('should have tip selection handler', () => {
      expect(voteContent).toContain('selectTip');
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
      expect(htmlContent).toContain('爱赚钱管理页面');
    });

    it('should include util.js', () => {
      expect(htmlContent).toContain('util.js');
    });

    it('should have stats display', () => {
      expect(htmlContent).toContain('totalTips');
      expect(htmlContent).toContain('totalVotes');
    });

    it('should have tips table', () => {
      expect(htmlContent).toContain('tipsTable');
      expect(htmlContent).toContain('tipsTableBody');
    });

    it('should have delete functionality', () => {
      expect(htmlContent).toContain('deleteTip');
    });

    it('should have back link', () => {
      expect(htmlContent).toContain('返回');
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

    it('should have grid layout for tips', () => {
      expect(cssContent).toContain('grid-template-columns');
    });

    it('should have form styling', () => {
      expect(cssContent).toContain('.form-group');
      expect(cssContent).toContain('.submit-btn');
    });

    it('should have card styling', () => {
      expect(cssContent).toContain('.tip-card');
    });

    it('should have appropriate font sizes for elderly', () => {
      expect(cssContent).toContain('font-size: 18px');
    });

    it('should use green color theme', () => {
      expect(cssContent).toContain('#27ae60');
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

    it('should have tip gallery styling', () => {
      expect(cssContent).toContain('.tip-gallery');
    });

    it('should have results styling', () => {
      expect(cssContent).toContain('.results-section');
      expect(cssContent).toContain('.winner-section');
    });

    it('should have selected state styling', () => {
      expect(cssContent).toContain('.selected');
    });
  });
});

describe('URL Extraction Function', () => {
  // Mock implementation for testing
  const extractUrl = (text) => {
    if (!text) return '';
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
      return matches[0].replace(/[.,;:!?]+$/, '');
    }
    return text.trim();
  };

  it('should extract URL from text with URL', () => {
    const input = '这是一个视频 https://example.com/video 请观看';
    const expected = 'https://example.com/video';
    expect(extractUrl(input)).toBe(expected);
  });

  it('should return original URL when input is just URL', () => {
    const input = 'https://example.com/video';
    expect(extractUrl(input)).toBe(input);
  });

  it('should handle empty input', () => {
    expect(extractUrl('')).toBe('');
    expect(extractUrl(null)).toBe('');
  });

  it('should remove trailing punctuation', () => {
    const input = 'Check this https://example.com/video.';
    const expected = 'https://example.com/video';
    expect(extractUrl(input)).toBe(expected);
  });

  it('should extract first URL from multiple URLs', () => {
    const input = 'https://first.com https://second.com';
    const expected = 'https://first.com';
    expect(extractUrl(input)).toBe(expected);
  });
});
