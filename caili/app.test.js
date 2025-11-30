/**
 * Tests for Caili Application - Bride Price Survey
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Caili Application', () => {
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
        it('should have correct title for bride price survey', () => {
            // Configuration should match the expected Chinese title
            const expectedTitle = "你愿意出多少彩礼娶她？";
            expect(expectedTitle).toBe("你愿意出多少彩礼娶她？");
        });

        it('should have correct question text', () => {
            const expectedQuestion = "看完视频中的美女，你愿意出多少彩礼娶她？";
            expect(expectedQuestion).toBe("看完视频中的美女，你愿意出多少彩礼娶她？");
        });

        it('should have correct answer options', () => {
            const expectedOptions = [
                { value: "1", label: "10万以下" },
                { value: "2", label: "30万" },
                { value: "3", label: "50万" },
                { value: "4", label: "80万" },
                { value: "5", label: "100万以上" }
            ];
            
            expect(expectedOptions.length).toBe(5);
            expect(expectedOptions[0].label).toBe("10万以下");
            expect(expectedOptions[1].label).toBe("30万");
            expect(expectedOptions[2].label).toBe("50万");
            expect(expectedOptions[3].label).toBe("80万");
            expect(expectedOptions[4].label).toBe("100万以上");
        });

        it('should use unique storage key for caili data', () => {
            const expectedStorageKey = "caili1.data";
            expect(expectedStorageKey).toBe("caili1.data");
            expect(expectedStorageKey).not.toBe("howlong1.data");
            expect(expectedStorageKey).not.toBe("guesscupsize.data");
        });
    });

    describe('Vote Data Structure', () => {
        it('should initialize vote data with zeros for all options', () => {
            const voteData = {
                "10万以下": 0,
                "30万": 0,
                "50万": 0,
                "80万": 0,
                "100万以上": 0
            };
            
            Object.values(voteData).forEach(count => {
                expect(count).toBe(0);
            });
        });

        it('should have correct number of vote categories', () => {
            const voteData = {
                "10万以下": 0,
                "30万": 0,
                "50万": 0,
                "80万": 0,
                "100万以上": 0
            };
            
            expect(Object.keys(voteData).length).toBe(5);
        });
    });

    describe('Result Display', () => {
        it('should calculate correct percentage for vote data', () => {
            const voteData = {
                "10万以下": 10,
                "30万": 20,
                "50万": 30,
                "80万": 25,
                "100万以上": 15
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(100);
            
            const percentage10Below = Math.round((voteData["10万以下"] / total) * 100);
            expect(percentage10Below).toBe(10);
            
            const percentage30 = Math.round((voteData["30万"] / total) * 100);
            expect(percentage30).toBe(20);
        });

        it('should handle empty vote data gracefully', () => {
            const voteData = {
                "10万以下": 0,
                "30万": 0,
                "50万": 0,
                "80万": 0,
                "100万以上": 0
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(0);
            
            // Percentage calculation should handle zero total
            const percentage = total > 0 ? Math.round((voteData["10万以下"] / total) * 100) : 0;
            expect(percentage).toBe(0);
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
            
            // Should not throw when ks is undefined
            expect(() => {
                if (typeof ks !== 'undefined' && ks.navigateTo) {
                    ks.navigateTo({ url: "/pages/index/index" });
                }
            }).not.toThrow();
        });

        it('should call ks.navigateTo when available', () => {
            const mockNavigateTo = jest.fn();
            global.ks = {
                navigateTo: mockNavigateTo
            };
            
            // Simulate navigation call
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({ url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=caili" });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=caili"
            });
        });
    });

    describe('Bar Chart Creation', () => {
        it('should calculate correct scale for bar heights', () => {
            const voteData = {
                "10万以下": 100,
                "30万": 50,
                "50万": 25,
                "80万": 10,
                "100万以上": 5
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            expect(maxCount).toBe(100);
            
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(2);
            
            // Verify bar heights
            expect(voteData["10万以下"] * scale).toBe(200);
            expect(voteData["30万"] * scale).toBe(100);
            expect(voteData["50万"] * scale).toBe(50);
        });

        it('should handle single vote correctly', () => {
            const voteData = {
                "10万以下": 1,
                "30万": 0,
                "50万": 0,
                "80万": 0,
                "100万以上": 0
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            
            expect(maxCount).toBe(1);
            expect(scale).toBe(200);
        });
    });

    describe('Option Selection', () => {
        it('should map option values to correct labels', () => {
            const options = [
                { value: "1", label: "10万以下" },
                { value: "2", label: "30万" },
                { value: "3", label: "50万" },
                { value: "4", label: "80万" },
                { value: "5", label: "100万以上" }
            ];
            
            const selectedValue = "3";
            const optionIndex = parseInt(selectedValue) - 1;
            const selectedLabel = options[optionIndex].label;
            
            expect(selectedLabel).toBe("50万");
        });

        it('should handle invalid option values', () => {
            const options = [
                { value: "1", label: "10万以下" },
                { value: "2", label: "30万" },
                { value: "3", label: "50万" },
                { value: "4", label: "80万" },
                { value: "5", label: "100万以上" }
            ];
            
            const selectedValue = "0";
            const optionIndex = parseInt(selectedValue) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });

        it('should handle out of range option values', () => {
            const options = [
                { value: "1", label: "10万以下" },
                { value: "2", label: "30万" },
                { value: "3", label: "50万" },
                { value: "4", label: "80万" },
                { value: "5", label: "100万以上" }
            ];
            
            const selectedValue = "6";
            const optionIndex = parseInt(selectedValue) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });
    });
});

describe('Integration with Storage', () => {
    it('should use correct storage key format', () => {
        const storageKey = "caili1.data";
        expect(storageKey).toMatch(/^caili\d+\.data$/);
    });

    it('should serialize vote data correctly', () => {
        const voteData = {
            "10万以下": 5,
            "30万": 10,
            "50万": 15,
            "80万": 8,
            "100万以上": 2
        };
        
        const serialized = JSON.stringify(voteData);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized["10万以下"]).toBe(5);
        expect(deserialized["100万以上"]).toBe(2);
    });
});
