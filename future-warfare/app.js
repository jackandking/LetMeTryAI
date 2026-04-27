/**
 * Future Warfare Survey Application
 * Logic for "2026 Military Tech" survey
 */

const questionConfig = {
    title: "2026军事黑科技：谁将主宰未来战场？",
    question: "在2026年爆发的军事科技革新中，你认为哪项技术最具颠覆性？",
    options: [
        { value: "swarm", label: "AI 蜂群无人机" },
        { value: "laser", label: "高能激光武器" },
        { value: "hypersonic", label: "高超音速导弹" },
        { value: "exo", label: "单兵外骨骼" },
        { value: "ugv", label: "无人战车" }
    ],
    storageKey: "future_warfare_v1.data"
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
        setupEventTracking();
        initializeVoteData();
        setupPageContent();
        handleResultDisplay();
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
    if (titleElement) titleElement.textContent = questionConfig.title;

    const questionElement = document.getElementById('questionText');
    if (questionElement) questionElement.textContent = questionConfig.question;
    
    attachRadioHandlers();
}

function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name="tech"]');
    if (!radios || radios.length === 0) return;

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            const matched = questionConfig.options.find(o => o.value === selectedValue);
            
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
            if (questionArea) questionArea.style.display = 'none';
            
            const showResultBtn = document.getElementById('showResultBtn');
            if (showResultBtn) showResultBtn.style.display = 'block';
            
        } catch (error) {
            console.error('Error processing vote:', error);
        }
    });
}

function showAd() {
    logEvent('rewarded_ad_trigger');
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=future-warfare",
        });
        return;
    }
    displayAdFallback().catch(err => console.error('Ad fallback error:', err));
}

function displayAdFallback() {
    return new Promise((resolve) => {
        let overlay = document.getElementById('adOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'adOverlay';
            overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;color:#0f0;flex-direction:column;font-family:monospace;';
            overlay.innerHTML = '<div style="background:#000;border:1px solid #0f0;padding:30px;box-shadow:0 0 20px #0f0;text-align:center;"><h3>SYSTEM ANALYZING...</h3><div style="margin-top:15px;width:40px;height:40px;border:4px solid #0f0;border-top:4px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div><p style="margin-top:10px;font-size:12px;">UPLOADING TACTICAL DATA</p><style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style></div>';
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
        if (data) showResult(data);
        else showResult(voteData);
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

function showResult(voteData) {
    if (!voteData || typeof voteData !== 'object') return;

    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    resultDiv.innerHTML = "<h2 style='text-align:center;color:#0f0;text-shadow:0 0 10px #0f0;'>作战数据分析报告</h2>";
    resultDiv.innerHTML += "<p style='text-align:center;color:#0a0;margin-bottom:20px;font-size:14px;font-family:monospace;'>[CLASSIFIED] 实时民意情报</p>";

    const barChart = createBarChart(voteData);
    resultDiv.appendChild(barChart);
    
    addSummaryStatistics(resultDiv, voteData);
}

function createBarChart(voteData) {
    const barChart = document.createElement("div");
    barChart.className = "bar-chart";

    const maxCount = Math.max(...Object.values(voteData));
    const scale = maxCount > 0 ? 200 / maxCount : 1;
    const total = Object.values(voteData).reduce((a, b) => a + b, 0);

    const sortedEntries = Object.entries(voteData).sort((a, b) => b[1] - a[1]);

    for (const [option, count] of sortedEntries) {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        const barContainer = document.createElement("div");
        barContainer.className = "bar-container";

        const bar = document.createElement("div");
        bar.className = "bar";
        bar.style.height = "2px";
        
        requestAnimationFrame(() => {
            bar.style.height = `${Math.max(count * scale, 2)}px`; 
        });
        
        if (count === maxCount && count > 0) {
            bar.style.background = "linear-gradient(to top, #ff0000, #ff5555)";
            bar.style.boxShadow = "0 0 15px #ff0000";
        }

        const barLabel = document.createElement("div");
        barLabel.className = "bar-label";
        barLabel.innerText = `${count}`;

        const optionLabel = document.createElement("div");
        optionLabel.className = "tech-label";
        optionLabel.innerText = option;

        barContainer.appendChild(bar);
        barContainer.appendChild(barLabel);
        barContainer.appendChild(optionLabel);
        barChart.appendChild(barContainer);
    }

    return barChart;
}

function addSummaryStatistics(container, voteData) {
    const total = Object.values(voteData).reduce((a, b) => a + b, 0);
    
    const statsDiv = document.createElement("div");
    statsDiv.style.cssText = "text-align:center; margin-top:20px; padding-top:15px; border-top:1px dashed #0f0;";
    
    const totalVotes = document.createElement("p");
    totalVotes.style.color = "#0f0";
    totalVotes.innerText = `总参与人数: ${total}`;
    
    const timestamp = document.createElement("p");
    timestamp.style.cssText = "font-size: 12px; color: #0a0; margin-top: 5px; font-family:monospace;";
    timestamp.innerText = `情报更新时间: ${new Date().toLocaleString()}`;
    
    statsDiv.appendChild(totalVotes);
    statsDiv.appendChild(timestamp);
    container.appendChild(statsDiv);
}

function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: "/pages/index/index" });
    } else {
        window.location.href = "/";
    }
}

// Expose for testing
if (typeof window !== 'undefined') {
    window.questionConfig = questionConfig;
    window.processVote = processVote;
    window.voteData = voteData;
    window.initializeApp = initializeApp;
}

document.addEventListener('DOMContentLoaded', initializeApp);
