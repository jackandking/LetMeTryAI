/**
 * 手机拍照模式投票 Survey Application
 * Logic for the "旗舰拍照PK：你选哪种拍照模式？" survey
 */

const questionConfig = {
    "title": "旗舰拍照PK：你选哪种拍照模式？",
    "question": "拍照时你最常用或最看重哪种拍照模式？",
    "options": [
        {
            "value": "night-mode",
            "label": "夜景模式"
        },
        {
            "value": "telephoto-zoom",
            "label": "长焦变焦"
        },
        {
            "value": "portrait-bokeh",
            "label": "人像虚化"
        },
        {
            "value": "ultrawide-scene",
            "label": "超广角"
        }
    ],
    "storageKey": "phone_camera_mode_pick_v1.data"
};

let currentQuestion = 1;
let voteData = {};

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
    const radios = document.querySelectorAll('input[name="nanrenbao"]');
    if (!radios || radios.length === 0) {
        return;
    }

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
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: '/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=phone-camera-mode-pick'
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
            overlay.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:9999;color:#fff;flex-direction:column;';
            overlay.innerHTML = '<div style="background:#2f4858;padding:30px;border-radius:12px;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5);"><h3>正在分析“旗舰拍照PK：你选哪种拍照模式？”的投票趋势...</h3><div style="margin-top:15px;width:40px;height:40px;border:4px solid #ff7f50;border-top:4px solid transparent;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto;"></div><style>@keyframes spin {0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);}}</style></div>';
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

    if (questionnaire) {
        questionnaire.style.display = 'none';
    }
    if (showResultBtn) {
        showResultBtn.style.display = 'none';
    }
    if (result) {
        result.style.display = 'block';
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
        if (questionnaire) {
            questionnaire.style.display = 'none';
        }
        if (result) {
            result.style.display = 'block';
        }

        displayResults();
    }
}

function showResult(latestVoteData) {
    if (!latestVoteData || typeof latestVoteData !== 'object') {
        return;
    }

    const resultDiv = document.getElementById('result');
    if (!resultDiv) {
        return;
    }

    resultDiv.innerHTML = "<h2 style='text-align:center;color:#2f4858;'>手机拍照模式投票投票结果</h2>";
    resultDiv.innerHTML += "<p style='text-align:center;color:#7f8c8d;margin-bottom:20px;font-size:14px;'>看看大家对“旗舰拍照PK：你选哪种拍照模式？”的最新态度</p>";

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

        requestAnimationFrame(() => {
            bar.style.height = `${Math.max(count * scale, 2)}px`;
        });

        if (count === maxCount && count > 0) {
            bar.style.background = 'linear-gradient(to top, #ff6b35, #ffb199)';
        }

        const barLabel = document.createElement('div');
        barLabel.className = 'bar-label';
        barLabel.innerText = `${count}`;

        const optionLabel = document.createElement('div');
        optionLabel.className = 'jet-label';
        optionLabel.innerText = option.split(' ')[0];

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
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: '/pages/index/index' });
    } else {
        window.location.href = '/';
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);
