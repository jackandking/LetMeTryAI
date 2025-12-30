/**
 * Love Dancing Application
 * Allows users to share dances and Kuaishou video links
 */

/**
 * Configuration
 */
const dancingConfig = {
    dancesKey: "elder-love-dances",
    votingKey: "elder-love-dances-votes"
};

/**
 * Application state
 */
let dances = [];

/**
 * Extract URL from pasted content
 */
function extractUrl(text) {
    if (!text) return '';
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlPattern);
    if (matches && matches.length > 0) {
        return matches[0].replace(/[.,;:!?]+$/, '');
    }
    return text.trim();
}

/**
 * Initialize the page
 */
function initializePage() {
    setupFormSubmission();
    loadDances();
}

function setupFormSubmission() {
    const form = document.getElementById('uploadForm');
    const videoLinkInput = document.getElementById('videoLink');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    if (videoLinkInput) {
        videoLinkInput.addEventListener('blur', function() {
            const extractedUrl = extractUrl(this.value);
            if (extractedUrl !== this.value) {
                this.value = extractedUrl;
            }
        });
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    const danceName = document.getElementById('danceName').value.trim();
    let videoLink = document.getElementById('videoLink').value.trim();
    const description = document.getElementById('description').value.trim();

    videoLink = extractUrl(videoLink);

    if (!danceName || !videoLink) {
        alert('请填写舞名和视频链接！');
        return;
    }

    const dance = {
        id: `dance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: danceName,
        videoLink: videoLink,
        description: description,
        timestamp: Date.now(),
        votes: 0
    };

    dances.push(dance);

    try {
        await saveDances();
        alert('提交成功！感谢您的分享！');
        document.getElementById('uploadForm').reset();
        loadDances();
    } catch (error) {
        console.error('Error saving dance:', error);
        alert('提交失败，请稍后重试！');
    }
}

function saveDances() {
    const dancesData = JSON.stringify(dances);
    return new Promise((resolve, reject) => {
        updateKeyValueStore(dancingConfig.dancesKey, dancesData)
            .then(() => resolve())
            .catch(err => reject(err));
    });
}

function loadDances() {
    const loadingMessage = document.getElementById('loadingMessage');
    const dancesList = document.getElementById('dancesList');

    if (loadingMessage) loadingMessage.style.display = 'block';

    readKeyValueStore(dancingConfig.dancesKey, (data) => {
        if (loadingMessage) loadingMessage.style.display = 'none';

        if (data) {
            try {
                dances = JSON.parse(data);
                displayDances(dances);
            } catch (error) {
                console.error('Error parsing dances data:', error);
                dancesList.innerHTML = '<p style="text-align: center; color: #888;">暂无数据</p>';
            }
        } else {
            dances = [];
            dancesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享舞蹈，快来做第一个吧！</p>';
        }
    });
}

function displayDances(dancesArray) {
    const dancesList = document.getElementById('dancesList');
    if (!dancesArray || dancesArray.length === 0) {
        dancesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享舞蹈，快来做第一个吧！</p>';
        return;
    }

    const sorted = [...dancesArray].sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return b.timestamp - a.timestamp;
    });

    dancesList.innerHTML = '';
    sorted.forEach(d => {
        const card = createDanceCard(d);
        dancesList.appendChild(card);
    });
}

function createDanceCard(dance) {
    const card = document.createElement('div');
    card.className = 'dish-card';

    // Thumbnail removed per request

    const title = document.createElement('h3');
    title.textContent = dance.name;
    card.appendChild(title);

    const videoLink = document.createElement('a');
    videoLink.href = dance.videoLink;
    videoLink.target = '_blank';
    videoLink.className = 'video-link';
    videoLink.textContent = '观看视频 →';
    card.appendChild(videoLink);

    if (dance.description) {
        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = dance.description;
        card.appendChild(description);
    }

    if (dance.votes !== undefined && dance.votes > 0) {
        const votes = document.createElement('div');
        votes.className = 'votes';
        votes.textContent = `❤️ ${dance.votes} 票`;
        card.appendChild(votes);
    }

    return card;
}

function getDancesForVoting() {
    return dances.filter(d => d.name && d.name.trim());
}

if (typeof window !== 'undefined') {
    window.getDancesForVoting = getDancesForVoting;
    window.extractUrl = extractUrl;
}
