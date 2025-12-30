/**
 * Dance Voting Application
 */

const voteConfig = {
    dancesKey: "elder-love-dances",
    votingKey: "elder-love-dances-votes",
    numberOfDishes: 5
};

let allDances = [];
let selectedDances = [];
let selectedDanceIndex = null;

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
        loadDancesAndSetupVoting();
    }
}

function loadDancesAndSetupVoting() {
    readKeyValueStore(voteConfig.dancesKey, (data) => {
        if (data) {
            try {
                allDances = JSON.parse(data);
                if (allDances.length < voteConfig.numberOfDishes) {
                    showError(`舞蹈数量不足，至少需要${voteConfig.numberOfDishes}支`);
                    return;
                }
                selectedDances = getRandomDishes(allDances, voteConfig.numberOfDishes);
                displayDances(selectedDances);
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing dances:', error);
                showError('加载舞蹈失败，请刷新页面重试');
            }
        } else {
            showError('暂无舞蹈数据，请先在爱跳舞页面添加舞蹈');
        }
    });
}

function getRandomDishes(dishList, count) {
    const shuffled = [...dishList];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function displayDances(dances) {
    const gallery = document.getElementById('danceGallery');
    gallery.innerHTML = '';
    dances.forEach((d, index) => {
        const container = createDanceContainer(d, index);
        gallery.appendChild(container);
    });
}

function createDanceContainer(dance, index) {
    const container = document.createElement('div');
    container.className = 'dish-container';
    container.onclick = () => selectDance(index);
    const name = document.createElement('div');
    name.className = 'dish-name';
    name.textContent = dance.name;
    container.appendChild(name);
    if (dance.description) {
        const description = document.createElement('div');
        description.className = 'dish-description';
        description.textContent = dance.description;
        container.appendChild(description);
    }
    return container;
}

function selectDance(index) {
    const containers = document.querySelectorAll('.dish-container');
    containers.forEach(c => c.classList.remove('selected'));
    containers[index].classList.add('selected');
    selectedDanceIndex = index;
    // Immediately open the ad (which will save the vote and show results)
    showAd();
}

function showAd() {
    if (selectedDanceIndex === null) { alert('请先选择一支舞！'); return; }
    saveVote();
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=elder-love/dancing",
        });
    } else {
        window.location.href = 'vote.html?showResults=true';
    }
}

function saveVote() {
    const selected = selectedDances[selectedDanceIndex];
    if (selected.id) {
        const map = new Map(allDances.map(d => [d.id, d]));
        const found = map.get(selected.id);
        if (found) found.votes = (found.votes || 0) + 1;
    } else {
        const idx = allDances.findIndex(d => d.name === selected.name && d.timestamp === selected.timestamp);
        if (idx !== -1) allDances[idx].votes = (allDances[idx].votes || 0) + 1;
    }
    updateKeyValueStore(voteConfig.dancesKey, JSON.stringify(allDances))
        .then(() => console.log('Vote saved'))
        .catch(err => console.error('Error saving vote:', err));
}

function displayResults() {
    readKeyValueStore(voteConfig.dancesKey, (data) => {
        if (data) {
            try {
                const dances = JSON.parse(data);
                const sorted = [...dances].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('resultsContainer').style.display = 'block';
                if (sorted.length > 0) {
                    const winner = sorted[0];
                    document.getElementById('winnerSection').style.display = 'block';
                    document.getElementById('winnerDance').textContent = winner.name;
                    document.getElementById('winnerVotes').textContent = `获得 ${winner.votes || 0} 票`;
                }
                document.getElementById('resultsSection').style.display = 'block';
                displayResultsList(sorted);
                const totalVotes = sorted.reduce((s, d) => s + (d.votes || 0), 0);
                document.getElementById('totalVotes').textContent = `总投票数：${totalVotes}`;
                document.getElementById('timestamp').textContent = `更新时间：${new Date().toLocaleString('zh-CN')}`;
            } catch (error) { console.error(error); showError('显示结果失败'); }
        } else { showError('无法加载投票结果'); }
    });
}

function displayResultsList(dances) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    dances.forEach((dance, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        const info = document.createElement('div');
        info.className = 'result-info';
        const rank = document.createElement('div');
        rank.className = 'result-rank'; rank.textContent = `${index + 1}.`;
        const name = document.createElement('div'); name.className = 'result-name'; name.textContent = dance.name;
        info.appendChild(rank); info.appendChild(name);
        item.appendChild(info);
        const votes = document.createElement('div'); votes.className = 'result-votes'; votes.textContent = `${dance.votes || 0} 票`;
        item.appendChild(votes);
        resultsList.appendChild(item);
    });
}

function retryVote() { window.location.href = 'vote.html'; }

function showError(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) { loadingMessage.textContent = message; loadingMessage.style.display = 'block'; loadingMessage.style.color = '#e74c3c'; }
    else alert(message);
}

function jumpToIndex() { window.location.href = 'index.html'; }
