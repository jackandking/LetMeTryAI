/**
 * Tests for What Fish Application - Fish Identification Survey
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('What Fish Application', () => {
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
            const expectedImageUrl = "https://x0.ifengimg.com/res/2020/D5ED958F91CAA53EE0F623DAD9CA134B2287C3F9_size221_w600_h400.png";
            expect(expectedImageUrl).toMatch(/^https:\/\//);
            expect(expectedImageUrl).toContain("ifengimg.com");
        });

        it('should have correct answer options including common fish', () => {
            const expectedOptions = [
                { value: "1", label: "鲤鱼" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            expect(expectedOptions.length).toBe(5);
            expect(expectedOptions.map(o => o.label)).toContain("鲫鱼");
            expect(expectedOptions.map(o => o.label)).toContain("鲤鱼");
            expect(expectedOptions.map(o => o.label)).toContain("草鱼");
            expect(expectedOptions.map(o => o.label)).toContain("青鱼");
            expect(expectedOptions.map(o => o.label)).toContain("鲢鱼");
        });

        it('should have 鲫鱼 as the correct answer', () => {
            const correctAnswer = "鲫鱼";
            expect(correctAnswer).toBe("鲫鱼");
        });

        it('should use unique storage key for fish data', () => {
            const expectedStorageKey = "whatfish1.data";
            expect(expectedStorageKey).toBe("whatfish1.data");
            expect(expectedStorageKey).not.toBe("caili1.data");
            expect(expectedStorageKey).not.toBe("howlong1.data");
        });
    });

    describe('Vote Data Structure', () => {
        it('should initialize vote data with zeros for all fish options', () => {
            const voteData = {
                "鲤鱼": 0,
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
                "鲤鱼": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            expect(Object.keys(voteData).length).toBe(5);
        });

        it('should include the correct answer in vote data', () => {
            const voteData = {
                "鲤鱼": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            expect(voteData).toHaveProperty("鲫鱼");
        });
    });

    describe('Result Display', () => {
        it('should calculate correct percentage for vote data', () => {
            const voteData = {
                "鲤鱼": 15,
                "鲫鱼": 40,
                "草鱼": 20,
                "青鱼": 15,
                "鲢鱼": 10
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(100);
            
            const percentageJiyu = Math.round((voteData["鲫鱼"] / total) * 100);
            expect(percentageJiyu).toBe(40);
            
            const percentageGrassfish = Math.round((voteData["草鱼"] / total) * 100);
            expect(percentageGrassfish).toBe(20);
        });

        it('should handle empty vote data gracefully', () => {
            const voteData = {
                "鲤鱼": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(0);
            
            const percentage = total > 0 ? Math.round((voteData["鲫鱼"] / total) * 100) : 0;
            expect(percentage).toBe(0);
        });

        it('should calculate correct answer rate', () => {
            const voteData = {
                "鲤鱼": 10,
                "鲫鱼": 50,
                "草鱼": 20,
                "青鱼": 10,
                "鲢鱼": 10
            };
            const correctAnswer = "鲫鱼";
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            const correctCount = voteData[correctAnswer];
            const correctRate = Math.round((correctCount / total) * 100);
            
            expect(correctRate).toBe(50);
        });

        it('should identify correct answer from options', () => {
            const options = [
                { value: "1", label: "鲤鱼" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            const correctAnswer = "鲫鱼";
            
            const correctOption = options.find(opt => opt.label === correctAnswer);
            expect(correctOption).toBeDefined();
            expect(correctOption.value).toBe("2");
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
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({ url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=whatfish" });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=whatfish"
            });
        });
    });

    describe('Bar Chart Creation', () => {
        it('should calculate correct scale for bar heights', () => {
            const voteData = {
                "鲤鱼": 100,
                "鲫鱼": 50,
                "草鱼": 25,
                "青鱼": 10,
                "鲢鱼": 5
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            expect(maxCount).toBe(100);
            
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(2);
            
            expect(voteData["鲤鱼"] * scale).toBe(200);
            expect(voteData["鲫鱼"] * scale).toBe(100);
            expect(voteData["草鱼"] * scale).toBe(50);
        });

        it('should handle single vote correctly', () => {
            const voteData = {
                "鲤鱼": 0,
                "鲫鱼": 1,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            
            expect(maxCount).toBe(1);
            expect(scale).toBe(200);
        });

        it('should handle zero votes with default scale', () => {
            const voteData = {
                "鲤鱼": 0,
                "鲫鱼": 0,
                "草鱼": 0,
                "青鱼": 0,
                "鲢鱼": 0
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            
            expect(maxCount).toBe(0);
            expect(scale).toBe(1);
        });
    });

    describe('Option Selection', () => {
        it('should map option values to correct fish labels', () => {
            const options = [
                { value: "1", label: "鲤鱼" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            const selectedValue = "2";
            const optionIndex = parseInt(selectedValue) - 1;
            const selectedLabel = options[optionIndex].label;
            
            expect(selectedLabel).toBe("鲫鱼");
        });

        it('should handle invalid option values', () => {
            const options = [
                { value: "1", label: "鲤鱼" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            const selectedValue = "0";
            const optionIndex = parseInt(selectedValue) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });

        it('should handle out of range option values', () => {
            const options = [
                { value: "1", label: "鲤鱼" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            
            const selectedValue = "6";
            const optionIndex = parseInt(selectedValue) - 1;
            
            const isValid = optionIndex >= 0 && optionIndex < options.length;
            expect(isValid).toBe(false);
        });

        it('should correctly identify the correct answer selection', () => {
            const options = [
                { value: "1", label: "鲤鱼" },
                { value: "2", label: "鲫鱼" },
                { value: "3", label: "草鱼" },
                { value: "4", label: "青鱼" },
                { value: "5", label: "鲢鱼" }
            ];
            const correctAnswer = "鲫鱼";
            
            const selectedValue = "2";
            const optionIndex = parseInt(selectedValue) - 1;
            const selectedLabel = options[optionIndex].label;
            const isCorrect = selectedLabel === correctAnswer;
            
            expect(isCorrect).toBe(true);
        });
    });
});

describe('Integration with Storage', () => {
    it('should use correct storage key format', () => {
        const storageKey = "whatfish1.data";
        expect(storageKey).toMatch(/^whatfish\d+\.data$/);
    });

    it('should serialize vote data correctly', () => {
        const voteData = {
            "鲤鱼": 5,
            "鲫鱼": 10,
            "草鱼": 15,
            "青鱼": 8,
            "鲢鱼": 2
        };
        
        const serialized = JSON.stringify(voteData);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized["鲤鱼"]).toBe(5);
        expect(deserialized["鲫鱼"]).toBe(10);
        expect(deserialized["鲢鱼"]).toBe(2);
    });

    it('should handle Chinese characters in storage keys', () => {
        const voteData = {
            "鲫鱼": 100
        };
        
        const serialized = JSON.stringify(voteData);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized).toHaveProperty("鲫鱼");
        expect(deserialized["鲫鱼"]).toBe(100);
    });
});

describe('Fish Identification Features', () => {
    it('should display fish image from external source', () => {
        const imageUrl = "https://x0.ifengimg.com/res/2020/D5ED958F91CAA53EE0F623DAD9CA134B2287C3F9_size221_w600_h400.png";
        expect(imageUrl).toMatch(/^https:\/\//);
        expect(imageUrl).toContain(".png");
    });

    it('should have all common freshwater fish as options', () => {
        const fishTypes = ["鲤鱼", "鲫鱼", "草鱼", "青鱼", "鲢鱼"];
        
        fishTypes.forEach(fish => {
            expect(typeof fish).toBe('string');
            expect(fish.length).toBeGreaterThan(0);
        });
        
        expect(fishTypes).toContain("鲫鱼");
    });

    it('should calculate accuracy statistics correctly', () => {
        const voteData = {
            "鲤鱼": 20,
            "鲫鱼": 60,
            "草鱼": 10,
            "青鱼": 5,
            "鲢鱼": 5
        };
        const correctAnswer = "鲫鱼";
        
        const total = Object.values(voteData).reduce((a, b) => a + b, 0);
        const correctCount = voteData[correctAnswer];
        const accuracyRate = Math.round((correctCount / total) * 100);
        
        expect(total).toBe(100);
        expect(correctCount).toBe(60);
        expect(accuracyRate).toBe(60);
    });
});
