/**
 * Typing Game - Fun Vocabulary Learning
 * A typing game to help children learn keyboard and memorize English vocabulary
 */

/**
 * Word database organized by categories
 * Each word has: english, chinese, hint, and difficulty level
 */
const wordDatabase = {
    animals: [
        { english: 'cat', chinese: '猫', hint: '喵喵叫的小动物', difficulty: 1 },
        { english: 'dog', chinese: '狗', hint: '人类最好的朋友', difficulty: 1 },
        { english: 'fish', chinese: '鱼', hint: '在水里游泳的动物', difficulty: 1 },
        { english: 'bird', chinese: '鸟', hint: '在天空飞翔的动物', difficulty: 1 },
        { english: 'pig', chinese: '猪', hint: '农场里粉色的动物', difficulty: 1 },
        { english: 'cow', chinese: '牛', hint: '产牛奶的动物', difficulty: 1 },
        { english: 'duck', chinese: '鸭子', hint: '嘎嘎叫的动物', difficulty: 1 },
        { english: 'hen', chinese: '母鸡', hint: '下蛋的家禽', difficulty: 1 },
        { english: 'horse', chinese: '马', hint: '可以骑的动物', difficulty: 2 },
        { english: 'sheep', chinese: '绵羊', hint: '毛茸茸的动物', difficulty: 2 },
        { english: 'rabbit', chinese: '兔子', hint: '长耳朵的小动物', difficulty: 2 },
        { english: 'monkey', chinese: '猴子', hint: '喜欢爬树的动物', difficulty: 2 },
        { english: 'tiger', chinese: '老虎', hint: '百兽之王', difficulty: 2 },
        { english: 'lion', chinese: '狮子', hint: '有漂亮鬃毛的猛兽', difficulty: 2 },
        { english: 'elephant', chinese: '大象', hint: '长鼻子的大动物', difficulty: 3 },
        { english: 'giraffe', chinese: '长颈鹿', hint: '脖子最长的动物', difficulty: 3 },
        { english: 'panda', chinese: '熊猫', hint: '中国的国宝', difficulty: 2 },
        { english: 'bear', chinese: '熊', hint: '喜欢吃蜂蜜的动物', difficulty: 2 },
        { english: 'snake', chinese: '蛇', hint: '没有脚的爬行动物', difficulty: 2 },
        { english: 'frog', chinese: '青蛙', hint: '呱呱叫的两栖动物', difficulty: 2 }
    ],
    fruits: [
        { english: 'apple', chinese: '苹果', hint: '红色或绿色的圆形水果', difficulty: 2 },
        { english: 'banana', chinese: '香蕉', hint: '黄色弯弯的水果', difficulty: 2 },
        { english: 'orange', chinese: '橙子', hint: '酸酸甜甜的橙色水果', difficulty: 2 },
        { english: 'grape', chinese: '葡萄', hint: '一串一串的小圆果', difficulty: 2 },
        { english: 'peach', chinese: '桃子', hint: '毛茸茸的粉色水果', difficulty: 2 },
        { english: 'pear', chinese: '梨', hint: '像葫芦形状的水果', difficulty: 2 },
        { english: 'mango', chinese: '芒果', hint: '热带黄色水果', difficulty: 2 },
        { english: 'lemon', chinese: '柠檬', hint: '很酸的黄色水果', difficulty: 2 },
        { english: 'melon', chinese: '甜瓜', hint: '夏天吃的大水果', difficulty: 2 },
        { english: 'cherry', chinese: '樱桃', hint: '小小红红的水果', difficulty: 2 },
        { english: 'strawberry', chinese: '草莓', hint: '红色带小籽的水果', difficulty: 3 },
        { english: 'watermelon', chinese: '西瓜', hint: '夏天消暑的大水果', difficulty: 3 },
        { english: 'pineapple', chinese: '菠萝', hint: '外面有刺的热带水果', difficulty: 3 },
        { english: 'coconut', chinese: '椰子', hint: '热带的大坚果', difficulty: 3 },
        { english: 'kiwi', chinese: '猕猴桃', hint: '毛茸茸的绿心水果', difficulty: 2 }
    ],
    colors: [
        { english: 'red', chinese: '红色', hint: '苹果和番茄的颜色', difficulty: 1 },
        { english: 'blue', chinese: '蓝色', hint: '天空和大海的颜色', difficulty: 1 },
        { english: 'green', chinese: '绿色', hint: '树叶和草地的颜色', difficulty: 2 },
        { english: 'yellow', chinese: '黄色', hint: '香蕉和太阳的颜色', difficulty: 2 },
        { english: 'orange', chinese: '橙色', hint: '橘子的颜色', difficulty: 2 },
        { english: 'purple', chinese: '紫色', hint: '葡萄的颜色', difficulty: 2 },
        { english: 'pink', chinese: '粉色', hint: '小猪的颜色', difficulty: 2 },
        { english: 'black', chinese: '黑色', hint: '夜晚的颜色', difficulty: 2 },
        { english: 'white', chinese: '白色', hint: '雪和牛奶的颜色', difficulty: 2 },
        { english: 'brown', chinese: '棕色', hint: '巧克力的颜色', difficulty: 2 },
        { english: 'gray', chinese: '灰色', hint: '大象的颜色', difficulty: 2 },
        { english: 'gold', chinese: '金色', hint: '金子的颜色', difficulty: 2 }
    ],
    numbers: [
        { english: 'one', chinese: '一', hint: '第一个数字', difficulty: 1 },
        { english: 'two', chinese: '二', hint: '一加一', difficulty: 1 },
        { english: 'three', chinese: '三', hint: '三角形的边数', difficulty: 2 },
        { english: 'four', chinese: '四', hint: '正方形的边数', difficulty: 2 },
        { english: 'five', chinese: '五', hint: '一只手的手指数', difficulty: 2 },
        { english: 'six', chinese: '六', hint: '骰子最大的点数', difficulty: 1 },
        { english: 'seven', chinese: '七', hint: '一周的天数', difficulty: 2 },
        { english: 'eight', chinese: '八', hint: '蜘蛛的腿数', difficulty: 2 },
        { english: 'nine', chinese: '九', hint: '十减一', difficulty: 2 },
        { english: 'ten', chinese: '十', hint: '两只手的手指总数', difficulty: 1 },
        { english: 'zero', chinese: '零', hint: '什么都没有的数字', difficulty: 2 },
        { english: 'hundred', chinese: '百', hint: '一百', difficulty: 3 }
    ],
    family: [
        { english: 'mom', chinese: '妈妈', hint: '生你的女性', difficulty: 1 },
        { english: 'dad', chinese: '爸爸', hint: '你的父亲', difficulty: 1 },
        { english: 'mother', chinese: '母亲', hint: '妈妈的正式说法', difficulty: 2 },
        { english: 'father', chinese: '父亲', hint: '爸爸的正式说法', difficulty: 2 },
        { english: 'sister', chinese: '姐姐/妹妹', hint: '女性兄弟姐妹', difficulty: 2 },
        { english: 'brother', chinese: '哥哥/弟弟', hint: '男性兄弟姐妹', difficulty: 2 },
        { english: 'grandma', chinese: '奶奶/外婆', hint: '妈妈或爸爸的妈妈', difficulty: 2 },
        { english: 'grandpa', chinese: '爷爷/外公', hint: '妈妈或爸爸的爸爸', difficulty: 2 },
        { english: 'uncle', chinese: '叔叔/舅舅', hint: '爸爸或妈妈的兄弟', difficulty: 2 },
        { english: 'aunt', chinese: '阿姨/姑姑', hint: '爸爸或妈妈的姐妹', difficulty: 2 },
        { english: 'baby', chinese: '宝宝', hint: '很小的孩子', difficulty: 2 },
        { english: 'family', chinese: '家庭', hint: '一家人', difficulty: 2 }
    ],
    daily: [
        { english: 'book', chinese: '书', hint: '可以阅读的东西', difficulty: 1 },
        { english: 'pen', chinese: '钢笔', hint: '写字的工具', difficulty: 1 },
        { english: 'bag', chinese: '书包', hint: '装东西的袋子', difficulty: 1 },
        { english: 'desk', chinese: '书桌', hint: '写作业用的桌子', difficulty: 2 },
        { english: 'chair', chinese: '椅子', hint: '坐着的家具', difficulty: 2 },
        { english: 'bed', chinese: '床', hint: '睡觉的家具', difficulty: 1 },
        { english: 'door', chinese: '门', hint: '进出房间的通道', difficulty: 2 },
        { english: 'window', chinese: '窗户', hint: '可以看外面的', difficulty: 2 },
        { english: 'table', chinese: '桌子', hint: '吃饭用的家具', difficulty: 2 },
        { english: 'cup', chinese: '杯子', hint: '喝水的容器', difficulty: 1 },
        { english: 'phone', chinese: '手机', hint: '打电话的工具', difficulty: 2 },
        { english: 'clock', chinese: '钟', hint: '显示时间的东西', difficulty: 2 },
        { english: 'lamp', chinese: '灯', hint: '照亮房间的东西', difficulty: 2 },
        { english: 'shoe', chinese: '鞋子', hint: '穿在脚上的', difficulty: 2 },
        { english: 'hat', chinese: '帽子', hint: '戴在头上的', difficulty: 1 }
    ]
};

