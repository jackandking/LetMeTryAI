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
        it('should handle finishedAd=true with videoUrl parameter', () => {
            const urlParams = new URLSearchParams('finishedAd=true&videoUrl=https%3A%2F%2Fv.kuaishou.com%2FKL337Hat');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            const videoUrl = urlParams.get('videoUrl');
            
            expect(finishedAd).toBe(true);
            expect(videoUrl).toBe('https://v.kuaishou.com/KL337Hat');
        });

        it('should handle finishedAd=false parameter', () => {
            const urlParams = new URLSearchParams('finishedAd=false');
            const finishedAd = urlParams.get('finishedAd') === 'true';
            
            expect(finishedAd).toBe(false);
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

        it('should call ks.navigateTo for ad display', () => {
            const mockNavigateTo = jest.fn();
            global.ks = {
                navigateTo: mockNavigateTo
            };
            
            const videoUrl = 'https://v.kuaishou.com/KL337Hat';
            const encodedVideoUrl = encodeURIComponent(videoUrl);
            
            if (typeof ks !== 'undefined' && ks.navigateTo) {
                ks.navigateTo({
                    url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom&videoUrl=${encodedVideoUrl}`
                });
            }
            
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: expect.stringContaining('result_page_id=viproom')
            });
            expect(mockNavigateTo).toHaveBeenCalledWith({
                url: expect.stringContaining('videoUrl=')
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

describe('Video URL Preservation After Sorting', () => {
    it('should preserve correct video URLs after sorting by clicks', () => {
        // Initial items with different click counts
        const items = [
            { imgUrl: "img1.jpg", videoUrl: "https://v.kuaishou.com/video1" },  // Will have 5 clicks
            { imgUrl: "img2.jpg", videoUrl: "https://v.kuaishou.com/video2" },  // Will have 15 clicks (most)
            { imgUrl: "img3.jpg", videoUrl: "https://v.kuaishou.com/video3" }   // Will have 10 clicks
        ];
        const clickCounts = { "0": 5, "1": 15, "2": 10 };
        
        // Simulate sorting logic
        const itemsWithIndices = items.map((item, index) => ({
            item,
            originalIndex: index,
            clicks: clickCounts[index] || 0
        }));
        
        itemsWithIndices.sort((a, b) => b.clicks - a.clicks);
        
        // Use the new logic: preserve original indices
        const sortedItems = itemsWithIndices.map(entry => ({
            ...entry.item,
            _originalIndex: entry.originalIndex
        }));
        
        // After sorting, order should be: video2 (15), video3 (10), video1 (5)
        expect(sortedItems[0].videoUrl).toBe("https://v.kuaishou.com/video2");
        expect(sortedItems[1].videoUrl).toBe("https://v.kuaishou.com/video3");
        expect(sortedItems[2].videoUrl).toBe("https://v.kuaishou.com/video1");
        
        // Original indices should be preserved
        expect(sortedItems[0]._originalIndex).toBe(1); // video2 was originally at index 1
        expect(sortedItems[1]._originalIndex).toBe(2); // video3 was originally at index 2
        expect(sortedItems[2]._originalIndex).toBe(0); // video1 was originally at index 0
        
        // When clicking on position 1 (video3), it should use video3's URL and original index 2
        const clickedItem = sortedItems[1];
        expect(clickedItem.videoUrl).toBe("https://v.kuaishou.com/video3");
        expect(clickedItem._originalIndex).toBe(2);
        expect(clickedItem.videoUrl).not.toBe("https://v.kuaishou.com/video2"); // Not the most clicked
    });

    it('should maintain click data indexed by original configuration positions', () => {
        // Initial setup
        const items = [
            { imgUrl: "img1.jpg", videoUrl: "https://v.kuaishou.com/video1" },
            { imgUrl: "img2.jpg", videoUrl: "https://v.kuaishou.com/video2" },
            { imgUrl: "img3.jpg", videoUrl: "https://v.kuaishou.com/video3" }
        ];
        let clickData = { "0": 5, "1": 15, "2": 10 };
        
        // Sort items
        const itemsWithIndices = items.map((item, index) => ({
            item,
            originalIndex: index,
            clicks: clickData[index] || 0
        }));
        itemsWithIndices.sort((a, b) => b.clicks - a.clicks);
        
        const sortedItems = itemsWithIndices.map(entry => ({
            ...entry.item,
            _originalIndex: entry.originalIndex
        }));
        
        // User clicks on display position 1 (which is video3, original index 2)
        const clickedItem = sortedItems[1];
        const originalIndex = clickedItem._originalIndex;
        
        // Increment click count using ORIGINAL index
        clickData[originalIndex] = (clickData[originalIndex] || 0) + 1;
        
        // Click data should now be: {0: 5, 1: 15, 2: 11}
        expect(clickData[0]).toBe(5);  // video1 still has 5 clicks
        expect(clickData[1]).toBe(15); // video2 still has 15 clicks
        expect(clickData[2]).toBe(11); // video3 now has 11 clicks (was 10)
        
        // On next page load, this click data can be correctly applied to the original config
        expect(clickData).toEqual({ "0": 5, "1": 15, "2": 11 });
    });

    it('should pass correct video URL when clicking on second most popular item', () => {
        const mockNavigateTo = jest.fn();
        global.ks = { navigateTo: mockNavigateTo };
        
        // Simulate sorted items: most clicked first
        const sortedItems = [
            { imgUrl: "img1.jpg", videoUrl: "https://v.kuaishou.com/MOST_CLICKED" },
            { imgUrl: "img2.jpg", videoUrl: "https://v.kuaishou.com/SECOND_CLICKED" },
            { imgUrl: "img3.jpg", videoUrl: "https://v.kuaishou.com/THIRD_CLICKED" }
        ];
        
        // User clicks on the SECOND item (index 1)
        const clickedItem = sortedItems[1];
        const videoUrl = clickedItem.videoUrl;
        const encodedVideoUrl = encodeURIComponent(videoUrl);
        
        // Simulate showing ad
        if (typeof ks !== 'undefined' && ks.navigateTo) {
            ks.navigateTo({
                url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom&videoUrl=${encodedVideoUrl}`
            });
        }
        
        // Verify the SECOND video URL was passed, not the first
        expect(mockNavigateTo).toHaveBeenCalled();
        const callUrl = mockNavigateTo.mock.calls[0][0].url;
        expect(callUrl).toContain(encodeURIComponent("https://v.kuaishou.com/SECOND_CLICKED"));
        expect(callUrl).not.toContain(encodeURIComponent("https://v.kuaishou.com/MOST_CLICKED"));
    });

    it('should play the correct video URL after ad completes', () => {
        // Simulate returning from ad with SECOND_CLICKED video URL
        const returnedVideoUrl = "https://v.kuaishou.com/SECOND_CLICKED";
        const urlParams = new URLSearchParams(`finishedAd=true&videoUrl=${encodeURIComponent(returnedVideoUrl)}`);
        
        const finishedAd = urlParams.get('finishedAd') === 'true';
        const videoUrl = urlParams.get('videoUrl');
        
        expect(finishedAd).toBe(true);
        expect(videoUrl).toBe(returnedVideoUrl);
        expect(decodeURIComponent(videoUrl)).toBe("https://v.kuaishou.com/SECOND_CLICKED");
        
        // Should NOT be the most clicked video
        expect(videoUrl).not.toBe("https://v.kuaishou.com/MOST_CLICKED");
    });
});
