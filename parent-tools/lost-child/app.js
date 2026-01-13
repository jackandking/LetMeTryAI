/**
 * Lost Child Application
 * Allows users to share experiences and emergency measures
 */

/**
 * Configuration
 */
const lostChildConfig = {
    casesKey: "parent-tools-lost-child-cases",
    votingKey: "parent-tools-lost-child-votes"
};

/**
 * Application state
 */
let cases = [];

/**
 * Initialize the page
 */
function initializePage() {
    setupFormSubmission();
    loadCases();
}

function setupFormSubmission() {
    const form = document.getElementById('uploadForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const caseTitle = document.getElementById('caseTitle').value.trim();
    const caseCategory = document.getElementById('caseCategory').value.trim();
    const description = document.getElementById('description').value.trim();

    if (!caseTitle || !caseCategory || !description) {
        alert('请填写所有必填项！');
        return;
    }

    const caseItem = {
        id: `case-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: caseTitle,
        description: description,
        category: caseCategory,
        timestamp: Date.now(),
        votes: 0
    };

    cases.push(caseItem);

    try {
        await saveCases();
        alert('提交成功！感谢您的分享！');
        document.getElementById('uploadForm').reset();
        loadCases();
    } catch (error) {
        console.error('Error saving case:', error);
        alert('提交失败，请稍后重试！');
    }
}

function saveCases() {
    const casesData = JSON.stringify(cases);
    return new Promise((resolve, reject) => {
        updateKeyValueStore(lostChildConfig.casesKey, casesData)
            .then(() => resolve())
            .catch(err => reject(err));
    });
}

function loadCases() {
    const loadingMessage = document.getElementById('loadingMessage');
    const casesList = document.getElementById('casesList');

    if (loadingMessage) loadingMessage.style.display = 'block';

    readKeyValueStore(lostChildConfig.casesKey, (data) => {
        if (loadingMessage) loadingMessage.style.display = 'none';

        if (data) {
            try {
                cases = JSON.parse(data);
                displayCases(cases);
            } catch (error) {
                console.error('Error parsing cases data:', error);
                casesList.innerHTML = '<p style="text-align: center; color: #888;">暂无数据</p>';
            }
        } else {
            cases = [];
            casesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享案例，快来做第一个吧！</p>';
        }
    });
}

function displayCases(casesArray) {
    const casesList = document.getElementById('casesList');
    if (!casesArray || casesArray.length === 0) {
        casesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享案例，快来做第一个吧！</p>';
        return;
    }

    // Sort by votes (descending) then by timestamp (newest first)
    const sorted = [...casesArray].sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return b.timestamp - a.timestamp;
    });

    casesList.innerHTML = '';
    sorted.forEach(c => {
        const card = createCaseCard(c);
        casesList.appendChild(card);
    });
}

function createCaseCard(caseItem) {
    const card = document.createElement('div');
    card.className = 'case-card';

    // Category badge
    const category = document.createElement('div');
    category.className = 'case-category';
    category.textContent = caseItem.category;
    card.appendChild(category);

    // Title
    const title = document.createElement('h3');
    title.textContent = caseItem.title;
    card.appendChild(title);

    // Description
    const description = document.createElement('p');
    description.className = 'description';
    description.textContent = caseItem.description;
    card.appendChild(description);

    // Votes
    if (caseItem.votes !== undefined && caseItem.votes > 0) {
        const votes = document.createElement('div');
        votes.className = 'votes';
        votes.textContent = `👍 ${caseItem.votes} 票`;
        card.appendChild(votes);
    }

    return card;
}

function getCasesForVoting() {
    return cases.filter(c => c.title && c.title.trim());
}

if (typeof window !== 'undefined') {
    window.getCasesForVoting = getCasesForVoting;
}
