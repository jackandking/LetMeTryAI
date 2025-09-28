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
 * Generate exercise content with input fields - one question at a time
 */
function generateExerciseContent() {
    const container = document.getElementById('exerciseContent');
    const content = currentExercise.content;
    const blanks = currentExercise.blanks;
    
    let html = '<p><strong>题目说明：</strong>' + currentExercise.instruction + '</p>';
    
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
    
    // Show current question only
    const currentBlank = blanks[currentQuestionIndex];
    const parts = content.split('___');
    
    // Build the sentence with only current blank shown as input
    let questionText = '';
    for (let i = 0; i < parts.length; i++) {
        // Wrap text parts in spans with explicit dark color for better readability
        if (parts[i].trim()) {
            questionText += `<span style="color: #333; font-weight: 500;">${parts[i]}</span>`;
        } else {
            questionText += parts[i];
        }
        if (i < blanks.length) {
            if (i === currentQuestionIndex) {
                // Current question - show input
                questionText += `<input type="text" class="blank-input" 
                     placeholder="请填入词语" 
                     oninput="updateAnswer(${i}, this.value)"
                     data-blank-index="${i}"
                     id="blank-${i}"
                     value="${userAnswers[i] || ''}"
                     style="background: #e3f2fd; border-color: #2196f3; font-weight: bold;">`;
            } else if (i < currentQuestionIndex) {
                // Already answered - show the answer
                questionText += `<span style="background: #c8e6c9; padding: 4px 8px; border-radius: 4px; font-weight: bold; color: #2e7d32;">${userAnswers[i] || '___'}</span>`;
            } else {
                // Future questions - show placeholder
                questionText += '<span style="background: #e8f4fd; padding: 4px 8px; border-radius: 4px; color: #1976d2; border: 1px solid #bbdefb;">___</span>';
            }
        }
    }
    
    html += '<div style="font-size: 18px; line-height: 2; margin: 15px 0; color: #333; font-weight: 500;">' + questionText + '</div>';
    
    // Show example for current question
    if (currentBlank.example) {
        html += '<div style="margin: 15px 0; padding: 10px; background: #f0f8ff; border-radius: 6px; border-left: 3px solid #2196f3;">';
        html += '<strong style="color: #1976d2;">💡 参考示例：</strong><br>';
        html += '<span style="color: #9c27b0; font-size: 14px; font-weight: 500;">' + currentBlank.example + '</span>';
        html += '</div>';
    }
    
    html += '</div>';
    html += `<p><strong>难度等级：</strong><span style="color: #ff9800;">${currentExercise.difficulty}</span></p>`;
    
    container.innerHTML = html;
    
    // Focus on the current input
    setTimeout(() => {
        const currentInput = document.getElementById(`blank-${currentQuestionIndex}`);
        if (currentInput) {
            currentInput.focus();
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
        // Last question
        submitBtn.textContent = '提交答案';
        submitBtn.style.display = 'inline-block';
        submitBtn.onclick = () => submitAnswer();
        nextBtn.style.display = 'none';
    }
    
    submitBtn.disabled = false;
    hintBtn.style.display = 'inline-block';
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
`;

// Add the CSS to the document
const styleElement = document.createElement('style');
styleElement.textContent = sparkleCSS;
document.head.appendChild(styleElement);
function showHint() {
    const hintElement = document.getElementById('hint');
    if (currentExercise && currentExercise.blanks[currentQuestionIndex]) {
        const currentBlank = currentExercise.blanks[currentQuestionIndex];
        let hintText = '💡 提示：<br>';
        hintText += `第${currentQuestionIndex + 1}题提示：${currentBlank.hints[0]}<br>`;
        if (currentBlank.hints[1]) {
            hintText += `补充提示：${currentBlank.hints[1]}`;
        }
        hintElement.innerHTML = hintText;
        hintElement.style.display = 'block';
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
    document.getElementById('submitBtn').textContent = '评判中...';
    document.getElementById('submitBtn').disabled = true;
    
    try {
        // Prepare content for AI evaluation
        const exerciseText = currentExercise.content;
        const correctAnswers = currentExercise.blanks.map(blank => blank.answer);
        
        // Create evaluation prompt
        const prompt = `作为语文老师，请评判学生的填空练习答案。

题目：${exerciseText}

标准答案：${correctAnswers.join('、')}
学生答案：${userAnswers.join('、')}

评判标准：
1. 语义正确性（是否符合上下文含义）
2. 语法正确性（词性和语法是否正确）
3. 表达恰当性（是否使文章更生动）

请回答：
1. 是否通过（通过/不通过）
2. 具体评价（每个空的点评）
3. 改进建议

回答格式：
通过状态：[通过/不通过]
评价：[具体评价内容]
建议：[改进建议]`;

        // Call AI service for evaluation
        const aiResponse = await callAIService(prompt);
        processAIEvaluation(aiResponse);
        
    } catch (error) {
        console.error('AI evaluation error:', error);
        // Fallback to simple matching evaluation
        simpleEvaluation();
    }
}

/**
 * Call AI service for evaluation
 */
async function callAIService(prompt) {
    try {
        // Import AI utilities
        const { sendChatMessage } = await import('../util/ai_utils.js');
        return await sendChatMessage(prompt);
    } catch (error) {
        console.error('Failed to load AI utilities:', error);
        throw error;
    }
}

/**
 * Process AI evaluation response
 */
function processAIEvaluation(response) {
    try {
        const evaluation = response.response || response;
        const isPassed = evaluation.includes('通过状态：通过') || 
                        evaluation.includes('通过') && !evaluation.includes('不通过');
        
        if (isPassed) {
            handleLevelComplete(evaluation);
        } else {
            handleLevelFailed(evaluation);
        }
        
    } catch (error) {
        console.error('Failed to process AI evaluation:', error);
        simpleEvaluation();
    }
}

/**
 * Simple fallback evaluation (exact matching)
 */
function simpleEvaluation() {
    const correctAnswers = currentExercise.blanks.map(blank => blank.answer);
    let correctCount = 0;
    let feedback = '';
    
    for (let i = 0; i < userAnswers.length; i++) {
        const isCorrect = userAnswers[i] === correctAnswers[i];
        updatePlayerStats(isCorrect); // Update player statistics
        
        if (isCorrect) {
            correctCount++;
        } else {
            feedback += `第${i + 1}个空：建议填入"${correctAnswers[i]}"<br>`;
        }
    }
    
    const score = (correctCount / correctAnswers.length) * 100;
    const isPassed = score >= 60; // 60分及格
    
    // Show player level info
    const playerLevel = assessPlayerLevel();
    const levelNames = { 1: '初学者', 2: '进阶者', 3: '高手' };
    const accuracy = gameConfig.playerProgress.totalAnswers > 0 ? 
        ((gameConfig.playerProgress.correctAnswers / gameConfig.playerProgress.totalAnswers) * 100).toFixed(1) : 0;
    
    const statsInfo = `<br><small>玩家等级：${levelNames[playerLevel]} | 总体准确率：${accuracy}%</small>`;
    
    if (isPassed) {
        handleLevelComplete(`恭喜！您答对了 ${correctCount}/${correctAnswers.length} 个，得分：${score.toFixed(0)}分${statsInfo}`);
    } else {
        handleLevelFailed(`答对了 ${correctCount}/${correctAnswers.length} 个，得分：${score.toFixed(0)}分<br>${feedback}请再试一次！${statsInfo}`);
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