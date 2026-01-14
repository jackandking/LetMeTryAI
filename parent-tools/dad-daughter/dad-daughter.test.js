// parent-tools/dad-daughter/dad-daughter.test.js - Tests for Dad-Daughter feature
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Dad-Daughter Feature', () => {
  let indexHtmlContent;
  let appJsContent;
  let voteHtmlContent;
  let voteJsContent;
  let adminHtmlContent;
  let stylesContent;
  let voteStylesContent;

  beforeAll(() => {
    indexHtmlContent = readFileSync(join(__dirname, 'index.html'), 'utf-8');
    appJsContent = readFileSync(join(__dirname, 'app.js'), 'utf-8');
    voteHtmlContent = readFileSync(join(__dirname, 'vote.html'), 'utf-8');
    voteJsContent = readFileSync(join(__dirname, 'vote.js'), 'utf-8');
    adminHtmlContent = readFileSync(join(__dirname, 'admin.html'), 'utf-8');
    stylesContent = readFileSync(join(__dirname, 'styles.css'), 'utf-8');
    voteStylesContent = readFileSync(join(__dirname, 'vote-styles.css'), 'utf-8');
  });

  describe('index.html', () => {
    it('should have correct page title', () => {
      expect(indexHtmlContent).toContain('爸爸带女儿玩什么 - 家长爱');
    });

    it('should have correct header content', () => {
      expect(indexHtmlContent).toContain('👨‍👧 爸爸带女儿玩什么');
      expect(indexHtmlContent).toContain('父女互动活动推荐');
      expect(indexHtmlContent).toContain('培养温柔、自信、独立的女孩');
    });

    it('should have activities list section', () => {
      expect(indexHtmlContent).toContain('🌸 大家的父女活动分享');
      expect(indexHtmlContent).toContain('id="activitiesList"');
    });

    it('should have form fields for activity submission', () => {
      expect(indexHtmlContent).toContain('id="activityName"');
      expect(indexHtmlContent).toContain('placeholder="例如：和女儿一起学烘焙"');
      expect(indexHtmlContent).toContain('id="videoLink"');
      expect(indexHtmlContent).toContain('id="description"');
    });

    it('should have vote section', () => {
      expect(indexHtmlContent).toContain('🗳️ 活动投票');
      expect(indexHtmlContent).toContain('href="vote.html"');
    });

    it('should include required scripts', () => {
      expect(indexHtmlContent).toContain('../../util.js');
      expect(indexHtmlContent).toContain('app.js');
      expect(indexHtmlContent).toContain('styles.css');
    });

    it('should have Baidu analytics', () => {
      expect(indexHtmlContent).toContain('hm.baidu.com/hm.js');
    });

    it('should have VConsole support', () => {
      expect(indexHtmlContent).toContain('vconsole');
      expect(indexHtmlContent).toContain("debug === 'true'");
    });
  });

  describe('app.js', () => {
    it('should have correct configuration', () => {
      expect(appJsContent).toContain('dadDaughterConfig');
      expect(appJsContent).toContain('"parent-tools-dad-daughter-activities"');
      expect(appJsContent).toContain('"parent-tools-dad-daughter-votes"');
    });

    it('should have activities variable', () => {
      expect(appJsContent).toContain('let activities = []');
    });

    it('should have all required functions', () => {
      expect(appJsContent).toContain('function extractUrl');
      expect(appJsContent).toContain('function initializePage');
      expect(appJsContent).toContain('function setupFormSubmission');
      expect(appJsContent).toContain('function handleFormSubmit');
      expect(appJsContent).toContain('function saveActivities');
      expect(appJsContent).toContain('function loadActivities');
      expect(appJsContent).toContain('function displayActivities');
      expect(appJsContent).toContain('function createActivityCard');
      expect(appJsContent).toContain('function getActivitiesForVoting');
    });

    it('should use correct element IDs', () => {
      expect(appJsContent).toContain("getElementById('activityName')");
      expect(appJsContent).toContain("getElementById('activitiesList')");
      expect(appJsContent).toContain("getElementById('uploadForm')");
    });

    it('should handle activity data correctly', () => {
      expect(appJsContent).toContain('id: `activity-');
      expect(appJsContent).toContain('name: activityName');
      expect(appJsContent).toContain('videoLink: videoLink');
      expect(appJsContent).toContain('description: description');
      expect(appJsContent).toContain('timestamp: Date.now()');
      expect(appJsContent).toContain('votes: 0');
    });
  });

  describe('vote.html', () => {
    it('should have correct page title', () => {
      expect(voteHtmlContent).toContain('投票 - 爸爸带女儿玩什么');
    });

    it('should have activity gallery', () => {
      expect(voteHtmlContent).toContain('id="activityGallery"');
    });

    it('should have results sections', () => {
      expect(voteHtmlContent).toContain('id="resultsContainer"');
      expect(voteHtmlContent).toContain('id="winnerSection"');
      expect(voteHtmlContent).toContain('🏆 最受欢迎活动');
    });

    it('should include required scripts', () => {
      expect(voteHtmlContent).toContain('../../util.js');
      expect(voteHtmlContent).toContain('vote.js');
      expect(voteHtmlContent).toContain('vote-styles.css');
    });

    it('should have back link', () => {
      expect(voteHtmlContent).toContain('← 返回爸爸带女儿玩什么主页');
    });
  });

  describe('vote.js', () => {
    it('should have correct configuration', () => {
      expect(voteJsContent).toContain('voteConfig');
      expect(voteJsContent).toContain('"parent-tools-dad-daughter-activities"');
      expect(voteJsContent).toContain('"parent-tools-dad-daughter-votes"');
      expect(voteJsContent).toContain('numberOfDishes: 5');
    });

    it('should have all required functions', () => {
      expect(voteJsContent).toContain('function initializeVoting');
      expect(voteJsContent).toContain('function loadActivitiesAndSetupVoting');
      expect(voteJsContent).toContain('function displayActivities');
      expect(voteJsContent).toContain('function selectActivity');
      expect(voteJsContent).toContain('function saveVote');
      expect(voteJsContent).toContain('function displayResults');
    });

    it('should use correct result page ID for ad navigation', () => {
      expect(voteJsContent).toContain('result_page_id=parent-tools/dad-daughter');
    });

    it('should handle activities data', () => {
      expect(voteJsContent).toContain('allActivities');
      expect(voteJsContent).toContain('selectedActivities');
      expect(voteJsContent).toContain('selectedActivityIndex');
    });
  });

  describe('admin.html', () => {
    it('should have correct page title', () => {
      expect(adminHtmlContent).toContain('爸爸带女儿玩什么 管理页面');
    });

    it('should have statistics section', () => {
      expect(adminHtmlContent).toContain('id="totalActivities"');
      expect(adminHtmlContent).toContain('id="totalVotes"');
    });

    it('should have activities table', () => {
      expect(adminHtmlContent).toContain('class="activities-table"');
      expect(adminHtmlContent).toContain('id="activitiesTableBody"');
    });

    it('should have delete functionality', () => {
      expect(adminHtmlContent).toContain('deleteActivity');
      expect(adminHtmlContent).toContain('class="delete-btn"');
    });

    it('should use correct configuration', () => {
      expect(adminHtmlContent).toContain('dadDaughterConfig');
      expect(adminHtmlContent).toContain('"parent-tools-dad-daughter-activities"');
    });
  });

  describe('styles.css', () => {
    it('should have pink-purple gradient theme', () => {
      expect(stylesContent).toContain('#f093fb');
      expect(stylesContent).toContain('#f5576c');
      expect(stylesContent).toContain('#e91e63');
      expect(stylesContent).toContain('#9c27b0');
    });

    it('should have responsive design', () => {
      expect(stylesContent).toContain('@media');
      expect(stylesContent).toContain('max-width: 768px');
    });

    it('should have all required classes', () => {
      expect(stylesContent).toContain('.container');
      expect(stylesContent).toContain('.section');
      expect(stylesContent).toContain('.upload-form');
      expect(stylesContent).toContain('.dish-card');
      expect(stylesContent).toContain('.vote-btn');
    });
  });

  describe('vote-styles.css', () => {
    it('should have pink-purple gradient theme', () => {
      expect(voteStylesContent).toContain('#f093fb');
      expect(voteStylesContent).toContain('#f5576c');
      expect(voteStylesContent).toContain('#e91e63');
    });

    it('should have voting-specific styles', () => {
      expect(voteStylesContent).toContain('.dish-gallery');
      expect(voteStylesContent).toContain('.dish-container');
      expect(voteStylesContent).toContain('.winner-section');
      expect(voteStylesContent).toContain('.result-item');
    });
  });

  describe('Integration with parent-tools', () => {
    it('should be accessible from parent-tools index', () => {
      const parentIndexPath = join(__dirname, '..', 'index.html');
      const parentIndexContent = readFileSync(parentIndexPath, 'utf-8');
      
      expect(parentIndexContent).toContain('爸爸带女儿玩什么');
      expect(parentIndexContent).toContain('父女互动');
      expect(parentIndexContent).toContain('href="dad-daughter/index.html"');
    });
  });
});
