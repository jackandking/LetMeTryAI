/**
 * Chinese Composition Writing Level Game
 * Progressive difficulty levels with fill-in-blank exercises and AI evaluation
 */

/**
 * Game configuration and levels
 */
const gameConfig = {
    totalLevels: 5, // This can be dynamically updated
    currentLevel: 1,
    playerProgress: {
        completedLevels: [],
        currentScore: 0,
        playerLevel: 1, // Player skill level
        correctAnswers: 0,
        totalAnswers: 0
    },
    difficultySettings: {
        beginner: { minScore: 0, maxScore: 40 },
        intermediate: { minScore: 41, maxScore: 70 },
        advanced: { minScore: 71, maxScore: 100 }
    }
};

/**
 * Exercise data for different levels
 */
const exercises = {
    1: {
        title: "第一关：基础填空",
        type: "fill-blank",
        content: "春天来了，小鸟在枝头___唱歌，花儿在园子里___开放，孩子们在操场上___奔跑。这是一个___的季节，充满了___和希望。",
        blanks: [
            { index: 0, answer: "欢快地", hints: ["表示动作的方式", "形容开心的样子"], example: "如：高兴地、快乐地、愉快地" },
            { index: 1, answer: "美丽地", hints: ["形容花朵的状态", "表示美好的样子"], example: "如：灿烂地、绚烂地、娇艳地" },
            { index: 2, answer: "自由地", hints: ["表示没有约束", "形容轻松的状态"], example: "如：快乐地、尽情地、畅快地" },
            { index: 3, answer: "温暖", hints: ["春天的特点", "让人感到舒适"], example: "如：美好、和谐、充满希望" },
            { index: 4, answer: "生机", hints: ["表示活力", "春天带来的感觉"], example: "如：活力、朝气、希望" }
        ],
        instruction: "请在空白处填入合适的词语，让句子更加生动。",
        difficulty: "初级"
    },
    2: {
        title: "第二关：情感表达",
        type: "fill-blank",
        content: "看着妈妈___的背影，我的心里___涌起一阵暖流。她为了我们的家___付出，从不___。我___要好好学习，报答她的恩情。",
        blanks: [
            { index: 0, answer: "忙碌", hints: ["描述妈妈的状态", "表示很忙"], example: "如：疲惫、劳累、辛苦" },
            { index: 1, answer: "顿时", hints: ["表示时间", "立刻、马上"], example: "如：立刻、瞬间、马上" },
            { index: 2, answer: "默默地", hints: ["表示方式", "不声不响地"], example: "如：悄悄地、静静地、无声地" },
            { index: 3, answer: "抱怨", hints: ["表示不满", "埋怨"], example: "如：埋怨、责备、批评" },
            { index: 4, answer: "暗下决心", hints: ["表示决定", "在心里决定"], example: "如：下定决心、立志、决定" }
        ],
        instruction: "填入恰当的词语，表达对母亲的感激之情。",
        difficulty: "初级"
    },
    3: {
        title: "第三关：景物描写",
        type: "fill-blank",
        content: "夕阳西下，天边的云彩被染得___。远山___，近水___。一阵微风吹过，湖面___，就像___的绸缎。",
        blanks: [
            { index: 0, answer: "通红", hints: ["夕阳的颜色", "红色的程度"] },
            { index: 1, answer: "朦胧", hints: ["看不清楚的样子", "模糊"] },
            { index: 2, answer: "清澈", hints: ["水很干净", "透明"] },
            { index: 3, answer: "波光粼粼", hints: ["水面的样子", "闪闪发光"] },
            { index: 4, answer: "柔滑", hints: ["触感描述", "很光滑"] }
        ],
        instruction: "用优美的词语描绘黄昏的景色。",
        difficulty: "中级"
    },
    4: {
        title: "第四关：修辞手法",
        type: "fill-blank",
        content: "图书馆里静得___，同学们___地读着书。书页翻动的声音___，___每个人的心田。知识的海洋___，等待着我们去探索。",
        blanks: [
            { index: 0, answer: "连一根针掉在地上都能听见", hints: ["比喻很安静", "夸张的表达"] },
            { index: 1, answer: "聚精会神", hints: ["专心致志", "很专注"] },
            { index: 2, answer: "如春风化雨", hints: ["比喻句", "温柔地滋润"] },
            { index: 3, answer: "滋润着", hints: ["给予营养", "使受益"] },
            { index: 4, answer: "浩瀚无边", hints: ["形容很大", "没有边际"] }
        ],
        instruction: "运用修辞手法，让描写更加生动形象。",
        difficulty: "中级"
    },
    5: {
        title: "第五关：综合运用",
        type: "fill-blank",
        content: "成功的路上___荆棘，但正是这些挫折___了我们的意志。___的人永远不会被困难___，因为他们知道，___之后必有彩虹。",
        blanks: [
            { index: 0, answer: "布满", hints: ["到处都是", "充满"] },
            { index: 1, answer: "磨砺", hints: ["锻炼", "使更坚强"] },
            { index: 2, answer: "坚强", hints: ["不怕困难", "意志坚定"] },
            { index: 3, answer: "击倒", hints: ["打败", "战胜"] },
            { index: 4, answer: "风雨", hints: ["困难和挫折", "比喻逆境"] }
        ],
        instruction: "展现深刻的人生感悟，运用恰当的词语。",
        difficulty: "高级"
    }
};