/**
 * Encouraging messages for correct answers
 */
const encouragingMessages = [
    '太棒了！🎉',
    '厉害！👏',
    '你真聪明！🧠',
    '继续加油！💪',
    '真厉害！⭐',
    '学得真快！🚀',
    '超级棒！🌟',
    '你是最棒的！👍',
    '完美！✨',
    '太优秀了！🏆'
];

/**
 * Game configuration
 */
const gameConfig = {
    difficulty: 'easy',
    category: 'animals',
    timeLimit: {
        easy: 60,
        medium: 60,
        hard: 60
    },
    scoreMultiplier: {
        easy: 1,
        medium: 1.5,
        hard: 2
    },
    comboBonus: 10,
    keyboardHintMode: 'pre' // 'pre' for showing hints before typing, 'post' for showing after keypress
};

/**
 * Game state
 */
let gameState = {
    isPlaying: false,
    isPaused: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correctWords: 0,
    totalAttempts: 0,
    timeRemaining: 60,
    currentWord: null,
    wordsLearned: [],
    timer: null,
    hintsUsed: 0,
    wordsSkipped: 0
};

/**
 * Keyboard layout for visual keyboard
 */
const keyboardLayout = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
];

/**
 * Initialize the game
 */
function initializeGame() {
    try {
        loadProgress();
        renderKeyboard();
        setupEventListeners();
        updateHighScoreDisplay();
        console.log('Typing game initialized successfully');
    } catch (error) {
        console.error('Error initializing game:', error);
    }
}

/**
 * Load saved progress from localStorage
 */
function loadProgress() {
    const savedProgress = localStorage.getItem('typing-game-progress');
    if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        gameConfig.difficulty = progress.difficulty || 'easy';
        gameConfig.category = progress.category || 'animals';
    }
}

/**
 * Save progress to localStorage
 */
function saveProgress() {
    const progress = {
        difficulty: gameConfig.difficulty,
        category: gameConfig.category,
        highScore: getHighScore(), // Keep existing high score
        highTypingCount: Math.max(gameState.correctWords, getHighTypingCount()), // Track typing quantity
        wordsLearned: gameState.wordsLearned.length
    };
    localStorage.setItem('typing-game-progress', JSON.stringify(progress));
}

/**
 * Get high score from localStorage (kept for backward compatibility)
 */
function getHighScore() {
    const saved = localStorage.getItem('typing-game-progress');
    if (saved) {
        const progress = JSON.parse(saved);
        return progress.highScore || 0;
    }
    return 0;
}

/**
 * Get high typing count (number of correct words) from localStorage
 */
function getHighTypingCount() {
    const saved = localStorage.getItem('typing-game-progress');
    if (saved) {
        const progress = JSON.parse(saved);
        return progress.highTypingCount || 0;
    }
    return 0;
}

/**
 * Render the visual keyboard
 */
function renderKeyboard() {
    const container = document.getElementById('keyboardVisual');
    if (!container) return;
    
    let html = '';
    keyboardLayout.forEach((row, rowIndex) => {
        html += `<div class="keyboard-row" style="margin-left: ${rowIndex * 20}px;">`;
        row.forEach(key => {
            html += `<div class="keyboard-key" data-key="${key}" id="key-${key}">${key}</div>`;
        });
        html += '</div>';
    });
    
    container.innerHTML = html;
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    const input = document.getElementById('wordInput');
    if (input) {
        input.addEventListener('input', handleInput);
        input.addEventListener('keydown', handleKeyDown);
    }
    
    // Keyboard highlighting
    document.addEventListener('keydown', (e) => {
        if (gameState.isPlaying && !gameState.isPaused) {
            highlightKey(e.key.toUpperCase(), true);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        highlightKey(e.key.toUpperCase(), false);
    });
}

/**
 * Highlight key on visual keyboard
 */
function highlightKey(key, active) {
    const keyElement = document.getElementById(`key-${key}`);
    if (keyElement) {
        if (active) {
            keyElement.classList.add('active');
        } else {
            keyElement.classList.remove('active');
        }
    }
}

/**
 * Select difficulty level
 */
function selectDifficulty(difficulty) {
    gameConfig.difficulty = difficulty;
    
    // Update UI
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-difficulty="${difficulty}"]`).classList.add('active');
}

/**
 * Select word category
 */
function selectCategory(category) {
    gameConfig.category = category;
    
    // Update UI
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-category="${category}"]`).classList.add('active');
}

/**
 * Select keyboard hint mode
 */
function selectHintMode(mode) {
    gameConfig.keyboardHintMode = mode;
    
    // Update UI
    document.querySelectorAll('.hint-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
}

/**
 * Start the game
 */
function startGame() {
    // Reset game state
    gameState = {
        isPlaying: true,
        isPaused: false,
        score: 0,
        combo: 0,
        maxCombo: 0,
        correctWords: 0,
        totalAttempts: 0,
        timeRemaining: gameConfig.timeLimit[gameConfig.difficulty],
        currentWord: null,
        wordsLearned: [],
        timer: null,
        hintsUsed: 0,
        wordsSkipped: 0
    };
    
    // Update UI
    updateStats();
    showScreen('gameScreen');
    
    // Start timer
    startTimer();
    
    // Get first word
    nextWord();
    
    // Focus input
    setTimeout(() => {
        const input = document.getElementById('wordInput');
        if (input) {
            input.focus();
        }
    }, 100);
}

/**
 * Show a specific screen
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

/**
 * Start the countdown timer
 */
function startTimer() {
    updateTimerDisplay();
    
    gameState.timer = setInterval(() => {
        if (!gameState.isPaused) {
            gameState.timeRemaining--;
            updateTimerDisplay();
            
            if (gameState.timeRemaining <= 0) {
                endGame();
            }
            
            // Warning when time is low
            if (gameState.timeRemaining <= 10) {
                document.getElementById('timer').classList.add('warning');
            }
        }
    }, 1000);
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.textContent = gameState.timeRemaining;
    }
}

/**
 * Get next word to display
 */
function nextWord() {
    const words = wordDatabase[gameConfig.category];
    const difficultyLevel = gameConfig.difficulty === 'easy' ? 1 : 
                           gameConfig.difficulty === 'medium' ? 2 : 3;
    
    // Filter words by difficulty
    const availableWords = words.filter(word => {
        // Include words at or below current difficulty level
        return word.difficulty <= difficultyLevel;
    });
    
    // Get random word
    const randomIndex = Math.floor(Math.random() * availableWords.length);
    gameState.currentWord = availableWords[randomIndex];
    
    // Display word
    displayWord(gameState.currentWord);
    
    // Clear input
    const input = document.getElementById('wordInput');
    if (input) {
        input.value = '';
        input.classList.remove('correct', 'incorrect');
    }
    
    // Hide hint
    document.getElementById('wordHint').classList.remove('visible');
}

/**
 * Display the current word
 */
function displayWord(word) {
    // Chinese word
    const chineseElement = document.getElementById('chineseWord');
    if (chineseElement) {
        chineseElement.textContent = word.chinese;
        chineseElement.classList.add('bounce');
        setTimeout(() => chineseElement.classList.remove('bounce'), 300);
    }
    
    // English word with individual letters
    const englishElement = document.getElementById('englishWord');
    if (englishElement) {
        let html = '';
        for (let i = 0; i < word.english.length; i++) {
            html += `<span class="word-letter" data-index="${i}">${word.english[i]}</span>`;
        }
        englishElement.innerHTML = html;
    }
    
    // Hint
    const hintElement = document.getElementById('wordHint');
    if (hintElement) {
        hintElement.innerHTML = `💡 提示：${word.hint}`;
    }
    
    // Highlight the first key in 'pre' hint mode
    if (gameConfig.keyboardHintMode === 'pre' && word.english.length > 0) {
        highlightNextKey(word.english[0].toUpperCase());
    } else {
        clearKeyboardHighlights();
    }
}

