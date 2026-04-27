/**
 * AI Generals Survey Application
 * Logic for "Human vs AI Generals" survey
 */

/**
 * Configuration object for question and options
 */
const questionConfig = {
    title: "未来战争：谁来指挥？",
    question: "面对瞬息万变的战场，你愿意将指挥权交给谁？",
    options: [
        { value: "human", label: "人类直觉 (Human)" },
        { value: "ai", label: "AI 精准 (AI)" },
        { value: "hybrid", label: "人机协作 (Hybrid)" }
    ],
    storageKey: "ai_generals_v1.data"
};

/**
 * Application state
 */
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

/**
 * Initializes the application
 */
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

/**
 * Checks URL parameters for navigation control
 */
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
    
    // Check if ad is finished - navigate back if not (mini-program context)
    if (urlParams.get('finishedAd') === 'false') {
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
    }
}

/**
 * Initializes vote data structure
 */
function initializeVoteData() {
    questionConfig.options.forEach(option => {
        voteData[option.label] = 0;
    });
}

/**
 * Sets up the page content dynamically
 */
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

/**
 * Attach change handlers to radio inputs
 */
function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name="commander"]');
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

/**
 * Processes the user's vote
 */
function processVote(selectedLabel) {
    logEvent('vote_complete', { option: selectedLabel });
    getConfig(questionConfig.storageKey, (data) => {
        try {
            if (data !== null && typeof data === 'object') {
                voteData = { ...data };
            }
            
            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;

            updateConfig(questionConfig.storageKey, voteData);
            
            console.log('Vote recorded:', selectedLabel, voteData);
            
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

/**
 * Shows advertisement before displaying results
 */
function showAd() {
    logEvent('rewarded_ad_trigger');
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=ai-generals",
        });
        return;
    }

    displayAdFallback().catch(err => console.error('Ad fallback error:', err));
}

/**
 * Web fallback to simulate an ad
 */
function displayAdFallback() {
    return new Promise((resolve) => {
        let overlay = document.getElementById('adOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'adOverlay';
            overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;flex-direction:column;';
            overlay.innerHTML = '<div style="background:#2c3e50;padding:30px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);"><h3>正在分析战场数据...</h3><div style="margin-top:15px;width:40px;height:40px;border:4px solid #3498db;border-top:4px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div><style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style></div>';
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
 * Display results logic
 */
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

/**
 * Handles URL parameters for result display
 */
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

/**
 * Displays voting results as a bar chart
 */
function showResult(voteData) {
    if (!voteData || typeof voteData !== 'object') return;

    const resultDiv = document.getElementById("result");
    if (!resultDiv) return;

    resultDiv.innerHTML = "<h2 style='text-align:center;color:#2c3e50;'>全网指挥官选择倾向</h2>";
    resultDiv.innerHTML += "<p style='text-align:center;color:#7f8c8d;margin-bottom:20px;font-size:14px;'>基于实时全网数据统计</p>";

    const barChart = createBarChart(voteData);
    resultDiv.appendChild(barChart);
    
    addSummaryStatistics(resultDiv, voteData);
}

/**
 * Creates bar chart
 */
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
            bar.style.background = "linear-gradient(to top, #e74c3c, #f1948a)";
        }

        const barLabel = document.createElement("div");
        barLabel.className = "bar-label";
        barLabel.innerText = `${count}`;

        const optionLabel = document.createElement("div");
        optionLabel.className = "jet-label";
        optionLabel.innerText = option.split(' ')[0]; // Show first part of label

        barContainer.appendChild(bar);
        barContainer.appendChild(barLabel);
        barContainer.appendChild(optionLabel);
        barChart.appendChild(barContainer);
    }

    return barChart;
}

/**
 * Adds summary statistics
 */
function addSummaryStatistics(container, voteData) {
    const total = Object.values(voteData).reduce((a, b) => a + b, 0);
    
    const statsDiv = document.createElement("div");
    statsDiv.style.cssText = "text-align:center; margin-top:20px; padding-top:15px; border-top:1px dashed #bdc3c7;";
    
    const totalVotes = document.createElement("p");
    totalVotes.style.fontWeight = "bold";
    totalVotes.innerText = `总参与人数: ${total}`;
    
    const timestamp = document.createElement("p");
    timestamp.style.cssText = "font-size: 12px; color: #95a5a6; margin-top: 5px;";
    timestamp.innerText = `最后更新: ${new Date().toLocaleString()}`;
    
    statsDiv.appendChild(totalVotes);
    statsDiv.appendChild(timestamp);
    container.appendChild(statsDiv);
}

/**
 * Navigation to index
 */
function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: "/pages/index/index" });
    } else {
        window.location.href = "/";
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
