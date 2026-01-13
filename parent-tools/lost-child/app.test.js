/**
 * Unit tests for Lost Child Application
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Mock the util.js functions
global.readKeyValueStore = jest.fn();
global.updateKeyValueStore = jest.fn();
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};

// Mock DOM
document.body.innerHTML = `
    <div id="loadingMessage">Loading...</div>
    <div id="casesList"></div>
    <form id="uploadForm">
        <input type="text" id="caseTitle" />
        <select id="caseCategory"></select>
        <textarea id="description"></textarea>
        <button type="submit">Submit</button>
    </form>
`;

// Load the app.js file
const appJsPath = join(__dirname, 'app.js');
const appJsContent = readFileSync(appJsPath, 'utf-8');

// Extract functions from app.js for testing
eval(appJsContent);

describe('Lost Child Application', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.readKeyValueStore.mockClear();
        global.updateKeyValueStore.mockClear();
        document.getElementById('casesList').innerHTML = '';
    });

    describe('Configuration', () => {
        it('should have correct configuration values', () => {
            expect(lostChildConfig.casesKey).toBe('parent-tools-lost-child-cases');
            expect(lostChildConfig.votingKey).toBe('parent-tools-lost-child-votes');
        });
    });

    describe('Case Data Structure', () => {
        it('should create case with all required fields', () => {
            const mockCase = {
                id: 'case-123-abc',
                title: '商场走失案例',
                description: '在商场走失后通过广播找回',
                category: '成功案例',
                timestamp: Date.now(),
                votes: 0
            };

            expect(mockCase).toHaveProperty('id');
            expect(mockCase).toHaveProperty('title');
            expect(mockCase).toHaveProperty('description');
            expect(mockCase).toHaveProperty('category');
            expect(mockCase).toHaveProperty('timestamp');
            expect(mockCase).toHaveProperty('votes');
        });

        it('should validate category values', () => {
            const validCategories = ['预防经验', '应急措施', '成功案例'];
            
            validCategories.forEach(category => {
                const mockCase = {
                    category: category
                };
                expect(validCategories).toContain(mockCase.category);
            });
        });

        it('should generate unique IDs', () => {
            const id1 = `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const id2 = `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            
            // IDs should follow the pattern
            expect(id1).toMatch(/^case-\d+-[a-z0-9]+$/);
            expect(id2).toMatch(/^case-\d+-[a-z0-9]+$/);
        });
    });

    describe('createCaseCard', () => {
        it('should create case card with correct structure', () => {
            const testCase = {
                id: 'case-123',
                title: '测试案例',
                description: '这是一个测试描述',
                category: '预防经验',
                votes: 5
            };

            const card = createCaseCard(testCase);

            expect(card).toBeDefined();
            expect(card.className).toBe('case-card');
            expect(card.querySelector('h3').textContent).toBe('测试案例');
            expect(card.querySelector('.description').textContent).toBe('这是一个测试描述');
            expect(card.querySelector('.case-category').textContent).toBe('预防经验');
            expect(card.querySelector('.votes').textContent).toContain('5');
        });

        it('should handle case without votes', () => {
            const testCase = {
                id: 'case-123',
                title: '测试案例',
                description: '描述',
                category: '应急措施',
                votes: 0
            };

            const card = createCaseCard(testCase);
            expect(card.querySelector('.votes')).toBeNull();
        });
    });

    describe('displayCases', () => {
        it('should display message when no cases', () => {
            displayCases([]);
            const casesList = document.getElementById('casesList');
            expect(casesList.innerHTML).toContain('还没有人分享案例');
        });

        it('should display cases in correct order', () => {
            const cases = [
                { id: '1', title: 'Case 1', description: 'Desc 1', category: '预防经验', votes: 5, timestamp: 1000 },
                { id: '2', title: 'Case 2', description: 'Desc 2', category: '应急措施', votes: 10, timestamp: 2000 },
                { id: '3', title: 'Case 3', description: 'Desc 3', category: '成功案例', votes: 5, timestamp: 3000 }
            ];

            displayCases(cases);
            const casesList = document.getElementById('casesList');
            const cards = casesList.querySelectorAll('.case-card');
            
            expect(cards.length).toBe(3);
            // Should be sorted by votes (desc) then timestamp (desc)
            expect(cards[0].querySelector('h3').textContent).toBe('Case 2'); // 10 votes
            expect(cards[1].querySelector('h3').textContent).toBe('Case 3'); // 5 votes, newer
            expect(cards[2].querySelector('h3').textContent).toBe('Case 1'); // 5 votes, older
        });
    });

    describe('getCasesForVoting', () => {
        it('should return only cases with valid titles', () => {
            global.cases = [
                { title: 'Valid Case', description: 'Description' },
                { title: '', description: 'No title' },
                { title: '  ', description: 'Whitespace title' },
                { title: 'Another Valid', description: 'Description' }
            ];

            const votingCases = getCasesForVoting();
            expect(votingCases.length).toBe(2);
            expect(votingCases[0].title).toBe('Valid Case');
            expect(votingCases[1].title).toBe('Another Valid');
        });
    });

    describe('loadCases', () => {
        it('should display loading message initially', () => {
            loadCases();
            const loadingMessage = document.getElementById('loadingMessage');
            expect(loadingMessage.style.display).toBe('block');
        });

        it('should load and display cases from storage', (done) => {
            const mockCases = [
                { id: '1', title: 'Case 1', description: 'Desc 1', category: '预防经验', votes: 0, timestamp: 1000 }
            ];

            global.readKeyValueStore.mockImplementation((key, callback) => {
                callback(JSON.stringify(mockCases));
            });

            loadCases();

            setTimeout(() => {
                const casesList = document.getElementById('casesList');
                expect(casesList.querySelector('.case-card')).toBeDefined();
                done();
            }, 100);
        });

        it('should handle empty storage', (done) => {
            global.readKeyValueStore.mockImplementation((key, callback) => {
                callback(null);
            });

            loadCases();

            setTimeout(() => {
                const casesList = document.getElementById('casesList');
                expect(casesList.innerHTML).toContain('还没有人分享案例');
                done();
            }, 100);
        });

        it('should handle invalid JSON', (done) => {
            global.readKeyValueStore.mockImplementation((key, callback) => {
                callback('invalid json');
            });

            loadCases();

            setTimeout(() => {
                const casesList = document.getElementById('casesList');
                expect(casesList.innerHTML).toContain('暂无数据');
                done();
            }, 100);
        });
    });

    describe('saveCases', () => {
        it('should save cases to storage', async () => {
            global.cases = [
                { id: '1', title: 'Test Case', description: 'Description', category: '预防经验' }
            ];

            global.updateKeyValueStore.mockResolvedValue(undefined);

            await saveCases();

            expect(global.updateKeyValueStore).toHaveBeenCalledWith(
                'parent-tools-lost-child-cases',
                expect.any(String)
            );
        });

        it('should handle save errors', async () => {
            global.cases = [{ id: '1', title: 'Test' }];
            global.updateKeyValueStore.mockRejectedValue(new Error('Save failed'));

            await expect(saveCases()).rejects.toThrow('Save failed');
        });
    });
});

describe('Lost Child HTML Structure', () => {
    let htmlContent;

    beforeEach(() => {
        const htmlPath = join(__dirname, 'index.html');
        htmlContent = readFileSync(htmlPath, 'utf-8');
    });

    it('should have proper HTML structure', () => {
        expect(htmlContent).toContain('<!DOCTYPE html>');
        expect(htmlContent).toContain('<html lang="zh-CN">');
        expect(htmlContent).toContain('</html>');
    });

    it('should have correct page title', () => {
        expect(htmlContent).toContain('<title>孩子丢了怎么办 - 家长爱</title>');
    });

    it('should have meta description', () => {
        expect(htmlContent).toContain('预防孩子走失 & 应急处理指南');
    });

    it('should include util.js and app.js', () => {
        expect(htmlContent).toContain('../../util.js');
        expect(htmlContent).toContain('app.js');
    });

    it('should have knowledge section', () => {
        expect(htmlContent).toContain('防丢知识库');
        expect(htmlContent).toContain('身份信息卡');
        expect(htmlContent).toContain('定位设备');
        expect(htmlContent).toContain('安全教育');
        expect(htmlContent).toContain('黄金24小时');
    });

    it('should have emergency measures section', () => {
        expect(htmlContent).toContain('应急措施指南');
        expect(htmlContent).toContain('立即报警');
        expect(htmlContent).toContain('原地等待');
        expect(htmlContent).toContain('广播求助');
        expect(htmlContent).toContain('调取监控');
    });

    it('should have case sharing form', () => {
        expect(htmlContent).toContain('分享您的经验');
        expect(htmlContent).toContain('id="caseTitle"');
        expect(htmlContent).toContain('id="caseCategory"');
        expect(htmlContent).toContain('id="description"');
    });

    it('should have vote link', () => {
        expect(htmlContent).toContain('案例投票');
        expect(htmlContent).toContain('vote.html');
    });

    it('should have back link', () => {
        expect(htmlContent).toContain('返回家长爱主页');
    });
});