// Add some additional example exercises to demonstrate unlimited expansion capability
const additionalExercises = [
    {
        title: "第六关：诗词填空",
        type: "fill-blank", 
        content: "举头望___月，低头思___。___花落知多少，春眠不觉___。",
        blanks: [
            { index: 0, answer: "明", hints: ["李白诗句", "明亮的月亮"], example: "如：明、皎洁、圆" },
            { index: 1, answer: "故乡", hints: ["思念的地方", "家乡"], example: "如：故乡、家乡、故土" },
            { index: 2, answer: "夜来风雨声", hints: ["杜甫诗句", "春天的声音"], example: "如：夜来风雨声、昨夜风雨" },
            { index: 3, answer: "晓", hints: ["早晨", "天明"], example: "如：晓、dawn、清晨" }
        ],
        instruction: "填入古诗词中的经典词句。",
        difficulty: "中级"
    },
    {
        title: "第七关：现代文阅读",
        type: "fill-blank",
        content: "科技的发展___了人类的生活方式。人工智能正在___各个领域，___着社会的进步。我们要___地拥抱新技术，同时___传统文化的价值。",
        blanks: [
            { index: 0, answer: "改变", hints: ["使不同", "产生变化"], example: "如：改变、革新、转变" },
            { index: 1, answer: "渗透", hints: ["深入各处", "逐渐影响"], example: "如：渗透、进入、影响" },
            { index: 2, answer: "推动", hints: ["促进发展", "向前进"], example: "如：推动、促进、带动" },
            { index: 3, answer: "理性", hints: ["明智地", "不盲目"], example: "如：理性、冷静、明智" },
            { index: 4, answer: "保护", hints: ["维护价值", "传承下去"], example: "如：保护、传承、维护" }
        ],
        instruction: "理解现代科技发展的影响，填入合适词语。",
        difficulty: "高级"
    }
];

// Automatically add these exercises to the main exercises object (demonstrates unlimited expansion)
additionalExercises.forEach((exercise, index) => {
    const level = Object.keys(exercises).length + 1;
    exercises[level] = {
        ...exercise,
        id: level,
        dateAdded: new Date().toISOString()
    };
});

// Update total levels to reflect new exercises
gameConfig.totalLevels = Object.keys(exercises).length;

/**
 * Add new exercise to the game (supports unlimited expansion)
 */
function addNewExercise(exerciseData) {
    const nextLevel = Math.max(...Object.keys(exercises).map(Number)) + 1;
    exercises[nextLevel] = {
        ...exerciseData,
        id: nextLevel,
        dateAdded: new Date().toISOString()
    };
    gameConfig.totalLevels = nextLevel;
    console.log(`Added new exercise: Level ${nextLevel}`);
    return nextLevel;
}

/**
 * Assess player level based on performance
 */
function assessPlayerLevel() {
    const { correctAnswers, totalAnswers } = gameConfig.playerProgress;
    if (totalAnswers === 0) return 1;
    
    const accuracy = (correctAnswers / totalAnswers) * 100;
    
    if (accuracy >= gameConfig.difficultySettings.advanced.minScore) {
        return 3; // Advanced
    } else if (accuracy >= gameConfig.difficultySettings.intermediate.minScore) {
        return 2; // Intermediate
    } else {
        return 1; // Beginner
    }
}

/**
 * Get recommended next level based on player performance
 */
function getRecommendedLevel(currentLevel) {
    const playerLevel = assessPlayerLevel();
    const completedLevels = gameConfig.playerProgress.completedLevels;
    
    // Find appropriate difficulty exercises
    const availableExercises = Object.keys(exercises)
        .map(Number)
        .filter(level => !completedLevels.includes(level))
        .filter(level => {
            const exercise = exercises[level];
            switch (playerLevel) {
                case 1: return exercise.difficulty === '初级';
                case 2: return exercise.difficulty === '中级';
                case 3: return exercise.difficulty === '高级';
                default: return true;
            }
        });
    
    return availableExercises.length > 0 ? Math.min(...availableExercises) : currentLevel + 1;
}

/**
 * Update player statistics
 */
function updatePlayerStats(isCorrect) {
    gameConfig.playerProgress.totalAnswers++;
    if (isCorrect) {
        gameConfig.playerProgress.correctAnswers++;
    }
    gameConfig.playerProgress.playerLevel = assessPlayerLevel();
    saveProgress();
}
let currentExercise = null;
let userAnswers = [];
let isSubmitted = false;
let currentQuestionIndex = 0; // Track current question being answered

/**
 * Initialize the game
 */
function initializeGame() {
    try {
        loadProgress();
        generateLevelProgress();
        loadLevel(gameConfig.currentLevel);
    } catch (error) {
        console.error('Error initializing game:', error);
        showFeedback('游戏初始化失败，请刷新页面重试。', 'error');
    }
}

/**
 * Load player progress from localStorage
 */
function loadProgress() {
    const savedProgress = localStorage.getItem('zuowen-game-progress');
    if (savedProgress) {
        gameConfig.playerProgress = JSON.parse(savedProgress);
    }
    
    // Set current level based on progress
    const completedCount = gameConfig.playerProgress.completedLevels.length;
    gameConfig.currentLevel = Math.min(completedCount + 1, gameConfig.totalLevels);
}

