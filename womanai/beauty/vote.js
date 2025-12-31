/**
 * Beauty Voting Application
 * Mirrors elder-love/dancing/vote.js but uses womanai-beauty storage key
 */

const voteConfig = {
    postsKey: "womanai-beauty",
    votingKey: "womanai-beauty-votes",
    numberOfItems: 5
};

let allItems = [];
let selectedItems = [];
let selectedIndex = null;

function initializeVoting() {
    try {
        handleResultDisplay();
    } catch (error) {
        console.error('Error initializing voting:', error);
        showError('初始化失败，请刷新页面重试');
    }
}

function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('finishedAd') === 'true' || urlParams.get('showResults') === 'true') {
        displayResults();
    } else {
        loadItemsAndSetupVoting();
    }
}

function loadItemsAndSetupVoting() {
    readKeyValueStore(voteConfig.postsKey, (data) => {
        if (data) {
            try {
                allItems = JSON.parse(data);
                if (allItems.length < voteConfig.numberOfItems) {
                    showError(`条目数量不足，至少需要${voteConfig.numberOfItems}项`);
                    return;
                }
                selectedItems = getRandomItems(allItems, voteConfig.numberOfItems);
                displayItems(selectedItems);
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing items:', error);
                showError('加载数据失败，请刷新页面重试');
            }
        } else {
            showError('暂无数据，请先在爱美容页面添加分享');
        }
    });
}

function getRandomItems(list, count) {
    const shuffled = [...list];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

function displayItems(items) {
    const gallery = document.getElementById('itemGallery') || document.getElementById('danceGallery') || document.getElementById('itemGallery');
    // support id variations
    const container = document.getElementById('itemGallery') || document.getElementById('danceGallery');
    const target = container || gallery;
    if (!target) return;
    target.innerHTML = '';
    items.forEach((it, index) => {
        const el = createItemContainer(it, index);
        target.appendChild(el);
    });
}

function createItemContainer(item, index) {
    const container = document.createElement('div');
    container.className = 'dish-container';
    container.onclick = () => selectItem(index);
    const name = document.createElement('div');
    name.className = 'dish-name';
    name.textContent = item.title || item.name || '未命名';
    container.appendChild(name);
    if (item.description) {
        const desc = document.createElement('div');
        desc.className = 'dish-description';
        desc.textContent = item.description;
        container.appendChild(desc);
    }
    return container;
}

function selectItem(index) {
    const containers = document.querySelectorAll('.dish-container');
    containers.forEach(c => c.classList.remove('selected'));
    containers[index].classList.add('selected');
    selectedIndex = index;
    showAd();
}

function showAd() {
    if (selectedIndex === null) { alert('请先选择一项！'); return; }
    saveVote();
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({ url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=womanai/beauty", });
    } else {
        window.location.href = 'vote.html?showResults=true';
    }
}

function saveVote() {
    const selected = selectedItems[selectedIndex];
    if (!selected) return;
    if (selected.id) {
        const map = new Map(allItems.map(d => [d.id, d]));
        const found = map.get(selected.id);
        if (found) found.votes = (found.votes || 0) + 1;
    } else {
        const idx = allItems.findIndex(d => (d.title === selected.title || d.name === selected.name) && d.timestamp === selected.timestamp);
        if (idx !== -1) allItems[idx].votes = (allItems[idx].votes || 0) + 1;
    }
    updateKeyValueStore(voteConfig.postsKey, JSON.stringify(allItems))
        .then(() => console.log('Vote saved'))
        .catch(err => console.error('Error saving vote:', err));
}

function displayResults() {
    readKeyValueStore(voteConfig.postsKey, (data) => {
        if (data) {
            try {
                const items = JSON.parse(data);
                const sorted = [...items].sort((a, b) => (b.votes || 0) - (a.votes || 0));
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'none';
                document.getElementById('resultsContainer').style.display = 'block';
                if (sorted.length > 0) {
                    const winner = sorted[0];
                    const winnerSection = document.getElementById('winnerSection');
                    if (winnerSection) winnerSection.style.display = 'block';
                    const winnerItem = document.getElementById('winnerItem');
                    const winnerVotes = document.getElementById('winnerVotes');
                    if (winnerItem) winnerItem.textContent = winner.title || winner.name;
                    if (winnerVotes) winnerVotes.textContent = `获得 ${winner.votes || 0} 票`;
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

function displayResultsList(items) {
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';
    items.forEach((it, index) => {
        const item = document.createElement('div');
        item.className = 'result-item';
        const info = document.createElement('div');
        info.className = 'result-info';
        const rank = document.createElement('div'); rank.className = 'result-rank'; rank.textContent = `${index + 1}.`;
        const name = document.createElement('div'); name.className = 'result-name'; name.textContent = it.title || it.name;
        info.appendChild(rank); info.appendChild(name);
        item.appendChild(info);
        const votes = document.createElement('div'); votes.className = 'result-votes'; votes.textContent = `${it.votes || 0} 票`;
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
