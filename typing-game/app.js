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
    const ctx = canvas.getContext('2d');
    
    const gridSize = 20;
    let snake = [{x: 10, y: 10}];
    let food = {x: 15, y: 15};
    let direction = {x: 1, y: 0};
    let score = 0;
    
    const scoreDisplay = document.createElement('div');
    scoreDisplay.style.cssText = 'font-size: 20px; font-weight: bold; margin-bottom: 10px; color: #667eea;';
    scoreDisplay.textContent = `得分: ${score}`;
    
    document.addEventListener('keydown', (e) => {
        if (!miniGameState.currentGame) return;
        
        switch(e.key) {
            case 'ArrowUp': if (direction.y === 0) direction = {x: 0, y: -1}; break;
            case 'ArrowDown': if (direction.y === 0) direction = {x: 0, y: 1}; break;
            case 'ArrowLeft': if (direction.x === 0) direction = {x: -1, y: 0}; break;
            case 'ArrowRight': if (direction.x === 0) direction = {x: 1, y: 0}; break;
        }
    });
    
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
    container.innerHTML = '<div style="font-size: 48px;">🫧</div><p style="color: #667eea; font-size: 18px;">泡泡龙游戏</p><p style="color: #666;">敬请期待！</p>';
}

function initMazeGame(container) {
    container.innerHTML = '<div style="font-size: 48px;">🧩</div><p style="color: #667eea; font-size: 18px;">走迷宫游戏</p><p style="color: #666;">敬请期待！</p>';
}

function initMatch3Game(container) {
    container.innerHTML = '<div style="font-size: 48px;">💎</div><p style="color: #667eea; font-size: 18px;">消消乐游戏</p><p style="color: #666;">敬请期待！</p>';
}

function initJumpGame(container) {
    container.innerHTML = '<div style="font-size: 48px;">🦘</div><p style="color: #667eea; font-size: 18px;">跳跃游戏</p><p style="color: #666;">敬请期待！</p>';
}

function initPuzzleGame(container) {
    container.innerHTML = '<div style="font-size: 48px;">🧩</div><p style="color: #667eea; font-size: 18px;">拼图游戏</p><p style="color: #666;">敬请期待！</p>';
}

function initBreakoutGame(container) {
    container.innerHTML = '<div style="font-size: 48px;">🎮</div><p style="color: #667eea; font-size: 18px;">打砖块游戏</p><p style="color: #666;">敬请期待！</p>';
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