/**
 * Save player progress to localStorage
 */
function saveProgress() {
    localStorage.setItem('zuowen-game-progress', JSON.stringify(gameConfig.playerProgress));
}

/**
 * Generate level progress indicators
 */
function generateLevelProgress() {
    const progressContainer = document.getElementById('levelProgress');
    progressContainer.innerHTML = '';
    
    for (let i = 1; i <= gameConfig.totalLevels; i++) {
        const indicator = document.createElement('div');
        indicator.className = 'level-indicator';
        indicator.textContent = i;
        
        if (gameConfig.playerProgress.completedLevels.includes(i)) {
            indicator.classList.add('completed');
        } else if (i === gameConfig.currentLevel) {
            indicator.classList.add('current');
        } else {
            indicator.classList.add('locked');
        }
        
        progressContainer.appendChild(indicator);
    }
}

/**
 * Load a specific level
 */
function loadLevel(levelNumber) {
    if (!exercises[levelNumber]) {
        showFeedback('关卡不存在', 'error');
        return;
    }
    
    currentExercise = exercises[levelNumber];
    userAnswers = new Array(currentExercise.blanks.length).fill('');
    isSubmitted = false;
    currentQuestionIndex = 0; // Reset to first question
    
    // Update UI
    document.getElementById('levelTitle').textContent = currentExercise.title;
    generateExerciseContent();
    
    // Reset buttons and feedback
    updateActionButtons();
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('achievement').classList.remove('show');
    document.getElementById('hint').style.display = 'none';
}

/**
 * Generate exercise content with enhanced user experience
 */
function generateExerciseContent() {
    const container = document.getElementById('exerciseContent');
    const content = currentExercise.content;
    const blanks = currentExercise.blanks;
    
    let html = '<p style="color: #2c3e50; font-weight: 600;"><strong>题目说明：</strong>' + currentExercise.instruction + '</p>';
    
    // Progress indicator for questions
    html += '<div style="margin: 10px 0; text-align: center; color: #e91e63; font-size: 14px; font-weight: bold;">';
    html += `第 ${currentQuestionIndex + 1} 题，共 ${blanks.length} 题`;
    html += '</div>';
    
    // Progress bar
    const progress = ((currentQuestionIndex + 1) / blanks.length) * 100;
    html += '<div style="width: 100%; background: #e0e0e0; border-radius: 10px; margin: 10px 0; height: 8px;">';
    html += `<div style="width: ${progress}%; background: #2196f3; height: 8px; border-radius: 10px; transition: width 0.3s;"></div>`;
    html += '</div>';
    
    html += '<div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #2196f3;">';
    
    // Show full sentence with all blanks visible for context
    const currentBlank = blanks[currentQuestionIndex];
    const parts = content.split('___');
    
    // Build the sentence with full context
    let questionText = '';
    for (let i = 0; i < parts.length; i++) {
        // Wrap text parts in spans with explicit dark color for better readability
        if (parts[i].trim()) {
            questionText += `<span style="color: #2c3e50; font-weight: 500;">${parts[i]}</span>`;
        } else {
            questionText += parts[i];
        }
        if (i < blanks.length) {
            if (i === currentQuestionIndex) {
                // Current question - show input with highlighting
                questionText += `<span style="background: #fff3e0; padding: 2px 4px; border-radius: 4px; border: 2px solid #ff9800;">
                    <input type="text" class="blank-input" 
                         placeholder="请填入词语" 
                         oninput="updateAnswer(${i}, this.value)"
                         onkeypress="handleKeyPress(event)"
                         data-blank-index="${i}"
                         id="blank-${i}"
                         value="${userAnswers[i] || ''}"
                         style="background: transparent; border: none; outline: none; font-weight: bold; color: #2c3e50; min-width: 80px; text-align: center;">
                </span>`;
            } else if (i < currentQuestionIndex) {
                // Already answered - show the answer
                questionText += `<span style="background: #c8e6c9; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: #2e7d32; position: relative;" title="已完成">${userAnswers[i] || '___'}<span style="position: absolute; top: -2px; right: -2px; color: #4caf50; font-size: 10px;">✓</span></span>`;
            } else {
                // Future questions - show placeholder with number indicator
                questionText += `<span style="background: #e8f4fd; padding: 4px 8px; border-radius: 4px; color: #2c3e50; border: 1px solid #bbdefb; position: relative;" title="待填写">___<span style="position: absolute; top: -8px; right: -8px; background: #2196f3; color: white; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; display: flex; align-items: center; justify-content: center;">${i + 1}</span></span>`;
            }
        }
    }
    
    html += '<div style="font-size: 18px; line-height: 2.5; margin: 15px 0; color: #2c3e50; font-weight: 500;">' + questionText + '</div>';
    
    // Show current question details
    html += `<div style="background: #f0f8ff; padding: 12px; border-radius: 6px; margin: 15px 0; border-left: 3px solid #2196f3;">
        <strong style="color: #1976d2;">💡 当前题目 (第${currentQuestionIndex + 1}题)：</strong><br>
        <span style="color: #666; font-size: 14px;">请为上面带橙色框的空白处填写合适的词语</span>
    </div>`;
    
    // Show example for current question
    if (currentBlank.example) {
        html += '<div style="margin: 15px 0; padding: 10px; background: #fff3e0; border-radius: 6px; border-left: 3px solid #ff9800;">';
        html += '<strong style="color: #f57c00;">🔖 参考示例：</strong><br>';
        html += '<span style="color: #7b1fa2; font-size: 14px; font-weight: 600;">' + currentBlank.example + '</span>';
        html += '</div>';
    }
    
    // Show hints for current question
    if (currentBlank.hints && currentBlank.hints.length > 0) {
        html += '<div style="margin: 15px 0; padding: 10px; background: #e8f5e8; border-radius: 6px; border-left: 3px solid #4caf50;">';
        html += '<strong style="color: #388e3c;">💭 温馨提示：</strong><br>';
        html += '<span style="color: #2e7d32; font-size: 14px;">' + currentBlank.hints[0] + '</span>';
        html += '</div>';
    }
    
    html += '</div>';
    html += `<p><strong>难度等级：</strong><span style="color: #ff9800;">${currentExercise.difficulty}</span></p>`;
    
    container.innerHTML = html;
    
    // Focus on the current input and scroll to it
    setTimeout(() => {
        const currentInput = document.getElementById(`blank-${currentQuestionIndex}`);
        if (currentInput) {
            currentInput.focus();
            // Auto-scroll to ensure input is visible on mobile
            currentInput.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
        }
    }, 100);
}

