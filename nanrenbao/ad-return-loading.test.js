/**
 * Test for ad return loading bug fix
 * Bug: After watching ad, points and images don't load until page refresh
 * Fix: Move handleAdReturn() into DOMContentLoaded event
 */

const assert = require('assert');

describe('Ad Return Loading Bug Fix', () => {
    describe('Execution Order', () => {
        it('should define handleAdReturn before DOMContentLoaded', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdReturnDefIndex = html.indexOf('function handleAdReturn');
            const domContentLoadedIndex = html.indexOf('DOMContentLoaded');
            
            assert(handleAdReturnDefIndex < domContentLoadedIndex,
                'handleAdReturn should be defined before DOMContentLoaded listener');
        });

        it('should call handleAdReturn inside DOMContentLoaded', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const domContentSection = html.substring(
                html.indexOf('DOMContentLoaded'),
                html.indexOf('</script>', html.indexOf('DOMContentLoaded'))
            );
            
            assert(domContentSection.includes('handleAdReturn()'),
                'handleAdReturn() should be called inside DOMContentLoaded');
        });

        it('should call handleAdReturn before loadImages', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const domContentSection = html.substring(
                html.indexOf('DOMContentLoaded'),
                html.indexOf('</script>', html.indexOf('DOMContentLoaded'))
            );
            
            const handleAdIndex = domContentSection.indexOf('handleAdReturn()');
            const loadImagesIndex = domContentSection.indexOf('loadImages()');
            
            assert(handleAdIndex > 0, 'handleAdReturn() should be in DOMContentLoaded');
            assert(loadImagesIndex > 0, 'loadImages() should be in DOMContentLoaded');
            assert(handleAdIndex < loadImagesIndex,
                'handleAdReturn() should be called before loadImages()');
        });

        it('should NOT call handleAdReturn during initialization', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            // Check the initialization section (before DOMContentLoaded)
            const initSection = html.substring(
                html.indexOf('// Initialize points system'),
                html.indexOf('DOMContentLoaded')
            );
            
            assert(!initSection.includes('handleAdReturn()'),
                'handleAdReturn() should NOT be called during initialization');
        });
    });

    describe('Function Dependencies', () => {
        it('should have updatePointsDisplay defined before handleAdReturn is called', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const updatePointsDefIndex = html.indexOf('function updatePointsDisplay');
            const handleAdReturnCallIndex = html.lastIndexOf('handleAdReturn()');
            
            assert(updatePointsDefIndex < handleAdReturnCallIndex,
                'updatePointsDisplay must be defined before handleAdReturn is called');
        });

        it('should have showPointsNotification defined before handleAdReturn is called', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const showNotificationDefIndex = html.indexOf('function showPointsNotification');
            const handleAdReturnCallIndex = html.lastIndexOf('handleAdReturn()');
            
            assert(showNotificationDefIndex < handleAdReturnCallIndex,
                'showPointsNotification must be defined before handleAdReturn is called');
        });

        it('should initialize PointsSystem before handleAdReturn is called', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const pointsInitIndex = html.indexOf('PointsSystem.initialize()');
            const handleAdReturnCallIndex = html.lastIndexOf('handleAdReturn()');
            
            assert(pointsInitIndex < handleAdReturnCallIndex,
                'PointsSystem must be initialized before handleAdReturn is called');
        });
    });

    describe('DOM Element Access', () => {
        it('should access DOM elements after DOMContentLoaded', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            // Check that pointsValueElement and pointsNotification are defined
            assert(html.includes('document.getElementById(\'pointsValue\')'),
                'Should access pointsValue element');
            assert(html.includes('document.getElementById(\'pointsNotification\')'),
                'Should access pointsNotification element');
        });

        it('should have gallery element available when loadImages is called', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const loadImagesSection = html.substring(
                html.indexOf('async function loadImages'),
                html.indexOf('window.addEventListener(\'DOMContentLoaded\'')
            );
            
            assert(loadImagesSection.includes('document.getElementById(\'gallery\')'),
                'loadImages should access gallery element');
            assert(loadImagesSection.includes('document.getElementById(\'loading\')'),
                'loadImages should access loading element');
        });
    });

    describe('URL Parameter Handling', () => {
        it('should check for finishedAd parameter', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdReturnFunc = html.substring(
                html.indexOf('function handleAdReturn'),
                html.indexOf('function showAdForPoints')
            );
            
            assert(handleAdReturnFunc.includes('URLSearchParams'),
                'Should use URLSearchParams');
            assert(handleAdReturnFunc.includes('finishedAd'),
                'Should check finishedAd parameter');
        });

        it('should clean URL after processing ad return', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdReturnFunc = html.substring(
                html.indexOf('function handleAdReturn'),
                html.indexOf('function showAdForPoints')
            );
            
            assert(handleAdReturnFunc.includes('window.history.replaceState'),
                'Should clean URL using replaceState');
            assert(handleAdReturnFunc.includes('window.location.pathname'),
                'Should use clean pathname');
        });

        it('should update points before cleaning URL', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const handleAdReturnFunc = html.substring(
                html.indexOf('function handleAdReturn'),
                html.indexOf('function showAdForPoints')
            );
            
            const addPointsIndex = handleAdReturnFunc.indexOf('PointsSystem.addPoints');
            const updateDisplayIndex = handleAdReturnFunc.indexOf('updatePointsDisplay');
            const cleanUrlIndex = handleAdReturnFunc.indexOf('window.history.replaceState');
            
            assert(addPointsIndex > 0, 'Should add points');
            assert(updateDisplayIndex > addPointsIndex, 'Should update display after adding points');
            assert(cleanUrlIndex > updateDisplayIndex, 'Should clean URL after updating display');
        });
    });

    describe('Bug Scenario Verification', () => {
        it('should ensure both points and images load on ad return', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const domContentSection = html.substring(
                html.indexOf('DOMContentLoaded'),
                html.indexOf('</script>', html.indexOf('DOMContentLoaded'))
            );
            
            // Both handleAdReturn (points) and loadImages (images) should be in the event
            assert(domContentSection.includes('handleAdReturn()'),
                'Points should be updated in DOMContentLoaded');
            assert(domContentSection.includes('loadImages()'),
                'Images should be loaded in DOMContentLoaded');
        });

        it('should have proper comment explaining the fix', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            const domContentSection = html.substring(
                html.indexOf('// Load images and handle ad return'),
                html.indexOf('</script>', html.indexOf('DOMContentLoaded'))
            );
            
            assert(domContentSection.length > 0,
                'Should have descriptive comment for the event listener');
        });
    });

    describe('No Duplicate Calls', () => {
        it('should call handleAdReturn only once (not counting definition)', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            // Match handleAdReturn() calls but not function definition
            const callPattern = /(?<!function\s)handleAdReturn\(\)/g;
            const matches = html.match(callPattern);
            
            assert(matches && matches.length === 1,
                `handleAdReturn() should be called exactly once, found ${matches ? matches.length : 0}`);
        });

        it('should call loadImages only once (not counting definition)', () => {
            const fs = require('fs');
            const html = fs.readFileSync('./nanrenbao/appreciate.html', 'utf8');
            
            // Match loadImages() calls but not function definition
            const callPattern = /(?<!function\s)loadImages\(\)/g;
            const matches = html.match(callPattern);
            
            assert(matches && matches.length === 1,
                `loadImages() should be called exactly once, found ${matches ? matches.length : 0}`);
        });
    });
});
