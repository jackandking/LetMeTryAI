/**
 * Mother's Day Gift Survey
 */
const questionConfig = {
    "title": "母亲节礼物大作战",
    "question": "今年母亲节，你准备送妈妈什么礼物？来投票看看大家的选择！",
    "options": [
        { "value": "flower-cake", "label": "鲜花/蛋糕" },
        { "value": "skincare-cosmetics", "label": "护肤品/化妆品" },
        { "value": "jewelry", "label": "珠宝/首饰" },
        { "value": "red-envelope", "label": "红包/现金" },
        { "value": "handmade", "label": "亲手做的礼物" },
        { "value": "travel", "label": "带妈妈出游" }
    ],
    "storageKey": "mothers_day_gift_v1.data"
};

let voteData = {};
const EVENT_ENDPOINT = 'https://letmetry.cloud/api/track';
const pageStartTime = Date.now();

function logEvent(event, data = {}) {
    const payload = { event, appId: questionConfig.storageKey.replace(/\.data$/, ''), timestamp: Date.now(), date: new Date().toISOString().split('T')[0], ...data };
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        navigator.sendBeacon(EVENT_ENDPOINT, JSON.stringify(payload));
    } else if (typeof fetch !== 'undefined') {
        fetch(EVENT_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true }).catch(() => {});
    }
}

function initializeApp() {
    try {
        setupEventTracking();
        initializeVoteData();
        setupPageContent();
        handleResultDisplay();
    } catch (error) { console.error('Error initializing app:', error); }
}

function setupEventTracking() {
    const urlParams = new URLSearchParams(window.location.search);
    logEvent('page_load', { showAd: urlParams.get('showAd') === 'true' });
    const finishedAd = urlParams.get('finishedAd');
    if (finishedAd === 'true') { logEvent('rewarded_ad_complete'); }
    else if (finishedAd === 'false') { logEvent('rewarded_ad_skip'); }
    window.addEventListener('beforeunload', () => { logEvent('page_exit', { durationMs: Date.now() - pageStartTime }); });
}

function initializeVoteData() {
    questionConfig.options.forEach(option => { voteData[option.label] = 0; });
}

function setupPageContent() {
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) { titleElement.textContent = questionConfig.title; }
    const questionElement = document.getElementById('questionText');
    if (questionElement) { questionElement.textContent = questionConfig.question; }
    attachRadioHandlers();
}

function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name="womanai"]');
    if (!radios || radios.length === 0) return;
    radios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const selectedValue = event.target.value;
            const matched = questionConfig.options.find(option => option.value === selectedValue);
            if (matched) { processVote(matched.label); showAd(); }
        });
    });
}

function processVote(selectedLabel) {
    logEvent('vote_complete', { option: selectedLabel });
    getConfig(questionConfig.storageKey, (data) => {
        try {
            if (data !== null && typeof data === 'object') { voteData = { ...data }; }
            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;
            updateConfig(questionConfig.storageKey, voteData);
            const questionArea = document.getElementById('questionArea');
            if (questionArea) { questionArea.style.display = 'none'; }
            const showResultBtn = document.getElementById('showResultBtn');
            if (showResultBtn) { showResultBtn.style.display = 'block'; }
        } catch (error) { console.error('Error processing vote:', error); }
    });
}

function showAd() {
    logEvent('rewarded_ad_trigger');
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: '/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=mothers-day-gift' });
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
            overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;flex-direction:column;';
            overlay.innerHTML = '<div style="background:#2f4858;padding:30px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);"><h3>正在分析投票趋势...</h3><div style="margin-top:15px;width:40px;height:40px;border:4px solid #ff7f50;border-top:4px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div><style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style></div>';
            document.body.appendChild(overlay);
        } else { overlay.style.display = 'flex'; }
        setTimeout(() => { overlay.style.display = 'none'; displayResults(); resolve(); }, 1500);
    });
}

function displayResults() {
    const questionnaire = document.getElementById('questionnaire');
    const result = document.getElementById('result');
    const showResultBtn = document.getElementById('showResultBtn');
    if (questionnaire) { questionnaire.style.display = 'none'; }
    if (showResultBtn) { showResultBtn.style.display = 'none'; }
    if (result) { result.style.display = 'block'; }
    getConfig(questionConfig.storageKey, (data) => { if (data) { showResult(data); } else { showResult(voteData); } });
}

function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    const finishedAd = urlParams.get('finishedAd');
    if (finishedAd === 'true' || finishedAd === true || finishedAd === '1') {
        const questionnaire = document.getElementById('questionnaire');
        const result = document.getElementById('result');
        if (questionnaire) { questionnaire.style.display = 'none'; }
        if (result) { result.style.display = 'block'; }
        displayResults();
    }
}

function showResult(latestVoteData) {
    if (!latestVoteData || typeof latestVoteData !== 'object') return;
    const resultDiv = document.getElementById('result');
    if (!resultDiv) return;
    resultDiv.innerHTML = "<h2 style='text-align:center;color:#d63384;'>母亲节礼物投票结果</h2>";
    resultDiv.innerHTML += "<p style='text-align:center;color:#7f8c8d;margin-bottom:20px;font-size:14px;'>看看大家今年母亲节都准备送什么</p>";
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
        bar.style.height = '2px';
        requestAnimationFrame(() => { bar.style.height = `${Math.max(count * scale, 2)}px`; });
        if (count === maxCount && count > 0) { bar.style.background = 'linear-gradient(to top, #ff6b35, #ffb199)'; }
        const barLabel = document.createElement('div');
        barLabel.className = 'bar-label';
        barLabel.innerText = `${count}`;
        const optionLabel = document.createElement('div');
        optionLabel.className = 'option-label';
        optionLabel.innerText = option;
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
    statsDiv.style.cssText = 'text-align:center; margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;';
    const totalVotes = document.createElement('p');
    totalVotes.style.fontWeight = 'bold';
    totalVotes.innerText = `总参与人数: ${total}`;
    const timestamp = document.createElement('p');
    timestamp.style.cssText = 'font-size: 12px; color: #95a5a6; margin-top: 5px;';
    timestamp.innerText = `最后更新: ${new Date().toLocaleString()}`;
    statsDiv.appendChild(totalVotes);
    statsDiv.appendChild(timestamp);
    container.appendChild(statsDiv);
}

function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) { ks.navigateTo({ url: '/pages/index/index' }); }
    else { window.location.href = '/'; }
}

document.addEventListener('DOMContentLoaded', initializeApp);