/**
 * Highlight the next key to press on the keyboard
 */
function highlightNextKey(key) {
    clearKeyboardHighlights();
    const keyElement = document.getElementById(`key-${key}`);
    if (keyElement) {
        keyElement.classList.add('next-key');
    }
}

/**
 * Clear all keyboard highlights except active key presses
 */
function clearKeyboardHighlights() {
    document.querySelectorAll('.keyboard-key').forEach(key => {
        key.classList.remove('next-key');
    });
}

/**
 * Handle input changes
 */
function handleInput(e) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const input = e.target;
    const userInput = input.value.toLowerCase();
    const targetWord = gameState.currentWord.english.toLowerCase();
    
    // Highlight matching letters
    highlightMatchingLetters(userInput, targetWord);
    
    // Highlight next key in 'pre' mode
    if (gameConfig.keyboardHintMode === 'pre' && userInput.length < targetWord.length) {
        highlightNextKey(targetWord[userInput.length].toUpperCase());
    } else if (gameConfig.keyboardHintMode === 'pre') {
        clearKeyboardHighlights();
    }
    
    // Check if complete word is typed
    if (userInput === targetWord) {
        handleCorrectAnswer();
    } else if (userInput.length > 0 && !targetWord.startsWith(userInput)) {
        // Wrong input
        input.classList.add('shake');
        setTimeout(() => input.classList.remove('shake'), 300);
        
        // Track attempts
        gameState.totalAttempts++;
        
        // Reset combo on wrong input
        if (gameState.combo > 0) {
            gameState.combo = 0;
            updateStats();
        }
    }
}

/**
 * Handle key down events
 */
function handleKeyDown(e) {
    if (e.key === 'Enter' && gameState.isPlaying && !gameState.isPaused) {
        const input = document.getElementById('wordInput');
        if (input.value.toLowerCase() === gameState.currentWord.english.toLowerCase()) {
            handleCorrectAnswer();
        }
    }
}

/**
 * Highlight matching letters in the displayed word
 */
function highlightMatchingLetters(userInput, targetWord) {
    const letters = document.querySelectorAll('.word-letter');
    letters.forEach((letter, index) => {
        if (index < userInput.length) {
            if (userInput[index] === targetWord[index]) {
                letter.classList.add('correct');
                letter.classList.remove('incorrect');
            } else {
                letter.classList.add('incorrect');
                letter.classList.remove('correct');
            }
        } else {
            letter.classList.remove('correct', 'incorrect');
        }
    });
}

/**
 * Handle correct answer
 */
function handleCorrectAnswer() {
    gameState.correctWords++;
    gameState.totalAttempts++;
    gameState.combo++;
    
    // Track max combo
    if (gameState.combo > gameState.maxCombo) {
        gameState.maxCombo = gameState.combo;
    }
    
    // Calculate score
    const baseScore = gameState.currentWord.english.length * 10;
    const difficultyBonus = baseScore * (gameConfig.scoreMultiplier[gameConfig.difficulty] - 1);
    const comboBonus = gameState.combo > 1 ? gameConfig.comboBonus * (gameState.combo - 1) : 0;
    const totalScore = Math.round(baseScore + difficultyBonus + comboBonus);
    
    gameState.score += totalScore;
    
    // Add to learned words
    if (!gameState.wordsLearned.find(w => w.english === gameState.currentWord.english)) {
        gameState.wordsLearned.push(gameState.currentWord);
    }
    
    // Update stats
    updateStats();
    
    // Show encouragement
    showEncouragement(totalScore);
    
    // Visual feedback
    const input = document.getElementById('wordInput');
    if (input) {
        input.classList.add('correct');
    }
    
    // Celebration effect
    createCelebrationEffect();
    
    // Next word after short delay
    setTimeout(() => {
        nextWord();
    }, 500);
}

/**
 * Update game statistics display
 */
function updateStats() {
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('combo').textContent = gameState.combo;
    
    // Update accuracy
    const accuracy = gameState.totalAttempts > 0 
        ? Math.round((gameState.correctWords / gameState.totalAttempts) * 100) 
        : 100;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
    
    // Combo animation
    if (gameState.combo >= 3) {
        document.getElementById('combo').classList.add('combo-fire');
    } else {
        document.getElementById('combo').classList.remove('combo-fire');
    }
}

/**
 * Show encouraging message
 */
function showEncouragement(score) {
    const message = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];
    
    const container = document.getElementById('floatingMessages');
    const msgElement = document.createElement('div');
    msgElement.className = 'floating-message';
    msgElement.innerHTML = `${message}<br><small>+${score}分</small>`;
    
    // Random position
    msgElement.style.left = `${20 + Math.random() * 60}%`;
    
    container.appendChild(msgElement);
    
    // Remove after animation
    setTimeout(() => {
        msgElement.remove();
    }, 2000);
}

/**
 * Create celebration effect
 */
function createCelebrationEffect() {
    const container = document.getElementById('celebrationContainer');
    
    // Stars effect
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const star = document.createElement('div');
            star.className = 'celebration-star';
            star.innerHTML = '⭐';
            star.style.left = `${20 + Math.random() * 60}%`;
            star.style.animationDelay = `${i * 0.1}s`;
            container.appendChild(star);
            
            setTimeout(() => star.remove(), 1500);
        }, i * 100);
    }
}

/**
 * Show hint for current word
 */
function showHint() {
    const hintElement = document.getElementById('wordHint');
    if (hintElement) {
        hintElement.classList.add('visible');
        gameState.hintsUsed++;
    }
}

/**
 * Skip current word
 */
function skipWord() {
    gameState.wordsSkipped++;
    gameState.combo = 0; // Reset combo
    updateStats();
    nextWord();
}

/**
 * Toggle pause state
 */
function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    
    const pauseBtn = document.querySelector('.pause-btn');
    if (gameState.isPaused) {
        pauseBtn.innerHTML = '▶️ 继续';
        pauseBtn.classList.add('paused');
    } else {
        pauseBtn.innerHTML = '⏸️ 暂停';
        pauseBtn.classList.remove('paused');
        
        // Refocus input
        document.getElementById('wordInput').focus();
    }
}

/**
 * End the game
 */
function endGame() {
    gameState.isPlaying = false;
    
    // Stop timer
    if (gameState.timer) {
        clearInterval(gameState.timer);
    }
    
    // Note: saveProgress() is now called in showResultScreen() after checking for new high score
    // This ensures we can properly detect new records before saving
    
    // Show result screen
    showResultScreen();
}

/**
 * Check if current typing count is a new high record
 * @returns {{isNew: boolean, previousHighTypingCount: number}} Object with new record status and previous high typing count
 */
function checkNewHighScore() {
    const previousHighTypingCount = getHighTypingCount();
    return {
        isNew: gameState.correctWords > previousHighTypingCount && gameState.correctWords > 0,
        previousHighTypingCount: previousHighTypingCount
    };
}

/**
 * Show result screen
 */
function showResultScreen() {
    // Check for new high score BEFORE saving (so we compare with previous record)
    const highScoreResult = checkNewHighScore();
    const newRecord = highScoreResult.isNew;
    const previousHighTypingCount = highScoreResult.previousHighTypingCount;
    
    // Now save progress AFTER checking for new record
    // This ensures the comparison happens with the old record value
    saveProgress();
    
    // Update result stats
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('correctWords').textContent = gameState.correctWords;
    document.getElementById('maxCombo').textContent = gameState.maxCombo;
    
    const accuracy = gameState.totalAttempts > 0 
        ? Math.round((gameState.correctWords / gameState.totalAttempts) * 100) 
        : 0;
    document.getElementById('finalAccuracy').textContent = `${accuracy}%`;
    
    // Update high score display - show typing count as the main record
    const highScoreElement = document.getElementById('highScore');
    if (highScoreElement) {
        const displayHighTypingCount = newRecord ? gameState.correctWords : previousHighTypingCount;
        highScoreElement.textContent = displayHighTypingCount;
    }
    
    // Show learned words
    const wordsList = document.getElementById('wordsList');
    if (wordsList && gameState.wordsLearned.length > 0) {
        let html = '';
        gameState.wordsLearned.forEach(word => {
            html += `
                <div class="learned-word">
                    <span class="word-english">${word.english}</span>
                    <span class="word-chinese">${word.chinese}</span>
                </div>
            `;
        });
        wordsList.innerHTML = html;
    } else if (wordsList) {
        wordsList.innerHTML = '<p>这次没有学习新单词，再试试吧！</p>';
    }
    
    // Show achievement
    showAchievement();
    
    // Show result screen
    showScreen('resultScreen');
    
    // Celebration effects - extra special for new high score!
    if (newRecord) {
        createNewHighScoreCelebration(previousHighTypingCount);
        // Show game reward modal
        showGameRewardModal();
    } else if (gameState.score >= 100) {
        createBigCelebration();
    }
}

