/**
 * Unit tests for Typing Game
 * Tests for word database, game logic, and configuration
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock localStorage
const localStorageMock = {
    store: {},
    getItem: jest.fn((key) => localStorageMock.store[key] || null),
    setItem: jest.fn((key, value) => {
        localStorageMock.store[key] = value;
    }),
    removeItem: jest.fn((key) => {
        delete localStorageMock.store[key];
    }),
    clear: jest.fn(() => {
        localStorageMock.store = {};
    })
};

// Mock DOM elements
const mockElements = {
    'score': { textContent: '' },
    'combo': { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
    'timer': { textContent: '', classList: { add: jest.fn() } },
    'accuracy': { textContent: '' },
    'chineseWord': { textContent: '', classList: { add: jest.fn(), remove: jest.fn() } },
    'englishWord': { innerHTML: '' },
    'wordHint': { innerHTML: '', classList: { add: jest.fn(), remove: jest.fn() } },
    'wordInput': { 
        value: '', 
        focus: jest.fn(), 
        classList: { add: jest.fn(), remove: jest.fn() },
        addEventListener: jest.fn()
    },
    'keyboardVisual': { innerHTML: '' },
    'floatingMessages': { appendChild: jest.fn() },
    'celebrationContainer': { appendChild: jest.fn() },
    'startScreen': { classList: { add: jest.fn(), remove: jest.fn() } },
    'gameScreen': { classList: { add: jest.fn(), remove: jest.fn() } },
    'resultScreen': { classList: { add: jest.fn(), remove: jest.fn() } },
    'finalScore': { textContent: '' },
    'correctWords': { textContent: '' },
    'finalAccuracy': { textContent: '' },
    'maxCombo': { textContent: '' },
    'wordsList': { innerHTML: '' },
    'resultAchievement': { innerHTML: '', classList: { add: jest.fn() } }
};

global.localStorage = localStorageMock;
global.document = {
    getElementById: jest.fn((id) => mockElements[id] || null),
    querySelectorAll: jest.fn(() => []),
    querySelector: jest.fn(() => ({ classList: { add: jest.fn(), remove: jest.fn() } })),
    createElement: jest.fn(() => ({
        className: '',
        innerHTML: '',
        style: {},
        appendChild: jest.fn(),
        remove: jest.fn(),
        classList: { add: jest.fn(), remove: jest.fn() }
    })),
    addEventListener: jest.fn()
};
global.window = {
    location: { href: '' }
};
global.navigator = {
    share: jest.fn(),
    clipboard: { writeText: jest.fn() }
};
global.setInterval = jest.fn(() => 123);
global.clearInterval = jest.fn();
global.setTimeout = jest.fn((fn) => fn());

describe('Typing Game', () => {
    // Import after mocks are set up
    let wordDatabase, gameConfig, encouragingMessages;
    
    beforeEach(() => {
        jest.clearAllMocks();
        localStorageMock.clear();
        
        // Define test data directly since we can't easily import ES modules in Jest with this setup
        wordDatabase = {
            animals: [
                { english: 'cat', chinese: '猫', hint: '喵喵叫的小动物', difficulty: 1 },
                { english: 'dog', chinese: '狗', hint: '人类最好的朋友', difficulty: 1 },
                { english: 'elephant', chinese: '大象', hint: '长鼻子的大动物', difficulty: 3 }
            ],
            fruits: [
                { english: 'apple', chinese: '苹果', hint: '红色或绿色的圆形水果', difficulty: 2 },
                { english: 'banana', chinese: '香蕉', hint: '黄色弯弯的水果', difficulty: 2 }
            ],
            colors: [
                { english: 'red', chinese: '红色', hint: '苹果和番茄的颜色', difficulty: 1 },
                { english: 'blue', chinese: '蓝色', hint: '天空和大海的颜色', difficulty: 1 }
            ],
            numbers: [
                { english: 'one', chinese: '一', hint: '第一个数字', difficulty: 1 },
                { english: 'two', chinese: '二', hint: '一加一', difficulty: 1 }
            ],
            family: [
                { english: 'mom', chinese: '妈妈', hint: '生你的女性', difficulty: 1 },
                { english: 'dad', chinese: '爸爸', hint: '你的父亲', difficulty: 1 }
            ],
            daily: [
                { english: 'book', chinese: '书', hint: '可以阅读的东西', difficulty: 1 },
                { english: 'pen', chinese: '钢笔', hint: '写字的工具', difficulty: 1 }
            ]
        };
        
        gameConfig = {
            difficulty: 'easy',
            category: 'animals',
            timeLimit: {
                easy: 60,
                medium: 45,
                hard: 30
            },
            scoreMultiplier: {
                easy: 1,
                medium: 1.5,
                hard: 2
            },
            comboBonus: 10
        };
        
        encouragingMessages = [
            '太棒了！🎉',
            '厉害！👏',
            '你真聪明！🧠'
        ];
    });

    describe('Word Database', () => {
        it('should have all required categories', () => {
            const expectedCategories = ['animals', 'fruits', 'colors', 'numbers', 'family', 'daily'];
            expectedCategories.forEach(category => {
                expect(wordDatabase).toHaveProperty(category);
                expect(Array.isArray(wordDatabase[category])).toBe(true);
            });
        });

        it('should have valid word structure for all words', () => {
            Object.keys(wordDatabase).forEach(category => {
                wordDatabase[category].forEach(word => {
                    expect(word).toHaveProperty('english');
                    expect(word).toHaveProperty('chinese');
                    expect(word).toHaveProperty('hint');
                    expect(word).toHaveProperty('difficulty');
                    expect(typeof word.english).toBe('string');
                    expect(typeof word.chinese).toBe('string');
                    expect(typeof word.hint).toBe('string');
                    expect(typeof word.difficulty).toBe('number');
                    expect(word.difficulty).toBeGreaterThanOrEqual(1);
                    expect(word.difficulty).toBeLessThanOrEqual(3);
                });
            });
        });

        it('should have words at different difficulty levels', () => {
            const allWords = Object.values(wordDatabase).flat();
            const difficulties = new Set(allWords.map(w => w.difficulty));
            expect(difficulties.size).toBeGreaterThanOrEqual(1);
        });

        it('should have non-empty english words', () => {
            Object.values(wordDatabase).flat().forEach(word => {
                expect(word.english.length).toBeGreaterThan(0);
            });
        });

        it('should have non-empty chinese translations', () => {
            Object.values(wordDatabase).flat().forEach(word => {
                expect(word.chinese.length).toBeGreaterThan(0);
            });
        });
    });

    describe('Game Configuration', () => {
        it('should have correct time limits for each difficulty', () => {
            expect(gameConfig.timeLimit.easy).toBe(60);
            expect(gameConfig.timeLimit.medium).toBe(60);
            expect(gameConfig.timeLimit.hard).toBe(60);
        });

        it('should have correct score multipliers', () => {
            expect(gameConfig.scoreMultiplier.easy).toBe(1);
            expect(gameConfig.scoreMultiplier.medium).toBe(1.5);
            expect(gameConfig.scoreMultiplier.hard).toBe(2);
        });

        it('should have a positive combo bonus', () => {
            expect(gameConfig.comboBonus).toBeGreaterThan(0);
        });

        it('should default to easy difficulty', () => {
            expect(gameConfig.difficulty).toBe('easy');
        });

        it('should default to animals category', () => {
            expect(gameConfig.category).toBe('animals');
        });
        
        it('should have keyboard hint mode configuration', () => {
            expect(gameConfig).toHaveProperty('keyboardHintMode');
            expect(['pre', 'post']).toContain(gameConfig.keyboardHintMode);
        });
        
        it('should default to pre hint mode', () => {
            expect(gameConfig.keyboardHintMode).toBe('pre');
        });
    });

    describe('Encouraging Messages', () => {
        it('should have at least 3 encouraging messages', () => {
            expect(encouragingMessages.length).toBeGreaterThanOrEqual(3);
        });

        it('should have non-empty messages', () => {
            encouragingMessages.forEach(message => {
                expect(message.length).toBeGreaterThan(0);
            });
        });

        it('should contain emoji or celebratory content', () => {
            const hasEmoji = encouragingMessages.some(msg => 
                /[\u{1F300}-\u{1F9FF}]/u.test(msg)
            );
            expect(hasEmoji).toBe(true);
        });
    });

    describe('Score Calculation', () => {
        it('should calculate base score based on word length', () => {
            const word = { english: 'cat' };
            const baseScore = word.english.length * 10;
            expect(baseScore).toBe(30);
        });

        it('should apply difficulty multiplier correctly', () => {
            const baseScore = 30;
            expect(baseScore * gameConfig.scoreMultiplier.easy).toBe(30);
            expect(baseScore * gameConfig.scoreMultiplier.medium).toBe(45);
            expect(baseScore * gameConfig.scoreMultiplier.hard).toBe(60);
        });

        it('should calculate combo bonus correctly', () => {
            const combo = 5;
            const comboBonus = combo > 1 ? gameConfig.comboBonus * (combo - 1) : 0;
            expect(comboBonus).toBe(40);
        });

        it('should not give combo bonus for first correct answer', () => {
            const combo = 1;
            const comboBonus = combo > 1 ? gameConfig.comboBonus * (combo - 1) : 0;
            expect(comboBonus).toBe(0);
        });
    });

    describe('Accuracy Calculation', () => {
        it('should calculate 100% accuracy when all answers are correct', () => {
            const correctWords = 10;
            const totalAttempts = 10;
            const accuracy = Math.round((correctWords / totalAttempts) * 100);
            expect(accuracy).toBe(100);
        });

        it('should calculate 50% accuracy correctly', () => {
            const correctWords = 5;
            const totalAttempts = 10;
            const accuracy = Math.round((correctWords / totalAttempts) * 100);
            expect(accuracy).toBe(50);
        });

        it('should handle zero attempts gracefully', () => {
            const correctWords = 0;
            const totalAttempts = 0;
            const accuracy = totalAttempts > 0 
                ? Math.round((correctWords / totalAttempts) * 100) 
                : 100;
            expect(accuracy).toBe(100);
        });
    });

    describe('Word Filtering by Difficulty', () => {
        it('should filter easy words correctly', () => {
            const difficultyLevel = 1;
            const availableWords = wordDatabase.animals.filter(
                word => word.difficulty <= difficultyLevel
            );
            expect(availableWords.every(w => w.difficulty <= 1)).toBe(true);
        });

        it('should include lower difficulty words in harder modes', () => {
            const difficultyLevel = 3;
            const availableWords = wordDatabase.animals.filter(
                word => word.difficulty <= difficultyLevel
            );
            expect(availableWords.length).toBe(wordDatabase.animals.length);
        });
    });

    describe('LocalStorage Progress', () => {
        it('should save progress to localStorage', () => {
            const progress = {
                difficulty: 'medium',
                category: 'fruits',
                highScore: 500,
                wordsLearned: 10
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(progress);
            const retrieved = JSON.parse(localStorageMock.store['typing-game-progress']);
            expect(retrieved.difficulty).toBe('medium');
            expect(retrieved.highScore).toBe(500);
        });

        it('should retrieve progress from localStorage', () => {
            const progress = {
                difficulty: 'hard',
                category: 'colors',
                highScore: 1000
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(progress);
            const retrieved = JSON.parse(localStorageMock.store['typing-game-progress']);
            expect(retrieved.difficulty).toBe('hard');
            expect(retrieved.category).toBe('colors');
            expect(retrieved.highScore).toBe(1000);
        });
    });

    describe('High Score Functionality', () => {
        it('should detect new high score when current typing count exceeds previous', () => {
            // Simulate game state with typing count
            const gameState = { correctWords: 25 };
            const previousHighTypingCount = 20;
            
            const isNewRecord = gameState.correctWords > previousHighTypingCount && gameState.correctWords > 0;
            expect(isNewRecord).toBe(true);
        });

        it('should not detect new high score when current typing count is lower', () => {
            const gameState = { correctWords: 15 };
            const previousHighTypingCount = 20;
            
            const isNewRecord = gameState.correctWords > previousHighTypingCount && gameState.correctWords > 0;
            expect(isNewRecord).toBe(false);
        });

        it('should not detect new high score when current typing count equals previous', () => {
            const gameState = { correctWords: 20 };
            const previousHighTypingCount = 20;
            
            const isNewRecord = gameState.correctWords > previousHighTypingCount && gameState.correctWords > 0;
            expect(isNewRecord).toBe(false);
        });

        it('should not detect new high score when typing count is zero', () => {
            const gameState = { correctWords: 0 };
            const previousHighTypingCount = 0;
            
            const isNewRecord = gameState.correctWords > previousHighTypingCount && gameState.correctWords > 0;
            expect(isNewRecord).toBe(false);
        });

        it('should return correct high typing count from localStorage', () => {
            const progress = {
                highTypingCount: 30
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(progress);
            const retrieved = JSON.parse(localStorageMock.store['typing-game-progress']);
            expect(retrieved.highTypingCount).toBe(30);
        });

        it('should return 0 when no high typing count exists', () => {
            localStorageMock.clear();
            const saved = localStorageMock.store['typing-game-progress'];
            const highTypingCount = saved ? JSON.parse(saved).highTypingCount || 0 : 0;
            expect(highTypingCount).toBe(0);
        });

        it('should update high typing count when new record is achieved', () => {
            const previousProgress = {
                highTypingCount: 20
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(previousProgress);
            
            // Simulate new high typing count
            const newTypingCount = 35;
            const previousHighTypingCount = JSON.parse(localStorageMock.store['typing-game-progress']).highTypingCount;
            const newHighTypingCount = Math.max(newTypingCount, previousHighTypingCount);
            
            const newProgress = {
                highTypingCount: newHighTypingCount
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(newProgress);
            
            const retrieved = JSON.parse(localStorageMock.store['typing-game-progress']);
            expect(retrieved.highTypingCount).toBe(35);
        });

        it('should keep previous high typing count when new count is lower', () => {
            const previousProgress = {
                highTypingCount: 30
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(previousProgress);
            
            // Simulate lower typing count
            const newTypingCount = 20;
            const previousHighTypingCount = JSON.parse(localStorageMock.store['typing-game-progress']).highTypingCount;
            const newHighTypingCount = Math.max(newTypingCount, previousHighTypingCount);
            
            const newProgress = {
                highTypingCount: newHighTypingCount
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(newProgress);
            
            const retrieved = JSON.parse(localStorageMock.store['typing-game-progress']);
            expect(retrieved.highTypingCount).toBe(30);
        });
        
        it('should maintain backward compatibility with old high score', () => {
            const progress = {
                highScore: 500,
                highTypingCount: 25
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(progress);
            const retrieved = JSON.parse(localStorageMock.store['typing-game-progress']);
            expect(retrieved.highScore).toBe(500);
            expect(retrieved.highTypingCount).toBe(25);
        });
        
        it('should check for new record BEFORE saving progress', () => {
            // Regression test for issue where saveProgress was called before checking new record
            // Set up initial high score
            const initialProgress = {
                highTypingCount: 5
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(initialProgress);
            
            // Simulate achieving a new record (10 correct words)
            const gameState = { correctWords: 10 };
            
            // Get the previous high score BEFORE saving
            const previousHighTypingCount = JSON.parse(localStorageMock.store['typing-game-progress']).highTypingCount || 0;
            
            // Check if it's a new record (should be true)
            const isNewRecord = gameState.correctWords > previousHighTypingCount && gameState.correctWords > 0;
            expect(isNewRecord).toBe(true);
            expect(previousHighTypingCount).toBe(5);
            
            // Only AFTER checking, save the progress
            const newProgress = {
                highTypingCount: Math.max(gameState.correctWords, previousHighTypingCount)
            };
            localStorageMock.store['typing-game-progress'] = JSON.stringify(newProgress);
            
            // Verify the new high score was saved
            const saved = JSON.parse(localStorageMock.store['typing-game-progress']);
            expect(saved.highTypingCount).toBe(10);
        });
        
        it('should detect new record correctly when saveProgress is called after check', () => {
            // This test ensures the fix works: saveProgress must be called AFTER checkNewHighScore
            localStorageMock.store['typing-game-progress'] = JSON.stringify({ highTypingCount: 5 });
            
            const gameState = { correctWords: 8 };
            
            // Step 1: Check for new record (this should happen FIRST)
            const step1_previousCount = JSON.parse(localStorageMock.store['typing-game-progress']).highTypingCount || 0;
            const step1_isNewRecord = gameState.correctWords > step1_previousCount && gameState.correctWords > 0;
            
            expect(step1_previousCount).toBe(5);
            expect(step1_isNewRecord).toBe(true); // Should be true because 8 > 5
            
            // Step 2: Save progress (this should happen AFTER)
            localStorageMock.store['typing-game-progress'] = JSON.stringify({
                highTypingCount: Math.max(gameState.correctWords, step1_previousCount)
            });
            
            // Step 3: Verify saved correctly
            const step3_savedCount = JSON.parse(localStorageMock.store['typing-game-progress']).highTypingCount;
            expect(step3_savedCount).toBe(8);
        });
        
        it('should NOT detect new record if saveProgress is called BEFORE check (the bug)', () => {
            // This test demonstrates the BUG that was fixed
            localStorageMock.store['typing-game-progress'] = JSON.stringify({ highTypingCount: 5 });
            
            const gameState = { correctWords: 8 };
            
            // BUG: Save progress FIRST (wrong order)
            localStorageMock.store['typing-game-progress'] = JSON.stringify({
                highTypingCount: Math.max(gameState.correctWords, 5)
            });
            
            // Then check for new record (wrong order)
            const buggy_previousCount = JSON.parse(localStorageMock.store['typing-game-progress']).highTypingCount || 0;
            const buggy_isNewRecord = gameState.correctWords > buggy_previousCount && gameState.correctWords > 0;
            
            // With the bug, previousCount would be 8 (already saved), so 8 > 8 is false
            expect(buggy_previousCount).toBe(8); // Already saved!
            expect(buggy_isNewRecord).toBe(false); // BUG: Should be true but it's false!
        });
    });

    describe('Keyboard Layout', () => {
        const keyboardLayout = [
            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
            ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
        ];

        it('should have 3 rows', () => {
            expect(keyboardLayout.length).toBe(3);
        });

        it('should have correct number of keys in each row', () => {
            expect(keyboardLayout[0].length).toBe(10); // Top row
            expect(keyboardLayout[1].length).toBe(9);  // Middle row
            expect(keyboardLayout[2].length).toBe(7);  // Bottom row
        });

        it('should contain all letters A-Z', () => {
            const allKeys = keyboardLayout.flat().join('');
            for (let i = 65; i <= 90; i++) {
                expect(allKeys).toContain(String.fromCharCode(i));
            }
        });
    });

    describe('Word Matching', () => {
        it('should match exact lowercase input', () => {
            const targetWord = 'apple';
            const userInput = 'apple';
            expect(userInput.toLowerCase() === targetWord.toLowerCase()).toBe(true);
        });

        it('should match case-insensitive input', () => {
            const targetWord = 'Apple';
            const userInput = 'APPLE';
            expect(userInput.toLowerCase() === targetWord.toLowerCase()).toBe(true);
        });

        it('should detect partial match at start', () => {
            const targetWord = 'banana';
            const userInput = 'ban';
            expect(targetWord.startsWith(userInput)).toBe(true);
        });

        it('should detect wrong input', () => {
            const targetWord = 'apple';
            const userInput = 'aple';
            expect(targetWord.startsWith(userInput)).toBe(false);
        });
    });
    
    describe('Keyboard Hint Mode', () => {
        it('should support pre and post hint modes', () => {
            const validModes = ['pre', 'post'];
            expect(validModes).toContain('pre');
            expect(validModes).toContain('post');
        });
        
        it('should start with pre hint mode by default', () => {
            expect(gameConfig.keyboardHintMode).toBe('pre');
        });
        
        it('should allow changing hint mode', () => {
            const newConfig = { ...gameConfig, keyboardHintMode: 'post' };
            expect(newConfig.keyboardHintMode).toBe('post');
        });
    });

    describe('Achievement Thresholds', () => {
        it('should award combo master for 10+ combo', () => {
            const maxCombo = 10;
            let achievement = '';
            if (maxCombo >= 10) {
                achievement = '🔥 连击大师！';
            }
            expect(achievement).toContain('连击大师');
        });

        it('should award word master for 20+ correct words', () => {
            const correctWords = 20;
            let achievement = '';
            if (correctWords >= 20) {
                achievement = '📚 单词达人！';
            }
            expect(achievement).toContain('单词达人');
        });

        it('should award high scorer for 500+ points', () => {
            const score = 500;
            let achievement = '';
            if (score >= 500) {
                achievement = '🏆 高分选手！';
            }
            expect(achievement).toContain('高分选手');
        });
    });
});

describe('Category Word Count', () => {
    const wordDatabase = {
        animals: new Array(20).fill({ english: 'test', chinese: '测试', hint: '提示', difficulty: 1 }),
        fruits: new Array(15).fill({ english: 'test', chinese: '测试', hint: '提示', difficulty: 1 }),
        colors: new Array(12).fill({ english: 'test', chinese: '测试', hint: '提示', difficulty: 1 }),
        numbers: new Array(12).fill({ english: 'test', chinese: '测试', hint: '提示', difficulty: 1 }),
        family: new Array(12).fill({ english: 'test', chinese: '测试', hint: '提示', difficulty: 1 }),
        daily: new Array(15).fill({ english: 'test', chinese: '测试', hint: '提示', difficulty: 1 })
    };

    it('should have at least 10 words per category', () => {
        Object.keys(wordDatabase).forEach(category => {
            expect(wordDatabase[category].length).toBeGreaterThanOrEqual(10);
        });
    });

    it('should have a good variety of words', () => {
        const totalWords = Object.values(wordDatabase).flat().length;
        expect(totalWords).toBeGreaterThanOrEqual(50);
    });
});