/**
 * Update action buttons based on current state
 */
function updateActionButtons() {
    const submitBtn = document.getElementById('submitBtn');
    const nextBtn = document.getElementById('nextBtn');
    const hintBtn = document.getElementById('hintBtn');
    
    if (currentQuestionIndex < currentExercise.blanks.length - 1) {
        // Still have more questions
        submitBtn.textContent = '下一题';
        submitBtn.style.display = 'inline-block';
        submitBtn.onclick = () => nextQuestion();
        nextBtn.style.display = 'none';
    } else {
        // Last question - show review option
        submitBtn.textContent = '预览答案';
        submitBtn.style.display = 'inline-block';
        submitBtn.onclick = () => showAnswerReview();
        nextBtn.style.display = 'none';
    }
    
    submitBtn.disabled = false;
    hintBtn.style.display = 'inline-block';
}

/**
 * Show complete answer review before final submission
 */
function showAnswerReview() {
    const container = document.getElementById('exerciseContent');
    const content = currentExercise.content;
    const blanks = currentExercise.blanks;
    const parts = content.split('___');
    
    let html = `
        <div style="background: #f8f9fa; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <h3 style="color: #2c3e50; text-align: center; margin-top: 0;">📋 答案预览</h3>
            <p style="color: #666; text-align: center; margin-bottom: 20px;">请检查您的答案，确认无误后点击"提交答案"</p>
            
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #2196f3;">
                <h4 style="color: #2196f3; margin-top: 0;">完整句子：</h4>
    `;
    
    // Build complete sentence with answers
    let completeText = '';
    for (let i = 0; i < parts.length; i++) {
        completeText += `<span style="color: #2c3e50;">${parts[i]}</span>`;
        if (i < blanks.length) {
            const answer = userAnswers[i] || '___';
            const isEmpty = !userAnswers[i];
            completeText += `<span style="
                background: ${isEmpty ? '#ffebee' : '#e8f5e8'}; 
                color: ${isEmpty ? '#c62828' : '#2e7d32'}; 
                padding: 4px 8px; 
                border-radius: 4px; 
                font-weight: bold;
                border: 2px solid ${isEmpty ? '#f44336' : '#4caf50'};
            ">${answer}</span>`;
        }
    }
    html += `<div style="font-size: 18px; line-height: 2.2; margin: 10px 0;">${completeText}</div>`;
    
    // Show individual answers with indicators
    html += `
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #ff9800;">
                <h4 style="color: #ff9800; margin-top: 0;">逐题检查：</h4>
    `;
    
    for (let i = 0; i < blanks.length; i++) {
        const answer = userAnswers[i] || '';
        const isEmpty = !answer;
        const icon = isEmpty ? '❌' : '✅';
        const status = isEmpty ? '未填写' : '已填写';
        
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span>第${i + 1}题:</span>
                <span style="font-weight: bold; color: ${isEmpty ? '#c62828' : '#2e7d32'};">
                    ${icon} "${answer || '空白'}" (${status})
                </span>
                <button onclick="editAnswer(${i})" style="padding: 4px 8px; background: #2196f3; color: white; border: none; border-radius: 4px; font-size: 12px; cursor: pointer;">
                    编辑
                </button>
            </div>
        `;
    }
    
    html += `
            </div>
            <div style="text-align: center; margin-top: 20px;">
                <button onclick="backToAnswering()" style="padding: 12px 24px; background: #607d8b; color: white; border: none; border-radius: 25px; margin: 0 10px; cursor: pointer;">
                    返回答题
                </button>
                <button onclick="finalSubmit()" style="padding: 12px 24px; background: #4caf50; color: white; border: none; border-radius: 25px; margin: 0 10px; cursor: pointer; font-weight: bold;">
                    确认提交
                </button>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    
    // Hide action buttons during review
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('hintBtn').style.display = 'none';
}

/**
 * Edit a specific answer
 */
function editAnswer(index) {
    currentQuestionIndex = index;
    generateExerciseContent();
    updateActionButtons();
}

/**
 * Return to normal answering mode
 */
function backToAnswering() {
    currentQuestionIndex = currentExercise.blanks.length - 1; // Go to last question
    generateExerciseContent();
    updateActionButtons();
}

/**
 * Final submission after review
 */
function finalSubmit() {
    submitAnswer();
}

/**
 * Handle key press events for better mobile experience
 */
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        const currentInput = document.getElementById(`blank-${currentQuestionIndex}`);
        if (currentInput && currentInput.value.trim()) {
            if (currentQuestionIndex < currentExercise.blanks.length - 1) {
                nextQuestion();
            } else {
                submitAnswer();
            }
        }
    }
}

