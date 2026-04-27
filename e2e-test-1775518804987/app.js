/**
 * 运动装备偏好小调查 - Voting Application
 * Design System: UI/UX Pro Max - Vibrant Sport Theme
 */

const questionConfig = {
    title: '运动装备偏好小调查',
    question: '以下运动装备，你喜欢哪个？',
    options: [
        { value: 'basketball-shoes', label: '篮球鞋' },
        { value: 'running-shoes', label: '跑鞋' },
        { value: 'gym-gloves', label: '健身手套' }
    ],
    storageKey: 'e2e_test_1775518804987.data'
};

let currentQuestion = 1;
let voteData = {};

const EVENT_ENDPOINT = 'https://letmetry.cloud/api/track';
const pageStartTime = Date.now();

function logEvent(event, data = {}) {
    const payload = {
        event,
        appId: questionConfig.storageKey.replace(/\.data$/, ''),
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        ...data
    };
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(payload));
    } else if (typeof fetch !== 'undefined') {
        fetch(EVENT_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            keepalive: true
        }).catch(() => {});
    }
}

let isVoting = false; // Prevent double voting

function initializeApp() {
    try {
        checkUrlParameters();
        setupEventTracking();
        initializeVoteData();
        setupPageContent();
        handleResultDisplay();
        createVotingOverlay();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function setupEventTracking() {
    const urlParams = new URLSearchParams(window.location.search);
    logEvent('page_load', { showAd: urlParams.get('showAd') === 'true' });
    const finishedAd = urlParams.get('finishedAd');
    if (finishedAd === 'true') {
        logEvent('rewarded_ad_complete');
    } else if (finishedAd === 'false') {
        logEvent('rewarded_ad_skip');
    }
    window.addEventListener('beforeunload', () => {
        logEvent('page_exit', { durationMs: Date.now() - pageStartTime });
    });
}


function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const finishedAd = urlParams.get('finishedAd');
    
    if (finishedAd === 'false') {
        // 用户没看完广告，但仍然显示结果（因为已经投票了）
        console.log('Ad not finished, but showing results anyway');
        // 延迟显示结果，让用户知道发生了什么
        setTimeout(() => {
            displayResults();
        }, 100);
    }
}

function initializeVoteData() {
    questionConfig.options.forEach(option => {
        voteData[option.label] = 0;
    });
}

function setupPageContent() {
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
        titleElement.textContent = questionConfig.title;
    }

    const questionElement = document.getElementById('questionText');
    if (questionElement) {
        questionElement.textContent = questionConfig.question;
    }

    attachRadioHandlers();
}

// Create voting overlay for visual feedback
function createVotingOverlay() {
    if (document.getElementById('votingOverlay')) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'votingOverlay';
    overlay.className = 'voting-overlay';
    overlay.innerHTML = `
        <div class="spinner"></div>
        <h3>正在提交投票...</h3>
        <p>请稍候，正在处理您的选择</p>
    `;
    document.body.appendChild(overlay);
}

function showVotingOverlay() {
    const overlay = document.getElementById('votingOverlay');
    if (overlay) overlay.classList.add('active');
}

function hideVotingOverlay() {
    const overlay = document.getElementById('votingOverlay');
    if (overlay) overlay.classList.remove('active');
}

function attachRadioHandlers() {
    const optionCards = document.querySelectorAll('.option-card');
    if (!optionCards || optionCards.length === 0) {
        console.error('No option cards found');
        return;
    }

    optionCards.forEach(card => {
        // Use pointerdown for faster response on mobile + click for fallback
        card.addEventListener('pointerdown', handleCardInteraction);
        card.addEventListener('click', handleCardInteraction);
    });
    
    console.log('Radio handlers attached to', optionCards.length, 'cards');
}

