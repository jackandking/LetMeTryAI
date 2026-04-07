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
let isVoting = false; // Prevent double voting

function initializeApp() {
    try {
        checkUrlParameters();
        initializeVoteData();
        setupPageContent();
        handleResultDisplay();
        createVotingOverlay();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('finishedAd') === 'false') {
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
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
    if (finishedAd === 'true' || finishedAd === true || finishedAd === '1') {
        const questionnaire = document.getElementById('questionnaire');
        const result = document.getElementById('result');
        if (questionnaire) questionnaire.style.display = 'none';
        if (result) {
            result.style.display = 'block';
            // Scroll to result
            setTimeout(() => {
                result.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
        }

        displayResults();
    }
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
    const actionsDiv = document.createElement('div');
    actionsDiv.style.cssText = 'display: flex; gap: 16px; justify-content: center; margin-top: 24px; flex-wrap: wrap;';
    
    // Vote again button
    const voteAgainBtn = document.createElement('button');
    voteAgainBtn.className = 'show-result-btn';
    voteAgainBtn.style.cssText = 'margin: 0; max-width: 200px; background: linear-gradient(135deg, #F97316 0%, #FB923C 100%);';
    voteAgainBtn.textContent = '再投一次';
    voteAgainBtn.onclick = () => {
        window.location.reload();
    };
    
    // Back to home button
    const homeBtn = document.createElement('button');
    homeBtn.className = 'show-result-btn';
    homeBtn.style.cssText = 'margin: 0; max-width: 200px; background: var(--color-bg-light); color: var(--color-text); border: 2px solid var(--color-primary);';
    homeBtn.textContent = '返回首页';
    homeBtn.onclick = jumpToIndex;
    
    actionsDiv.appendChild(voteAgainBtn);
    actionsDiv.appendChild(homeBtn);
    container.appendChild(actionsDiv);
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
