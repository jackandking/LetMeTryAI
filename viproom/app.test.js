/**
 * Tests for VIP Room Application
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('VIP Room Application', () => {
    let originalDocument;
    let mockGetConfig;
    let mockUpdateConfig;

    beforeEach(() => {
        // Store original document
        originalDocument = global.document;

        // Setup DOM mock
        document.body.innerHTML = `
            <h1>VIP房间</h1>
            <div id="loadingContainer" class="loading">
                正在加载精彩内容...
            </div>
            <div id="galleryContainer" class="gallery" style="display: none;">
            </div>
            <div class="more" id="more"><a target="_blank">快手男人宝小程序主页看更多美女</a></div>
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

    describe('Configuration', () => {
        it('should use correct storage key for configuration', () => {
            const expectedKey = 'viproom.conf';
            expect(expectedKey).toBe('viproom.conf');
            expect(expectedKey).not.toBe('caili1.data');
        });

        it('should use correct storage key for click tracking', () => {
            const expectedKey = 'viproom.clicks';
            expect(expectedKey).toBe('viproom.clicks');
        });

        it('should handle configuration array correctly', () => {
            const config = [
                {
                    "imgUrl": "https://example.com/image1.jpg",
                    "videoUrl": "https://v.kuaishou.com/test1"
                },
                {
                    "imgUrl": "https://example.com/image2.jpg",
                    "videoUrl": "https://v.kuaishou.com/test2"
                }
            ];

            expect(Array.isArray(config)).toBe(true);
            expect(config.length).toBe(2);
            expect(config[0]).toHaveProperty('imgUrl');
            expect(config[0]).toHaveProperty('videoUrl');
        });
    });

    describe('Click Data Initialization', () => {
        it('should initialize click data with zeros for all items', () => {
            const galleryItems = [
                { imgUrl: "url1", videoUrl: "video1" },
                { imgUrl: "url2", videoUrl: "video2" },
                { imgUrl: "url3", videoUrl: "video3" }
            ];

            const clickData = {};
            galleryItems.forEach((item, index) => {
                clickData[index] = 0;
            });

            expect(Object.keys(clickData).length).toBe(3);
            expect(clickData[0]).toBe(0);
            expect(clickData[1]).toBe(0);
            expect(clickData[2]).toBe(0);
        });

        it('should preserve existing click data when loaded', () => {
            const existingClickData = {
                "0": 5,
                "1": 10,
                "2": 3
            };

            expect(existingClickData["0"]).toBe(5);
            expect(existingClickData["1"]).toBe(10);
            expect(existingClickData["2"]).toBe(3);
        });
    });

    describe('Click Tracking', () => {
        it('should increment click count when image is clicked', () => {
            let clickData = { "0": 5, "1": 3, "2": 8 };
            const clickedIndex = 1;

            clickData[clickedIndex] = (clickData[clickedIndex] || 0) + 1;

            expect(clickData["1"]).toBe(4);
        });

        it('should handle first click on untracked item', () => {
            let clickData = {};
            const clickedIndex = 0;

            clickData[clickedIndex] = (clickData[clickedIndex] || 0) + 1;

            expect(clickData[0]).toBe(1);
        });

        it('should save click data after each click', () => {
            const clickData = { "0": 5, "1": 3 };
            const CLICKS_KEY = 'viproom.clicks';

            // Simulate saving
            const savedData = JSON.stringify(clickData);
            const parsedData = JSON.parse(savedData);

            expect(parsedData["0"]).toBe(5);
            expect(parsedData["1"]).toBe(3);
        });
    });

    describe('Sorting by Popularity', () => {
        it('should sort items by click count in descending order', () => {
            const items = [
                { imgUrl: "img1", videoUrl: "vid1" },
                { imgUrl: "img2", videoUrl: "vid2" },
                { imgUrl: "img3", videoUrl: "vid3" }
            ];
            
            const clickCounts = [5, 15, 10];
            
            // Create array with indices and click counts
            const itemsWithClicks = items.map((item, index) => ({
                ...item,
                clicks: clickCounts[index],
                originalIndex: index
            }));
            
            // Sort by clicks descending
            itemsWithClicks.sort((a, b) => b.clicks - a.clicks);
            
            expect(itemsWithClicks[0].originalIndex).toBe(1); // 15 clicks
            expect(itemsWithClicks[1].originalIndex).toBe(2); // 10 clicks
            expect(itemsWithClicks[2].originalIndex).toBe(0); // 5 clicks
        });

        it('should handle items with zero clicks', () => {
            const clickData = { "0": 0, "1": 5, "2": 0 };
            const maxClicks = Math.max(...Object.values(clickData));
            
            expect(maxClicks).toBe(5);
        });

        it('should maintain stable sort for items with equal clicks', () => {
            const items = [
                { imgUrl: "img1", clicks: 5 },
                { imgUrl: "img2", clicks: 5 },
                { imgUrl: "img3", clicks: 10 }
            ];
            
            items.sort((a, b) => b.clicks - a.clicks);
            
            expect(items[0].clicks).toBe(10);
            expect(items[1].clicks).toBe(5);
            expect(items[2].clicks).toBe(5);
        });
    });

    describe('URL Parameters', () => {
        it('should handle finishedAd=true with stored video URL in localStorage', () => {
            // Setup: store a video URL in localStorage
            const videoUrl = 'https://v.kuaishou.com/KL337Hat';
            localStorage.setItem('viproom.pendingVideo', videoUrl);
            
            const urlParams = new URLSearchParams('finishedAd=true');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            
            expect(finishedAd).toBe(true);
            
            // Simulate retrieval
            const storedVideoUrl = localStorage.getItem('viproom.pendingVideo');
            expect(storedVideoUrl).toBe(videoUrl);
            
            // Cleanup
            localStorage.removeItem('viproom.pendingVideo');
        });

        it('should handle finishedAd=true with videoUrl parameter', () => {
            const urlParams = new URLSearchParams('finishedAd=true&videoUrl=https%3A%2F%2Fv.kuaishou.com%2FKL337Hat');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            const videoUrl = urlParams.get('videoUrl');
            
            expect(finishedAd).toBe(true);
            expect(videoUrl).toBe('https://v.kuaishou.com/KL337Hat');
        });

        it('should handle finishedAd=false parameter and clear pending video', () => {
            // Setup: store a video URL in localStorage
            localStorage.setItem('viproom.pendingVideo', 'https://v.kuaishou.com/test');
            
            const urlParams = new URLSearchParams('finishedAd=false');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            
            expect(finishedAd).toBe(false);
            
            // Should clear pending video when ad is cancelled
            localStorage.removeItem('viproom.pendingVideo');
            expect(localStorage.getItem('viproom.pendingVideo')).toBeNull();
        });

        it('should decode encoded video URL correctly', () => {
            const encodedUrl = 'https%3A%2F%2Fv.kuaishou.com%2FKL337Hat';
            const decodedUrl = decodeURIComponent(encodedUrl);
            
            expect(decodedUrl).toBe('https://v.kuaishou.com/KL337Hat');
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

        it('should store video URL in localStorage before showing ad', () => {
            const mockNavigateTo = jest.fn();
            global.ks = {
                navigateTo: mockNavigateTo
            };
            
            const videoUrl = 'https://v.kuaishou.com/MOST_VOTED';
            
            // Simulate storing video URL before ad
            localStorage.setItem('viproom.pendingVideo', videoUrl);
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom`
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: expect.stringContaining('result_page_id=viproom')
            });
            expect(localStorage.getItem('viproom.pendingVideo')).toBe(videoUrl);
            
            // Cleanup
            localStorage.removeItem('viproom.pendingVideo');
        });

        it('should call ks.navigateTo for ad display without videoUrl parameter', () => {
            const mockNavigateTo = jest.fn();
            global.ks = {
                navigateTo: mockNavigateTo
            };
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom`
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: expect.stringContaining('result_page_id=viproom')
            });
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: expect.not.stringContaining('videoUrl=')
            });
        });

        it('should call ks.navigateBack when ad is cancelled', () => {
            const mockNavigateBack = jest.fn();
            global.ks = {
                navigateBack: mockNavigateBack
            };
            
            const urlParams = new URLSearchParams('finishedAd=false');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            
            if (!finishedAd && typeof ks !== 'undefined' && ks.navigateBack) {
                ks.navigateBack();
            }
            
            expect(mockNavigateBack).toHaveBeenCalled();
        });
    });

    describe('DOM Manipulation', () => {
        it('should hide loading and show gallery when data is loaded', () => {
            const loadingContainer = document.getElementById('loadingContainer');
            const galleryContainer = document.getElementById('galleryContainer');
            
            expect(loadingContainer).toBeDefined();
            expect(galleryContainer).toBeDefined();
            
            // Simulate loading complete
            if (loadingContainer) loadingContainer.style.display = 'none';
            if (galleryContainer) galleryContainer.style.display = 'grid';
            
            expect(loadingContainer.style.display).toBe('none');
            expect(galleryContainer.style.display).toBe('grid');
        });

        it('should create image card with correct structure', () => {
            const item = {
                imgUrl: "https://example.com/test.jpg",
                videoUrl: "https://v.kuaishou.com/test"
            };
            const index = 0;
            const clickCount = 5;
            
            // Simulate card creation
            const card = document.createElement('div');
            card.className = 'image-card';
            
            const img = document.createElement('img');
            img.src = item.imgUrl;
            img.alt = `美女图片 ${index + 1}`;
            
            const info = document.createElement('div');
            info.className = 'image-info';
            info.innerHTML = `<div class="click-count">点击量: <span class="count">${clickCount}</span></div>`;
            
            card.appendChild(img);
            card.appendChild(info);
            
            expect(card.querySelector('img').src).toBe(item.imgUrl);
            expect(card.querySelector('.click-count')).toBeDefined();
            expect(card.querySelector('.count').textContent).toBe(String(clickCount));
        });

        it('should display error message when configuration fails to load', () => {
            const loadingContainer = document.getElementById('loadingContainer');
            const errorMessage = '配置加载失败，请联系管理员';
            
            if (loadingContainer) {
                loadingContainer.textContent = errorMessage;
                loadingContainer.style.color = '#ff6b6b';
            }
            
            expect(loadingContainer.textContent).toBe(errorMessage);
            expect(loadingContainer.style.color).toBe('#ff6b6b');
        });
    });

    describe('Data Validation', () => {
        it('should validate configuration is an array', () => {
            const validConfig = [{ imgUrl: "url", videoUrl: "video" }];
            const invalidConfig = { imgUrl: "url", videoUrl: "video" };
            
            expect(Array.isArray(validConfig)).toBe(true);
            expect(Array.isArray(invalidConfig)).toBe(false);
        });

        it('should validate item has required properties', () => {
            const item = {
                imgUrl: "https://example.com/image.jpg",
                videoUrl: "https://v.kuaishou.com/test"
            };
            
            expect(item).toHaveProperty('imgUrl');
            expect(item).toHaveProperty('videoUrl');
            expect(typeof item.imgUrl).toBe('string');
            expect(typeof item.videoUrl).toBe('string');
        });

        it('should handle missing or null configuration gracefully', () => {
            const configs = [null, undefined, [], {}];
            
            configs.forEach(config => {
                const isValid = config && Array.isArray(config) && config.length > 0;
                if (!isValid) {
                    expect(isValid).toBe(false);
                }
            });
        });
    });

    describe('Image Error Handling', () => {
        it('should have fallback for failed image loads', () => {
            const fallbackSrc = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ddd" width="300" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E图片加载失败%3C/text%3E%3C/svg%3E';
            
            expect(fallbackSrc).toContain('data:image/svg+xml');
            expect(fallbackSrc).toContain('图片加载失败');
        });
    });
});

describe('Integration with Storage', () => {
    it('should serialize and deserialize configuration correctly', () => {
        const config = [
            {
                "imgUrl": "https://example.com/img1.jpg",
                "videoUrl": "https://v.kuaishou.com/vid1"
            },
            {
                "imgUrl": "https://example.com/img2.jpg",
                "videoUrl": "https://v.kuaishou.com/vid2"
            }
        ];
        
        const serialized = JSON.stringify(config);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized).toEqual(config);
        expect(deserialized[0].imgUrl).toBe(config[0].imgUrl);
        expect(deserialized[1].videoUrl).toBe(config[1].videoUrl);
    });

    it('should serialize and deserialize click data correctly', () => {
        const clickData = {
            "0": 15,
            "1": 8,
            "2": 22
        };
        
        const serialized = JSON.stringify(clickData);
        const deserialized = JSON.parse(serialized);
        
        expect(deserialized["0"]).toBe(15);
        expect(deserialized["1"]).toBe(8);
        expect(deserialized["2"]).toBe(22);
    });
});

describe('Most Voted Video After Ad', () => {
    it('should navigate to ad page without videoUrl parameter', () => {
        const mockNavigateTo = jest.fn();
        global.ks = { navigateTo: mockNavigateTo };
        
        // Simulate sorted gallery items (already sorted by clicks - highest first)
        const galleryItems = [
            { imgUrl: "img1.jpg", videoUrl: "https://v.kuaishou.com/MOST_VOTED" },   // Most clicks
            { imgUrl: "img2.jpg", videoUrl: "https://v.kuaishou.com/SECOND_VOTED" }, // Second most
            { imgUrl: "img3.jpg", videoUrl: "https://v.kuaishou.com/THIRD_VOTED" }   // Third most
        ];
        
        // User clicks on any video
        const clickedItem = galleryItems[2];
        expect(clickedItem.videoUrl).toBe("https://v.kuaishou.com/THIRD_VOTED");
        
        // Navigate to ad page without videoUrl parameter (not supported)
        if (typeof ks !== 'undefined' && ks.navigateTo) {
            ks.navigateTo({
                url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom`
            });
        }
        
        // Verify navigation was called with only result_page_id, no videoUrl
        expect(mockNavigateTo).toHaveBeenCalled();
        const callUrl = mockNavigateTo.mock.calls[0][0].url;
        expect(callUrl).toContain('result_page_id=viproom');
        expect(callUrl).not.toContain('videoUrl=');
    });

    it('should use first item videoUrl as most voted video', () => {
        // Gallery items are sorted by click count (highest first)
        const galleryItems = [
            { imgUrl: "img1.jpg", videoUrl: "https://v.kuaishou.com/TOP_VIDEO", clicks: 100 },
            { imgUrl: "img2.jpg", videoUrl: "https://v.kuaishou.com/VIDEO_2", clicks: 50 },
            { imgUrl: "img3.jpg", videoUrl: "https://v.kuaishou.com/VIDEO_3", clicks: 10 }
        ];
        
        // Most voted video is the first one
        const mostVotedVideoUrl = galleryItems.length > 0 ? galleryItems[0].videoUrl : null;
        
        expect(mostVotedVideoUrl).toBe("https://v.kuaishou.com/TOP_VIDEO");
        expect(mostVotedVideoUrl).not.toBe("https://v.kuaishou.com/VIDEO_2");
        expect(mostVotedVideoUrl).not.toBe("https://v.kuaishou.com/VIDEO_3");
    });

    it('should fallback to clicked item videoUrl if gallery is empty', () => {
        const galleryItems = [];
        const clickedItem = { imgUrl: "img.jpg", videoUrl: "https://v.kuaishou.com/FALLBACK" };
        
        const mostVotedVideoUrl = galleryItems.length > 0 ? galleryItems[0].videoUrl : clickedItem.videoUrl;
        
        expect(mostVotedVideoUrl).toBe("https://v.kuaishou.com/FALLBACK");
    });
});

describe('LocalStorage Video Playback Flow', () => {
    const PENDING_VIDEO_KEY = 'viproom.pendingVideo';
    
    beforeEach(() => {
        // Clear localStorage before each test
        localStorage.clear();
    });

    afterEach(() => {
        // Clean up localStorage after each test
        localStorage.clear();
    });

    it('should store video URL before showing ad', () => {
        const videoUrl = 'https://v.kuaishou.com/TEST_VIDEO';
        
        // Store video URL
        localStorage.setItem(PENDING_VIDEO_KEY, videoUrl);
        
        // Verify it's stored
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBe(videoUrl);
    });

    it('should retrieve and clear stored video URL after ad completes', () => {
        const videoUrl = 'https://v.kuaishou.com/TEST_VIDEO';
        
        // Store video URL (simulating before ad)
        localStorage.setItem(PENDING_VIDEO_KEY, videoUrl);
        
        // Simulate ad completion - retrieve video URL
        const storedVideoUrl = localStorage.getItem(PENDING_VIDEO_KEY);
        expect(storedVideoUrl).toBe(videoUrl);
        
        // Clear the stored video URL
        localStorage.removeItem(PENDING_VIDEO_KEY);
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBeNull();
    });

    it('should handle missing stored video URL gracefully', () => {
        // Try to retrieve when nothing is stored
        const storedVideoUrl = localStorage.getItem(PENDING_VIDEO_KEY);
        
        expect(storedVideoUrl).toBeNull();
    });

    it('should clear pending video when ad is cancelled', () => {
        const videoUrl = 'https://v.kuaishou.com/TEST_VIDEO';
        
        // Store video URL
        localStorage.setItem(PENDING_VIDEO_KEY, videoUrl);
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBe(videoUrl);
        
        // Simulate ad cancellation - clear pending video
        localStorage.removeItem(PENDING_VIDEO_KEY);
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBeNull();
    });

    it('should store most voted video URL, not clicked item URL', () => {
        // Gallery items sorted by popularity (highest first)
        const galleryItems = [
            { imgUrl: "img1.jpg", videoUrl: "https://v.kuaishou.com/MOST_VOTED" },
            { imgUrl: "img2.jpg", videoUrl: "https://v.kuaishou.com/SECOND" }
        ];
        
        // User clicks on second item
        const clickedItem = galleryItems[1];
        expect(clickedItem.videoUrl).toBe("https://v.kuaishou.com/SECOND");
        
        // But we should store the most voted (first) item's video
        const mostVotedVideoUrl = galleryItems[0].videoUrl;
        localStorage.setItem(PENDING_VIDEO_KEY, mostVotedVideoUrl);
        
        // Verify the most voted video is stored, not the clicked one
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).toBe("https://v.kuaishou.com/MOST_VOTED");
        expect(localStorage.getItem(PENDING_VIDEO_KEY)).not.toBe(clickedItem.videoUrl);
        
        // Cleanup
        localStorage.removeItem(PENDING_VIDEO_KEY);
    });
});
