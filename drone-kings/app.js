/**
 * Baller Leader Showdown - Survey Application
 * Logic for the "男人宝热榜：谁是最能带队的球星？" voting app
 */

// Configuration
const CONFIG = {
    title: '男人宝热榜：谁是最能带队的球星？',
    question: '站在男人宝用户视角，你更想把票投给谁：谁是当下最能带队的球星？',
    options: [
        { value: 'kylian-mbappe', label: '姆巴佩', fullLabel: '基利安·姆巴佩' },
        { value: 'erling-haaland', label: '哈兰德', fullLabel: '厄林·哈兰德' },
        { value: 'vinicius-jr', label: '维尼修斯', fullLabel: '维尼修斯·儒尼奥尔' }
    ],
    storageKey: 'baller_leader_showdown_v1.data',
    adPageId: 'baller-leader-showdown'
};

// State
let voteData = {};

/**
 * Initialize the application
 */
function initializeApp() {
    try {
        checkUrlParameters();
        initializeVoteData();
        setupPageContent();
        handleResultDisplay();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

/**
 * Check URL parameters for special handling
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get('finishedAd') === 'false') {
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
    }
}

/**
 * Initialize vote data structure
 */
function initializeVoteData() {
    voteData = {};
    CONFIG.options.forEach(option => {
        voteData[option.fullLabel] = 0;
    });
}

/**
 * Setup page content from config
 */
function setupPageContent() {
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
        titleElement.textContent = CONFIG.title;
    }

    const questionElement = document.getElementById('questionText');
    if (questionElement) {
        questionElement.textContent = CONFIG.question;
    }

    attachRadioHandlers();
}

/**
 * Attach event handlers to radio inputs
 */
function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name="nanrenbao"]');
    if (!radios || radios.length === 0) {
        return;
    }

    radios.forEach(radio => {
        radio.addEventListener('change', handleVoteSelection);
    });
}

/**
 * Handle vote selection
 * @param {Event} event - Change event
 */
function handleVoteSelection(event) {
    const selectedValue = event.target.value;
    const matched = CONFIG.options.find(option => option.value === selectedValue);

    if (matched) {
        processVote(matched.fullLabel);
        showAd();
    }
}

/**
 * Process the vote and update storage
 * @param {string} selectedLabel - The selected option label
 */
function processVote(selectedLabel) {
    getConfig(CONFIG.storageKey, (data) => {
        try {
            if (data !== null && typeof data === 'object') {
                voteData = { ...data };
            }

            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
            updateConfig(CONFIG.storageKey, voteData);

            hideQuestionArea();
            showResultButton();
        } catch (error) {
            console.error('Error processing vote:', error);
        }
    });
}

/**
 * Hide the question area
 */
function hideQuestionArea() {
    const questionArea = document.getElementById('questionArea');
    if (questionArea) {
        questionArea.style.display = 'none';
    }
}

/**
 * Show the result button
 */
function showResultButton() {
    const showResultBtn = document.getElementById('showResultBtn');
    if (showResultBtn) {
        showResultBtn.style.display = 'block';
    }
}

/**
 * Show advertisement and then display results
 */