/**
 * Move to next question
 */
function nextQuestion() {
    const currentInput = document.getElementById(`blank-${currentQuestionIndex}`);
    if (!currentInput || !currentInput.value.trim()) {
        showFeedback('请先填写当前题目的答案', 'error');
        return;
    }
    
    // Save current answer
    userAnswers[currentQuestionIndex] = currentInput.value.trim();
    
    // Move to next question
    if (currentQuestionIndex < currentExercise.blanks.length - 1) {
        currentQuestionIndex++;
        generateExerciseContent();
        updateActionButtons();
        
        // Hide any previous feedback
        document.getElementById('feedback').style.display = 'none';
        
        // Auto-scroll to new input field for better mobile experience
        setTimeout(() => {
            const newInput = document.getElementById(`blank-${currentQuestionIndex}`);
            if (newInput) {
                newInput.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
            }
        }, 200);
    }
}
function updateAnswer(index, value) {
    userAnswers[index] = value.trim();
    console.log(`Updated answer ${index}: ${value.trim()}`);
    
    // Add real-time feedback effects
    const inputElement = document.getElementById(`blank-${index}`);
    if (inputElement && value.trim()) {
        // Check if answer is close to correct answer
        const correctAnswer = currentExercise.blanks[index].answer;
        const similarity = calculateSimilarity(value.trim(), correctAnswer);
        
        if (similarity > 0.8) {
            inputElement.classList.add('correct-answer');
            inputElement.classList.remove('incorrect-answer');
            // Add sparkle effect
            addSparkleEffect(inputElement);
        } else if (similarity > 0.5) {
            inputElement.style.borderColor = '#ff9800';
            inputElement.style.background = '#fff3e0';
        } else {
            inputElement.classList.remove('correct-answer');
            inputElement.style.borderColor = '#2196f3';
            inputElement.style.background = '#e3f2fd';
        }
    }
    
    // Prevent event bubbling that might cause issues
    event.stopPropagation();
}

/**
 * Calculate similarity between user answer and correct answer
 */
function calculateSimilarity(userAnswer, correctAnswer) {
    if (!userAnswer || !correctAnswer) return 0;
    
    const user = userAnswer.toLowerCase();
    const correct = correctAnswer.toLowerCase();
    
    // Exact match
    if (user === correct) return 1.0;
    
    // Check if user answer contains correct answer or vice versa
    if (user.includes(correct) || correct.includes(user)) return 0.9;
    
    // Simple character similarity
    let matches = 0;
    const maxLength = Math.max(user.length, correct.length);
    const minLength = Math.min(user.length, correct.length);
    
    for (let i = 0; i < minLength; i++) {
        if (user[i] === correct[i]) matches++;
    }
    
    return matches / maxLength;
}

/**
 * Add sparkle effect to element
 */
function addSparkleEffect(element) {
    // Create sparkle elements
    for (let i = 0; i < 5; i++) {
        setTimeout(() => {
            const sparkle = document.createElement('div');
            sparkle.innerHTML = '✨';
            sparkle.style.position = 'absolute';
            sparkle.style.pointerEvents = 'none';
            sparkle.style.fontSize = '14px';
            sparkle.style.animation = 'sparkleFloat 1s ease-out forwards';
            
            const rect = element.getBoundingClientRect();
            sparkle.style.left = (rect.left + Math.random() * rect.width) + 'px';
            sparkle.style.top = (rect.top - 20) + 'px';
            sparkle.style.zIndex = '1000';
            
            document.body.appendChild(sparkle);
            
            setTimeout(() => sparkle.remove(), 1000);
        }, i * 100);
    }
}

// Add sparkle animation CSS dynamically
const sparkleCSS = `
@keyframes sparkleFloat {
    0% {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
    100% {
        opacity: 0;
        transform: translateY(-30px) scale(0.5);
    }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes confettiFall {
    0% {
        transform: translateY(-100vh) rotate(0deg);
        opacity: 1;
    }
    100% {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
    }
}

@keyframes flashFade {
    0% { opacity: 0.3; }
    50% { opacity: 0.1; }
    100% { opacity: 0; }
}

.correct-answer {
    background: #c8e6c9 !important;
    border-color: #4caf50 !important;
    color: #2e7d32 !important;
}

.incorrect-answer {
    background: #ffcdd2 !important;
    border-color: #f44336 !important;
    color: #c62828 !important;
}

.feedback.info {
    background: #e3f2fd;
    color: #1976d2;
    border: 2px solid #2196f3;
}
`;

