/**
 * Earning Tips Voting Application
 * Allows users to vote for the most useful earning tips
 */

/**
 * Configuration
 */
const voteConfig = {
    tipsKey: "elder-love-earning-tips",
    votingKey: "elder-love-earning-votes",
    numberOfTips: 5
};

/**
 * Application state
 */
let allTips = [];
let selectedTips = [];
let selectedTipIndex = null;

/**
 * Initialize voting page
 */
function initializeVoting() {
    try {
        checkUrlParameters();
        handleResultDisplay();
    } catch (error) {
        console.error('Error initializing voting:', error);
        showError('初始化失败，请刷新页面重试');
    }
}

/**
 * Check URL parameters for navigation control
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if ad is finished - navigate back if not
    if (urlParams.get('finishedAd') === 'false') {
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
    }
}

/**
 * Handle result display or load tips for voting
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('showResults') === 'true') {
        displayResults();
    } else {
        loadTipsAndSetupVoting();
    }
}

/**
 * Load tips from storage and setup voting interface
 */
function loadTipsAndSetupVoting() {
    readKeyValueStore(voteConfig.tipsKey, (data) => {
        if (data) {
            try {
                allTips = JSON.parse(data);
                console.log(`Loaded ${allTips.length} tips`);
                
                if (allTips.length < voteConfig.numberOfTips) {
                    showError(`技巧数量不足，至少需要${voteConfig.numberOfTips}道技巧`);
                    return;
                }
                
                // Select random tips and display them
                selectedTips = getRandomTips(allTips, voteConfig.numberOfTips);
                displayTips(selectedTips);
                
                // Hide loading message and show voting section
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing tips:', error);
                showError('加载技巧失败，请刷新页面重试');
            }
        } else {
            showError('暂无技巧数据，请先在爱做饭页面添加技巧');
        }
    });
}

/**
 * Get random tips from the tip list using Fisher-Yates shuffle
 */
function getRandomTips(tipList, count) {
    const shuffled = [...tipList];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

/**
 * Display tips in the gallery
 */
function displayTips(tips) {
    const gallery = document.getElementById('tipGallery');
    gallery.innerHTML = '';
    
    tips.forEach((tip, index) => {
        const container = createTipContainer(tip, index);
        gallery.appendChild(container);
    });
}

/**
 * Create a tip container element
 */
function createTipContainer(tip, index) {
    const container = document.createElement('div');
    container.className = 'tip-container';
    container.onclick = () => selectTip(index);
    
    const name = document.createElement('div');
    name.className = 'tip-name';
    name.textContent = tip.name;
    container.appendChild(name);
    
    if (tip.description) {
        const description = document.createElement('div');
        description.className = 'tip-description';
        description.textContent = tip.description;
        container.appendChild(description);
    }
    
    return container;
}

/**
 * Handle tip selection
 */
function selectTip(index) {
    const containers = document.querySelectorAll('.tip-container');
    containers.forEach(c => c.classList.remove('selected'));
    
    containers[index].classList.add('selected');
    selectedTipIndex = index;
    
    // Show result button
    const showResultBtn = document.getElementById('showResultBtn');
    if (showResultBtn) {
        showResultBtn.style.display = 'block';
    }
}

/**
 * Show ad before displaying results
 */
function showAd() {
    if (selectedTipIndex === null) {
        alert('请先选择一道技巧！');
        return;
    }
    
    // Save vote
    saveVote();
    
    // Check if running in Kuaishou environment
    if (typeof ks !== 'undefined' && ks.showAd) {
        ks.showAd({
            success: function() {
                window.location.href = 'vote.html?showResults=true';
            },
            fail: function() {
                // If ad fails, still show results
                window.location.href = 'vote.html?showResults=true';
            }
        });
    } else {
        // If not in Kuaishou environment, directly show results
        window.location.href = 'vote.html?showResults=true';
    }
}

/**
 * Save vote to storage
 */
function saveVote() {
    const selectedTip = selectedTips[selectedTipIndex];
    
    // Create a Map for O(1) lookup if tip has ID, otherwise fallback to findIndex
    if (selectedTip.id) {
        const tipMap = new Map(allTips.map(d => [d.id, d]));
        const tip = tipMap.get(selectedTip.id);
        if (tip) {
            tip.votes = (tip.votes || 0) + 1;
        }
    } else {
        // Fallback for tips without IDs (backward compatibility)
        const tipIndex = allTips.findIndex(d => d.name === selectedTip.name && d.timestamp === selectedTip.timestamp);
        if (tipIndex !== -1) {
            allTips[tipIndex].votes = (allTips[tipIndex].votes || 0) + 1;
        }
    }
    
    // Save updated tips
    const tipsData = JSON.stringify(allTips);
    updateKeyValueStore(voteConfig.tipsKey, tipsData)
        .then(() => {
            console.log('Vote saved successfully');
        })
        .catch((error) => {
            console.error('Error saving vote:', error);
        });
}

/**
 * Display voting results
 */
function displayResults() {
    readKeyValueStore(voteConfig.tipsKey, (data) => {
        if (data) {
            try {
                const tips = JSON.parse(data);
                
                // Sort by votes
                const sortedTips = [...tips].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                
                // Hide voting section, show results
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('resultsContainer').style.display = 'block';
                
                // Show winner
                if (sortedTips.length > 0) {
                    const winner = sortedTips[0];
                    document.getElementById('winnerSection').style.display = 'block';
                    document.getElementById('winnerTip').textContent = winner.name;
                    document.getElementById('winnerVotes').textContent = `获得 ${winner.votes || 0} 票`;
                }
                
                // Show all results
                document.getElementById('resultsSection').style.display = 'block';
                displayResultsList(sortedTips);
                
                // Display statistics
                const totalVotes = sortedTips.reduce((sum, tip) => sum + (tip.votes || 0), 0);
                document.getElementById('totalVotes').textContent = `总投票数：${totalVotes}`;
                document.getElementById('timestamp').textContent = `更新时间：${new Date().toLocaleString('zh-CN')}`;
                
            } catch (error) {
                console.error('Error displaying results:', error);
                showError('显示结果失败');
            }
        } else {
            showError('无法加载投票结果');
        }
    });
}

/**
 * Display results list
 */
function displayResultsList(tips) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    tips.forEach((tip, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        
        const info = document.createElement('div');
        info.className = 'result-info';
        
        const rank = document.createElement('div');
        rank.className = 'result-rank';
        rank.textContent = `${index + 1}.`;
        info.appendChild(rank);
        
        const name = document.createElement('div');
        name.className = 'result-name';
        name.textContent = tip.name;
        info.appendChild(name);
        
        item.appendChild(info);
        
        const votes = document.createElement('div');
        votes.className = 'result-votes';
        votes.textContent = `${tip.votes || 0} 票`;
        item.appendChild(votes);
        
        resultsList.appendChild(item);
    });
}

/**
 * Retry voting
 */
function retryVote() {
    window.location.href = 'vote.html';
}

/**
 * Show error message
 */
function showError(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = message;
        loadingMessage.style.display = 'block';
        loadingMessage.style.color = '#e74c3c';
    } else {
        alert(message);
    }
}

/**
 * Jump to index page (for compatibility)
 */
function jumpToIndex() {
    window.location.href = 'index.html';
}
