/**
 * Emperor Survey Application - Survey/Quiz functionality
 * Handles user interaction for "Greatest Emperor in Chinese History" survey questions
 */

/**
 * Configuration object for question and options
 */
const questionConfig = {
    title: "中国最伟大的皇帝是谁？",
    question: "在中国历史上，你认为谁是最伟大的皇帝？",
    options: [
        { value: "1", label: "秦始皇嬴政" },
        { value: "2", label: "汉高祖刘邦" },
        { value: "3", label: "汉武帝刘彻" },
        { value: "4", label: "唐太宗李世民" },
        { value: "5", label: "明太祖朱元璋" }
    ],
    storageKey: "emperor1.data"
};

/**
 * Application state
 */
let currentQuestion = 1;
let score = 0;
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
    console.log('URL parameters:', urlParams);

    // Check if ad is finished - navigate back if not
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
    // Initialize voteData based on questionConfig options
    questionConfig.options.forEach(option => {
        voteData[option.label] = 0;
    });
}

/**
 * Sets up the page content dynamically
 */
function setupPageContent() {
    // Set page title
    const titleElement = document.getElementById('pageTitle');
    if (titleElement) {
        titleElement.textContent = questionConfig.title;
    }

    // Set question text
    const questionElement = document.getElementById('questionText');
    if (questionElement) {
        questionElement.textContent = questionConfig.question;
    }

    // Generate option buttons
    const optionsContainer = document.getElementById('optionsContainer');
    if (optionsContainer) {
        generateOptionButtons(optionsContainer);
        attachRadioHandlers();
    }
}

/**
 * Generates option buttons in the container
 * @param {HTMLElement} container - The container element for buttons
 */
function generateOptionButtons(container) {
    // If the container already contains radio inputs or custom option elements,
    // don't generate the default buttons to avoid duplicate UI.
    if (container.querySelector('input[type="radio"]') || container.querySelector('.option')) {
        return;
    }

    questionConfig.options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.onclick = () => nextQuestion(option.value);
        button.textContent = option.label;
        container.appendChild(button);
    });
}

/**
 * Attach change handlers to radio inputs so a selection records the vote
 * and immediately proceeds to show the ad flow (no extra click required).
 */
function attachRadioHandlers() {
    const radios = document.querySelectorAll('input[name="emperor"]');
    if (!radios || radios.length === 0) return;

    radios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedValueOrLabel = e.target.value;

            // Try to find matching option by exact label first
            let matched = questionConfig.options.find(o => o.label === selectedValueOrLabel);

            // If not exact match, try contains matching (handles slight label differences)
            if (!matched) {
                matched = questionConfig.options.find(o => selectedValueOrLabel.includes(o.label) || o.label.includes(selectedValueOrLabel));
            }

            const selectedValue = matched ? matched.value : null;
            if (selectedValue) {
                nextQuestion(selectedValue);
                // Immediately start ad flow
                showAd();
            } else {
                console.warn('Selected radio did not match configured options:', selectedValueOrLabel);
            }
        });
    });
}

/**
 * Handles the next question logic
 * @param {string} selectedOption - The selected option value
 */
function nextQuestion(selectedOption) {
    if (!selectedOption) {
        console.error('No option selected');
        return;
    }

    try {
        // Process the vote
        processVote(selectedOption);

        // Hide current question
        const currentQuestionElement = document.getElementById(`question${currentQuestion}`);
        if (currentQuestionElement) {
            currentQuestionElement.style.display = 'none';
        }

        // Move to next question or show result button
        currentQuestion++;
        if (currentQuestion <= 1) {
            // Show next question if available
            const nextQuestionElement = document.getElementById(`question${currentQuestion}`);
            if (nextQuestionElement) {
                nextQuestionElement.style.display = 'block';
            }
        } else {
            // No more questions - show result button
            const showResultBtn = document.getElementById('showResultBtn');
            if (showResultBtn) {
                showResultBtn.style.display = 'block';
            }
        }
    } catch (error) {
        console.error('Error processing question:', error);
    }
}

/**
 * Processes the user's vote
 * @param {string} selectedOption - The selected option value
 */
function processVote(selectedOption) {
    const optionIndex = parseInt(selectedOption) - 1;
    
    if (optionIndex < 0 || optionIndex >= questionConfig.options.length) {
        console.error('Invalid option selected:', selectedOption);
        return;
    }

    const selectedLabel = questionConfig.options[optionIndex].label;

    // Read current voting results
    getConfig(questionConfig.storageKey, (data) => {
        try {
            // Update vote data
            if (data !== null && typeof data === 'object') {
                voteData = { ...data };
            }
            
            // Increment vote for selected option
            voteData[selectedLabel] = (voteData[selectedLabel] || 0) + 1;

            // Save updated voting results
            updateConfig(questionConfig.storageKey, voteData);
            
            console.log('Vote recorded:', selectedLabel, voteData);
        } catch (error) {
            console.error('Error processing vote:', error);
        }
    });
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Navigation Functions - Mini-program specific
 */

/**
 * Shows advertisement before displaying results
 */
function showAd() {
    logEvent('rewarded_ad_trigger');
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=emperor",
        });
        return;
    }

    // Fallback for web environment: simulate an ad, then show results.
    displayAdFallback().catch(err => console.error('Ad fallback error:', err));
}

/**
 * Web fallback to simulate an ad: shows a temporary overlay, then reveals results.
 * Returns a Promise that resolves after results are shown.
 */
