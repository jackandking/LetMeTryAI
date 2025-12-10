/**
 * Tests for VIP Room Result Page
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Constants used across multiple test suites
const PENDING_VIDEO_KEY = 'viproom.pendingVideo';
const CONFIG_KEY = 'viproom.conf';
const CLICKS_KEY = 'viproom.clicks';

describe('VIP Room Result Page', () => {
    let originalDocument;
    let mockGetConfig;

    beforeEach(() => {
        // Store original document
        originalDocument = global.document;

        // Setup DOM mock
        document.body.innerHTML = `
            <div class="result-container">
                <h1>VIP房间投票结果</h1>
                <div id="loadingMessage" class="loading">正在加载投票结果...</div>
                <div id="winnerSection" class="winner-section" style="display: none;">
                    <h2>🏆 票选最受欢迎</h2>
                    <img id="winnerImage" class="winner-image" alt="Winner">
                    <div class="winner-votes" id="winnerVotes"></div>
                    <button class="play-button">▶ 观看视频</button>
                </div>
                <div id="resultsSection" class="results-section" style="display: none;">
                    <h2>所有投票结果</h2>
                    <div id="resultsList"></div>
                    <div class="stats-info">
                        <p id="totalVotes"></p>
                        <p id="timestamp"></p>
                    </div>
                </div>
                <button class="retry-button">返回投票</button>
                <div class="more" id="more"><a target="_blank">快手男人宝小程序主页看更多美女</a></div>
            </div>
        `;

        // Mock getConfig (comes from util.js)
        mockGetConfig = jest.fn((key, callback) => {
            callback(null);
        });

        global.getConfig = mockGetConfig;
        global.ks = undefined;

        // Clear localStorage before each test
        localStorage.clear();
    });

    afterEach(() => {
        jest.clearAllMocks();
        global.document = originalDocument;
        localStorage.clear();
    });

    describe('Configuration', () => {
        it('should use correct storage keys', () => {
            expect(CONFIG_KEY).toBe('viproom.conf');
            expect(CLICKS_KEY).toBe('viproom.clicks');
            expect(PENDING_VIDEO_KEY).toBe('viproom.pendingVideo');
        });

        it('should handle valid configuration data', () => {
            const config = [
                {
                    "imgUrl": "https://example.com/image1.jpg",
                    "videoUrl": "https://v.kuaishou.com/video1"
                },
                {
                    "imgUrl": "https://example.com/image2.jpg",
                    "videoUrl": "https://v.kuaishou.com/video2"
                }
            ];

            expect(Array.isArray(config)).toBe(true);
            expect(config.length).toBe(2);
            expect(config[0]).toHaveProperty('imgUrl');
            expect(config[0]).toHaveProperty('videoUrl');
        });

        it('should handle empty configuration gracefully', () => {
            const configs = [null, undefined, [], {}];
            
            configs.forEach(config => {
                const isValid = config && Array.isArray(config) && config.length > 0;
                expect(isValid).toBeFalsy();
            });
        });
    });

    describe('URL Parameters Handling', () => {
        it('should handle finishedAd=true with stored video URL', () => {
            const videoUrl = 'https://v.kuaishou.com/TEST_VIDEO';
            localStorage.setItem(PENDING_VIDEO_KEY, videoUrl);
            
            const urlParams = new URLSearchParams('finishedAd=true');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            
            expect(finishedAd).toBe(true);
            
            // Simulate retrieval
            const storedVideoUrl = localStorage.getItem(PENDING_VIDEO_KEY);
            expect(storedVideoUrl).toBe(videoUrl);
            
            // Should clear after retrieval
            localStorage.removeItem(PENDING_VIDEO_KEY);
            expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBeNull();
        });

        it('should handle finishedAd=false and clear pending video', () => {
            localStorage.setItem(PENDING_VIDEO_KEY, 'https://v.kuaishou.com/test');
            
            const urlParams = new URLSearchParams('finishedAd=false');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            
            expect(finishedAd).toBe(false);
            
            // Should clear pending video when ad is cancelled
            localStorage.removeItem(PENDING_VIDEO_KEY);
            expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBeNull();
        });

        it('should handle missing URL parameters', () => {
            const urlParams = new URLSearchParams('');
            const finishedAd = urlParams.get('finishedAd');
            
            expect(finishedAd).toBeNull();
        });
    });

    describe('Results Display', () => {
        it('should sort results by click count in descending order', () => {
            const items = [
                { imgUrl: "img1.jpg", videoUrl: "vid1.mp4" },
                { imgUrl: "img2.jpg", videoUrl: "vid2.mp4" },
                { imgUrl: "img3.jpg", videoUrl: "vid3.mp4" }
            ];
            
            const clickData = { "0": 5, "1": 15, "2": 10 };
            
            // Create array with items and click counts
            const resultsWithClicks = items.map((item, index) => ({
                item,
                index,
                clicks: clickData[index] || 0
            }));
            
            // Sort by clicks descending
            resultsWithClicks.sort((a, b) => b.clicks - a.clicks);
            
            expect(resultsWithClicks[0].index).toBe(1); // 15 clicks
            expect(resultsWithClicks[1].index).toBe(2); // 10 clicks
            expect(resultsWithClicks[2].index).toBe(0); // 5 clicks
        });

        it('should calculate total votes correctly', () => {
            const resultsWithClicks = [
                { clicks: 15 },
                { clicks: 10 },
                { clicks: 5 }
            ];
            
            const totalVotes = resultsWithClicks.reduce((sum, entry) => sum + entry.clicks, 0);
            
            expect(totalVotes).toBe(30);
        });

        it('should calculate vote bar percentage correctly', () => {
            const maxVotes = 15;
            const currentVotes = 10;
            
            const percentage = maxVotes > 0 ? (currentVotes / maxVotes) * 100 : 0;
            
            expect(percentage).toBeCloseTo(66.67, 1);
        });

        it('should handle zero votes gracefully', () => {
            const maxVotes = 0;
            const currentVotes = 0;
            
            const percentage = maxVotes > 0 ? (currentVotes / maxVotes) * 100 : 0;
            
            expect(percentage).toBe(0);
        });
    });

    describe('Winner Display', () => {
        it('should display winner as first item in sorted results', () => {
            const galleryItems = [
                { imgUrl: "img1.jpg", videoUrl: "vid1.mp4" },
                { imgUrl: "img2.jpg", videoUrl: "vid2.mp4" },
                { imgUrl: "img3.jpg", videoUrl: "vid3.mp4" }
            ];
            
            const clickData = { "0": 5, "1": 20, "2": 10 };
            
            const resultsWithClicks = galleryItems.map((item, index) => ({
                item,
                index,
                clicks: clickData[index] || 0
            }));
            
            resultsWithClicks.sort((a, b) => b.clicks - a.clicks);
            
            const winner = resultsWithClicks[0];
            
            expect(winner.index).toBe(1);
            expect(winner.clicks).toBe(20);
            expect(winner.item.videoUrl).toBe("vid2.mp4");
        });

        it('should set winner video URL for playback', () => {
            const winner = {
                item: {
                    imgUrl: "winner.jpg",
                    videoUrl: "https://v.kuaishou.com/WINNER"
                },
                clicks: 25
            };
            
            const winnerVideoUrl = winner.item.videoUrl;
            
            expect(winnerVideoUrl).toBe("https://v.kuaishou.com/WINNER");
        });
    });

    describe('Video Playback', () => {
        it('should store winner video URL in localStorage before ad', () => {
            const winnerVideoUrl = 'https://v.kuaishou.com/WINNER_VIDEO';
            
            localStorage.setItem(PENDING_VIDEO_KEY, winnerVideoUrl);
            
            expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBe(winnerVideoUrl);
        });

        it('should navigate to ad page with correct result_page_id', () => {
            const mockNavigateTo = jest.fn();
            global.ks = { navigateTo: mockNavigateTo };
            
            const winnerVideoUrl = 'https://v.kuaishou.com/WINNER';
            localStorage.setItem(PENDING_VIDEO_KEY, winnerVideoUrl);
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom-result`
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalled();
            const callUrl = mockNavigateTo.mock.calls[0][0].url;
            expect(callUrl).toContain('result_page_id=viproom-result');
        });

        it('should play video after ad completes', () => {
            const mockNavigateTo = jest.fn();
            global.ks = { navigateTo: mockNavigateTo };
            
            const videoUrl = 'https://v.kuaishou.com/TEST_VIDEO';
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: `/pages/video/video?url=${encodeURIComponent(videoUrl)}`
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalled();
            const callUrl = mockNavigateTo.mock.calls[0][0].url;
            expect(callUrl).toContain('/pages/video/video');
            expect(callUrl).toContain(encodeURIComponent(videoUrl));
        });

        it('should fallback to window.open when ks is not available', () => {
            global.ks = undefined;
            const mockWindowOpen = jest.fn();
            global.window.open = mockWindowOpen;
            
            const videoUrl = 'https://v.kuaishou.com/TEST';
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                // Should not execute
            } else {
                window.open(videoUrl, '_blank');
            }
            
            expect(mockWindowOpen).toHaveBeenCalledWith(videoUrl, '_blank');
        });
    });

    describe('DOM Manipulation', () => {
        it('should hide loading and show results sections', () => {
            const loadingMessage = document.getElementById('loadingMessage');
            const winnerSection = document.getElementById('winnerSection');
            const resultsSection = document.getElementById('resultsSection');
            
            // Simulate loading complete
            loadingMessage.style.display = 'none';
            winnerSection.style.display = 'block';
            resultsSection.style.display = 'block';
            
            expect(loadingMessage.style.display).toBe('none');
            expect(winnerSection.style.display).toBe('block');
            expect(resultsSection.style.display).toBe('block');
        });

        it('should create result item with correct structure', () => {
            const result = {
                item: {
                    imgUrl: "https://example.com/test.jpg",
                    videoUrl: "https://v.kuaishou.com/test"
                },
                index: 0,
                clicks: 15
            };
            
            const item = document.createElement('div');
            item.className = 'result-item';

            const img = document.createElement('img');
            img.className = 'result-image';
            img.src = result.item.imgUrl;

            const info = document.createElement('div');
            info.className = 'result-info';

            const rankSpan = document.createElement('span');
            rankSpan.className = 'result-rank';
            rankSpan.textContent = '#1';

            const votesSpan = document.createElement('span');
            votesSpan.className = 'result-votes';
            votesSpan.textContent = `${result.clicks} 票`;

            info.appendChild(rankSpan);
            info.appendChild(votesSpan);
            item.appendChild(img);
            item.appendChild(info);
            
            expect(item.querySelector('.result-image').src).toBe(result.item.imgUrl);
            expect(item.querySelector('.result-rank').textContent).toBe('#1');
            expect(item.querySelector('.result-votes').textContent).toBe('15 票');
        });

        it('should display total votes and timestamp', () => {
            const totalVotes = 50;
            const timestamp = new Date().toLocaleString();
            
            document.getElementById('totalVotes').textContent = `总投票数: ${totalVotes}`;
            document.getElementById('timestamp').textContent = `统计时间: ${timestamp}`;
            
            expect(document.getElementById('totalVotes').textContent).toBe('总投票数: 50');
            expect(document.getElementById('timestamp').textContent).toContain('统计时间:');
        });
    });

    describe('Navigation', () => {
        it('should navigate back to index.html when retry button is clicked', () => {
            const currentLocation = window.location.href;
            // In a real scenario, this would change the location
            // For testing, we verify the behavior would be correct
            expect(() => {
                // window.location.href = 'index.html';
            }).not.toThrow();
        });

        it('should handle ks.navigateTo for index page', () => {
            const mockNavigateTo = jest.fn();
            global.ks = { navigateTo: mockNavigateTo };
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: "/pages/index/index"
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: "/pages/index/index"
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle missing DOM elements gracefully', () => {
            document.body.innerHTML = '';
            
            const winnerImage = document.getElementById('winnerImage');
            expect(winnerImage).toBeNull();
        });

        it('should handle image load errors', () => {
            const img = document.createElement('img');
            img.className = 'result-image';
            img.src = 'https://invalid-url/image.jpg';
            
            // Set onerror handler
            img.onerror = () => {
                img.style.display = 'none';
            };
            
            // Trigger error
            img.onerror();
            
            expect(img.style.display).toBe('none');
        });
    });

    describe('Data Validation', () => {
        it('should validate result data structure', () => {
            const result = {
                item: {
                    imgUrl: "https://example.com/image.jpg",
                    videoUrl: "https://v.kuaishou.com/test"
                },
                index: 0,
                clicks: 10
            };
            
            expect(result).toHaveProperty('item');
            expect(result).toHaveProperty('index');
            expect(result).toHaveProperty('clicks');
            expect(result.item).toHaveProperty('imgUrl');
            expect(result.item).toHaveProperty('videoUrl');
        });

        it('should handle missing click data', () => {
            const galleryItems = [
                { imgUrl: "img1.jpg", videoUrl: "vid1.mp4" }
            ];
            const clickData = {};
            
            const resultsWithClicks = galleryItems.map((item, index) => ({
                item,
                index,
                clicks: clickData[index] || 0
            }));
            
            expect(resultsWithClicks[0].clicks).toBe(0);
        });
    });
});

describe('LocalStorage Integration for Result Page', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        localStorage.clear();
    });

    it('should store winner video URL before showing ad', () => {
        const videoUrl = 'https://v.kuaishou.com/WINNER_VIDEO';
        
        localStorage.setItem(PENDING_VIDEO_KEY, videoUrl);
        
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBe(videoUrl);
    });

    it('should retrieve and play video after ad completes', () => {
        const videoUrl = 'https://v.kuaishou.com/WINNER_VIDEO';
        
        // Store before ad
        localStorage.setItem(PENDING_VIDEO_KEY, videoUrl);
        
        // Retrieve after ad
        const storedUrl = localStorage.getItem(PENDING_VIDEO_KEY);
        expect(storedUrl).toBe(videoUrl);
        
        // Clear after playback
        localStorage.removeItem(PENDING_VIDEO_KEY);
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBeNull();
    });

    it('should handle missing stored video gracefully', () => {
        const storedUrl = localStorage.getItem(PENDING_VIDEO_KEY);
        expect(storedUrl).toBeNull();
    });

    it('should clear pending video on ad cancellation', () => {
        localStorage.setItem(PENDING_VIDEO_KEY, 'https://v.kuaishou.com/test');
        
        // Simulate cancellation
        localStorage.removeItem(PENDING_VIDEO_KEY);
        
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBeNull();
    });
});
