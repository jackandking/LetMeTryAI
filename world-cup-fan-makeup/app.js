/**
 * Fighter Jets Vote Application
 */

const questionConfig = {
    title: '看世界杯你会怎么打扮？哪种球迷妆更带感',
    question: '看世界杯你会怎么打扮？哪种球迷妆更带感？',
    options: [
        { value: 'flag-facepaint', label: '国旗脸彩妆' },
        { value: 'nude-jersey', label: '低调球衣＋裸妆' },
        { value: 'glitter-smoky-bold-lip', label: '亮片烟熏＋抢眼口红' },
        { value: 'korean-vintage-cute-fan', label: '复古韩系可爱球迷妆' }
    ],
    storageKey: 'world_cup_fan_makeup.data'
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

function initializeApp() {
    try {
        checkUrlParameters();
        initializeVoteData();
        setupPageContent();
        handleResultDisplay();
        setupEventTracking();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

function setupEventTracking() {
    const urlParams = new URLSearchParams(window.location.search);

    // 1. 页面加载
    logEvent('page_load', { showAd: urlParams.get('showAd') === 'true' });

    // 2. 检测广告返回状态
    const finishedAd = urlParams.get('finishedAd');
    if (finishedAd === 'true') {
        logEvent('rewarded_ad_complete');
    } else if (finishedAd === 'false') {
        logEvent('rewarded_ad_skip');
    }

    // 3. 页面离开
    window.addEventListener('beforeunload', () => {
        logEvent('page_exit', { durationMs: Date.now() - pageStartTime });
    });
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

function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name="equipment"]');
    if (!radios || radios.length === 0) return;

    radios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            const matched = questionConfig.options.find(option => option.value === selectedValue);

            if (matched) {
                processVote(matched.label);
                showAd();
            }
        });
    });
}

function processVote(selectedLabel) {
    logEvent('vote_complete', { option: selectedLabel });
    getConfig(questionConfig.storageKey, (data) => {
        try {
            if (data !== null && typeof data === 'object') {
                voteData = { ...data };
            }

            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
            updateConfig(questionConfig.storageKey, voteData);

            const questionArea = document.getElementById('questionArea');
            if (questionArea) {
                questionArea.style.display = 'none';
            }

            const showResultBtn = document.getElementById('showResultBtn');
            if (showResultBtn) {
                showResultBtn.style.display = 'block';
            }
        } catch (error) {
            console.error('Error processing vote:', error);
        }
    });
}

function showAd() {
    logEvent('rewarded_ad_trigger');
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: '/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=world-cup-fan-makeup'
        });
        return;
    }

    displayAdFallback().catch(error => console.error('Ad fallback error:', error));
}

function displayAdFallback() {
    return new Promise((resolve) => {
        let overlay = document.getElementById('adOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'adOverlay';
            overlay.innerHTML = `
                <div class="ad-content">
                    <h3>正在分析投票趋势...</h3>
                    <div class="ad-spinner"></div>
                </div>
            `;
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

function displayResults() {
    const questionnaire = document.getElementById('questionnaire');
    const result = document.getElementById('result');
    const showResultBtn = document.getElementById('showResultBtn');

    if (questionnaire) questionnaire.style.display = 'none';
    if (showResultBtn) showResultBtn.style.display = 'none';
    if (result) result.style.display = 'block';

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
        if (result) result.style.display = 'block';

        displayResults();
    }
}

function showResult(latestVoteData) {
    if (!latestVoteData || typeof latestVoteData !== 'object') return;

    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;

    resultDiv.innerHTML = '<h2>看世界杯你会怎么打扮？哪种球迷妆更带感结果</h2>';
    resultDiv.innerHTML += '<p class="result-subtitle">基于实时数据统计</p>';

    const barChart = createBarChart(latestVoteData);
    resultDiv.appendChild(barChart);

    addSummaryStatistics(resultDiv, latestVoteData);
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

    const statsDiv = document.createElement('div');
    statsDiv.className = 'stats-container';

    const totalVotes = document.createElement('p');
    totalVotes.className = 'total-votes';
    totalVotes.innerHTML = `总参与人数: <span>${total}</span>`;

    const timestamp = document.createElement('p');
    timestamp.className = 'timestamp';
    timestamp.textContent = `最后更新: ${new Date().toLocaleString('zh-CN')}`;

    statsDiv.appendChild(totalVotes);
    statsDiv.appendChild(timestamp);
    container.appendChild(statsDiv);
}

function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: '/pages/index/index' });
    } else {
        window.location.href = '/';
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