/**
 * Show achievement based on performance
 */
function showAchievement() {
    const achievementElement = document.getElementById('resultAchievement');
    if (!achievementElement) return;
    
    let achievement = '';
    
    if (gameState.maxCombo >= 10) {
        achievement = '🔥 连击大师！连续答对10个以上！';
    } else if (gameState.correctWords >= 20) {
        achievement = '📚 单词达人！答对20个以上单词！';
    } else if (gameState.score >= 500) {
        achievement = '🏆 高分选手！获得500分以上！';
    } else if (gameState.correctWords >= 10) {
        achievement = '⭐ 进步明星！答对10个以上单词！';
    } else if (gameState.correctWords >= 5) {
        achievement = '👍 加油选手！继续努力！';
    } else {
        achievement = '💪 初学者！多多练习会更好！';
    }
    
    achievementElement.innerHTML = `<div class="achievement-badge">${achievement}</div>`;
    achievementElement.classList.add('show');
}

/**
 * Create big celebration effect
 */
function createBigCelebration() {
    const container = document.getElementById('celebrationContainer');
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
    
    // Confetti
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
            container.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 4000);
        }, i * 50);
    }
}

/**
 * Create special celebration for new high score
 * @param {number} previousHighTypingCount - The previous high typing count that was beaten
 */
function createNewHighScoreCelebration(previousHighTypingCount) {
    const container = document.getElementById('celebrationContainer');
    const colors = ['#ffd700', '#ff6b6b', '#ff9800', '#ffeb3b', '#ff5722', '#e91e63'];
    
    // Show the new high score banner
    showNewHighScoreBanner(previousHighTypingCount);
    
    // Extra confetti for new high score (more than regular celebration)
    for (let i = 0; i < 100; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti new-record-confetti';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}%`;
            confetti.style.animationDuration = `${2 + Math.random() * 3}s`;
            container.appendChild(confetti);
            
            setTimeout(() => confetti.remove(), 5000);
        }, i * 30);
    }
    
    // Golden stars burst
    for (let i = 0; i < 20; i++) {
        setTimeout(() => {
            const star = document.createElement('div');
            star.className = 'celebration-star new-record-star';
            star.innerHTML = '⭐';
            star.style.left = `${10 + Math.random() * 80}%`;
            star.style.top = `${10 + Math.random() * 40}%`;
            star.style.fontSize = `${24 + Math.random() * 20}px`;
            container.appendChild(star);
            
            setTimeout(() => star.remove(), 3000);
        }, i * 100);
    }
    
    // Firework emoji bursts
    const fireworkEmojis = ['🎆', '🎇', '✨', '💫', '🌟', '🎉', '🎊'];
    for (let i = 0; i < 15; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'celebration-firework';
            firework.innerHTML = fireworkEmojis[Math.floor(Math.random() * fireworkEmojis.length)];
            firework.style.left = `${Math.random() * 100}%`;
            firework.style.top = `${Math.random() * 60}%`;
            firework.style.fontSize = `${30 + Math.random() * 30}px`;
            container.appendChild(firework);
            
            setTimeout(() => firework.remove(), 2500);
        }, i * 150);
    }
}

/**
 * Show the new high score banner with animation
 * @param {number} previousHighTypingCount - The previous high typing count
 */
function showNewHighScoreBanner(previousHighTypingCount) {
    const container = document.getElementById('celebrationContainer');
    
    // Create the banner element
    const banner = document.createElement('div');
    banner.className = 'new-high-score-banner';
    banner.innerHTML = `
        <div class="new-record-title">🏆 新纪录！🏆</div>
        <div class="new-record-score">${gameState.correctWords} 个单词</div>
        <div class="new-record-diff">超越了之前的记录 ${previousHighTypingCount} 个单词！</div>
        <div class="new-record-congrats">🎉 太厉害了！你是最棒的！🎉</div>
    `;
    
    container.appendChild(banner);
    
    // Trigger the animation after a brief delay
    setTimeout(() => {
        banner.classList.add('show');
    }, 100);
    
    // Remove after animation completes
    setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 500);
    }, 6000);
}

/**
 * Update high score display on start screen
 */
function updateHighScoreDisplay() {
    const highScoreDisplayElement = document.getElementById('highScoreDisplay');
    const highTypingCount = getHighTypingCount();
    
    if (highScoreDisplayElement) {
        if (highTypingCount > 0) {
            highScoreDisplayElement.textContent = `历史最高记录：${highTypingCount} 个单词`;
            highScoreDisplayElement.style.display = 'block';
        } else {
            highScoreDisplayElement.textContent = '还没有历史记录，快来挑战吧！';
            highScoreDisplayElement.style.display = 'block';
        }
    }
}

/**
 * Restart the game
 */
function restartGame() {
    startGame();
}

/**
 * Go back to start screen
 */
function backToStart() {
    updateHighScoreDisplay();
    showScreen('startScreen');
}

/**
 * Share result
 */
function shareResult() {
    const text = `我在打字小游戏中获得了 ${gameState.score} 分！学会了 ${gameState.wordsLearned.length} 个新单词！最高连击 ${gameState.maxCombo}！快来挑战我吧！🎮`;
    
    if (navigator.share) {
        navigator.share({
            title: '打字小游戏成绩',
            text: text,
            url: window.location.href
        }).catch(() => {
            // Fallback to clipboard
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('成绩已复制到剪贴板！');
        });
    } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('成绩已复制到剪贴板！');
    }
}

/**
 * Show a toast notification
 */
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 24px;
        border-radius: 25px;
        font-size: 14px;
        z-index: 10000;
        animation: toastFadeIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

/**
 * Navigation functions for mini-program integration
 */
function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: '/pages/index/index',
        });
    } else {
        window.location.href = '../index.html';
    }
}

/**
 * Show game reward modal
 */
