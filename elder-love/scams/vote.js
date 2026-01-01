/**
 * Scam Voting Application
 * Allows users to vote for the most dangerous scams
 */

/**
 * Configuration
 */
const voteConfig = {
    scamsKey: "elder-love-scams",
    votingKey: "elder-love-scams-votes",
    numberOfScams: 5
};

/**
 * Application state
 */
let allScams = [];
let selectedScams = [];
let selectedScamIndex = null;

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
 * Handle result display or load scams for voting
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if ad is finished and should show results
    if (urlParams.get('finishedAd') === 'true' || urlParams.get('showResults') === 'true') {
        displayResults();
    } else {
        loadScamsAndSetupVoting();
    }
}

/**
 * Load scams from storage and setup voting interface
 */
function loadScamsAndSetupVoting() {
    readKeyValueStore(voteConfig.scamsKey, (data) => {
        if (data) {
            try {
                allScams = JSON.parse(data);
                console.log(`Loaded ${allScams.length} scams`);
                
                if (allScams.length < voteConfig.numberOfScams) {
                    showError(`骗局案例数量不足，至少需要${voteConfig.numberOfScams}个案例`);
                    return;
                }
                
                // Select random scams and display them
                selectedScams = getRandomScams(allScams, voteConfig.numberOfScams);
                displayScams(selectedScams);
                
                // Hide loading message and show voting section
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing scams:', error);
                showError('加载骗局案例失败，请刷新页面重试');
            }
        } else {
            showError('暂无骗局案例数据，请先在主页添加案例');
        }
    });
}

/**
 * Get random scams from the scam list using Fisher-Yates shuffle
 */
function getRandomScams(scamList, count) {
    const shuffled = [...scamList];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

/**
 * Display scams in the gallery
 */
function displayScams(scams) {
    const gallery = document.getElementById('scamGallery');
    gallery.innerHTML = '';
    
    scams.forEach((scam, index) => {
        const container = createScamContainer(scam, index);
        gallery.appendChild(container);
    });
}

/**
 * Create a scam container element
 */
function createScamContainer(scam, index) {
    const container = document.createElement('div');
    container.className = 'scam-container';
    container.onclick = () => selectScam(index);
    
    const name = document.createElement('div');
    name.className = 'scam-name';
    name.textContent = scam.name;
    container.appendChild(name);
    
    if (scam.description) {
        const description = document.createElement('div');
        description.className = 'scam-description';
        description.textContent = scam.description;
        container.appendChild(description);
    }
    
    // Add video link button
    const videoLinkBtn = document.createElement('a');
    videoLinkBtn.href = scam.videoLink;
    videoLinkBtn.target = '_blank';
    videoLinkBtn.className = 'video-link-btn';
    videoLinkBtn.textContent = '📺 查看案例';
    videoLinkBtn.onclick = (e) => e.stopPropagation(); // Prevent container click when clicking link
    container.appendChild(videoLinkBtn);
    
    return container;
}

/**
 * Handle scam selection
 */
function selectScam(index) {
    const containers = document.querySelectorAll('.scam-container');
    containers.forEach(c => c.classList.remove('selected'));
    
    containers[index].classList.add('selected');
    selectedScamIndex = index;
    // Immediately open the ad (which will save the vote and show results)
    showAd();
}

/**
 * Show ad before displaying results
 */
function showAd() {
    if (selectedScamIndex === null) {
        alert('请先选择一个骗局！');
        return;
    }
    
    // Save vote
    saveVote();
    
    // Check if running in Kuaishou environment
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=elder-love/scams",
        });
    } else {
        // If not in Kuaishou environment, directly show results
        console.warn('Mini-program navigation not available');
        window.location.href = 'vote.html?showResults=true';
    }
}

/**
 * Save vote to storage
 */
function saveVote() {
    const selectedScam = selectedScams[selectedScamIndex];
    
    // Create a Map for O(1) lookup if scam has ID, otherwise fallback to findIndex
    if (selectedScam.id) {
        const scamMap = new Map(allScams.map(s => [s.id, s]));
        const scam = scamMap.get(selectedScam.id);
        if (scam) {
            scam.votes = (scam.votes || 0) + 1;
        }
    } else {
        // Fallback for scams without IDs (backward compatibility)
        const scamIndex = allScams.findIndex(s => s.name === selectedScam.name && s.timestamp === selectedScam.timestamp);
        if (scamIndex !== -1) {
            allScams[scamIndex].votes = (allScams[scamIndex].votes || 0) + 1;
        }
    }
    
    // Save updated scams
    const scamsData = JSON.stringify(allScams);
    updateKeyValueStore(voteConfig.scamsKey, scamsData)
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
    readKeyValueStore(voteConfig.scamsKey, (data) => {
        if (data) {
            try {
                const scams = JSON.parse(data);
                
                // Sort by votes
                const sortedScams = [...scams].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                
                // Hide voting section, show results
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('resultsContainer').style.display = 'block';
                
                // Show winner
                if (sortedScams.length > 0) {
                    const winner = sortedScams[0];
                    document.getElementById('winnerSection').style.display = 'block';
                    document.getElementById('winnerScam').textContent = winner.name;
                    document.getElementById('winnerVotes').textContent = `获得 ${winner.votes || 0} 票`;
                }
                
                // Show all results
                document.getElementById('resultsSection').style.display = 'block';
                displayResultsList(sortedScams);
                
                // Display statistics
                const totalVotes = sortedScams.reduce((sum, scam) => sum + (scam.votes || 0), 0);
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
function displayResultsList(scams) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    
    scams.forEach((scam, index) => {
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
        name.textContent = scam.name;
        info.appendChild(name);
        
        item.appendChild(info);
        
        const votes = document.createElement('div');
        votes.className = 'result-votes';
        votes.textContent = `${scam.votes || 0} 票`;
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
