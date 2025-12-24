/**
 * Tests for advertisement points system
 * Tests watching ads for earning points functionality
 */

const assert = require('assert');

describe('Advertisement Points System', () => {
    describe('Configuration', () => {
        it('should have AD_FULL and AD_PARTIAL in POINTS_CONFIG', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes('AD_FULL'), 'Should have AD_FULL config');
            assert(code.includes('AD_PARTIAL'), 'Should have AD_PARTIAL config');
            assert(code.includes('AD_FULL: 10'), 'AD_FULL should be 10 points');
            assert(code.includes('AD_PARTIAL: 3'), 'AD_PARTIAL should be 3 points');
        });

        it('should have awardAdPoints function', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes('function awardAdPoints'), 'Should have awardAdPoints function');
            assert(code.includes('watchedFull'), 'Should accept watchedFull parameter');
        });

        it('should export awardAdPoints in public API', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            const publicApiSection = code.substring(
                code.indexOf('// Public API'),
                code.indexOf('// Export for use')
            );
            
            assert(publicApiSection.includes('awardAdPoints'), 
                'Should export awardAdPoints in public API');
        });
    });

    describe('Award Ad Points Functionality', () => {
        let PointsSystem;
        
        beforeEach(() => {
            // Mock localStorage
            global.localStorage = {
                data: {},
                getItem(key) { return this.data[key] || null; },
                setItem(key, value) { this.data[key] = value; },
                removeItem(key) { delete this.data[key]; }
            };
            global.module = { exports: {} };

            // Load points system
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            eval(code);
            PointsSystem = module.exports;
            
            // Initialize user
            PointsSystem.initialize();
        });

        it('should award 10 points for watching full ad', () => {
            const initialPoints = PointsSystem.getPoints();
            const result = PointsSystem.awardAdPoints(true);
            
            assert.strictEqual(result.pointsAwarded, 10, 'Should award 10 points');
            assert.strictEqual(result.watchedFull, true, 'Should mark as full watch');
            assert.strictEqual(result.newTotal, initialPoints + 10, 'Total should increase by 10');
        });

        it('should award 3 points for partial ad watch', () => {
            const initialPoints = PointsSystem.getPoints();
            const result = PointsSystem.awardAdPoints(false);
            
            assert.strictEqual(result.pointsAwarded, 3, 'Should award 3 points');
            assert.strictEqual(result.watchedFull, false, 'Should mark as partial watch');
            assert.strictEqual(result.newTotal, initialPoints + 3, 'Total should increase by 3');
        });

        it('should return result object with correct structure', () => {
            const result = PointsSystem.awardAdPoints(true);
            
            assert(result.hasOwnProperty('pointsAwarded'), 'Should have pointsAwarded');
            assert(result.hasOwnProperty('newTotal'), 'Should have newTotal');
            assert(result.hasOwnProperty('watchedFull'), 'Should have watchedFull');
        });

        it('should allow multiple ad watches', () => {
            const initialPoints = PointsSystem.getPoints();
            
            PointsSystem.awardAdPoints(true);  // +10
            PointsSystem.awardAdPoints(false); // +3
            PointsSystem.awardAdPoints(true);  // +10
            
            const finalPoints = PointsSystem.getPoints();
            assert.strictEqual(finalPoints, initialPoints + 23, 'Should accumulate all ad points');
        });
    });

    describe('Appreciate Page Integration', () => {
        it('should have watch ad button in HTML', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('看广告赚积分'), 'Should have ad button text');
            assert(html.includes('watch-ad-btn'), 'Should have ad button class');
            assert(html.includes('showAdForPoints'), 'Should have ad button handler');
        });

        it('should have showAdForPoints function', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('function showAdForPoints'), 
                'Should have showAdForPoints function');
            assert(html.includes('ks.navigateTo'), 
                'Should use mini-program navigation');
            assert(html.includes('showRewardedVideoAd'), 
                'Should navigate to ad page');
        });

        it('should have handleAdReturn function', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('function handleAdReturn'), 
                'Should have handleAdReturn function');
            assert(html.includes('finishedAd'), 
                'Should check finishedAd parameter');
        });

        it('should handle both full and partial ad completion', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdSection = html.substring(
                html.indexOf('function handleAdReturn'),
                html.indexOf('function showAdForPoints')
            );
            
            assert(handleAdSection.includes("finishedAd === 'true'"), 
                'Should check for full ad completion');
            assert(handleAdSection.includes('pointsToAdd = 10'), 
                'Should award 10 points for full ad');
            assert(handleAdSection.includes('pointsToAdd = 3'), 
                'Should award 3 points for partial ad');
        });

        it('should update points display after ad return', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdSection = html.substring(
                html.indexOf('function handleAdReturn'),
                html.indexOf('function showAdForPoints')
            );
            
            assert(handleAdSection.includes('PointsSystem.addPoints'), 
                'Should add points');
            assert(handleAdSection.includes('updatePointsDisplay'), 
                'Should update display');
            assert(handleAdSection.includes('showPointsNotification'), 
                'Should show notification');
        });

        it('should clean URL after processing ad return', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdSection = html.substring(
                html.indexOf('function handleAdReturn'),
                html.indexOf('function showAdForPoints')
            );
            
            assert(handleAdSection.includes('window.history.replaceState'), 
                'Should clean URL parameters');
        });

        it('should call handleAdReturn on page load', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('handleAdReturn()'), 
                'Should call handleAdReturn on page load');
        });

        it('should mention ad in points explanation', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('看广告'), 'Should mention watching ads');
            assert(html.includes('3~10分') || html.includes('3-10分'), 
                'Should show ad point range');
        });
    });

    describe('URL Parameter Handling', () => {
        it('should extract finishedAd from URL parameters', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('URLSearchParams'), 
                'Should use URLSearchParams');
            assert(html.includes("urlParams.get('finishedAd')"), 
                'Should get finishedAd parameter');
        });

        it('should handle missing finishedAd parameter', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdSection = html.substring(
                html.indexOf('function handleAdReturn'),
                html.indexOf('function showAdForPoints')
            );
            
            assert(handleAdSection.includes('finishedAd !== null'), 
                'Should check if parameter exists');
        });
    });

    describe('Mini-Program Integration', () => {
        it('should use correct ad page URL', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('/pages/showRewardedVideoAd/showRewardedVideoAd'), 
                'Should use correct ad page path');
            assert(html.includes('result_page_id'), 
                'Should include result_page_id parameter');
            assert(html.includes('nanrenbao'), 
                'Should reference nanrenbao in return URL');
        });

        it('should have fallback for browser testing', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const showAdSection = html.substring(
                html.indexOf('function showAdForPoints'),
                html.indexOf('// Initialize points system') || html.indexOf('handleAdReturn()')
            );
            
            assert(showAdSection.includes('typeof ks'), 
                'Should check for ks object');
            assert(showAdSection.includes('console.log') || showAdSection.includes('showPointsNotification'), 
                'Should have fallback behavior');
        });
    });

    describe('Styling', () => {
        it('should have watch-ad-btn styles', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('.watch-ad-btn'), 'Should have button styles');
            assert(html.includes('gradient'), 'Should use gradient for button');
        });

        it('should have ad-buttons-container styles', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            assert(html.includes('.ad-buttons-container'), 
                'Should have container styles');
        });
    });

    describe('Edge Cases', () => {
        it('should handle ad points even when other points are 0', () => {
            global.localStorage = {
                data: {},
                getItem(key) { return this.data[key] || null; },
                setItem(key, value) { this.data[key] = value; },
                removeItem(key) { delete this.data[key]; }
            };
            global.module = { exports: {} };

            const fs = require('fs');
            eval(fs.readFileSync('./nanrenbao/points-system.js', 'utf8'));
            const PointsSystem = module.exports;

            // Initialize and deplete points
            PointsSystem.initialize();
            const currentPoints = PointsSystem.getPoints();
            PointsSystem.addPoints(-currentPoints);
            
            assert.strictEqual(PointsSystem.getPoints(), 0, 'Should be at 0');
            
            // Watch ad
            const result = PointsSystem.awardAdPoints(true);
            assert.strictEqual(result.newTotal, 10, 'Should have 10 points from ad');
        });

        it('should work with different point combinations', () => {
            global.localStorage = {
                data: {},
                getItem(key) { return this.data[key] || null; },
                setItem(key, value) { this.data[key] = value; },
                removeItem(key) { delete this.data[key]; }
            };
            global.module = { exports: {} };

            const fs = require('fs');
            eval(fs.readFileSync('./nanrenbao/points-system.js', 'utf8'));
            const PointsSystem = module.exports;

            PointsSystem.initialize();
            
            // Different combinations
            PointsSystem.awardAdPoints(true);   // +10
            PointsSystem.awardUploadPoints();   // +10
            PointsSystem.awardAdPoints(false);  // +3
            
            const total = PointsSystem.getPoints();
            assert(total >= 23, 'Should accumulate all point sources');
        });
    });
});
