/**
 * Fighter Jets Survey Application
 * Logic for "King of Modern Air Combat" survey
 */

/**
 * Configuration object for question and options
 */
const questionConfig = {
    title: "2026硬核科技：谁将彻底改变世界？",
    question: "在即将爆发的科技革命中，你最看好哪个领域？",
    options: [
        { value: "starship", label: "星舰飞船 (SpaceX)" },
        { value: "humanoid", label: "人形机器人 (Tesla)" },
        { value: "fusion", label: "可控核聚变 (ITER)" },
        { value: "bci", label: "脑机接口 (Neuralink)" },
        { value: "hypersonic", label: "高超音速飞行器 (China)" }
    ],
    storageKey: "hardcore_tech_v1.data"
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
    
    // Note: Options are generated in HTML for custom layout/images, 
    // but we need to attach listeners
    attachRadioHandlers();
}

/**
 * Attach change handlers to radio inputs
 */
function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name="fighter"]');
    if (!radios || radios.length === 0) return;

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            // Find option by value to get correct label for storage
            const matched = questionConfig.options.find(o => o.value === selectedValue);
            
            if (matched) {
                // Process vote and show result/ad
                processVote(matched.label);
                showAd();
            }
        });
    });
}

/**
 * Processes the user's vote
 * @param {string} selectedLabel - The selected option label
 */
function processVote(selectedLabel) {
    logEvent('vote_complete', { option: selectedLabel });
    // Read current voting results
    getConfig(questionConfig.storageKey, (data) => {
        try {
            if (data !== null && typeof data === 'object') {
                voteData = { ...data };
            }
            
            // Increment vote for selected option
            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;

            // Save updated voting results
            updateConfig(questionConfig.storageKey, voteData);
            
            console.log('Vote recorded:', selectedLabel, voteData);
            
            // Hide question area
            const questionArea = document.getElementById('questionArea');
            if (questionArea) {
                questionArea.style.display = 'none';
            }
            
            // Show result button if ad flow is interrupted or for fallback
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
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=hardcore-tech",
        });
        return;
    }

    // Fallback for web environment
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
            overlay.innerHTML = '<div style="background:#2c3e50;padding:30px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);"><h3>正在连接未来数据库...</h3><div style="margin-top:15px;width:40px;height:40px;border:4px solid #3498db;border-top:4px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div><style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style></div>';
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
 * Handles URL parameters for result display (callback from ad)
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for finishedAd parameter (handle both string 'true' and boolean true)
    const finishedAd = urlParams.get('finishedAd');
    if (finishedAd === 'true' || finishedAd === true || finishedAd === '1') {
        // Immediately show loading state/hide questions to give feedback
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

    resultDiv.innerHTML = "<h2 style='text-align:center;color:#2c3e50;'>硬核科技风向标</h2>";
    resultDiv.innerHTML += "<p style='text-align:center;color:#7f8c8d;margin-bottom:20px;font-size:14px;'>基于全网极客投票统计</p>";

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

    // Sort entries by count descending for better visualization
    const sortedEntries = Object.entries(voteData).sort((a, b) => b[1] - a[1]);

    for (const [option, count] of sortedEntries) {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        const barContainer = document.createElement("div");
        barContainer.className = "bar-container";

        const bar = document.createElement("div");
        bar.className = "bar";
        // Animate height - use requestAnimationFrame for better reliability than setTimeout
        // Set initial height to 2px to ensure visibility
        bar.style.height = "2px";
        
        requestAnimationFrame(() => {
            bar.style.height = `${Math.max(count * scale, 2)}px`; 
        });
        
        // Color variation for top rank
        if (count === maxCount && count > 0) {
            bar.style.background = "linear-gradient(to top, #e74c3c, #f1948a)"; // Red for winner
        }

        const barLabel = document.createElement("div");
        barLabel.className = "bar-label";
        barLabel.innerText = `${count}`;

        const optionLabel = document.createElement("div");
        optionLabel.className = "jet-label";
        // Show full label but maybe truncate if too long
        optionLabel.innerText = option.split(' ')[0]; // Just show "星舰", "人形机器人" etc

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
    totalVotes.innerText = `总参战人数: ${total}`;
    
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