function showGameRewardModal() {
    const modal = document.getElementById('gameRewardModal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

/**
 * Skip reward game and close modal
 */
function skipRewardGame() {
    const modal = document.getElementById('gameRewardModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Mini-game state
 */
let miniGameState = {
    timeRemaining: 60,
    timer: null,
    currentGame: null
};

/**
 * Play selected reward game
 */
function playRewardGame(gameType) {
    // Hide the modal
    const modal = document.getElementById('gameRewardModal');
    if (modal) {
        modal.classList.add('hidden');
    }
    
    // Show mini-game container
    const container = document.getElementById('miniGameContainer');
    if (container) {
        container.classList.remove('hidden');
    }
    
    // Set game title
    const titles = {
        memory: '🧠 记忆翻牌',
        whackamole: '🔨 打地鼠',
        snake: '🐍 贪吃蛇',
        catch: '🎯 接水果',
        bubble: '🫧 泡泡龙',
        maze: '🧩 走迷宫',
        match3: '💎 消消乐',
        jump: '🦘 跳跃游戏',
        puzzle: '🧩 拼图游戏',
        breakout: '🎮 打砖块'
    };
    
    const titleElement = document.getElementById('miniGameTitle');
    if (titleElement) {
        titleElement.textContent = titles[gameType] || '游戏时间';
    }
    
    // Initialize game
    miniGameState.currentGame = gameType;
    miniGameState.timeRemaining = 60;
    startMiniGameTimer();
    loadMiniGame(gameType);
}

/**
 * Start mini-game timer
 */
function startMiniGameTimer() {
    updateMiniGameTimer();
    
    miniGameState.timer = setInterval(() => {
        miniGameState.timeRemaining--;
        updateMiniGameTimer();
        
        if (miniGameState.timeRemaining <= 0) {
            exitMiniGame();
        }
    }, 1000);
}

/**
 * Update mini-game timer display
 */
function updateMiniGameTimer() {
    const timerElement = document.getElementById('miniGameTimer');
    if (timerElement) {
        timerElement.textContent = miniGameState.timeRemaining;
    }
}

/**
 * Exit mini-game
 */
function exitMiniGame() {
    // Stop timer
    if (miniGameState.timer) {
        clearInterval(miniGameState.timer);
        miniGameState.timer = null;
    }
    
    // Hide container
    const container = document.getElementById('miniGameContainer');
    if (container) {
        container.classList.add('hidden');
    }
    
    // Clean up game
    const canvas = document.getElementById('miniGameCanvas');
    if (canvas) {
        canvas.innerHTML = '';
    }
    
    miniGameState.currentGame = null;
}

/**
 * Load and initialize the selected mini-game
 */
function loadMiniGame(gameType) {
    const canvas = document.getElementById('miniGameCanvas');
    if (!canvas) return;
    
    // Clear previous content
    canvas.innerHTML = '';
    
    // Load the appropriate game
    switch(gameType) {
        case 'memory':
            initMemoryGame(canvas);
            break;
        case 'whackamole':
            initWhackAMoleGame(canvas);
            break;
        case 'snake':
            initSnakeGame(canvas);
            break;
        case 'catch':
            initCatchGame(canvas);
            break;
        case 'bubble':
            initBubbleGame(canvas);
            break;
        case 'maze':
            initMazeGame(canvas);
            break;
        case 'match3':
            initMatch3Game(canvas);
            break;
        case 'jump':
            initJumpGame(canvas);
            break;
        case 'puzzle':
            initPuzzleGame(canvas);
            break;
        case 'breakout':
            initBreakoutGame(canvas);
            break;
        default:
            canvas.innerHTML = '<p style="color: #666;">游戏加载中...</p>';
    }
}

/**
 * Memory Card Game
 */
function initMemoryGame(container) {
    const emojis = ['🐱', '🐶', '🐼', '🦊', '🐸', '🐰', '🦁', '🐯'];
    const cards = [...emojis, ...emojis].sort(() => Math.random() - 0.5);
    
    let flippedCards = [];
    let matchedPairs = 0;
    
    const gameBoard = document.createElement('div');
    gameBoard.style.cssText = 'display: grid; grid-template-columns: repeat(4, 100px); gap: 10px;';
    
    cards.forEach((emoji, index) => {
        const card = document.createElement('div');
        card.style.cssText = `
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 50px;
            cursor: pointer;
            transition: transform 0.3s;
        `;
        card.dataset.emoji = emoji;
        card.dataset.index = index;
        
        card.addEventListener('click', () => {
            if (flippedCards.length < 2 && !card.classList.contains('flipped')) {
                card.textContent = emoji;
                card.classList.add('flipped');
                flippedCards.push({ card, emoji, index });
                
                if (flippedCards.length === 2) {
                    setTimeout(() => {
                        if (flippedCards[0].emoji === flippedCards[1].emoji) {
                            matchedPairs++;
                            if (matchedPairs === emojis.length) {
                                setTimeout(() => {
                                    alert('🎉 恭喜完成！');
                                }, 300);
                            }
                        } else {
                            flippedCards.forEach(item => {
                                item.card.textContent = '';
                                item.card.classList.remove('flipped');
                            });
                        }
                        flippedCards = [];
                    }, 500);
                }
            }
        });
        
        gameBoard.appendChild(card);
    });
    
    container.appendChild(gameBoard);
}

/**
 * Whack-a-Mole Game
 */
function initWhackAMoleGame(container) {
    let score = 0;
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    const gameBoard = document.createElement('div');
    gameBoard.style.cssText = 'display: grid; grid-template-columns: repeat(3, 120px); gap: 15px;';
    
    const holes = [];
    for (let i = 0; i < 9; i++) {
        const hole = document.createElement('div');
        hole.style.cssText = `
            width: 120px;
            height: 120px;
            background: #f0f0f0;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
            cursor: pointer;
            border: 3px solid #ddd;
        `;
        
        hole.addEventListener('click', () => {
            if (hole.textContent === '🦫') {
                hole.textContent = '💥';
                score++;
                scoreDisplay.textContent = `得分: ${score}`;
                setTimeout(() => {
                    hole.textContent = '';
                }, 300);
            }
        });
        
        holes.push(hole);
        gameBoard.appendChild(hole);
    }
    
    // Randomly show moles
    const moleInterval = setInterval(() => {
        if (miniGameState.timeRemaining <= 0) {
            clearInterval(moleInterval);
            return;
        }
        
        const emptyHoles = holes.filter(h => h.textContent === '');
        if (emptyHoles.length > 0) {
            const randomHole = emptyHoles[Math.floor(Math.random() * emptyHoles.length)];
            randomHole.textContent = '🦫';
            setTimeout(() => {
                if (randomHole.textContent === '🦫') {
                    randomHole.textContent = '';
                }
            }, 1000);
        }
    }, 800);
    
    container.appendChild(scoreDisplay);
    container.appendChild(gameBoard);
}

/**
 * Snake Game (Simplified)
 */
function initSnakeGame(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    canvas.style.border = '2px solid #667eea';
    canvas.style.borderRadius = '10px';
    canvas.style.touchAction = 'none'; // Prevent default touch behaviors
    const ctx = canvas.getContext('2d');
    
    const gridSize = 20;
    let snake = [{x: 10, y: 10}];
    let food = {x: 15, y: 15};
    let direction = {x: 1, y: 0};
    let score = 0;
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    // Add instructions for touch controls
    const instructionsDisplay = document.createElement('div');
    instructionsDisplay.style.cssText = 'font-size: 16px; margin-bottom: 10px; color: #fff; text-align: center;';
    instructionsDisplay.innerHTML = '🎮 滑动屏幕控制方向 | 键盘方向键';
    
    // Touch swipe detection variables
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    const minSwipeDistance = 30; // Minimum distance for a swipe to be registered
    
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!miniGameState.currentGame) return;
        
        switch(e.key) {
            case 'ArrowUp': if (direction.y === 0) direction = {x: 0, y: -1}; break;
            case 'ArrowDown': if (direction.y === 0) direction = {x: 0, y: 1}; break;
            case 'ArrowLeft': if (direction.x === 0) direction = {x: -1, y: 0}; break;
            case 'ArrowRight': if (direction.x === 0) direction = {x: 1, y: 0}; break;
        }
    });
    
    // Touch controls for mobile
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault(); // Prevent page scrolling
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
    }, { passive: false });
    
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault(); // Prevent page scrolling during swipe
    }, { passive: false });
    
    canvas.addEventListener('touchend', (e) => {
        e.preventDefault(); // Prevent page scrolling
        if (!miniGameState.currentGame) return;
        
        const touch = e.changedTouches[0];
        touchEndX = touch.clientX;
        touchEndY = touch.clientY;
        
        handleSwipe();
    }, { passive: false });
    
    // Handle swipe gesture
    function handleSwipe() {
        const deltaX = touchEndX - touchStartX;
        const deltaY = touchEndY - touchStartY;
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // Check if swipe distance is significant enough
        if (Math.max(absDeltaX, absDeltaY) < minSwipeDistance) {
            return; // Swipe too short, ignore
        }
        
        // Determine swipe direction based on the larger delta
        if (absDeltaX > absDeltaY) {
            // Horizontal swipe
            if (deltaX > 0 && direction.x === 0) {
                // Swipe right
                direction = {x: 1, y: 0};
            } else if (deltaX < 0 && direction.x === 0) {
                // Swipe left
                direction = {x: -1, y: 0};
            }
        } else {
            // Vertical swipe
            if (deltaY > 0 && direction.y === 0) {
                // Swipe down
                direction = {x: 0, y: 1};
            } else if (deltaY < 0 && direction.y === 0) {
                // Swipe up
                direction = {x: 0, y: -1};
            }
        }
    }
    
    function gameLoop() {
        if (miniGameState.timeRemaining <= 0 || !miniGameState.currentGame) return;
        
        // Move snake
        const head = {x: snake[0].x + direction.x, y: snake[0].y + direction.y};
        
        // Check collision with walls
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20) {
            alert('游戏结束！得分: ' + score);
            return;
        }
        
        // Check collision with self
        if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
            alert('游戏结束！得分: ' + score);
            return;
        }
        
        snake.unshift(head);
        
        // Check if ate food
        if (head.x === food.x && head.y === food.y) {
            score++;
            scoreDisplay.textContent = `得分: ${score}`;
            food = {
                x: Math.floor(Math.random() * 20),
                y: Math.floor(Math.random() * 20)
            };
        } else {
            snake.pop();
        }
        
        // Draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw snake
        ctx.fillStyle = '#667eea';
        snake.forEach(segment => {
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        });
        
        // Draw food
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(food.x * gridSize, food.y * gridSize, gridSize - 2, gridSize - 2);
        
        setTimeout(gameLoop, 150);
    }
    
    container.appendChild(scoreDisplay);
    container.appendChild(instructionsDisplay);
    container.appendChild(canvas);
    gameLoop();
}