// Add the CSS to the document
const styleElement = document.createElement('style');
styleElement.textContent = sparkleCSS;
document.head.appendChild(styleElement);
function showHint() {
    const hintElement = document.getElementById('hint');
    if (currentExercise && currentExercise.blanks[currentQuestionIndex]) {
        const currentBlank = currentExercise.blanks[currentQuestionIndex];
        let hintText = `
            <div style="background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800;">
                <h4 style="color: #f57c00; margin-top: 0;">💡 第${currentQuestionIndex + 1}题详细提示</h4>
        `;
        
        if (currentBlank.hints && currentBlank.hints.length > 0) {
            hintText += `<p><strong>提示1：</strong>${currentBlank.hints[0]}</p>`;
            if (currentBlank.hints[1]) {
                hintText += `<p><strong>提示2：</strong>${currentBlank.hints[1]}</p>`;
            }
        }
        
        if (currentBlank.example) {
            hintText += `<p><strong>参考示例：</strong>${currentBlank.example}</p>`;
        }
        
        // Add contextual analysis
        const parts = currentExercise.content.split('___');
        const beforeText = parts[currentQuestionIndex] ? parts[currentQuestionIndex].slice(-10) : '';
        const afterText = parts[currentQuestionIndex + 1] ? parts[currentQuestionIndex + 1].slice(0, 10) : '';
        
        hintText += `
                <p><strong>上下文分析：</strong></p>
                <p style="background: #f5f5f5; padding: 8px; border-radius: 4px; font-family: monospace;">
                    ...${beforeText}<span style="background: #ffeb3b; padding: 2px 4px; border-radius: 2px;">[请填入]</span>${afterText}...
                </p>
                <p style="font-size: 12px; color: #666;">
                    💭 思考：这个位置需要什么样的词语？是形容词、副词还是名词？它在句子中起什么作用？
                </p>
            </div>
        `;
        
        hintElement.innerHTML = hintText;
        hintElement.style.display = 'block';
        
        // Scroll to hint for better visibility
        setTimeout(() => {
            hintElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'nearest' 
            });
        }, 100);
    }
}

/**
 * Submit user answers for AI evaluation
 */
async function submitAnswer() {
    if (isSubmitted) {
        return;
    }
    
    // Check if all blanks are filled
    const emptyBlanks = userAnswers.filter(answer => !answer).length;
    if (emptyBlanks > 0) {
        showFeedback(`还有 ${emptyBlanks} 个空白没有填写，请完成后再提交。`, 'error');
        return;
    }
    
    isSubmitted = true;
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = 'AI评判中...';
    submitBtn.disabled = true;
    
    // Add visual loading indicator
    submitBtn.innerHTML = `
        <span style="display: inline-flex; align-items: center;">
            <span style="display: inline-block; width: 16px; height: 16px; border: 2px solid #fff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></span>
            AI评判中...
        </span>
    `;
    
    try {
        // Prepare content for AI evaluation
        const exerciseText = currentExercise.content;
        const correctAnswers = currentExercise.blanks.map(blank => blank.answer);
        
        // Enhanced evaluation prompt with more context
        const prompt = `作为专业的语文老师，请评判学生的填空练习答案。

题目内容：${exerciseText}

标准答案：${correctAnswers.join('、')}
学生答案：${userAnswers.join('、')}

评判标准：
1. 语义正确性（是否符合上下文含义）- 权重40%
2. 语法正确性（词性和语法是否正确）- 权重30%
3. 表达恰当性（是否使文章更生动优美）- 权重30%

请详细分析每个空的填写情况，并按以下格式回答：

通过状态：[通过/不通过]
评价：[对每个空的详细分析，指出优点和问题]
建议：[具体的改进建议和学习方向]
得分：[总体得分，满分100分]

注意：如果学生答案在语义上正确且表达合理，即使与标准答案不完全相同也应该给予认可。`;

        // Show user what's being evaluated
        showFeedback(`正在评判您的答案...<br><small>题目：${currentExercise.title}</small>`, 'info');
        
        // Call AI service for evaluation
        const aiResponse = await callAIService(prompt);
        processAIEvaluation(aiResponse);
        
    } catch (error) {
        console.error('AI evaluation error:', error);
        
        // Show user-friendly error message
        showFeedback(`AI评判遇到问题：${error.message}<br>将使用基础评判方式`, 'error');
        
        // Fallback to simple matching evaluation after a short delay
        setTimeout(() => {
            simpleEvaluation();
        }, 2000);
    } finally {
        // Restore button appearance in case of error
        setTimeout(() => {
            submitBtn.innerHTML = '重新提交';
            submitBtn.disabled = false;
        }, 1000);
    }
}

/**
 * Call AI service for evaluation
 */
async function callAIService(prompt) {
    try {
        // Import AI utilities
        const { sendChatMessage } = await import('../util/ai_utils.js');
        
        // Add timeout and retry logic
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI service timeout')), 10000)
        );
        
        const aiPromise = sendChatMessage(prompt);
        
        return await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
        console.error('Failed to call AI service:', error);
        // Provide more detailed error information
        if (error.message.includes('timeout')) {
            throw new Error('AI服务响应超时，请稍后重试');
        } else if (error.message.includes('network')) {
            throw new Error('网络连接失败，请检查网络连接');
        } else {
            throw new Error('AI服务暂时不可用，使用基础评判方式');
        }
    }
}

/**
 * Process AI evaluation response
 */
