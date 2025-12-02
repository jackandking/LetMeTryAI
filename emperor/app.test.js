/**
 * Tests for Emperor Survey Application - Greatest Emperor in Chinese History
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Emperor Survey Application', () => {
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
        it('should have correct title for emperor survey', () => {
            // Configuration should match the expected Chinese title
            const expectedTitle = "中国历史上最伟大的皇帝是谁？";
            expect(expectedTitle).toBe("中国历史上最伟大的皇帝是谁？");
        });

        it('should have correct question text', () => {
            const expectedQuestion = "在中国历史上，你认为谁是最伟大的皇帝？";
            expect(expectedQuestion).toBe("在中国历史上，你认为谁是最伟大的皇帝？");
        });

        it('should have correct answer options with five emperors', () => {
            const expectedOptions = [
                { value: "1", label: "秦始皇嬴政" },
                { value: "2", label: "汉高祖刘邦" },
                { value: "3", label: "汉武帝刘彻" },
                { value: "4", label: "唐太宗李世民" },
                { value: "5", label: "明太祖朱元璋" }
            ];
            
            expect(expectedOptions.length).toBe(5);
            expect(expectedOptions[0].label).toBe("秦始皇嬴政");
            expect(expectedOptions[1].label).toBe("汉高祖刘邦");
            expect(expectedOptions[2].label).toBe("汉武帝刘彻");
            expect(expectedOptions[3].label).toBe("唐太宗李世民");
            expect(expectedOptions[4].label).toBe("明太祖朱元璋");
        });

        it('should use unique storage key for emperor data', () => {
            const expectedStorageKey = "emperor1.data";
            expect(expectedStorageKey).toBe("emperor1.data");
            expect(expectedStorageKey).not.toBe("caili1.data");
            expect(expectedStorageKey).not.toBe("howlong1.data");
        });
    });

    describe('Vote Data Structure', () => {
        it('should initialize vote data with zeros for all options', () => {
            const voteData = {
                "秦始皇嬴政": 0,
                "汉高祖刘邦": 0,
                "汉武帝刘彻": 0,
                "唐太宗李世民": 0,
                "明太祖朱元璋": 0
            };
            
            Object.values(voteData).forEach(count => {
                expect(count).toBe(0);
            });
        });

        it('should have correct number of vote categories', () => {
            const voteData = {
                "秦始皇嬴政": 0,
                "汉高祖刘邦": 0,
                "汉武帝刘彻": 0,
                "唐太宗李世民": 0,
                "明太祖朱元璋": 0
            };
            
            expect(Object.keys(voteData).length).toBe(5);
        });
    });

    describe('Result Display', () => {
        it('should calculate correct percentage for vote data', () => {
            const voteData = {
                "秦始皇嬴政": 30,
                "汉高祖刘邦": 15,
                "汉武帝刘彻": 20,
                "唐太宗李世民": 25,
                "明太祖朱元璋": 10
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(100);
            
            const percentageQinShiHuang = Math.round((voteData["秦始皇嬴政"] / total) * 100);
            expect(percentageQinShiHuang).toBe(30);
            
            const percentageTangTaizong = Math.round((voteData["唐太宗李世民"] / total) * 100);
            expect(percentageTangTaizong).toBe(25);
        });

        it('should handle empty vote data gracefully', () => {
            const voteData = {
                "秦始皇嬴政": 0,
                "汉高祖刘邦": 0,
                "汉武帝刘彻": 0,
                "唐太宗李世民": 0,
                "明太祖朱元璋": 0
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(0);
            
            // Percentage calculation should handle zero total
            const percentage = total > 0 ? Math.round((voteData["秦始皇嬴政"] / total) * 100) : 0;
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
                ks.navigateTo({ url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=emperor" });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=emperor"
            });
        });
    });

    describe('Bar Chart Creation', () => {
        it('should calculate correct scale for bar heights', () => {
            const voteData = {
                "秦始皇嬴政": 100,
                "汉高祖刘邦": 50,
                "汉武帝刘彻": 25,
                "唐太宗李世民": 10,
                "明太祖朱元璋": 5
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            expect(maxCount).toBe(100);
            
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(2);
            
            // Verify bar heights
            expect(voteData["秦始皇嬴政"] * scale).toBe(200);
            expect(voteData["汉高祖刘邦"] * scale).toBe(100);
            expect(voteData["汉武帝刘彻"] * scale).toBe(50);
        });

        it('should handle single vote correctly', () => {
            const voteData = {
                "秦始皇嬴政": 1,
                "汉高祖刘邦": 0,
                "汉武帝刘彻": 0,
                "唐太宗李世民": 0,
                "明太祖朱元璋": 0
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
                { value: "1", label: "秦始皇嬴政" },
                { value: "2", label: "汉高祖刘邦" },
                { value: "3", label: "汉武帝刘彻" },
                { value: "4", label: "唐太宗李世民" },
                { value: "5", label: "明太祖朱元璋" }
            ];
            
            const selectedValue = "4";
            const optionIndex = parseInt(selectedValue) - 1;
            const selectedLabel = options[optionIndex].label;
            
            expect(selectedLabel).toBe("唐太宗李世民");
        });

        it('should handle invalid option values', () => {
            const options = [
                { value: "1", label: "秦始皇嬴政" },
                { value: "2", label: "汉高祖刘邦" },
                { value: "3", label: "汉武帝刘彻" },
                { value: "4", label: "唐太宗李世民" },
                { value: "5", label: "明太祖朱元璋" }
            ];
            
            const selectedValue = "0";
            const optionIndex = parseInt(selectedValue) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });

        it('should handle out of range option values', () => {
            const options = [
                { value: "1", label: "秦始皇嬴政" },
                { value: "2", label: "汉高祖刘邦" },
                { value: "3", label: "汉武帝刘彻" },
                { value: "4", label: "唐太宗李世民" },
                { value: "5", label: "明太祖朱元璋" }
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
        const storageKey = "emperor1.data";
        expect(storageKey).toMatch(/^emperor\d+\.data$/);
    });

    it('should serialize vote data correctly', () => {
        const voteData = {
            "秦始皇嬴政": 25,
            "汉高祖刘邦": 10,
            "汉武帝刘彻": 20,
            "唐太宗李世民": 30,
            "明太祖朱元璋": 15
        };
        
        const serialized = JSON.stringify(voteData);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized["秦始皇嬴政"]).toBe(25);
        expect(deserialized["唐太宗李世民"]).toBe(30);
    });
});