function showAd() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=${CONFIG.adPageId}`
        });
        return;
    }

    displayAdFallback().catch(error => console.error('Ad fallback error:', error));
}

/**
 * Display fallback ad overlay
 * @returns {Promise<void>}
 */
function displayAdFallback() {
    return new Promise((resolve) => {
        let overlay = document.getElementById('adOverlay');
        if (!overlay) {
            overlay = createAdOverlay();
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
        }

        setTimeout(() => {
            overlay.style.display = 'none';
            displayResults();
            resolve();
        }, 1500);
    });
}

/**
 * Create ad overlay element
 * @returns {HTMLElement} The overlay element
 */
function createAdOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'adOverlay';
    overlay.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        color: #fff;
        flex-direction: column;
    `;
    overlay.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #2c5aa0 0%, #4a7ab8 100%);
            padding: 32px;
            border-radius: 16px;
            text-align: center;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
            max-width: 320px;
        ">
            <h3 style="margin: 0 0 16px 0; font-size: 18px;">正在分析投票趋势...</h3>
            <div style="
                width: 48px;
                height: 48px;
                border: 4px solid rgba(255, 255, 255, 0.3);
                border-top: 4px solid #ffffff;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 0 auto;
            "></div>
            <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
    `;
    return overlay;
}

/**
 * Display voting results
 */
function displayResults() {
    const questionnaire = document.getElementById('questionnaire');
    const result = document.getElementById('result');
    const showResultBtn = document.getElementById('showResultBtn');

    if (questionnaire) {
        questionnaire.style.display = 'none';
    }
    if (showResultBtn) {
        showResultBtn.style.display = 'none';
    }
    if (result) {
        result.style.display = 'block';
    }

    getConfig(CONFIG.storageKey, (data) => {
        if (data) {
            showResult(data);
        } else {
            showResult(voteData);
        }
    });
}

/**
 * Handle result display from URL parameter
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    const finishedAd = urlParams.get('finishedAd');

    if (finishedAd === 'true' || finishedAd === true || finishedAd === '1') {
        const questionnaire = document.getElementById('questionnaire');
        const result = document.getElementById('result');

        if (questionnaire) {
            questionnaire.style.display = 'none';
        }
        if (result) {
            result.style.display = 'block';
        }

        displayResults();
    }
}

/**
 * Render result content
 * @param {Object} latestVoteData - The vote data to display
 */
function showResult(latestVoteData) {
    if (!latestVoteData || typeof latestVoteData !== 'object') {
        return;
    }

    const resultDiv = document.getElementById('result');
    if (!resultDiv) {
        return;
    }

    resultDiv.innerHTML = `
        <h2>球星带队PK投票结果</h2>
        <p>看看大家对"男人宝热榜：谁是最能带队的球星？"的最新态度</p>
    `;

    const barChart = createBarChart(latestVoteData);
    resultDiv.appendChild(barChart);

    addSummaryStatistics(resultDiv, latestVoteData);
}

/**
 * Create bar chart for results
 * @param {Object} latestVoteData - The vote data
 * @returns {HTMLElement} The bar chart element
 */
function createBarChart(latestVoteData) {
    const barChart = document.createElement('div');
    barChart.className = 'bar-chart';

    const maxCount = Math.max(...Object.values(latestVoteData));
    const scale = maxCount > 0 ? 200 / maxCount : 1;
    const sortedEntries = Object.entries(latestVoteData).sort((a, b) => b[1] - a[1]);

    sortedEntries.forEach(([option, count], index) => {
        const barContainer = document.createElement('div');
        barContainer.className = 'bar-container';

        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.style.height = '2px';

        // Highlight winner
        if (count === maxCount && count > 0) {
            bar.classList.add('winner');
        }

        // Animate height
        requestAnimationFrame(() => {
            bar.style.height = `${Math.max(count * scale, 2)}px`;
        });

        const barLabel = document.createElement('div');
        barLabel.className = 'bar-label';
        barLabel.textContent = count;

        const optionLabel = document.createElement('div');
        optionLabel.className = 'option-label';
        optionLabel.textContent = getShortLabel(option);

        barContainer.appendChild(bar);
        barContainer.appendChild(barLabel);
        barContainer.appendChild(optionLabel);
        barChart.appendChild(barContainer);
    });

    return barChart;
}

/**
 * Get short label for display
 * @param {string} fullLabel - The full label
 * @returns {string} Short label
 */
function getShortLabel(fullLabel) {
    const option = CONFIG.options.find(opt => opt.fullLabel === fullLabel);
    return option ? option.label : fullLabel.split('·')[0];
}

/**
 * Add summary statistics to result
 * @param {HTMLElement} container - The container element
 * @param {Object} latestVoteData - The vote data
 */
function addSummaryStatistics(container, latestVoteData) {
    const total = Object.values(latestVoteData).reduce((sum, count) => sum + count, 0);

    const statsDiv = document.createElement('div');
    statsDiv.className = 'stats-section';

    const totalVotes = document.createElement('p');
    totalVotes.className = 'total-votes';
    totalVotes.textContent = `总参与人数: ${total}`;

    const timestamp = document.createElement('p');
    timestamp.className = 'timestamp';
    timestamp.textContent = `最后更新: ${new Date().toLocaleString()}`;

    statsDiv.appendChild(totalVotes);
    statsDiv.appendChild(timestamp);
    container.appendChild(statsDiv);
}

/**
 * Navigate to index page
 */
function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: '/pages/index/index' });
    } else {
        window.location.href = '/';
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initializeApp);