async function handleCardInteraction(event) {
    // Prevent double voting
    if (isVoting) {
        console.log('Already voting, ignoring click');
        return;
    }
    
    // Find the card that was clicked (could be a child element)
    const card = event.currentTarget;
    if (!card) {
        console.error('No card found');
        return;
    }
    
    const radio = card.querySelector('input[type="radio"]');
    if (!radio) {
        console.error('No radio input found in card');
        return;
    }
    
    // If already checked, do nothing (prevents double trigger)
    if (radio.checked) {
        console.log('Radio already checked');
        return;
    }
    
    console.log('Card clicked, processing vote...');
    
    // Set voting flag immediately
    isVoting = true;
    
    // Check the radio
    radio.checked = true;
    
    // Get selected value
    const selectedValue = radio.value;
    const matched = questionConfig.options.find(option => option.value === selectedValue);
    
    if (!matched) {
        console.error('No matching option found for:', selectedValue);
        isVoting = false;
        return;
    }
    
    console.log('Selected:', matched.label);
    
    // Visual feedback - highlight selected card
    const optionCards = document.querySelectorAll('.option-card');
    optionCards.forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    
    // Show voting overlay
    showVotingOverlay();
    
    try {
        // Process vote
        await processVoteAsync(matched.label);
        
        // Show ad or fallback (only in browser, Kuaishou will navigate away)
        await showAdAsync();
        
    } catch (error) {
        console.error('Vote processing error:', error);
        hideVotingOverlay();
        isVoting = false;
        
        // Show error to user
        alert('投票提交失败，请重试');
    }
}

// Async version of processVote
async function processVoteAsync(selectedLabel) {
    // Always try to get existing data first
    let existingData = null;
    try {
        existingData = await new Promise((resolve) => {
            getConfig(questionConfig.storageKey, (data) => resolve(data));
        });
    } catch (e) {
        console.warn('Failed to get existing data:', e);
    }
    
    if (existingData !== null && typeof existingData === 'object') {
        voteData = { ...existingData };
    }
    
    // Update local vote count
    voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
    
    // Try to update server (fire and forget)
    try {
        updateConfig(questionConfig.storageKey, voteData);
    } catch (error) {
        console.warn('Server update failed, using local data only:', error);
    }
    
    // Always hide question area and show result button
    const questionArea = document.getElementById('questionArea');
    if (questionArea) {
        questionArea.style.display = 'none';
    }

    const showResultBtn = document.getElementById('showResultBtn');
    if (showResultBtn) {
        showResultBtn.style.display = 'block';
    }
}

// Async version of showAd
// Legacy showAd function (for HTML onclick compatibility)
function showAd() {
    logEvent('rewarded_ad_trigger');
    return showAdAsync();
}

function showAdAsync() {
    return new Promise((resolve) => {
        // Check if we're in Kuaishou environment
        if (typeof ks !== 'undefined' && ks.navigateTo) {
            // In Kuaishou - show real ad
            ks.navigateTo({
                url: '/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=e2e-test-1775518804987'
            });
            // Note: In Kuaishou, the page will reload after ad, so we don't resolve
            return;
        }
        
        // In browser - show fallback animation
        setTimeout(() => {
            hideVotingOverlay();
            displayResults();
            isVoting = false;
            resolve();
        }, 1500);
    });
}