function displayAdFallback() {
    return new Promise((resolve) => {
        // Create overlay
        let overlay = document.getElementById('adOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'adOverlay';
            overlay.style.position = 'fixed';
            overlay.style.left = 0;
            overlay.style.top = 0;
            overlay.style.right = 0;
            overlay.style.bottom = 0;
            overlay.style.background = 'rgba(0,0,0,0.6)';
            overlay.style.display = 'flex';
            overlay.style.alignItems = 'center';
            overlay.style.justifyContent = 'center';
            overlay.style.zIndex = 9999;
            overlay.innerHTML = '<div style="background:#fff;padding:18px 24px;border-radius:8px;text-align:center;font-size:16px;color:#333;">正在为您准备广告...<br><small style="color:#666;margin-top:8px;display:block">若长时间未跳转请刷新页面</small></div>';
            document.body.appendChild(overlay);
        } else {
            overlay.style.display = 'flex';
        }

        // Wait briefly to simulate ad playback, then hide overlay and show results
        const AD_SIM_MS = 1500;
        setTimeout(() => {
            overlay.style.display = 'none';

            // Hide questionnaire, show result and load data
            const questionnaire = document.getElementById('questionnaire');
            const result = document.getElementById('result');
            if (questionnaire) questionnaire.style.display = 'none';
            if (result) result.style.display = 'block';

            getConfig(questionConfig.storageKey, (data) => {
                if (data) {
                    showResult(data);
                } else {
                    // If no remote data, use local voteData
                    showResult(voteData);
                }
                resolve();
            });
        }, AD_SIM_MS);
    });
}

/**
 * Navigates to index page
 */
function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/index/index",
        });
    } else {
        console.warn('Mini-program navigation not available');
    }
}

/**
 * Results Display Functions
 */

/**
 * Displays voting results as a bar chart
 * @param {Object} voteData - Object containing vote counts for each option
 */
function showResult(voteData) {
    if (!voteData || typeof voteData !== 'object') {
        console.error('Invalid vote data provided');
        return;
    }

    const resultDiv = document.getElementById("result");
    if (!resultDiv) {
        console.error('Result div not found');
        return;
    }

    // Clear and set up result container
    resultDiv.innerHTML = "<h2>全网用户统计结果</h2>";
    resultDiv.innerHTML += "<p style='text-align:center;color:#666;margin-bottom:20px;'>以下是所有参与用户的真实数据统计</p>";

    // Create bar chart
    const barChart = createBarChart(voteData);
    resultDiv.appendChild(barChart);
    
    // Add summary statistics  
    addSummaryStatistics(resultDiv, voteData);
}

/**
 * Creates a bar chart element from vote data
 * @param {Object} voteData - Vote data object
 * @returns {HTMLElement} Bar chart element
 */
function createBarChart(voteData) {
    const barChart = document.createElement("div");
    barChart.className = "bar-chart";

    const maxCount = Math.max(...Object.values(voteData));
    const scale = maxCount > 0 ? 200 / maxCount : 1;
    const total = Object.values(voteData).reduce((a, b) => a + b, 0);

    for (const [option, count] of Object.entries(voteData)) {
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        
        const barContainer = createBarContainer(option, count, percentage, scale);
        barChart.appendChild(barContainer);
    }

    return barChart;
}

/**
 * Creates a single bar container with label
 * @param {string} option - Option label
 * @param {number} count - Vote count
 * @param {number} percentage - Vote percentage
 * @param {number} scale - Height scale factor
 * @returns {HTMLElement} Bar container element
 */
function createBarContainer(option, count, percentage, scale) {
    const barContainer = document.createElement("div");
    barContainer.className = "bar-container";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.height = `${count * scale}px`;

    const barLabel = document.createElement("div");
    barLabel.className = "bar-label";
    barLabel.innerText = `${count}人 (${percentage}%)`;

    const optionLabel = document.createElement("div");
    optionLabel.className = "emperor-label";
    optionLabel.innerText = option;

    barContainer.appendChild(bar);
    barContainer.appendChild(barLabel);
    barContainer.appendChild(optionLabel);

    return barContainer;
}

/**
 * Adds summary statistics to result display
 * @param {HTMLElement} container - Container element
 * @param {Object} voteData - Vote data object
 */
function addSummaryStatistics(container, voteData) {
    const total = Object.values(voteData).reduce((a, b) => a + b, 0);
    
    // Total votes
    const totalVotes = document.createElement("p");
    totalVotes.style.textAlign = "center";
    totalVotes.style.marginTop = "20px";
    totalVotes.innerText = `总计: ${total}人参与`;
    container.appendChild(totalVotes);
    
    // Timestamp
    const timestamp = document.createElement("p");
    timestamp.style.cssText = "text-align: center; font-size: 12px; color: #888; margin-top: 10px;";
    timestamp.innerText = `统计时间: ${new Date().toLocaleString()}`;
    container.appendChild(timestamp);
}

/**
 * Handles URL parameters for result display
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('finishedAd') !== null) {
        const finishedAd = urlParams.get('finishedAd') === 'true';

        if (finishedAd) {
            // Hide questionnaire and show results
            const questionnaire = document.getElementById('questionnaire');
            const result = document.getElementById('result');
            
            if (questionnaire) questionnaire.style.display = 'none';
            if (result) result.style.display = 'block';
            
            // Load and display results
            getConfig(questionConfig.storageKey, (data) => {
                if (data) {
                    showResult(data);
                } else {
                    console.warn('No vote data available for results');
                }
            });
        }
    }
}
