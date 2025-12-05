/**
 * Unit tests for Mini-Games in Typing Game
 * Tests that reward mini-games are properly implemented
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Mini-Games Implementation', () => {
    let appJsContent;
    
    beforeEach(() => {
        // Read the app.js file content
        appJsContent = readFileSync(join(__dirname, 'app.js'), 'utf8');
    });
    
    describe('Game Implementation Status', () => {
        it('should have Match-3 game fully implemented', () => {
            const match3Function = appJsContent.match(/function initMatch3Game\(container\)\s*{([\s\S]*?)^}/m);
            expect(match3Function).toBeTruthy();
            expect(match3Function[0]).not.toContain('敬请期待');
            expect(match3Function[0]).not.toContain('Coming soon');
            expect(match3Function[0].length).toBeGreaterThan(500); // Should have substantial implementation
        });
        
        it('should have Bubble Shooter game fully implemented', () => {
            const bubbleFunction = appJsContent.match(/function initBubbleGame\(container\)\s*{([\s\S]*?)^}/m);
            expect(bubbleFunction).toBeTruthy();
            expect(bubbleFunction[0]).not.toContain('敬请期待');
            expect(bubbleFunction[0]).not.toContain('Coming soon');
            expect(bubbleFunction[0].length).toBeGreaterThan(500);
        });
        
        it('should have Maze game fully implemented', () => {
            const mazeFunction = appJsContent.match(/function initMazeGame\(container\)\s*{([\s\S]*?)^}/m);
            expect(mazeFunction).toBeTruthy();
            expect(mazeFunction[0]).not.toContain('敬请期待');
            expect(mazeFunction[0]).not.toContain('Coming soon');
            expect(mazeFunction[0].length).toBeGreaterThan(500);
        });
        
        it('should have Jump game fully implemented', () => {
            const jumpFunction = appJsContent.match(/function initJumpGame\(container\)\s*{([\s\S]*?)^}/m);
            expect(jumpFunction).toBeTruthy();
            expect(jumpFunction[0]).not.toContain('敬请期待');
            expect(jumpFunction[0]).not.toContain('Coming soon');
            expect(jumpFunction[0].length).toBeGreaterThan(500);
        });
        
        it('should have Puzzle game fully implemented', () => {
            const puzzleFunction = appJsContent.match(/function initPuzzleGame\(container\)\s*{([\s\S]*?)^}/m);
            expect(puzzleFunction).toBeTruthy();
            expect(puzzleFunction[0]).not.toContain('敬请期待');
            expect(puzzleFunction[0]).not.toContain('Coming soon');
            expect(puzzleFunction[0].length).toBeGreaterThan(500);
        });
        
        it('should have Breakout game fully implemented', () => {
            const breakoutFunction = appJsContent.match(/function initBreakoutGame\(container\)\s*{([\s\S]*?)^}/m);
            expect(breakoutFunction).toBeTruthy();
            expect(breakoutFunction[0]).not.toContain('敬请期待');
            expect(breakoutFunction[0]).not.toContain('Coming soon');
            expect(breakoutFunction[0].length).toBeGreaterThan(500);
        });
    });
    
    describe('Match-3 Game Features', () => {
        it('should have grid initialization', () => {
            expect(appJsContent).toContain('gridSize');
            expect(appJsContent).toContain('gemTypes');
        });
        
        it('should have match detection logic', () => {
            expect(appJsContent).toContain('findMatches');
            expect(appJsContent).toContain('checkMatch');
        });
        
        it('should have gem swapping functionality', () => {
            expect(appJsContent).toContain('selectGem');
        });
        
        it('should have scoring system', () => {
            const match3Section = appJsContent.match(/function initMatch3Game[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(match3Section).toContain('score');
        });
    });
    
    describe('Bubble Shooter Game Features', () => {
        it('should have canvas element', () => {
            const bubbleSection = appJsContent.match(/function initBubbleGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(bubbleSection).toContain('canvas');
            expect(bubbleSection).toContain('getContext');
        });
        
        it('should have bubble shooting mechanism', () => {
            const bubbleSection = appJsContent.match(/function initBubbleGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(bubbleSection).toContain('shootBubble');
        });
        
        it('should have bubble color system', () => {
            const bubbleSection = appJsContent.match(/function initBubbleGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(bubbleSection).toContain('bubbleColors');
        });
    });
    
    describe('Maze Game Features', () => {
        it('should have maze generation', () => {
            const mazeSection = appJsContent.match(/function initMazeGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(mazeSection).toContain('generateMaze');
        });
        
        it('should have player movement', () => {
            const mazeSection = appJsContent.match(/function initMazeGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(mazeSection).toContain('movePlayer');
        });
        
        it('should have goal detection', () => {
            const mazeSection = appJsContent.match(/function initMazeGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(mazeSection).toContain('goal');
        });
    });
    
    describe('Jump Game Features', () => {
        it('should have jumping mechanism', () => {
            const jumpSection = appJsContent.match(/function initJumpGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(jumpSection).toContain('isJumping');
        });
        
        it('should have obstacle system', () => {
            const jumpSection = appJsContent.match(/function initJumpGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(jumpSection).toContain('obstacles');
        });
        
        it('should have gravity physics', () => {
            const jumpSection = appJsContent.match(/function initJumpGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(jumpSection).toContain('vy'); // vertical velocity
        });
    });
    
    describe('Puzzle Game Features', () => {
        it('should have tile system', () => {
            const puzzleSection = appJsContent.match(/function initPuzzleGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(puzzleSection).toContain('tiles');
        });
        
        it('should have tile movement', () => {
            const puzzleSection = appJsContent.match(/function initPuzzleGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(puzzleSection).toContain('moveTile');
        });
        
        it('should have win detection', () => {
            const puzzleSection = appJsContent.match(/function initPuzzleGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(puzzleSection).toContain('checkWin');
        });
    });
    
    describe('Breakout Game Features', () => {
        it('should have paddle control', () => {
            const breakoutSection = appJsContent.match(/function initBreakoutGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(breakoutSection).toContain('paddle');
        });
        
        it('should have ball physics', () => {
            const breakoutSection = appJsContent.match(/function initBreakoutGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(breakoutSection).toContain('ball');
            expect(breakoutSection).toContain('dx');
            expect(breakoutSection).toContain('dy');
        });
        
        it('should have brick system', () => {
            const breakoutSection = appJsContent.match(/function initBreakoutGame[\s\S]*?(?=function init[A-Z]|$)/)[0];
            expect(breakoutSection).toContain('bricks');
        });
    });
    
    describe('Game Loading Function', () => {
        it('should have loadMiniGame function that calls all game initializers', () => {
            expect(appJsContent).toContain('function loadMiniGame');
            expect(appJsContent).toContain("case 'match3':");
            expect(appJsContent).toContain("case 'bubble':");
            expect(appJsContent).toContain("case 'maze':");
            expect(appJsContent).toContain("case 'jump':");
            expect(appJsContent).toContain("case 'puzzle':");
            expect(appJsContent).toContain("case 'breakout':");
        });
        
        it('should call initMatch3Game for match3 type', () => {
            const loadMiniGameFunction = appJsContent.match(/function loadMiniGame[\s\S]*?(?=^function [a-z]|$)/m);
            expect(loadMiniGameFunction[0]).toContain("initMatch3Game(canvas)");
        });
    });
    
    describe('No Placeholder Messages', () => {
        it('should not contain any "Coming Soon" placeholder messages in mini-games', () => {
            const miniGamesFunctions = [
                'initMatch3Game',
                'initBubbleGame', 
                'initMazeGame',
                'initJumpGame',
                'initPuzzleGame',
                'initBreakoutGame'
            ];
            
            miniGamesFunctions.forEach(funcName => {
                const funcRegex = new RegExp(`function ${funcName}[\\s\\S]*?(?=function init[A-Z]|$)`);
                const funcContent = appJsContent.match(funcRegex);
                if (funcContent) {
                    expect(funcContent[0]).not.toContain('敬请期待');
                    expect(funcContent[0]).not.toContain('Coming soon');
                }
            });
        });
    });
});

describe('Regression Tests - Mini-Games', () => {
    it('should maintain existing working mini-games', () => {
        const appJsContent = readFileSync(join(__dirname, 'app.js'), 'utf8');
        
        // These games were already working
        expect(appJsContent).toContain('function initMemoryGame');
        expect(appJsContent).toContain('function initWhackAMoleGame');
        expect(appJsContent).toContain('function initSnakeGame');
        expect(appJsContent).toContain('function initCatchGame');
    });
    
    it('should keep all game options in the modal', () => {
        const indexHtmlContent = readFileSync(join(__dirname, 'index.html'), 'utf8');
        
        const gameButtons = [
            'memory',
            'whackamole',
            'snake',
            'catch',
            'bubble',
            'maze',
            'match3',
            'jump',
            'puzzle',
            'breakout'
        ];
        
        gameButtons.forEach(game => {
            expect(indexHtmlContent).toContain(`playRewardGame('${game}')`);
        });
    });
});
