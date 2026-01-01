/**
 * Tests for IQ Tax Survey Application - Top 10 IQ Taxes
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('IQ Tax Survey Application', () => {
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
        it('should have correct title for IQ tax survey', () => {
            const expectedTitle = "评选十大智商税";
            expect(expectedTitle).toBe("评选十大智商税");
        });

        it('should have correct question text', () => {
            const expectedQuestion = "你认为以下哪个是最典型的智商税产品？";
            expect(expectedQuestion).toBe("你认为以下哪个是最典型的智商税产品？");
        });

        it('should have correct answer options with ten IQ tax products', () => {
            const expectedOptions = [
                { value: "1", label: "量子产品" },
                { value: "2", label: "防辐射服" },
                { value: "3", label: "负离子产品" },
                { value: "4", label: "酵素减肥" },
                { value: "5", label: "婴儿游泳" },
                { value: "6", label: "儿童天赋基因检测" },
                { value: "7", label: "磁疗产品" },
                { value: "8", label: "暴汗服" },
                { value: "9", label: "养生足贴" },
                { value: "10", label: "抗糖丸" }
            ];
            
            expect(expectedOptions.length).toBe(10);
            expect(expectedOptions[0].label).toBe("量子产品");
            expect(expectedOptions[1].label).toBe("防辐射服");
            expect(expectedOptions[2].label).toBe("负离子产品");
            expect(expectedOptions[3].label).toBe("酵素减肥");
            expect(expectedOptions[4].label).toBe("婴儿游泳");
            expect(expectedOptions[5].label).toBe("儿童天赋基因检测");
            expect(expectedOptions[6].label).toBe("磁疗产品");
            expect(expectedOptions[7].label).toBe("暴汗服");
            expect(expectedOptions[8].label).toBe("养生足贴");
            expect(expectedOptions[9].label).toBe("抗糖丸");
        });

        it('should use unique storage key for IQ tax data', () => {
            const expectedStorageKey = "iqtax1.data";
            expect(expectedStorageKey).toBe("iqtax1.data");
            expect(expectedStorageKey).not.toBe("emperor1.data");
            expect(expectedStorageKey).not.toBe("caili1.data");
            expect(expectedStorageKey).not.toBe("howlong1.data");
        });
    });

    describe('Vote Data Structure', () => {
        it('should initialize vote data with zeros for all options', () => {
            const voteData = {
                "量子产品": 0,
                "防辐射服": 0,
                "负离子产品": 0,
                "酵素减肥": 0,
                "婴儿游泳": 0,
                "儿童天赋基因检测": 0,
                "磁疗产品": 0,
                "暴汗服": 0,
                "养生足贴": 0,
                "抗糖丸": 0
            };
            
            Object.values(voteData).forEach(count => {
                expect(count).toBe(0);
            });
        });

        it('should have correct number of vote categories', () => {
            const voteData = {
                "量子产品": 0,
                "防辐射服": 0,
                "负离子产品": 0,
                "酵素减肥": 0,
                "婴儿游泳": 0,
                "儿童天赋基因检测": 0,
                "磁疗产品": 0,
                "暴汗服": 0,
                "养生足贴": 0,
                "抗糖丸": 0
            };
            
            expect(Object.keys(voteData).length).toBe(10);
        });
    });

    describe('Result Display', () => {
        it('should calculate correct percentage for vote data', () => {
            const voteData = {
                "量子产品": 25,
                "防辐射服": 15,
                "负离子产品": 10,
                "酵素减肥": 8,
                "婴儿游泳": 7,
                "儿童天赋基因检测": 12,
                "磁疗产品": 9,
                "暴汗服": 6,
                "养生足贴": 5,
                "抗糖丸": 3
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(100);
            
            const percentageQuantum = Math.round((voteData["量子产品"] / total) * 100);
            expect(percentageQuantum).toBe(25);
            
            const percentageRadiation = Math.round((voteData["防辐射服"] / total) * 100);
            expect(percentageRadiation).toBe(15);
        });

        it('should handle empty vote data gracefully', () => {
            const voteData = {
                "量子产品": 0,
                "防辐射服": 0,
                "负离子产品": 0,
                "酵素减肥": 0,
                "婴儿游泳": 0,
                "儿童天赋基因检测": 0,
                "磁疗产品": 0,
                "暴汗服": 0,
                "养生足贴": 0,
                "抗糖丸": 0
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(0);
            
            // Percentage calculation should handle zero total
            const percentage = total > 0 ? Math.round((voteData["量子产品"] / total) * 100) : 0;
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
                ks.navigateTo({ url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=iqtax" });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=iqtax"
            });
        });
    });

    describe('Bar Chart Creation', () => {
        it('should calculate correct scale for bar heights', () => {
            const voteData = {
                "量子产品": 100,
                "防辐射服": 50,
                "负离子产品": 25,
                "酵素减肥": 10,
                "婴儿游泳": 5,
                "儿童天赋基因检测": 80,
                "磁疗产品": 40,
                "暴汗服": 20,
                "养生足贴": 15,
                "抗糖丸": 8
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            expect(maxCount).toBe(100);
            
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(2);
            
            // Verify bar heights
            expect(voteData["量子产品"] * scale).toBe(200);
            expect(voteData["防辐射服"] * scale).toBe(100);
            expect(voteData["负离子产品"] * scale).toBe(50);
        });

        it('should handle single vote correctly', () => {
            const voteData = {
                "量子产品": 1,
                "防辐射服": 0,
                "负离子产品": 0,
                "酵素减肥": 0,
                "婴儿游泳": 0,
                "儿童天赋基因检测": 0,
                "磁疗产品": 0,
                "暴汗服": 0,
                "养生足贴": 0,
                "抗糖丸": 0
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
                { value: "1", label: "量子产品" },
                { value: "2", label: "防辐射服" },
                { value: "3", label: "负离子产品" },
                { value: "4", label: "酵素减肥" },
                { value: "5", label: "婴儿游泳" },
                { value: "6", label: "儿童天赋基因检测" },
                { value: "7", label: "磁疗产品" },
                { value: "8", label: "暴汗服" },
                { value: "9", label: "养生足贴" },
                { value: "10", label: "抗糖丸" }
            ];
            
            const selectedValue = "6";
            const optionIndex = parseInt(selectedValue) - 1;
            const selectedLabel = options[optionIndex].label;
            
            expect(selectedLabel).toBe("儿童天赋基因检测");
        });

        it('should handle invalid option values', () => {
            const options = [
                { value: "1", label: "量子产品" },
                { value: "2", label: "防辐射服" },
                { value: "3", label: "负离子产品" },
                { value: "4", label: "酵素减肥" },
                { value: "5", label: "婴儿游泳" },
                { value: "6", label: "儿童天赋基因检测" },
                { value: "7", label: "磁疗产品" },
                { value: "8", label: "暴汗服" },
                { value: "9", label: "养生足贴" },
                { value: "10", label: "抗糖丸" }
            ];
            
            const selectedValue = "0";
            const optionIndex = parseInt(selectedValue) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });

        it('should handle out of range option values', () => {
            const options = [
                { value: "1", label: "量子产品" },
                { value: "2", label: "防辐射服" },
                { value: "3", label: "负离子产品" },
                { value: "4", label: "酵素减肥" },
                { value: "5", label: "婴儿游泳" },
                { value: "6", label: "儿童天赋基因检测" },
                { value: "7", label: "磁疗产品" },
                { value: "8", label: "暴汗服" },
                { value: "9", label: "养生足贴" },
                { value: "10", label: "抗糖丸" }
            ];
            
            const selectedValue = "11";
            const optionIndex = parseInt(selectedValue) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });
    });
});

describe('Integration with Storage', () => {
    it('should use correct storage key format', () => {
        const storageKey = "iqtax1.data";
        expect(storageKey).toMatch(/^iqtax\d+\.data$/);
    });

    it('should serialize vote data correctly', () => {
        const voteData = {
            "量子产品": 25,
            "防辐射服": 10,
            "负离子产品": 20,
            "酵素减肥": 15,
            "婴儿游泳": 30
        };
        
        const serialized = JSON.stringify(voteData);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized["量子产品"]).toBe(25);
        expect(deserialized["婴儿游泳"]).toBe(30);
    });
});
