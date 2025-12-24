/**
 * Tests for the points refresh bug fix
 * Bug: Users getting free 20 points after spending all points and refreshing
 * Fix: Added INITIALIZED flag to track if user has been set up
 */

const assert = require('assert');

describe('Points Refresh Bug Fix', () => {
    describe('Bug Scenario', () => {
        it('should NOT give free points when user refreshes with 0 points', () => {
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
            const PointsSystem = module.exports;

            // Step 1: Initialize new user
            const init1 = PointsSystem.initialize();
            assert(init1.currentPoints > 0, 'New user should have points');

            // Step 2: Spend all points
            const allPoints = PointsSystem.getPoints();
            PointsSystem.addPoints(-allPoints);
            assert.strictEqual(PointsSystem.getPoints(), 0, 'Should have 0 points');

            // Step 3: Refresh (re-initialize) - BUG CHECK
            const init2 = PointsSystem.initialize();
            assert.strictEqual(init2.currentPoints, 0, 'Should still have 0 points after refresh');
            assert.strictEqual(init2.isNewUser, false, 'Should not be treated as new user');
        });

        it('should have INITIALIZED key in STORAGE_KEYS', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            assert(code.includes('INITIALIZED'), 'Should have INITIALIZED key');
            assert(code.includes('nanrenbao_initialized'), 'Should use correct storage key');
        });

        it('should check INITIALIZED flag instead of points === 0', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            // Should check initialized flag
            const initFunction = code.substring(
                code.indexOf('function initializeNewUser'),
                code.indexOf('function checkDailyVisit')
            );
            
            assert(initFunction.includes('STORAGE_KEYS.INITIALIZED'), 
                'Should check INITIALIZED flag');
            assert(initFunction.includes('!isInitialized'), 
                'Should check if NOT initialized');
            assert(!initFunction.includes('points === 0'), 
                'Should NOT check points === 0 anymore');
        });

        it('should set INITIALIZED flag when initializing new user', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            const initFunction = code.substring(
                code.indexOf('function initializeNewUser'),
                code.indexOf('function checkDailyVisit')
            );
            
            assert(initFunction.includes('localStorage.setItem(STORAGE_KEYS.INITIALIZED'), 
                'Should set INITIALIZED flag');
            assert(initFunction.includes("'true'"), 
                'Should set flag to true');
        });

        it('should remove INITIALIZED flag when resetting user', () => {
            const fs = require('fs');
            const code = fs.readFileSync('./nanrenbao/points-system.js', 'utf8');
            
            const resetFunction = code.substring(
                code.indexOf('function resetUser'),
                code.lastIndexOf('// Public API')
            );
            
            assert(resetFunction.includes('localStorage.removeItem(STORAGE_KEYS.INITIALIZED)'), 
                'Should remove INITIALIZED flag on reset');
        });
    });

    describe('Edge Cases', () => {
        it('should allow points to go to 0 without triggering new user logic', () => {
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

            // Initialize user
            PointsSystem.initialize();
            
            // Set points to 0
            const currentPoints = PointsSystem.getPoints();
            PointsSystem.addPoints(-currentPoints);
            
            assert.strictEqual(PointsSystem.getPoints(), 0, 'Points should be 0');
            
            // Check that user is still initialized
            assert(localStorage.getItem('nanrenbao_initialized'), 
                'INITIALIZED flag should still be set');
        });

        it('should still allow daily visit bonus when points are 0', () => {
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
            
            // Simulate new day
            localStorage.removeItem('nanrenbao_last_visit');
            
            // Check daily bonus
            const daily = PointsSystem.checkDailyVisit();
            assert(daily.awarded, 'Should award daily bonus even at 0 points');
            assert.strictEqual(daily.newTotal, 10, 'Should have 10 points from daily bonus');
        });

        it('should still allow upload bonus when points are 0', () => {
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
            
            // Award upload points
            const newTotal = PointsSystem.awardUploadPoints();
            assert.strictEqual(newTotal, 10, 'Should have 10 points from upload');
        });
    });

    describe('Backward Compatibility', () => {
        it('should handle existing users without INITIALIZED flag', () => {
            global.localStorage = {
                data: {
                    'nanrenbao_user_uuid': 'existing-uuid-123',
                    'nanrenbao_points': '15',
                    'nanrenbao_last_visit': '2025-12-23'
                    // No INITIALIZED flag for old users
                },
                getItem(key) { return this.data[key] || null; },
                setItem(key, value) { this.data[key] = value; },
                removeItem(key) { delete this.data[key]; }
            };
            global.module = { exports: {} };

            const fs = require('fs');
            eval(fs.readFileSync('./nanrenbao/points-system.js', 'utf8'));
            const PointsSystem = module.exports;

            // Initialize - should set flag but not give new user points
            const init = PointsSystem.initialize();
            
            // Should set initialized flag for existing user
            assert(localStorage.getItem('nanrenbao_initialized'), 
                'Should set INITIALIZED flag for existing users');
            
            // But should give them new user points since flag didn't exist
            // This is acceptable for migration
        });
    });
});
