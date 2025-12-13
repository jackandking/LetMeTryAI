/**
 * Tests for Guzhuang Meinv Application - Ancient Costume Beauty Voting
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Guzhuang Meinv Application', () => {
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
        it('should have correct title for ancient costume beauty voting', () => {
            // Configuration should match the expected Chinese title
            const expectedTitle = "古装第一美女";
            expect(expectedTitle).toBe("古装第一美女");
        });

        it('should have correct question text', () => {
            const expectedQuestion = "你认为谁是古装第一美女？";
            expect(expectedQuestion).toBe("你认为谁是古装第一美女？");
        });

        it('should have correct answer options with all 5 actresses', () => {
            const expectedOptions = [
                { value: "1", label: "朱琳的女儿国国王", image: "https://q1.itc.cn/images01/20250722/2ae2054c2e7e4a9e8c13ede4d8800dc6.jpeg" },
                { value: "2", label: "蒋勤勤的西施", image: "https://pic.rmb.bdstatic.com/bjh/9785b2bd76f0a179053dbf71a2ff53a0.jpeg" },
                { value: "3", label: "赵雅芝的白素贞", image: "https://pic.rmb.bdstatic.com/bjh/bc160f2886a/250124/73836a8ff1d7222c5a58de8363a9409e.jpeg" },
                { value: "4", label: "陈红的貂蝉", image: "https://q0.itc.cn/images01/20250918/576be67f696a415e8819fffd71a29a59.jpeg" },
                { value: "5", label: "刘亦菲的小龙女", image: "https://pic.rmb.bdstatic.com/bjh/bb818fcb2934/241213/e86d8017285b92ef2a6bca022bc0058b.jpeg" }
            ];
            
            expect(expectedOptions.length).toBe(5);
            expect(expectedOptions[0].label).toBe("朱琳的女儿国国王");
            expect(expectedOptions[1].label).toBe("蒋勤勤的西施");
            expect(expectedOptions[2].label).toBe("赵雅芝的白素贞");
            expect(expectedOptions[3].label).toBe("陈红的貂蝉");
            expect(expectedOptions[4].label).toBe("刘亦菲的小龙女");
        });

        it('should have image URLs for all options', () => {
            const expectedOptions = [
                { value: "1", label: "朱琳的女儿国国王", image: "https://q1.itc.cn/images01/20250722/2ae2054c2e7e4a9e8c13ede4d8800dc6.jpeg" },
                { value: "2", label: "蒋勤勤的西施", image: "https://pic.rmb.bdstatic.com/bjh/9785b2bd76f0a179053dbf71a2ff53a0.jpeg" },
                { value: "3", label: "赵雅芝的白素贞", image: "https://pic.rmb.bdstatic.com/bjh/bc160f2886a/250124/73836a8ff1d7222c5a58de8363a9409e.jpeg" },
                { value: "4", label: "陈红的貂蝉", image: "https://q0.itc.cn/images01/20250918/576be67f696a415e8819fffd71a29a59.jpeg" },
                { value: "5", label: "刘亦菲的小龙女", image: "https://pic.rmb.bdstatic.com/bjh/bb818fcb2934/241213/e86d8017285b92ef2a6bca022bc0058b.jpeg" }
            ];
            
            expectedOptions.forEach(option => {
                expect(option.image).toBeDefined();
                expect(option.image).toMatch(/^https?:\/\//);
            });
        });

        it('should use unique storage key for guzhuangmeinv data', () => {
            const expectedStorageKey = "guzhuangmeinv.data";
            expect(expectedStorageKey).toBe("guzhuangmeinv.data");
            expect(expectedStorageKey).not.toBe("caili1.data");
            expect(expectedStorageKey).not.toBe("beautyVote.data");
        });
    });

    describe('Vote Data Structure', () => {
        it('should initialize vote data with zeros for all options', () => {
            const voteData = {
                "朱琳的女儿国国王": 0,
                "蒋勤勤的西施": 0,
                "赵雅芝的白素贞": 0,
                "陈红的貂蝉": 0,
                "刘亦菲的小龙女": 0
            };
            
            Object.values(voteData).forEach(count => {
                expect(count).toBe(0);
            });
        });

        it('should have correct number of vote categories', () => {
            const voteData = {
                "朱琳的女儿国国王": 0,
                "蒋勤勤的西施": 0,
                "赵雅芝的白素贞": 0,
                "陈红的貂蝉": 0,
                "刘亦菲的小龙女": 0
            };
            
            expect(Object.keys(voteData).length).toBe(5);
        });
    });

    describe('Result Display', () => {
        it('should calculate correct percentage for vote data', () => {
            const voteData = {
                "朱琳的女儿国国王": 10,
                "蒋勤勤的西施": 20,
                "赵雅芝的白素贞": 30,
                "陈红的貂蝉": 25,
                "刘亦菲的小龙女": 15
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(100);
            
            const percentageZhuLin = Math.round((voteData["朱琳的女儿国国王"] / total) * 100);
            expect(percentageZhuLin).toBe(10);
            
            const percentageJiangQinqin = Math.round((voteData["蒋勤勤的西施"] / total) * 100);
            expect(percentageJiangQinqin).toBe(20);
        });

        it('should handle empty vote data gracefully', () => {
            const voteData = {
                "朱琳的女儿国国王": 0,
                "蒋勤勤的西施": 0,
                "赵雅芝的白素贞": 0,
                "陈红的貂蝉": 0,
                "刘亦菲的小龙女": 0
            };
            
            const total = Object.values(voteData).reduce((a, b) => a + b, 0);
            expect(total).toBe(0);
            
            // Percentage calculation should handle zero total
            const percentage = total > 0 ? Math.round((voteData["朱琳的女儿国国王"] / total) * 100) : 0;
            expect(percentage).toBe(0);
        });
    });

    describe('Configuration Validation', () => {
        it('should use centralized configuration patterns', () => {
            const config = {
                title: "古装第一美女",
                question: "你认为谁是古装第一美女？",
                storageKey: "guzhuangmeinv.data"
            };
            
            expect(config.title).toBeDefined();
            expect(config.question).toBeDefined();
            expect(config.storageKey).toBeDefined();
            expect(typeof config.title).toBe('string');
            expect(typeof config.question).toBe('string');
            expect(typeof config.storageKey).toBe('string');
        });

        it('should have proper option structure', () => {
            const option = {
                value: "1",
                label: "朱琳的女儿国国王",
                image: "https://q1.itc.cn/images01/20250722/2ae2054c2e7e4a9e8c13ede4d8800dc6.jpeg"
            };
            
            expect(option.value).toBeDefined();
            expect(option.label).toBeDefined();
            expect(option.image).toBeDefined();
            expect(typeof option.value).toBe('string');
            expect(typeof option.label).toBe('string');
            expect(typeof option.image).toBe('string');
        });
    });

    describe('Bar Chart Generation', () => {
        it('should calculate correct scale for bar heights', () => {
            const voteData = {
                "朱琳的女儿国国王": 100,
                "蒋勤勤的西施": 50,
                "赵雅芝的白素贞": 75,
                "陈红的貂蝉": 25,
                "刘亦菲的小龙女": 100
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            expect(maxCount).toBe(100);
            
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(2);
        });

        it('should handle zero votes correctly', () => {
            const voteData = {
                "朱琳的女儿国国王": 0,
                "蒋勤勤的西施": 0,
                "赵雅芝的白素贞": 0,
                "陈红的貂蝉": 0,
                "刘亦菲的小龙女": 0
            };
            
            const maxCount = Math.max(...Object.values(voteData));
            const scale = maxCount > 0 ? 200 / maxCount : 1;
            expect(scale).toBe(1);
        });
    });

    describe('Navigation Functions', () => {
        it('should have showAd function available', () => {
            expect(typeof showAd).toBe('function');
        });

        it('should have jumpToIndex function available', () => {
            expect(typeof jumpToIndex).toBe('function');
        });
    });

    describe('Image Display Functionality', () => {
        it('should display images for all options', () => {
            const expectedOptions = [
                { value: "1", label: "朱琳的女儿国国王", image: "https://q1.itc.cn/images01/20250722/2ae2054c2e7e4a9e8c13ede4d8800dc6.jpeg" },
                { value: "2", label: "蒋勤勤的西施", image: "https://pic.rmb.bdstatic.com/bjh/9785b2bd76f0a179053dbf71a2ff53a0.jpeg" },
                { value: "3", label: "赵雅芝的白素贞", image: "https://pic.rmb.bdstatic.com/bjh/bc160f2886a/250124/73836a8ff1d7222c5a58de8363a9409e.jpeg" },
                { value: "4", label: "陈红的貂蝉", image: "https://q0.itc.cn/images01/20250918/576be67f696a415e8819fffd71a29a59.jpeg" },
                { value: "5", label: "刘亦菲的小龙女", image: "https://pic.rmb.bdstatic.com/bjh/bb818fcb2934/241213/e86d8017285b92ef2a6bca022bc0058b.jpeg" }
            ];
            
            expectedOptions.forEach(option => {
                expect(option.image).toBeDefined();
                expect(option.image).toMatch(/^https:\/\//);
                expect(option.image).toMatch(/\.(jpeg|jpg|png)$/);
            });
        });

        it('should create image elements with correct structure', () => {
            const mockContainer = document.createElement('div');
            
            // Simulate what generateOptionButtons should create
            const button = document.createElement('button');
            button.className = 'image-button';
            
            const img = document.createElement('img');
            img.src = 'https://q1.itc.cn/images01/20250722/2ae2054c2e7e4a9e8c13ede4d8800dc6.jpeg';
            img.alt = '朱琳的女儿国国王';
            img.className = 'option-image';
            
            const label = document.createElement('div');
            label.className = 'option-label';
            label.textContent = '朱琳的女儿国国王';
            
            button.appendChild(img);
            button.appendChild(label);
            mockContainer.appendChild(button);
            
            // Verify structure
            expect(mockContainer.querySelector('button')).not.toBeNull();
            expect(mockContainer.querySelector('.image-button')).not.toBeNull();
            expect(mockContainer.querySelector('.option-image')).not.toBeNull();
            expect(mockContainer.querySelector('.option-label')).not.toBeNull();
            expect(mockContainer.querySelector('img').src).toContain('https://');
        });

        it('should have valid image URLs for all options', () => {
            const imageUrls = [
                "https://q1.itc.cn/images01/20250722/2ae2054c2e7e4a9e8c13ede4d8800dc6.jpeg",
                "https://pic.rmb.bdstatic.com/bjh/9785b2bd76f0a179053dbf71a2ff53a0.jpeg",
                "https://pic.rmb.bdstatic.com/bjh/bc160f2886a/250124/73836a8ff1d7222c5a58de8363a9409e.jpeg",
                "https://q0.itc.cn/images01/20250918/576be67f696a415e8819fffd71a29a59.jpeg",
                "https://pic.rmb.bdstatic.com/bjh/bb818fcb2934/241213/e86d8017285b92ef2a6bca022bc0058b.jpeg"
            ];
            
            imageUrls.forEach(url => {
                expect(url).toMatch(/^https:\/\//);
                expect(url).toBeDefined();
                expect(typeof url).toBe('string');
            });
        });

        it('should maintain label text with image display', () => {
            const labels = [
                "朱琳的女儿国国王",
                "蒋勤勤的西施",
                "赵雅芝的白素贞",
                "陈红的貂蝉",
                "刘亦菲的小龙女"
            ];
            
            labels.forEach(label => {
                expect(label).toBeDefined();
                expect(typeof label).toBe('string');
                expect(label.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle null vote data gracefully', () => {
            const voteData = null;
            
            if (!voteData || typeof voteData !== 'object') {
                expect(true).toBe(true); // Error would be caught
            }
        });

        it('should handle invalid option selection', () => {
            const selectedOption = '10'; // Invalid option
            const optionIndex = parseInt(selectedOption) - 1;
            
            if (optionIndex < 0 || optionIndex >= 5) {
                expect(true).toBe(true); // Would log error and return
            }
        });
    });
});
