/**
 * HowLong Application - Survey/Quiz functionality
 * Handles user interaction for duration-based questions
 */

/**
 * Configuration object for question and options
 */
const questionConfig = {
    title: "你能坚持多久？",
    question: "和视频中的美女啪啪你能坚持多久？",
    options: [
        { value: "1", label: "10秒以下" },
        { value: "2", label: "1分钟以上" },
        { value: "3", label: "5分钟以上" },
        { value: "4", label: "10分钟以上" },
        { value: "5", label: "30分钟以上" }
    ],
    storageKey: "howlong1.data"
};

/**
 * Application state
 */
let currentQuestion = 1;
let score = 0;
let voteData = {};

/**
 * Initializes the application
 */
function initializeApp() {
    try {
        checkUrlParameters();
        initializeVoteData();
        setupPageContent();
    } catch (error) {
        console.error('Error initializing app:', error);
    }
}

/**
 * Checks URL parameters for navigation control
 */
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
    }
}

/**
 * Generates option buttons in the container
 * @param {HTMLElement} container - The container element for buttons
 */
function generateOptionButtons(container) {
    questionConfig.options.forEach(option => {
        const button = document.createElement('button');
        button.type = 'button';
        button.onclick = () => nextQuestion(option.value);
        button.textContent = option.label;
        container.appendChild(button);
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
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=howlong",
        });
    } else {
        console.warn('Mini-program navigation not available');
    }
}

/**
 * Navigates to webview6 page
 * @deprecated This function appears unused
 */
function jumpToWebview6() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/webview6/webview6",
        });
    } else {
        console.warn('Mini-program navigation not available');
    }
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
    optionLabel.className = "cup-label";
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

/**
 * Enhanced initialization to handle result display
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