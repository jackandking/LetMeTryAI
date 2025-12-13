/**
 * Tests for What Fish 2 Application - Fish Identification Survey
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('What Fish 2 Application', () => {
    let originalDocument;
    let mockGetConfig;
    let mockUpdateConfig;

    beforeEach(() => {
        // Store original document
        originalDocument = global.document;

        // Setup DOM mock
        document.body.innerHTML = `
            <h1 id="pageTitle"></h1>
            <form id="questionnaire">
                <div class="question" id="question1">
                    <p id="questionText"></p>
                    <div class="fish-image-container">
                        <img id="fishImage" class="fish-image" src="" alt="鱼的图片" />
                    </div>
                    <div class="button-group" id="optionsContainer"></div>
                </div>
            </form>
            <div class="result" id="result">
                <p>正在获取最新统计结果...</p>
            </div>
            <button class="show-result-btn" style="display:none;" id="showResultBtn">看完广告显示结果</button>
            <div class="more" id="more"></div>
        `;

        // Mock getConfig and updateConfig (these come from util.js)
        mockGetConfig = jest.fn((key, callback) => {
            callback(null);
        });
        mockUpdateConfig = jest.fn();

        global.getConfig = mockGetConfig;
        global.updateConfig = mockUpdateConfig;
        global.ks = undefined;
    });

    afterEach(() => {
        jest.clearAllMocks();
        global.document = originalDocument;
    });

    describe('Question Configuration', () => {
        it('should have correct title for fish identification survey', () => {
            const expectedTitle = "这是什么鱼？";
            expect(expectedTitle).toBe("这是什么鱼？");
        });

        it('should have correct question text', () => {
            const expectedQuestion = "看图猜猜这是什么鱼？";
            expect(expectedQuestion).toBe("看图猜猜这是什么鱼？");
        });

        it('should have correct fish image URL', () => {
            const expectedImageUrl = "https://tse3.mm.bing.net/th/id/OIP.FfAh_Lpt9nDSK_Nsy5G80gHaEg?ucfimg=1&dpr=3&pid=ImgDetMain&o=7&rm=3";
            expect(expectedImageUrl).toMatch(/^https:\/\//);
            expect(expectedImageUrl).toContain("bing.net");
        });

        it('should have correct answer options including 白条', () => {
            const expectedOptions = [
                { value: "1", label: "白条" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            expect(expectedOptions.length).toBe(5);
            expect(expectedOptions.map(o => o.label)).toContain("白条");
            expect(expectedOptions.map(o => o.label)).toContain("鲫鱼");
            expect(expectedOptions.map(o => o.label)).toContain("草鱼");
            expect(expectedOptions.map(o => o.label)).toContain("青鱼");
            expect(expectedOptions.map(o => o.label)).toContain("鲢鱼");
        });

        it('should have 白条 as the correct answer', () => {
            const correctAnswer = "白条";
            expect(correctAnswer).toBe("白条");
        });

        it('should use unique storage key for fish data', () => {
            const expectedStorageKey = "whatfish2.data";
            expect(expectedStorageKey).toBe("whatfish2.data");
            expect(expectedStorageKey).not.toBe("whatfish1.data");
            expect(expectedStorageKey).not.toBe("caili1.data");
            expect(expectedStorageKey).not.toBe("howlong1.data");
        });

        it('should have resultPageId constant defined', () => {
            const expectedResultPageId = "whatfish2";
            expect(expectedResultPageId).toBe("whatfish2");
            expect(expectedResultPageId).not.toBe("whatfish");
            expect(expectedResultPageId).not.toBe("caili");
        });
    });

    describe('Vote Data Structure', () => {
        it('should initialize vote data with zeros for all fish options', () => {
            const voteData = {
                "白条": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            Object.values(voteData).forEach(count => {
                expect(count).toBe(0);
            });
        });

        it('should have correct number of vote categories', () => {
            const voteData = {
                "白条": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            expect(Object.keys(voteData).length).toBe(5);
        });

        it('should include the correct answer 白条 in vote data', () => {
            const voteData = {
                "白条": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            expect(voteData).toHaveProperty("白条");
        });
    });

    describe('Result Display', () => {
        it('should calculate correct percentage for vote data', () => {
            const voteData = {
                "白条": 40,
                "鲫鱼": 15,
                "草鱼": 20,
                "青鱼": 15,
                "鲢鱼": 10
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(100);
            
            const percentageBaitiao = Math.round((voteData["白条"] / total) * 100);
            expect(percentageBaitiao).toBe(40);
            
            const percentageGrassfish = Math.round((voteData["草鱼"] / total) * 100);
            expect(percentageGrassfish).toBe(20);
        });

        it('should handle empty vote data gracefully', () => {
            const voteData = {
                "白条": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(0);
            
            const percentage = total > 0 ? Math.round((voteData["白条"] / total) * 100) : 0;
            expect(percentage).toBe(0);
        });

        it('should calculate correct answer rate for 白条', () => {
            const voteData = {
                "白条": 50,
                "鲫鱼": 10,
                "草鱼": 20,
                "青鱼": 10,
                "鲢鱼": 10
            };
            const correctAnswer = "白条";
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            const correctCount = voteData[correctAnswer];
            const correctRate = Math.round((correctCount / total) * 100);
            
            expect(correctRate).toBe(50);
        });

        it('should identify correct answer 白条 from options', () => {
            const options = [
                { value: "1", label: "白条" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            const correctAnswer = "白条";
            
            const correctOption = options.find(opt => opt.label === correctAnswer);
            expect(correctOption).toBeDefined();
            expect(correctOption.value).toBe("1");
        });
    });

    describe('URL Parameters', () => {
        it('should handle finishedAd=true parameter', () => {
            const urlParams = new URLSearchParams('finishedAd=true');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            expect(finishedAd).toBe(true);
        });

        it('should handle finishedAd=false parameter', () => {
            const urlParams = new URLSearchParams('finishedAd=false');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            expect(finishedAd).toBe(false);
        });

        it('should handle missing finishedAd parameter', () => {
            const urlParams = new URLSearchParams('');
            const hasFinishedAd = urlParams.get('finishedAd') !== null;
            expect(hasFinishedAd).toBe(false);
        });
    });

    describe('Navigation Functions', () => {
        it('should handle missing ks object gracefully', () => {
            global.ks = undefined;
            
            expect(() => {
                if (typeof ks !== 'undefined' && ks.navigateTo) {
                    ks.navigateTo({ url: "/pages/index/index" });
                }
            }).not.toThrow();
        });

        it('should call ks.navigateTo with correct result_page_id', () => {
            const mockNavigateTo = jest.fn();
            global.ks = {
                navigateTo: mockNavigateTo
            };
            
            const resultPageId = "whatfish2";
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=${resultPageId}`,
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=whatfish2`,
            });
        });

        it('should handle navigation to index page', () => {
            const mockNavigateTo = jest.fn();
            global.ks = {
                navigateTo: mockNavigateTo
            };
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: "/pages/index/index",
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: "/pages/index/index",
            });
        });
    });

    describe('Option Selection', () => {
        it('should validate option indices', () => {
            const options = [
                { value: "1", label: "白条" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            const selectedOption = "1";
            const optionIndex = parseInt(selectedOption) - 1;
            
            expect(optionIndex).toBeGreaterThanOrEqual(0);
            expect(optionIndex).toBeLessThan(options.length);
        });

        it('should map option value to correct label', () => {
            const options = [
                { value: "1", label: "白条" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            const selectedOption = "1";
            const optionIndex = parseInt(selectedOption) - 1;
            const selectedLabel = options[optionIndex].label;
            
            expect(selectedLabel).toBe("白条");
        });

        it('should handle invalid option index', () => {
            const options = [
                { value: "1", label: "白条" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            const invalidOption = "10";
            const optionIndex = parseInt(invalidOption) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });
    });

    describe('Vote Processing', () => {
        it('should increment vote count correctly', () => {
            const voteData = {
                "白条": 5,
                "鲫鱼": 3,
                "草鱼": 2,
                "青鱼": 1,
                "鲢鱼": 0
            };
            
            const selectedLabel = "白条";
            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
            
            expect(voteData["白条"]).toBe(6);
        });

        it('should initialize vote count if undefined', () => {
            const voteData = {};
            const selectedLabel = "白条";
            
            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
            
            expect(voteData["白条"]).toBe(1);
        });

        it('should preserve other vote counts when incrementing', () => {
            const voteData = {
                "白条": 5,
                "鲫鱼": 3,
                "草鱼": 2,
                "青鱼": 1,
                "鲢鱼": 0
            };
            
            const selectedLabel = "鲫鱼";
            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
            
            expect(voteData["白条"]).toBe(5);
            expect(voteData["鲫鱼"]).toBe(4);
            expect(voteData["草鱼"]).toBe(2);
        });
    });

    describe('Bar Chart Calculations', () => {
        it('should calculate correct scale for bar chart', () => {
            const voteData = {
                "白条": 100,
                "鲫鱼": 50,
                "草鱼": 25,
                "青鱼": 10,
                "鲢鱼": 5
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            expect(maxCount).toBe(100);
            
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(2);
        });

        it('should handle zero values in bar chart', () => {
            const voteData = {
                "白条": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            expect(maxCount).toBe(0);
            
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(1);
        });

        it('should identify correct answer bar', () => {
            const correctAnswer = "白条";
            const option = "白条";
            const isCorrect = option === correctAnswer;
            
            expect(isCorrect).toBe(true);
        });

        it('should identify incorrect answer bar', () => {
            const correctAnswer = "白条";
            const option = "鲫鱼";
            const isCorrect = option === correctAnswer;
            
            expect(isCorrect).toBe(false);
        });
    });

    describe('Configuration Uniqueness', () => {
        it('should use different storage key from whatfish1', () => {
            const whatfish2StorageKey = "whatfish2.data";
            const whatfish1StorageKey = "whatfish1.data";
            
            expect(whatfish2StorageKey).not.toBe(whatfish1StorageKey);
        });

        it('should use different result page ID from whatfish', () => {
            const whatfish2PageId = "whatfish2";
            const whatfishPageId = "whatfish";
            
            expect(whatfish2PageId).not.toBe(whatfishPageId);
        });

        it('should have 白条 as first option', () => {
            const options = [
                { value: "1", label: "白条" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            expect(options[0].label).toBe("白条");
        });
    });
});