function processAIEvaluation(response) {
    try {
        const evaluation = response.response || response;
        console.log('AI Evaluation Response:', evaluation);
        
        // Enhanced AI response parsing
        let isPassed = false;
        let detailedFeedback = '';
        let suggestions = '';
        
        // Parse the structured response
        if (evaluation.includes('通过状态：通过')) {
            isPassed = true;
        } else if (evaluation.includes('通过状态：不通过')) {
            isPassed = false;
        } else {
            // Fallback parsing for less structured responses
            const positiveKeywords = ['通过', '正确', '优秀', '很好', '不错'];
            const negativeKeywords = ['不通过', '错误', '不正确', '需要改进'];
            
            const hasPositive = positiveKeywords.some(word => evaluation.includes(word));
            const hasNegative = negativeKeywords.some(word => evaluation.includes(word));
            
            isPassed = hasPositive && !hasNegative;
        }
        
        // Extract detailed feedback and suggestions
        const evaluationLines = evaluation.split('\n');
        evaluationLines.forEach(line => {
            if (line.includes('评价：')) {
                detailedFeedback = line.replace('评价：', '').trim();
            } else if (line.includes('建议：')) {
                suggestions = line.replace('建议：', '').trim();
            }
        });
        
        // Create comprehensive feedback
        let comprehensiveFeedback = evaluation;
        if (detailedFeedback || suggestions) {
            comprehensiveFeedback = `${detailedFeedback}<br><br><strong>改进建议：</strong><br>${suggestions}`;
        }
        
        // Add AI evaluation indicator
        comprehensiveFeedback = `<div style="background: #e8f5e8; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #4caf50;">
            <strong>🤖 AI智能评判：</strong><br>${comprehensiveFeedback}
        </div>`;
        
        if (isPassed) {
            handleLevelComplete(comprehensiveFeedback);
        } else {
            handleLevelFailed(comprehensiveFeedback);
        }
        
    } catch (error) {
        console.error('Failed to process AI evaluation:', error);
        // Fallback to simple evaluation with explanation
        showFeedback('AI评判出现问题，使用基础评判方式', 'error');
        setTimeout(() => simpleEvaluation(), 1000);
    }
}

/**
 * Enhanced fallback evaluation with detailed feedback
 */