/**
 * Catch Game (Catch falling fruits)
 */
function initCatchGame(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    canvas.style.border = '2px solid #667eea';
    canvas.style.borderRadius = '10px';
    const ctx = canvas.getContext('2d');
    
    let basketX = 175;
    let score = 0;
    let fruits = [];
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    const fruitEmojis = ['🍎', '🍊', '🍋', '🍌', '🍇', '🍓'];
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        basketX = e.clientX - rect.left - 25;
    });
    
    function spawnFruit() {
        if (miniGameState.timeRemaining <= 0) return;
        fruits.push({
            x: Math.random() * 350,
            y: 0,
            emoji: fruitEmojis[Math.floor(Math.random() * fruitEmojis.length)]
        });
    }
    
    const spawnInterval = setInterval(spawnFruit, 1000);
    
    function gameLoop() {
        if (miniGameState.timeRemaining <= 0 || !miniGameState.currentGame) {
            clearInterval(spawnInterval);
            return;
        }
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update and draw fruits
        fruits = fruits.filter(fruit => {
            fruit.y += 3;
            
            // Check if caught
            if (fruit.y >= 350 && fruit.x >= basketX && fruit.x <= basketX + 50) {
                score++;
                scoreDisplay.textContent = `得分: ${score}`;
                return false;
            }
            
            // Remove if fell off screen
            if (fruit.y > 400) return false;
            
            // Draw fruit
            ctx.font = '30px Arial';
            ctx.fillText(fruit.emoji, fruit.x, fruit.y);
            return true;
        });
        
        // Draw basket
        ctx.fillStyle = '#667eea';
        ctx.fillRect(basketX, 370, 50, 10);
        
        requestAnimationFrame(gameLoop);
    }
    
    container.appendChild(scoreDisplay);
    container.appendChild(canvas);
    gameLoop();
}

/**
 * Placeholder for other games
 */
function initBubbleGame(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    canvas.style.border = '2px solid #667eea';
    canvas.style.borderRadius = '10px';
    const ctx = canvas.getContext('2d');
    
    const bubbleColors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
    let score = 0;
    let bubbles = [];
    let shooter = { x: 200, y: 380, angle: -90 };
    let currentBubble = { color: bubbleColors[Math.floor(Math.random() * bubbleColors.length)] };
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    // Initialize bubbles
    for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 10; col++) {
            bubbles.push({
                x: col * 40 + 20,
                y: row * 40 + 20,
                color: bubbleColors[Math.floor(Math.random() * bubbleColors.length)],
                radius: 18
            });
        }
    }
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        shooter.angle = Math.atan2(mouseY - shooter.y, mouseX - shooter.x) * 180 / Math.PI;
    });
    
    canvas.addEventListener('click', () => {
        shootBubble();
    });
    
    function shootBubble() {
        const speed = 5;
        const radians = shooter.angle * Math.PI / 180;
        let bubbleX = shooter.x;
        let bubbleY = shooter.y;
        const dx = Math.cos(radians) * speed;
        const dy = Math.sin(radians) * speed;
        
        const interval = setInterval(() => {
            if (miniGameState.timeRemaining <= 0 || !miniGameState.currentGame) {
                clearInterval(interval);
                return;
            }
            
            bubbleX += dx;
            bubbleY += dy;
            
            // Wall collision - bubble sticks to wall
            if (bubbleX <= 18 || bubbleX >= 382) {
                bubbles.push({
                    x: bubbleX <= 18 ? 18 : 382,
                    y: bubbleY,
                    color: currentBubble.color,
                    radius: 18
                });
                clearInterval(interval);
                checkMatches();
                currentBubble = { color: bubbleColors[Math.floor(Math.random() * bubbleColors.length)] };
                return;
            }
            
            // Check collision with other bubbles
            let collided = false;
            for (let bubble of bubbles) {
                const dist = Math.sqrt((bubbleX - bubble.x) ** 2 + (bubbleY - bubble.y) ** 2);
                if (dist < 36) {
                    bubbles.push({
                        x: bubbleX,
                        y: bubbleY,
                        color: currentBubble.color,
                        radius: 18
                    });
                    collided = true;
                    break;
                }
            }
            
            // Top collision
            if (bubbleY <= 18) {
                bubbles.push({
                    x: bubbleX,
                    y: 18,
                    color: currentBubble.color,
                    radius: 18
                });
                collided = true;
            }
            
            if (collided) {
                clearInterval(interval);
                checkMatches();
                currentBubble = { color: bubbleColors[Math.floor(Math.random() * bubbleColors.length)] };
            }
        }, 20);
    }
    
    function checkMatches() {
        // Simple match check - remove bubbles of same color that are adjacent
        const toRemove = new Set();
        bubbles.forEach((bubble, i) => {
            let matchCount = 0;
            bubbles.forEach((other, j) => {
                if (i !== j) {
                    const dist = Math.sqrt((bubble.x - other.x) ** 2 + (bubble.y - other.y) ** 2);
                    if (dist < 40 && bubble.color === other.color) {
                        matchCount++;
                        if (matchCount >= 2) {
                            toRemove.add(i);
                        }
                    }
                }
            });
        });
        
        if (toRemove.size > 0) {
            score += toRemove.size * 10;
            scoreDisplay.textContent = `得分: ${score}`;
            bubbles = bubbles.filter((_, i) => !toRemove.has(i));
        }
    }
    
    function gameLoop() {
        if (miniGameState.timeRemaining <= 0 || !miniGameState.currentGame) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw bubbles
        bubbles.forEach(bubble => {
            ctx.beginPath();
            ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
            ctx.fillStyle = bubble.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        });
        
        // Draw shooter
        ctx.save();
        ctx.translate(shooter.x, shooter.y);
        ctx.rotate(shooter.angle * Math.PI / 180);
        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, -5, 30, 10);
        ctx.restore();
        
        // Draw current bubble
        ctx.beginPath();
        ctx.arc(shooter.x, shooter.y, 18, 0, Math.PI * 2);
        ctx.fillStyle = currentBubble.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        requestAnimationFrame(gameLoop);
    }
    
    container.appendChild(scoreDisplay);
    container.appendChild(canvas);
    gameLoop();
}

function initMazeGame(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    canvas.style.border = '2px solid #667eea';
    canvas.style.borderRadius = '10px';
    const ctx = canvas.getContext('2d');
    
    const cellSize = 20;
    const gridSize = 20;
    let player = { x: 0, y: 0 };
    let goal = { x: gridSize - 1, y: gridSize - 1 };
    let maze = [];
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = '使用方向键移动到黄色目标！';
    
    // Generate maze using simple random walk
    function generateMaze() {
        maze = Array(gridSize).fill().map(() => Array(gridSize).fill(1));
        
        // Simple path generation
        let x = 0, y = 0;
        maze[y][x] = 0;
        
        while (x < gridSize - 1 || y < gridSize - 1) {
            const canGoRight = x < gridSize - 1;
            const canGoDown = y < gridSize - 1;
            
            if (canGoRight && canGoDown) {
                if (Math.random() > 0.5) {
                    x++;
                } else {
                    y++;
                }
            } else if (canGoRight) {
                x++;
            } else if (canGoDown) {
                y++;
            }
            
            maze[y][x] = 0;
            
            // Add some random paths
            if (Math.random() > 0.7) {
                if (x > 0 && Math.random() > 0.5) maze[y][x-1] = 0;
                if (y > 0 && Math.random() > 0.5) maze[y-1][x] = 0;
            }
        }
        
        // Ensure start and goal are open
        maze[0][0] = 0;
        maze[gridSize-1][gridSize-1] = 0;
    }
    
    function movePlayer(dx, dy) {
        const newX = player.x + dx;
        const newY = player.y + dy;
        
        if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
            if (maze[newY][newX] === 0) {
                player.x = newX;
                player.y = newY;
                
                // Check if reached goal
                if (player.x === goal.x && player.y === goal.y) {
                    scoreDisplay.textContent = '🎉 恭喜通关！按任意键重新开始';
                    setTimeout(() => {
                        player = { x: 0, y: 0 };
                        generateMaze();
                    }, 2000);
                }
            }
        }
    }
    
    document.addEventListener('keydown', (e) => {
        if (!miniGameState.currentGame || miniGameState.currentGame !== 'maze') return;
        
        switch(e.key) {
            case 'ArrowUp': movePlayer(0, -1); break;
            case 'ArrowDown': movePlayer(0, 1); break;
            case 'ArrowLeft': movePlayer(-1, 0); break;
            case 'ArrowRight': movePlayer(1, 0); break;
        }
    });
    
    function gameLoop() {
        if (miniGameState.timeRemaining <= 0 || !miniGameState.currentGame) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw maze
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                ctx.fillStyle = maze[y][x] === 1 ? '#333' : '#f0f0f0';
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
                ctx.strokeStyle = '#ddd';
                ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }
        
        // Draw goal
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(goal.x * cellSize, goal.y * cellSize, cellSize, cellSize);
        
        // Draw player
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(player.x * cellSize + cellSize/2, player.y * cellSize + cellSize/2, cellSize/2 - 2, 0, Math.PI * 2);
        ctx.fill();
        
        requestAnimationFrame(gameLoop);
    }
    
    generateMaze();
    container.appendChild(scoreDisplay);
    container.appendChild(canvas);
    gameLoop();
}

