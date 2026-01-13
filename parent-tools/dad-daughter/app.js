/**
 * Dad Daughter Application
 * Allows users to share activities and links
 */

/**
 * Configuration
 */
const dadDaughterConfig = {
    activitiesKey: "parent-tools-dad-daughter-activities",
    votingKey: "parent-tools-dad-daughter-votes"
};

/**
 * Application state
 */
let activities = [];

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
    loadActivities();
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

    const activityName = document.getElementById('activityName').value.trim();
    let videoLink = document.getElementById('videoLink').value.trim();
    const description = document.getElementById('description').value.trim();

    videoLink = extractUrl(videoLink);

    if (!activityName || !videoLink) {
        alert('请填写活动标题和视频/文章链接！');
        return;
    }

    const activity = {
        id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: activityName,
        videoLink: videoLink,
        description: description,
        timestamp: Date.now(),
        votes: 0
    };

    activities.push(activity);

    try {
        await saveActivities();
        alert('提交成功！感谢您的分享！');
        document.getElementById('uploadForm').reset();
        loadActivities();
    } catch (error) {
        console.error('Error saving activity:', error);
        alert('提交失败，请稍后重试！');
    }
}

function saveActivities() {
    const activitiesData = JSON.stringify(activities);
    return new Promise((resolve, reject) => {
        updateKeyValueStore(dadDaughterConfig.activitiesKey, activitiesData)
            .then(() => resolve())
            .catch(err => reject(err));
    });
}

function loadActivities() {
    const loadingMessage = document.getElementById('loadingMessage');
    const activitiesList = document.getElementById('activitiesList');

    if (loadingMessage) loadingMessage.style.display = 'block';

    readKeyValueStore(dadDaughterConfig.activitiesKey, (data) => {
        if (loadingMessage) loadingMessage.style.display = 'none';

        if (data) {
            try {
                activities = JSON.parse(data);
                displayActivities(activities);
            } catch (error) {
                console.error('Error parsing activities data:', error);
                activitiesList.innerHTML = '<p style="text-align: center; color: #888;">暂无数据</p>';
            }
        } else {
            activities = [];
            activitiesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享活动，快来做第一个吧！</p>';
        }
    });
}

function displayActivities(activitiesArray) {
    const activitiesList = document.getElementById('activitiesList');
    if (!activitiesArray || activitiesArray.length === 0) {
        activitiesList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享活动，快来做第一个吧！</p>';
        return;
    }

    const sorted = [...activitiesArray].sort((a, b) => {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return b.timestamp - a.timestamp;
    });

    activitiesList.innerHTML = '';
    sorted.forEach(a => {
        const card = createActivityCard(a);
        activitiesList.appendChild(card);
    });
}

function createActivityCard(activity) {
    const card = document.createElement('div');
    card.className = 'dish-card';

    const title = document.createElement('h3');
    title.textContent = activity.name;
    card.appendChild(title);

    const videoLink = document.createElement('a');
    videoLink.href = activity.videoLink;
    videoLink.target = '_blank';
    videoLink.className = 'video-link';
    videoLink.textContent = '查看内容 →';
    card.appendChild(videoLink);

    if (activity.description) {
        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = activity.description;
        card.appendChild(description);
    }

    if (activity.votes !== undefined && activity.votes > 0) {
        const votes = document.createElement('div');
        votes.className = 'votes';
        votes.textContent = `❤️ ${activity.votes} 票`;
        card.appendChild(votes);
    }

    return card;
}

function getActivitiesForVoting() {
    return activities.filter(a => a.name && a.name.trim());
}

if (typeof window !== 'undefined') {
    window.getActivitiesForVoting = getActivitiesForVoting;
    window.extractUrl = extractUrl;
}