function displayResults() {
    const questionnaire = document.getElementById('questionnaire');
    const result = document.getElementById('result');
    const showResultBtn = document.getElementById('showResultBtn');

    if (questionnaire) questionnaire.style.display = 'none';
    if (showResultBtn) showResultBtn.style.display = 'none';
    if (result) {
        result.style.display = 'block';
        // Scroll to result
        result.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    getConfig(questionConfig.storageKey, (data) => {
        if (data) {
            showResult(data);
        } else {
            showResult(voteData);
        }
    });
}

function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    const finishedAd = urlParams.get('finishedAd');
    
    // 看完广告或没看完都显示结果（用户已经投票了）
    if (finishedAd === 'true' || finishedAd === '1' || finishedAd === 'false') {
        const questionnaire = document.getElementById('questionnaire');
        const result = document.getElementById('result');
        if (questionnaire) questionnaire.style.display = 'none';
        if (result) {
            result.style.display = 'block';
            setTimeout(() => {
                result.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }
        
        // 如果没看完广告，添加提示
        if (finishedAd === 'false') {
            showAdIncompleteNotice();
        }
        
        displayResults();
    }
}

function showAdIncompleteNotice() {
    // 创建温和提示，不强制要求看完广告
    const notice = document.createElement('div');
    notice.className = 'ad-notice';
    notice.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #f97316 0%, #fb923c 100%);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            margin: 16px auto;
            max-width: 90%;
            text-align: center;
            font-size: 14px;
            box-shadow: 0 4px 12px rgba(249, 115, 22, 0.3);
        ">
            💡 支持作者：下次完整观看广告可以支持我们继续提供免费投票服务哦~
        </div>
    `;
    
    const result = document.getElementById('result');
    if (result && result.firstChild) {
        result.insertBefore(notice, result.firstChild);
    }
    
    // 3秒后淡出
    setTimeout(() => {
        notice.style.transition = 'opacity 0.5s';
        notice.style.opacity = '0';
        setTimeout(() => notice.remove(), 500);
    }, 5000);
}

function showResult(latestVoteData) {
    if (!latestVoteData || typeof latestVoteData !== 'object') return;

    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;

    resultDiv.innerHTML = '<h2>投票结果</h2>';
    resultDiv.innerHTML += '<p class="result-subtitle">实时统计 · 基于所有用户投票</p>';

    const barChart = createBarChart(latestVoteData);
    resultDiv.appendChild(barChart);

    addSummaryStatistics(resultDiv, latestVoteData);
    
    // Add share/retry buttons
    addResultActions(resultDiv);
}

function createBarChart(latestVoteData) {
    const barChart = document.createElement('div');
    barChart.className = 'bar-chart';

    const maxCount = Math.max(...Object.values(latestVoteData));
    const scale = maxCount > 0 ? 200 / maxCount : 1;
    const sortedEntries = Object.entries(latestVoteData).sort((a, b) => b[1] - a[1]);

    for (const [option, count] of sortedEntries) {
        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';

        const bar = document.createElement('div');
        bar.className = 'bar';
        if (count === maxCount && count > 0) {
            bar.classList.add('top-vote');
        }
        bar.style.height = '2px';

        // Animate bar height
        requestAnimationFrame(() => {
            bar.style.height = `${Math.max(count * scale, 2)}px`;
        });

        const barLabel = document.createElement('div');
        barLabel.className = 'bar-label';
        barLabel.textContent = `${count}`;

        const optionLabel = document.createElement('div');
        optionLabel.className = 'option-label';
        optionLabel.textContent = option;

        barContainer.appendChild(bar);
        barContainer.appendChild(barLabel);
        barContainer.appendChild(optionLabel);
        barChart.appendChild(barContainer);
    }

    return barChart;
}

function addSummaryStatistics(container, latestVoteData) {
    const total = Object.values(latestVoteData).reduce((sum, count) => sum + count, 0);
    
    // Find winner
    const winner = Object.entries(latestVoteData).reduce((a, b) => a[1] > b[1] ? a : b);

    const statsDiv = document.createElement('div');
    statsDiv.className = 'stats-container';

    const totalVotes = document.createElement('p');
    totalVotes.className = 'total-votes';
    totalVotes.innerHTML = `总票数: <span>${total}</span>`;

    const winnerText = document.createElement('p');
    winnerText.style.color = '#22C55E';
    winnerText.style.fontWeight = '600';
    winnerText.style.marginTop = '8px';
    winnerText.innerHTML = `🏆 当前领先: ${winner[0]} (${winner[1]}票)`;

    const timestamp = document.createElement('p');
    timestamp.className = 'timestamp';
    timestamp.textContent = `更新时间: ${new Date().toLocaleString('zh-CN')}`;

    statsDiv.appendChild(totalVotes);
    if (total > 0) statsDiv.appendChild(winnerText);
    statsDiv.appendChild(timestamp);
    container.appendChild(statsDiv);
}

function addResultActions(container) {
    // 页面底部已有"返回主页查看更多"链接，这里不再重复添加
    // 如需添加其他操作按钮，可在此处扩展
}

function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: '/pages/index/index' });
    } else {
        window.location.href = '/';
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