function initMatch3Game(container) {
    const gridSize = 8;
    const gemTypes = ['💎', '💍', '🔮', '⭐', '💫', '✨'];
    let score = 0;
    let grid = [];
    let selectedGem = null;
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 24px; font-weight: bold; margin-bottom: 20px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    const gameBoard = document.createElement('div');
    gameBoard.style.cssText = 'display: grid; grid-template-columns: repeat(8, 50px); gap: 5px;';
    
    // Initialize grid
    function initializeGrid() {
        grid = [];
        for (let y = 0; y < gridSize; y++) {
            grid[y] = [];
            for (let x = 0; x < gridSize; x++) {
                grid[y][x] = gemTypes[Math.floor(Math.random() * gemTypes.length)];
            }
        }
        // Ensure no initial matches
        removeInitialMatches();
    }
    
    function removeInitialMatches() {
        let hasMatches = true;
        while (hasMatches) {
            hasMatches = false;
            for (let y = 0; y < gridSize; y++) {
                for (let x = 0; x < gridSize; x++) {
                    if (checkMatch(x, y)) {
                        grid[y][x] = gemTypes[Math.floor(Math.random() * gemTypes.length)];
                        hasMatches = true;
                    }
                }
            }
        }
    }
    
    function checkMatch(x, y) {
        const gem = grid[y][x];
        // Check horizontal
        if (x >= 2 && grid[y][x-1] === gem && grid[y][x-2] === gem) return true;
        if (x <= gridSize-3 && grid[y][x+1] === gem && grid[y][x+2] === gem) return true;
        if (x >= 1 && x <= gridSize-2 && grid[y][x-1] === gem && grid[y][x+1] === gem) return true;
        // Check vertical
        if (y >= 2 && grid[y-1][x] === gem && grid[y-2][x] === gem) return true;
        if (y <= gridSize-3 && grid[y+1][x] === gem && grid[y+2][x] === gem) return true;
        if (y >= 1 && y <= gridSize-2 && grid[y-1][x] === gem && grid[y+1][x] === gem) return true;
        return false;
    }
    
    function findMatches() {
        const matches = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const gem = grid[y][x];
                // Horizontal match
                if (x <= gridSize - 3) {
                    if (grid[y][x+1] === gem && grid[y][x+2] === gem) {
                        let matchLen = 3;
                        while (x + matchLen < gridSize && grid[y][x+matchLen] === gem) matchLen++;
                        for (let i = 0; i < matchLen; i++) {
                            if (!matches.some(m => m.x === x+i && m.y === y)) {
                                matches.push({x: x+i, y});
                            }
                        }
                    }
                }
                // Vertical match
                if (y <= gridSize - 3) {
                    if (grid[y+1][x] === gem && grid[y+2][x] === gem) {
                        let matchLen = 3;
                        while (y + matchLen < gridSize && grid[y+matchLen][x] === gem) matchLen++;
                        for (let i = 0; i < matchLen; i++) {
                            if (!matches.some(m => m.x === x && m.y === y+i)) {
                                matches.push({x, y: y+i});
                            }
                        }
                    }
                }
            }
        }
        return matches;
    }
    
    function removeMatches(matches) {
        matches.forEach(m => {
            grid[m.y][m.x] = null;
        });
        score += matches.length * 10;
        scoreDisplay.textContent = `得分: ${score}`;
    }
    
    function dropGems() {
        for (let x = 0; x < gridSize; x++) {
            let emptySpaces = 0;
            for (let y = gridSize - 1; y >= 0; y--) {
                if (grid[y][x] === null) {
                    emptySpaces++;
                } else if (emptySpaces > 0) {
                    grid[y + emptySpaces][x] = grid[y][x];
                    grid[y][x] = null;
                }
            }
            // Fill empty spaces at top
            for (let y = 0; y < emptySpaces; y++) {
                grid[y][x] = gemTypes[Math.floor(Math.random() * gemTypes.length)];
            }
        }
    }
    
    function renderGrid() {
        gameBoard.innerHTML = '';
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const cell = document.createElement('div');
                cell.style.cssText = `
                    width: 50px;
                    height: 50px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 30px;
                    cursor: pointer;
                    transition: all 0.3s;
                `;
                cell.textContent = grid[y][x];
                cell.dataset.x = x;
                cell.dataset.y = y;
                
                if (selectedGem && selectedGem.x === x && selectedGem.y === y) {
                    cell.style.transform = 'scale(1.1)';
                    cell.style.boxShadow = '0 0 10px rgba(255,215,0,0.8)';
                }
                
                cell.addEventListener('click', () => selectGem(x, y, cell));
                gameBoard.appendChild(cell);
            }
        }
    }
    
    function selectGem(x, y, cell) {
        if (!selectedGem) {
            selectedGem = {x, y};
            renderGrid();
        } else {
            const dx = Math.abs(selectedGem.x - x);
            const dy = Math.abs(selectedGem.y - y);
            
            // Check if adjacent
            if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
                // Swap gems
                const temp = grid[selectedGem.y][selectedGem.x];
                const oldSelected = { ...selectedGem };
                grid[selectedGem.y][selectedGem.x] = grid[y][x];
                grid[y][x] = temp;
                
                selectedGem = null;
                renderGrid();
                
                // Check for matches after swap
                setTimeout(() => {
                    let matches = findMatches();
                    if (matches.length > 0) {
                        processMatches();
                    } else {
                        // Swap back if no match
                        const temp2 = grid[y][x];
                        grid[y][x] = grid[oldSelected.y][oldSelected.x];
                        grid[oldSelected.y][oldSelected.x] = temp2;
                        renderGrid();
                    }
                }, 300);
            } else {
                selectedGem = {x, y};
                renderGrid();
            }
        }
    }
    
    function processMatches() {
        const matches = findMatches();
        if (matches.length > 0) {
            removeMatches(matches);
            setTimeout(() => {
                dropGems();
                renderGrid();
                setTimeout(() => processMatches(), 300);
            }, 300);
        }
    }
    
    initializeGrid();
    renderGrid();
    
    container.appendChild(scoreDisplay);
    container.appendChild(gameBoard);
}

