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
 * Handle result display or load tipes for voting
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('showResults') === 'true') {
        displayResults();
    } else {
        loadTipesAndSetupVoting();
    }
}

/**
 * Load tipes from storage and setup voting interface
 */
function loadTipesAndSetupVoting() {
    readKeyValueStore(voteConfig.tipesKey, (data) => {
        if (data) {
            try {
                allTipes = JSON.parse(data);
                console.log(`Loaded ${allTipes.length} tipes`);
                
                if (allTipes.length < voteConfig.numberOfTipes) {
                    showError(`技巧数量不足，至少需要${voteConfig.numberOfTipes}道技巧`);
                    return;
                }
                
                // Select random tipes and display them
                selectedTipes = getRandomTipes(allTipes, voteConfig.numberOfTipes);
                displayTipes(selectedTipes);
                
                // Hide loading message and show voting section
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing tipes:', error);
                showError('加载技巧失败，请刷新页面重试');
            }
        } else {
            showError('暂无技巧数据，请先在爱做饭页面添加技巧');
        }
    });
}

/**
 * Get random tipes from the tip list using Fisher-Yates shuffle
 */
function getRandomTipes(tipList, count) {
    const shuffled = [...tipList];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

/**
 * Display tipes in the gallery
 */
function displayTipes(tipes) {
    const gallery = document.getElementById('tipGallery');
    gallery.innerHTML = '';
    
    tipes.forEach((tip, index) => {
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
    const selectedTip = selectedTipes[selectedTipIndex];
    
    // Create a Map for O(1) lookup if tip has ID, otherwise fallback to findIndex
    if (selectedTip.id) {
        const tipMap = new Map(allTipes.map(d => [d.id, d]));
        const tip = tipMap.get(selectedTip.id);
        if (tip) {
            tip.votes = (tip.votes || 0) + 1;
        }
    } else {
        // Fallback for tipes without IDs (backward compatibility)
        const tipIndex = allTipes.findIndex(d => d.name === selectedTip.name && d.timestamp === selectedTip.timestamp);
        if (tipIndex !== -1) {
            allTipes[tipIndex].votes = (allTipes[tipIndex].votes || 0) + 1;
        }
    }
    
    // Save updated tipes
    const tipesData = JSON.stringify(allTipes);
    updateKeyValueStore(voteConfig.tipesKey, tipesData)
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
    readKeyValueStore(voteConfig.tipesKey, (data) => {
        if (data) {
            try {
                const tipes = JSON.parse(data);
                
                // Sort by votes
                const sortedTipes = [...tipes].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                
                // Hide voting section, show results
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('resultsContainer').style.display = 'block';
                
                // Show winner
                if (sortedTipes.length > 0) {
                    const winner = sortedTipes[0];
                    document.getElementById('winnerSection').style.display = 'block';
                    document.getElementById('winnerTip').textContent = winner.name;
                    document.getElementById('winnerVotes').textContent = `获得 ${winner.votes || 0} 票`;
                }
                
                // Show all results
                document.getElementById('resultsSection').style.display = 'block';
                displayResultsList(sortedTipes);
                
                // Display statistics
                const totalVotes = sortedTipes.reduce((sum, tip) => sum + (tip.votes || 0), 0);
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
function displayResultsList(tipes) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    tipes.forEach((tip, index) => {
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
