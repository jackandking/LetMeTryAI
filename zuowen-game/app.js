/**
 * Chinese Composition Writing Level Game
 * Progressive difficulty levels with fill-in-blank exercises and AI evaluation
 */

/**
 * Game configuration and levels
 */
const gameConfig = {
    totalLevels: 5,
    currentLevel: 1,
    playerProgress: {
        completedLevels: [],
        currentScore: 0
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
            { index: 0, answer: "欢快地", hints: ["表示动作的方式", "形容开心的样子"] },
            { index: 1, answer: "美丽地", hints: ["形容花朵的状态", "表示美好的样子"] },
            { index: 2, answer: "自由地", hints: ["表示没有约束", "形容轻松的状态"] },
            { index: 3, answer: "温暖", hints: ["春天的特点", "让人感到舒适"] },
            { index: 4, answer: "生机", hints: ["表示活力", "春天带来的感觉"] }
        ],
        instruction: "请在空白处填入合适的词语，让句子更加生动。",
        difficulty: "初级"
    },
    2: {
        title: "第二关：情感表达",
        type: "fill-blank",
        content: "看着妈妈___的背影，我的心里___涌起一阵暖流。她为了我们的家___付出，从不___。我___要好好学习，报答她的恩情。",
        blanks: [
            { index: 0, answer: "忙碌", hints: ["描述妈妈的状态", "表示很忙"] },
            { index: 1, answer: "顿时", hints: ["表示时间", "立刻、马上"] },
            { index: 2, answer: "默默地", hints: ["表示方式", "不声不响地"] },
            { index: 3, answer: "抱怨", hints: ["表示不满", "埋怨"] },
            { index: 4, answer: "暗下决心", hints: ["表示决定", "在心里决定"] }
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

/**
 * Current game state
 */
let currentExercise = null;
let userAnswers = [];
let isSubmitted = false;

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
    
    // Update UI
    document.getElementById('levelTitle').textContent = currentExercise.title;
    generateExerciseContent();
    
    // Reset buttons and feedback
    document.getElementById('submitBtn').style.display = 'inline-block';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('feedback').style.display = 'none';
    document.getElementById('achievement').classList.remove('show');
    document.getElementById('hint').style.display = 'none';
}

/**
 * Generate exercise content with input fields
 */
function generateExerciseContent() {
    const container = document.getElementById('exerciseContent');
    const content = currentExercise.content;
    const blanks = currentExercise.blanks;
    
    let html = '<p><strong>题目说明：</strong>' + currentExercise.instruction + '</p>';
    html += '<div style="margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border-left: 4px solid #2196f3;">';
    
    // Split content and insert input fields
    const parts = content.split('___');
    for (let i = 0; i < parts.length; i++) {
        html += parts[i];
        if (i < blanks.length) {
            html += `<input type="text" class="blank-input" 
                     placeholder="请填入词语" 
                     oninput="updateAnswer(${i}, this.value)"
                     data-blank-index="${i}"
                     id="blank-${i}">`;
        }
    }
    
    html += '</div>';
    html += `<p><strong>难度等级：</strong><span style="color: #ff9800;">${currentExercise.difficulty}</span></p>`;
    
    container.innerHTML = html;
}

/**
 * Update user answer for a specific blank
 */
function updateAnswer(index, value) {
    userAnswers[index] = value.trim();
    console.log(`Updated answer ${index}: ${value.trim()}`);
}

/**
 * Show hint for current level
 */
function showHint() {
    const hintElement = document.getElementById('hint');
    if (currentExercise) {
        let hintText = '💡 提示：<br>';
        currentExercise.blanks.forEach((blank, index) => {
            hintText += `第${index + 1}个空：${blank.hints[0]}<br>`;
        });
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
        if (userAnswers[i] === correctAnswers[i]) {
            correctCount++;
        } else {
            feedback += `第${i + 1}个空：建议填入"${correctAnswers[i]}"<br>`;
        }
    }
    
    const score = (correctCount / correctAnswers.length) * 100;
    const isPassed = score >= 60; // 60分及格
    
    if (isPassed) {
        handleLevelComplete(`恭喜！您答对了 ${correctCount}/${correctAnswers.length} 个，得分：${score.toFixed(0)}分`);
    } else {
        handleLevelFailed(`答对了 ${correctCount}/${correctAnswers.length} 个，得分：${score.toFixed(0)}分<br>${feedback}请再试一次！`);
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
    
    // Show success feedback
    showFeedback('🎉 恭喜过关！' + evaluation, 'success');
    
    // Show achievement
    document.getElementById('achievement').classList.add('show');
    
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
 * Move to next level
 */
function nextLevel() {
    if (gameConfig.currentLevel < gameConfig.totalLevels) {
        gameConfig.currentLevel++;
        loadLevel(gameConfig.currentLevel);
        generateLevelProgress();
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
            <p style="color: #666;">总得分：${gameConfig.playerProgress.currentScore}分</p>
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