function initJumpGame(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    canvas.style.border = '2px solid #667eea';
    canvas.style.borderRadius = '10px';
    const ctx = canvas.getContext('2d');
    
    let score = 0;
    let player = { x: 50, y: 300, vy: 0, isJumping: false };
    let obstacles = [];
    let gameSpeed = 3;
    let frameCount = 0;
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    const instructions = document.createElement('div');
    instructions.style.cssText = 'font-size: 16px; margin-bottom: 10px; color: #666;';
    instructions.textContent = '按空格键跳跃！';
    
    document.addEventListener('keydown', (e) => {
        if (!miniGameState.currentGame || miniGameState.currentGame !== 'jump') return;
        
        if (e.code === 'Space' && !player.isJumping) {
            player.vy = -12;
            player.isJumping = true;
        }
    });
    
    canvas.addEventListener('click', () => {
        if (!player.isJumping) {
            player.vy = -12;
            player.isJumping = true;
        }
    });
    
    function gameLoop() {
        if (miniGameState.timeRemaining <= 0 || !miniGameState.currentGame) return;
        
        frameCount++;
        
        // Update player
        player.vy += 0.5; // Gravity
        player.y += player.vy;
        
        // Ground collision
        if (player.y >= 300) {
            player.y = 300;
            player.vy = 0;
            player.isJumping = false;
        }
        
        // Spawn obstacles
        if (frameCount % 60 === 0) {
            obstacles.push({
                x: 400,
                y: 320,
                width: 20,
                height: Math.random() > 0.5 ? 40 : 60
            });
        }
        
        // Update obstacles
        obstacles = obstacles.filter(obs => {
            obs.x -= gameSpeed;
            
            // Check collision - proper AABB collision detection
            if (obs.x < player.x + 30 && obs.x + obs.width > player.x &&
                player.y + 30 > obs.y && player.y < obs.y + obs.height) {
                scoreDisplay.textContent = `游戏结束！得分: ${score}`;
                obstacles = [];
                score = 0;
                return false;
            }
            
            // Remove off-screen obstacles and add score
            if (obs.x + obs.width < 0) {
                score++;
                scoreDisplay.textContent = `得分: ${score}`;
                return false;
            }
            
            return true;
        });
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw ground
        ctx.fillStyle = '#96ceb4';
        ctx.fillRect(0, 330, 400, 70);
        
        // Draw player
        ctx.fillStyle = '#667eea';
        ctx.fillRect(player.x, player.y, 30, 30);
        
        // Draw obstacles
        ctx.fillStyle = '#ff6b6b';
        obstacles.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        });
        
        requestAnimationFrame(gameLoop);
    }
    
    container.appendChild(scoreDisplay);
    container.appendChild(instructions);
    container.appendChild(canvas);
    gameLoop();
}

function initPuzzleGame(container) {
    const gridSize = 3;
    const cellSize = 120;
    let tiles = [];
    let emptyPos = { x: 2, y: 2 };
    let moves = 0;
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = `移动次数: ${moves}`;
    
    const gameBoard = document.createElement('div');
    gameBoard.style.cssText = 'display: grid; grid-template-columns: repeat(3, 120px); gap: 5px; background: #f0f0f0; padding: 10px; border-radius: 10px;';
    
    // Initialize puzzle
    function initPuzzle() {
        tiles = [];
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const num = y * gridSize + x + 1;
                if (num < gridSize * gridSize) {
                    tiles.push({ num, x, y });
                }
            }
        }
        
        // Shuffle
        for (let i = 0; i < 100; i++) {
            const validMoves = getValidMoves();
            const randomMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            moveTile(randomMove.x, randomMove.y, false);
        }
        
        moves = 0;
        scoreDisplay.textContent = `移动次数: ${moves}`;
    }
    
    function getValidMoves() {
        const valid = [];
        const dirs = [{x:0,y:-1}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:0}];
        
        dirs.forEach(dir => {
            const newX = emptyPos.x + dir.x;
            const newY = emptyPos.y + dir.y;
            if (newX >= 0 && newX < gridSize && newY >= 0 && newY < gridSize) {
                valid.push({ x: newX, y: newY });
            }
        });
        
        return valid;
    }
    
    function moveTile(x, y, countMove = true) {
        const tile = tiles.find(t => t.x === x && t.y === y);
        if (!tile) return;
        
        // Check if adjacent to empty space
        const dx = Math.abs(tile.x - emptyPos.x);
        const dy = Math.abs(tile.y - emptyPos.y);
        
        if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
            // Swap with empty
            const oldEmpty = { ...emptyPos };
            emptyPos.x = tile.x;
            emptyPos.y = tile.y;
            tile.x = oldEmpty.x;
            tile.y = oldEmpty.y;
            
            if (countMove) {
                moves++;
                scoreDisplay.textContent = `移动次数: ${moves}`;
            }
            
            renderPuzzle();
            checkWin();
        }
    }
    
    function checkWin() {
        let solved = true;
        tiles.forEach(tile => {
            const expectedX = (tile.num - 1) % gridSize;
            const expectedY = Math.floor((tile.num - 1) / gridSize);
            if (tile.x !== expectedX || tile.y !== expectedY) {
                solved = false;
            }
        });
        
        if (solved && emptyPos.x === 2 && emptyPos.y === 2) {
            setTimeout(() => {
                scoreDisplay.textContent = `🎉 完成！用了 ${moves} 步！`;
            }, 100);
        }
    }
    
    function renderPuzzle() {
        gameBoard.innerHTML = '';
        
        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const tile = tiles.find(t => t.x === x && t.y === y);
                const cell = document.createElement('div');
                cell.style.cssText = `
                    width: 120px;
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 48px;
                    font-weight: bold;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s;
                `;
                
                if (tile) {
                    cell.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    cell.style.color = 'white';
                    cell.textContent = tile.num;
                    cell.addEventListener('click', () => moveTile(x, y));
                } else {
                    cell.style.background = 'transparent';
                }
                
                gameBoard.appendChild(cell);
            }
        }
    }
    
    initPuzzle();
    renderPuzzle();
    
    container.appendChild(scoreDisplay);
    container.appendChild(gameBoard);
}

function initBreakoutGame(container) {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    canvas.style.border = '2px solid #667eea';
    canvas.style.borderRadius = '10px';
    const ctx = canvas.getContext('2d');
    
    let score = 0;
    let paddle = { x: 160, y: 370, width: 80, height: 10 };
    let ball = { x: 200, y: 200, dx: 3, dy: -3, radius: 8 };
    let bricks = [];
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    // Initialize bricks
    const brickRowCount = 5;
    const brickColumnCount = 8;
    const brickWidth = 45;
    const brickHeight = 20;
    const brickPadding = 5;
    const brickOffsetTop = 30;
    const brickOffsetLeft = 10;
    
    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < brickRowCount; r++) {
            bricks.push({
                x: (c * (brickWidth + brickPadding)) + brickOffsetLeft,
                y: (r * (brickHeight + brickPadding)) + brickOffsetTop,
                status: 1,
                color: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'][r % 5]
            });
        }
    }
    
    canvas.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        paddle.x = Math.max(0, Math.min(mouseX - paddle.width / 2, canvas.width - paddle.width));
    });
    
    function gameLoop() {
        if (miniGameState.timeRemaining <= 0 || !miniGameState.currentGame) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Update ball
        ball.x += ball.dx;
        ball.y += ball.dy;
        
        // Wall collision
        if (ball.x + ball.dx > canvas.width - ball.radius || ball.x + ball.dx < ball.radius) {
            ball.dx = -ball.dx;
        }
        if (ball.y + ball.dy < ball.radius) {
            ball.dy = -ball.dy;
        }
        
        // Paddle collision
        if (ball.y + ball.dy > paddle.y - ball.radius && 
            ball.x > paddle.x && ball.x < paddle.x + paddle.width) {
            ball.dy = -ball.dy;
        }
        
        // Bottom collision (game over)
        if (ball.y + ball.dy > canvas.height - ball.radius) {
            ball.x = 200;
            ball.y = 200;
            ball.dx = 3;
            ball.dy = -3;
        }
        
        // Brick collision
        bricks.forEach(brick => {
            if (brick.status === 1) {
                if (ball.x > brick.x && ball.x < brick.x + brickWidth &&
                    ball.y > brick.y && ball.y < brick.y + brickHeight) {
                    ball.dy = -ball.dy;
                    brick.status = 0;
                    score += 10;
                    scoreDisplay.textContent = `得分: ${score}`;
                }
            }
        });
        
        // Draw bricks
        bricks.forEach(brick => {
            if (brick.status === 1) {
                ctx.fillStyle = brick.color;
                ctx.fillRect(brick.x, brick.y, brickWidth, brickHeight);
                ctx.strokeStyle = '#fff';
                ctx.strokeRect(brick.x, brick.y, brickWidth, brickHeight);
            }
        });
        
        // Draw paddle
        ctx.fillStyle = '#667eea';
        ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
        
        // Draw ball
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#ff6b6b';
        ctx.fill();
        ctx.closePath();
        
        // Check win
        if (bricks.every(b => b.status === 0)) {
            scoreDisplay.textContent = `🎉 恭喜通关！得分: ${score}`;
            ball.dx = 0;
            ball.dy = 0;
        }
        
        requestAnimationFrame(gameLoop);
    }
    
    container.appendChild(scoreDisplay);
    container.appendChild(canvas);
    gameLoop();
}

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        wordDatabase,
        gameConfig,
        encouragingMessages,
        selectDifficulty,
        selectCategory,
        selectHintMode,
        initializeGame,
        startGame,
        handleCorrectAnswer,
        skipWord,
        updateStats,
        getHighScore,
        getHighTypingCount,
        checkNewHighScore,
        updateHighScoreDisplay,
        showGameRewardModal,
        playRewardGame,
        exitMiniGame
    };
}