function simpleEvaluation() {
    const correctAnswers = currentExercise.blanks.map(blank => blank.answer);
    let correctCount = 0;
    let detailedFeedback = [];
    let partialMatches = 0;
    
    for (let i = 0; i < userAnswers.length; i++) {
        const userAnswer = userAnswers[i];
        const correctAnswer = correctAnswers[i];
        const similarity = calculateSimilarity(userAnswer, correctAnswer);
        
        updatePlayerStats(similarity > 0.8); // Update player statistics
        
        if (similarity === 1.0) {
            correctCount++;
            detailedFeedback.push(`第${i + 1}个空：✅ 完全正确！"${userAnswer}"`);
        } else if (similarity > 0.8) {
            correctCount++;
            partialMatches++;
            detailedFeedback.push(`第${i + 1}个空：✅ 很好！"${userAnswer}" (标准答案："${correctAnswer}")`);
        } else if (similarity > 0.5) {
            partialMatches++;
            detailedFeedback.push(`第${i + 1}个空：⚠️ 部分正确。"${userAnswer}" → 建议："${correctAnswer}"`);
        } else {
            detailedFeedback.push(`第${i + 1}个空：❌ 需要改进。"${userAnswer}" → 建议："${correctAnswer}"`);
        }
    }
    
    const score = (correctCount / correctAnswers.length) * 100;
    const isPassed = score >= 60; // 60分及格
    
    // Enhanced player statistics
    const playerLevel = assessPlayerLevel();
    const levelNames = { 1: '初学者', 2: '进阶者', 3: '高手' };
    const accuracy = gameConfig.playerProgress.totalAnswers > 0 ? 
        ((gameConfig.playerProgress.correctAnswers / gameConfig.playerProgress.totalAnswers) * 100).toFixed(1) : 0;
    
    // Create comprehensive feedback
    let comprehensiveFeedback = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 10px 0;">
            <h4 style="color: #2c3e50; margin-top: 0;">📊 评判结果</h4>
            <p><strong>得分：</strong> ${score.toFixed(0)}分 / 100分</p>
            <p><strong>正确率：</strong> ${correctCount}/${correctAnswers.length} 
               ${partialMatches > 0 ? `(其中 ${partialMatches} 个部分正确)` : ''}</p>
            <div style="margin: 10px 0;">
                ${detailedFeedback.join('<br>')}
            </div>
        </div>
        
        <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #2196f3;">
            <strong>📈 学习进展：</strong><br>
            玩家等级：${levelNames[playerLevel]} | 总体准确率：${accuracy}%<br>
            完成关卡：${gameConfig.playerProgress.completedLevels.length}/${gameConfig.totalLevels}
        </div>`;
    
    if (isPassed) {
        comprehensiveFeedback += `
            <div style="background: #e8f5e8; padding: 12px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #4caf50;">
                <strong>🎉 恭喜通过！</strong><br>
                继续保持这样的水平，向下一关进发吧！
            </div>`;
        handleLevelComplete(comprehensiveFeedback);
    } else {
        comprehensiveFeedback += `
            <div style="background: #fff3e0; padding: 12px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #ff9800;">
                <strong>💪 继续努力！</strong><br>
                多观察上下文的语境和语法结构，您一定可以做得更好！
                ${score >= 50 ? '已经很接近及格线了，再试一次！' : '建议先复习相关知识点。'}
            </div>`;
        handleLevelFailed(comprehensiveFeedback);
    }
}

/**
 * Handle level completion
 */
function handleLevelComplete(evaluation) {
    // Add to completed levels
    if (!gameConfig.playerProgress.completedLevels.includes(gameConfig.currentLevel)) {
        gameConfig.playerProgress.completedLevels.push(gameConfig.currentLevel);
        gameConfig.playerProgress.currentScore += 100;
        saveProgress();
    }
    
    // Add celebration effects
    triggerCelebrationEffects();
    
    // Show success feedback with enhanced styling
    showFeedback('🎉 恭喜过关！' + evaluation, 'success');
    
    // Show achievement with celebration animation
    const achievement = document.getElementById('achievement');
    achievement.classList.add('show', 'celebration-mode');
    
    // Update buttons
    document.getElementById('submitBtn').style.display = 'none';
    if (gameConfig.currentLevel < gameConfig.totalLevels) {
        document.getElementById('nextBtn').style.display = 'inline-block';
    } else {
        // Game completed
        showGameComplete();
    }
    
    // Update progress indicators
    generateLevelProgress();
}

/**
 * Trigger celebration effects
 */
function triggerCelebrationEffects() {
    // Add confetti effect
    createConfetti();
    
    // Add screen flash effect
    const flashOverlay = document.createElement('div');
    flashOverlay.style.position = 'fixed';
    flashOverlay.style.top = '0';
    flashOverlay.style.left = '0';
    flashOverlay.style.width = '100vw';
    flashOverlay.style.height = '100vh';
    flashOverlay.style.background = 'rgba(76, 175, 80, 0.3)';
    flashOverlay.style.pointerEvents = 'none';
    flashOverlay.style.zIndex = '9999';
    flashOverlay.style.animation = 'flashFade 1s ease-out forwards';
    
    document.body.appendChild(flashOverlay);
    setTimeout(() => flashOverlay.remove(), 1000);
    
    // Play celebration sound effect (if available)
    try {
        // Simple audio context beep
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 523.25; // C5 note
        gainNode.gain.value = 0.1;
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (e) {
        console.log('Audio not supported');
    }
}

/**
 * Create confetti effect
 */
function createConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd', '#98d8c8'];
    
    for (let i = 0; i < 30; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.top = '-10px';
            confetti.style.width = '10px';
            confetti.style.height = '10px';
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '9998';
            confetti.style.animation = `confettiFall ${2 + Math.random() * 2}s linear forwards`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 4000);
        }, i * 50);
    }
}

/**
 * Handle level failure
 */
function handleLevelFailed(evaluation) {
    showFeedback('还需要努力哦！<br>' + evaluation, 'error');
    
    // Reset for retry
    isSubmitted = false;
    document.getElementById('submitBtn').textContent = '重新提交';
    document.getElementById('submitBtn').disabled = false;
}

/**
 * Move to next level (with adaptive difficulty)
 */
function nextLevel() {
    const recommendedLevel = getRecommendedLevel(gameConfig.currentLevel);
    
    if (recommendedLevel <= gameConfig.totalLevels) {
        gameConfig.currentLevel = recommendedLevel;
        loadLevel(gameConfig.currentLevel);
        generateLevelProgress();
        
        // Show adaptive message
        const playerLevel = assessPlayerLevel();
        const levelNames = { 1: '初学者', 2: '进阶者', 3: '高手' };
        showFeedback(`为${levelNames[playerLevel]}推荐合适难度关卡`, 'success');
        setTimeout(() => {
            document.getElementById('feedback').style.display = 'none';
        }, 2000);
    }
}

/**
 * Show game completion
 */
function showGameComplete() {
    const container = document.getElementById('exerciseContent');
    container.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <h2 style="color: #4caf50;">🏆 恭喜完成所有关卡！</h2>
            <p style="font-size: 18px; margin: 20px 0;">您已经成功通过了所有的作文水平测试！</p>
            <p style="color: #555;">总得分：${gameConfig.playerProgress.currentScore}分</p>
            <button class="btn btn-primary" onclick="restartGame()" style="margin-top: 20px;">重新开始</button>
        </div>
    `;
    
    document.getElementById('submitBtn').style.display = 'none';
    document.getElementById('nextBtn').style.display = 'none';
}

/**
 * Restart the game
 */
function restartGame() {
    gameConfig.playerProgress = {
        completedLevels: [],
        currentScore: 0
    };
    gameConfig.currentLevel = 1;
    saveProgress();
    initializeGame();
}

/**
 * Show feedback message
 */
function showFeedback(message, type) {
    const feedbackElement = document.getElementById('feedback');
    feedbackElement.innerHTML = message;
    feedbackElement.className = `feedback ${type}`;
    feedbackElement.style.display = 'block';
    
    // Auto hide after 5 seconds for success messages
    if (type === 'success') {
        setTimeout(() => {
            feedbackElement.style.display = 'none';
        }, 5000);
    }
}

/**
 * Navigation functions for mini-program integration
 */
function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/index/index",
        });
    } else {
        window.location.href = '../index.html';
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeGame);