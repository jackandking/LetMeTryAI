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
        highScore: Math.max(gameState.score, getHighScore()),
        wordsLearned: gameState.wordsLearned.length
    };
    localStorage.setItem('typing-game-progress', JSON.stringify(progress));
}

/**
 * Get high score from localStorage
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
    
    // Save progress
    saveProgress();
    
    // Show result screen
    showResultScreen();
}

/**
 * Show result screen
 */
function showResultScreen() {
    // Update result stats
    document.getElementById('finalScore').textContent = gameState.score;
    document.getElementById('correctWords').textContent = gameState.correctWords;
    document.getElementById('maxCombo').textContent = gameState.maxCombo;
    
    const accuracy = gameState.totalAttempts > 0 
        ? Math.round((gameState.correctWords / gameState.totalAttempts) * 100) 
        : 0;
    document.getElementById('finalAccuracy').textContent = `${accuracy}%`;
    
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
    
    // Celebration effects
    if (gameState.score >= 100) {
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
 * Restart the game
 */
function restartGame() {
    startGame();
}

/**
 * Go back to start screen
 */
function backToStart() {
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

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        wordDatabase,
        gameConfig,
        encouragingMessages,
        selectDifficulty,
        selectCategory,
        initializeGame,
        startGame,
        handleCorrectAnswer,
        skipWord,
        updateStats,
        getHighScore
    };
}
