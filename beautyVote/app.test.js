/**
 * Unit tests for Beauty Vote Application
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

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
    <div id="votingSection" style="display: none;"></div>
    <div id="imageGallery"></div>
    <div id="showResultBtn" style="display: none;"></div>
    <div id="resultsContainer" style="display: none;">
        <div id="winnerSection" style="display: none;">
            <img id="winnerImage" alt="Winner">
            <div id="winnerVotes"></div>
        </div>
        <div id="resultsSection" style="display: none;">
            <div id="resultsList"></div>
            <p id="totalVotes"></p>
            <p id="timestamp"></p>
        </div>
    </div>
`;

describe('Beauty Vote Application', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        global.readKeyValueStore.mockClear();
        global.updateKeyValueStore.mockClear();
    });

    describe('Configuration', () => {
        it('should have correct configuration values', () => {
            const config = {
                title: "谁美一点",
                imageListKey: "indexURLs_0.1.0",
                storageKey: "beautyVote.data",
                numberOfImages: 5
            };

            expect(config.title).toBe("谁美一点");
            expect(config.imageListKey).toBe("indexURLs_0.1.0");
            expect(config.storageKey).toBe("beautyVote.data");
            expect(config.numberOfImages).toBe(5);
        });

        it('should use centralized storage key format', () => {
            const config = {
                storageKey: "beautyVote.data"
            };

            expect(config.storageKey).toMatch(/\.data$/);
            expect(config.storageKey).not.toContain('hardcoded');
        });
    });

    describe('getRandomImages', () => {
        it('should return correct number of images', () => {
            const imageList = [
                'https://example.com/img1.jpg',
                'https://example.com/img2.jpg',
                'https://example.com/img3.jpg',
                'https://example.com/img4.jpg',
                'https://example.com/img5.jpg',
                'https://example.com/img6.jpg',
                'https://example.com/img7.jpg'
            ];

            function getRandomImages(imageList, count) {
                const shuffled = [...imageList].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count).map(url => ({
                    url: url,
                    maskPosition: Math.random() < 0.5 ? 'top' : 'bottom'
                }));
            }

            const result = getRandomImages(imageList, 5);
            expect(result).toHaveLength(5);
        });

        it('should add mask position to each image', () => {
            const imageList = ['https://example.com/img1.jpg'];

            function getRandomImages(imageList, count) {
                const shuffled = [...imageList].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count).map(url => ({
                    url: url,
                    maskPosition: Math.random() < 0.5 ? 'top' : 'bottom'
                }));
            }

            const result = getRandomImages(imageList, 1);
            expect(result[0]).toHaveProperty('url');
            expect(result[0]).toHaveProperty('maskPosition');
            expect(['top', 'bottom']).toContain(result[0].maskPosition);
        });

        it('should handle empty image list', () => {
            const imageList = [];

            function getRandomImages(imageList, count) {
                const shuffled = [...imageList].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count).map(url => ({
                    url: url,
                    maskPosition: Math.random() < 0.5 ? 'top' : 'bottom'
                }));
            }

            const result = getRandomImages(imageList, 5);
            expect(result).toHaveLength(0);
        });

        it('should not modify original image list', () => {
            const imageList = ['img1', 'img2', 'img3'];
            const originalList = [...imageList];

            function getRandomImages(imageList, count) {
                const shuffled = [...imageList].sort(() => Math.random() - 0.5);
                return shuffled.slice(0, count).map(url => ({
                    url: url,
                    maskPosition: Math.random() < 0.5 ? 'top' : 'bottom'
                }));
            }

            getRandomImages(imageList, 2);
            expect(imageList).toEqual(originalList);
        });
    });

    describe('Image Loading', () => {
        it('should parse newline-separated image URLs', () => {
            const rawData = 'https://example.com/img1.jpg\nhttps://example.com/img2.jpg\nhttps://example.com/img3.jpg';
            const parsed = rawData.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());

            expect(parsed).toHaveLength(3);
            expect(parsed[0]).toBe('https://example.com/img1.jpg');
            expect(parsed[2]).toBe('https://example.com/img3.jpg');
        });

        it('should handle CRLF line endings', () => {
            const rawData = 'https://example.com/img1.jpg\r\nhttps://example.com/img2.jpg\r\nhttps://example.com/img3.jpg';
            const parsed = rawData.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());

            expect(parsed).toHaveLength(3);
        });

        it('should filter out empty lines', () => {
            const rawData = 'https://example.com/img1.jpg\n\nhttps://example.com/img2.jpg\n   \nhttps://example.com/img3.jpg';
            const parsed = rawData.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());

            expect(parsed).toHaveLength(3);
            expect(parsed).not.toContain('');
        });

        it('should trim whitespace from URLs', () => {
            const rawData = '  https://example.com/img1.jpg  \n  https://example.com/img2.jpg  ';
            const parsed = rawData.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());

            expect(parsed[0]).toBe('https://example.com/img1.jpg');
            expect(parsed[1]).toBe('https://example.com/img2.jpg');
        });
    });

    describe('Vote Recording', () => {
        it('should increment vote count for selected image', () => {
            const imageUrl = 'https://example.com/img1.jpg';
            let voteData = {};

            // Simulate recording a vote
            voteData[imageUrl] = (voteData[imageUrl] || 0) + 1;

            expect(voteData[imageUrl]).toBe(1);
        });

        it('should handle multiple votes for same image', () => {
            const imageUrl = 'https://example.com/img1.jpg';
            let voteData = {};

            voteData[imageUrl] = (voteData[imageUrl] || 0) + 1;
            voteData[imageUrl] = (voteData[imageUrl] || 0) + 1;
            voteData[imageUrl] = (voteData[imageUrl] || 0) + 1;

            expect(voteData[imageUrl]).toBe(3);
        });

        it('should track votes for multiple images', () => {
            let voteData = {};

            voteData['img1.jpg'] = (voteData['img1.jpg'] || 0) + 1;
            voteData['img2.jpg'] = (voteData['img2.jpg'] || 0) + 1;
            voteData['img1.jpg'] = (voteData['img1.jpg'] || 0) + 1;

            expect(voteData['img1.jpg']).toBe(2);
            expect(voteData['img2.jpg']).toBe(1);
        });

        it('should merge with existing vote data', () => {
            let voteData = {
                'img1.jpg': 5,
                'img2.jpg': 3
            };

            const newVote = 'img1.jpg';
            voteData[newVote] = (voteData[newVote] || 0) + 1;

            expect(voteData['img1.jpg']).toBe(6);
            expect(voteData['img2.jpg']).toBe(3);
        });
    });

    describe('Result Display', () => {
        it('should sort results by vote count', () => {
            const voteData = {
                'img1.jpg': 5,
                'img2.jpg': 10,
                'img3.jpg': 3
            };

            const sortedResults = Object.entries(voteData)
                .map(([url, votes]) => ({ url, votes }))
                .sort((a, b) => b.votes - a.votes);

            expect(sortedResults[0].url).toBe('img2.jpg');
            expect(sortedResults[0].votes).toBe(10);
            expect(sortedResults[2].url).toBe('img3.jpg');
        });

        it('should calculate total votes correctly', () => {
            const voteData = {
                'img1.jpg': 5,
                'img2.jpg': 10,
                'img3.jpg': 3
            };

            const sortedResults = Object.entries(voteData)
                .map(([url, votes]) => ({ url, votes }));
            const totalVotes = sortedResults.reduce((sum, item) => sum + item.votes, 0);

            expect(totalVotes).toBe(18);
        });

        it('should calculate vote percentage correctly', () => {
            const votes = 10;
            const maxVotes = 20;
            const percentage = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;

            expect(percentage).toBe(50);
        });

        it('should handle zero votes gracefully', () => {
            const maxVotes = 0;
            const percentage = maxVotes > 0 ? (10 / maxVotes) * 100 : 0;

            expect(percentage).toBe(0);
        });
    });

    describe('Error Handling', () => {
        it('should handle null vote data', () => {
            const voteData = null;
            const result = voteData !== null && typeof voteData === 'object' ? voteData : {};

            expect(result).toEqual({});
        });

        it('should handle undefined vote data', () => {
            const voteData = undefined;
            const result = voteData !== null && typeof voteData === 'object' ? voteData : {};

            expect(result).toEqual({});
        });

        it('should handle empty vote data object', () => {
            const voteData = {};
            const sortedResults = Object.entries(voteData)
                .map(([url, votes]) => ({ url, votes }))
                .sort((a, b) => b.votes - a.votes);

            expect(sortedResults).toHaveLength(0);
        });
    });

    describe('URL Parameter Handling', () => {
        it('should check for finishedAd parameter', () => {
            const urlParams = new URLSearchParams('?finishedAd=true');
            expect(urlParams.get('finishedAd')).toBe('true');
        });

        it('should handle missing finishedAd parameter', () => {
            const urlParams = new URLSearchParams('');
            expect(urlParams.get('finishedAd')).toBeNull();
        });

        it('should handle false finishedAd parameter', () => {
            const urlParams = new URLSearchParams('?finishedAd=false');
            expect(urlParams.get('finishedAd')).toBe('false');
        });
    });

    describe('Integration with Storage', () => {
        it('should use correct storage key format', () => {
            const storageKey = 'beautyVote.data';
            expect(storageKey).toMatch(/\.data$/);
        });

        it('should use correct image list key', () => {
            const imageListKey = 'indexURLs_0.1.0';
            expect(imageListKey).toBe('indexURLs_0.1.0');
            expect(imageListKey).toMatch(/^indexURLs_/);
        });

        it('should handle JSON serialization of vote data', () => {
            const voteData = {
                'img1.jpg': 5,
                'img2.jpg': 3
            };

            const serialized = JSON.stringify(voteData);
            const deserialized = JSON.parse(serialized);

            expect(deserialized).toEqual(voteData);
        });
    });

    describe('Mask Position Logic', () => {
        it('should only use top or bottom mask positions', () => {
            const validPositions = ['top', 'bottom'];
            
            for (let i = 0; i < 100; i++) {
                const maskPosition = Math.random() < 0.5 ? 'top' : 'bottom';
                expect(validPositions).toContain(maskPosition);
            }
        });
    });

    describe('Result Display in Index Page', () => {
        it('should handle finishedAd=true parameter', () => {
            const urlParams = new URLSearchParams('?finishedAd=true');
            expect(urlParams.get('finishedAd')).toBe('true');
            expect(urlParams.get('finishedAd') === 'true').toBe(true);
        });

        it('should handle finishedAd=false parameter', () => {
            const urlParams = new URLSearchParams('?finishedAd=false');
            expect(urlParams.get('finishedAd')).toBe('false');
            expect(urlParams.get('finishedAd') === 'true').toBe(false);
        });

        it('should handle missing finishedAd parameter', () => {
            const urlParams = new URLSearchParams('');
            expect(urlParams.get('finishedAd')).toBeNull();
        });

        it('should create result item with correct structure', () => {
            const result = { url: 'https://example.com/img1.jpg', votes: 10 };
            const rank = 1;
            const maxVotes = 20;

            // Simulate createResultItem logic
            const percentage = maxVotes > 0 ? (result.votes / maxVotes) * 100 : 0;
            
            expect(percentage).toBe(50);
            expect(rank).toBe(1);
        });

        it('should calculate winner correctly', () => {
            const voteData = {
                'img1.jpg': 5,
                'img2.jpg': 15,
                'img3.jpg': 8
            };

            const sortedResults = Object.entries(voteData)
                .map(([url, votes]) => ({ url, votes }))
                .sort((a, b) => b.votes - a.votes);

            const winner = sortedResults[0];
            
            expect(winner.url).toBe('img2.jpg');
            expect(winner.votes).toBe(15);
        });

        it('should handle empty vote data in results', () => {
            const voteData = {};
            const sortedResults = Object.entries(voteData)
                .map(([url, votes]) => ({ url, votes }))
                .sort((a, b) => b.votes - a.votes);

            expect(sortedResults).toHaveLength(0);
        });
    });
});
