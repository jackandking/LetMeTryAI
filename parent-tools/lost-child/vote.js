/**
 * Case Voting Application for Lost Child
 */

const voteConfig = {
    casesKey: "parent-tools-lost-child-cases",
    votingKey: "parent-tools-lost-child-votes",
    numberOfCases: 5
};

let allCases = [];
let selectedCases = [];
let selectedCaseIndex = null;

function initializeVoting() {
    try {
        checkUrlParameters();
        handleResultDisplay();
    } catch (error) {
        console.error('Error initializing voting:', error);
        showError('初始化失败，请刷新页面重试');
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

function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('finishedAd') === 'true' || urlParams.get('showResults') === 'true') {
        displayResults();
    } else {
        loadCasesAndSetupVoting();
    }
}

function loadCasesAndSetupVoting() {
    readKeyValueStore(voteConfig.casesKey, (data) => {
        if (data) {
            try {
                allCases = JSON.parse(data);
                if (allCases.length < voteConfig.numberOfCases) {
                    showError(`案例数量不足，至少需要${voteConfig.numberOfCases}个`);
                    return;
                }
                selectedCases = getRandomCases(allCases, voteConfig.numberOfCases);
                displayCases(selectedCases);
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing cases:', error);
                showError('加载案例失败，请刷新页面重试');
            }
        } else {
            showError('暂无案例数据，请先在孩子丢了怎么办页面添加案例');
        }
    });
}

function getRandomCases(caseList, count) {
    const shuffled = [...caseList];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function displayCases(cases) {
    const gallery = document.getElementById('caseGallery');
    gallery.innerHTML = '';
    cases.forEach((c, index) => {
        const container = createCaseContainer(c, index);
        gallery.appendChild(container);
    });
}

function createCaseContainer(caseItem, index) {
    const container = document.createElement('div');
    container.className = 'case-container';
    container.onclick = () => selectCase(index);
    
    // Category badge
    const category = document.createElement('div');
    category.className = 'case-category-badge';
    category.textContent = caseItem.category;
    container.appendChild(category);
    
    // Title
    const title = document.createElement('div');
    title.className = 'case-title';
    title.textContent = caseItem.title;
    container.appendChild(title);
    
    // Description (truncated)
    if (caseItem.description) {
        const description = document.createElement('div');
        description.className = 'case-description';
        const truncated = caseItem.description.length > 100 
            ? caseItem.description.substring(0, 100) + '...' 
            : caseItem.description;
        description.textContent = truncated;
        container.appendChild(description);
    }
    
    return container;
}

function selectCase(index) {
    const containers = document.querySelectorAll('.case-container');
    containers.forEach(c => c.classList.remove('selected'));
    containers[index].classList.add('selected');
    selectedCaseIndex = index;
    // Immediately open the ad (which will save the vote and show results)
    showAd();
}

function showAd() {
    if (selectedCaseIndex === null) { alert('请先选择一个案例！'); return; }
    saveVote();
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=parent-tools/lost-child",
        });
    } else {
        window.location.href = 'vote.html?showResults=true';
    }
}

function saveVote() {
    const selected = selectedCases[selectedCaseIndex];
    if (selected.id) {
        const map = new Map(allCases.map(c => [c.id, c]));
        const found = map.get(selected.id);
        if (found) found.votes = (found.votes || 0) + 1;
    } else {
        const idx = allCases.findIndex(c => c.title === selected.title && c.timestamp === selected.timestamp);
        if (idx !== -1) allCases[idx].votes = (allCases[idx].votes || 0) + 1;
    }
    updateKeyValueStore(voteConfig.casesKey, JSON.stringify(allCases))
        .then(() => console.log('Vote saved'))
        .catch(err => console.error('Error saving vote:', err));
}

function displayResults() {
    readKeyValueStore(voteConfig.casesKey, (data) => {
        if (data) {
            try {
                const cases = JSON.parse(data);
                const sorted = [...cases].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('resultsContainer').style.display = 'block';
                if (sorted.length > 0) {
                    const winner = sorted[0];
                    document.getElementById('winnerSection').style.display = 'block';
                    document.getElementById('winnerCase').textContent = winner.title;
                    document.getElementById('winnerVotes').textContent = `获得 ${winner.votes || 0} 票`;
                }
                document.getElementById('resultsSection').style.display = 'block';
                displayResultsList(sorted);
                const totalVotes = sorted.reduce((s, c) => s + (c.votes || 0), 0);
                document.getElementById('totalVotes').textContent = `总投票数：${totalVotes}`;
                document.getElementById('timestamp').textContent = `更新时间：${new Date().toLocaleString('zh-CN')}`;
            } catch (error) { console.error(error); showError('显示结果失败'); }
        } else { showError('无法加载投票结果'); }
    });
}

function displayResultsList(cases) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    cases.forEach((caseItem, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        const info = document.createElement('div');
        info.className = 'result-info';
        const rank = document.createElement('div');
        rank.className = 'result-rank'; rank.textContent = `${index + 1}.`;
        const name = document.createElement('div'); 
        name.className = 'result-name'; 
        name.textContent = caseItem.title;
        info.appendChild(rank); 
        info.appendChild(name);
        item.appendChild(info);
        const votes = document.createElement('div'); 
        votes.className = 'result-votes'; 
        votes.textContent = `${caseItem.votes || 0} 票`;
        item.appendChild(votes);
        resultsList.appendChild(item);
    });
}

function retryVote() { window.location.href = 'vote.html'; }

function showError(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) { 
        loadingMessage.textContent = message; 
        loadingMessage.style.display = 'block'; 
        loadingMessage.style.color = '#e74c3c'; 
    }
    else alert(message);
}

function jumpToIndex() { window.location.href = 'index.html'; }
