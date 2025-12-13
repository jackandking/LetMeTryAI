/**
 * Love Earning Money Application
 * Allows users to share earning tips and Kuaishou video links
 */

/**
 * Configuration
 */
const earningConfig = {
    tipsKey: "elder-love-earning-tips",
    votingKey: "elder-love-earning-votes"
};

/**
 * Application state
 */
let tips = [];

/**
 * Initialize the page
 */
function initializePage() {
    setupFormSubmission();
    loadTips();
}

/**
 * Extract URL from pasted content
 * Handles cases where users paste full text with URL embedded
 */
function extractUrl(text) {
    if (!text) return '';
    
    // Try to extract URL using regex
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const matches = text.match(urlPattern);
    
    if (matches && matches.length > 0) {
        // Return the first URL found, removing any trailing punctuation
        return matches[0].replace(/[.,;:!?]+$/, '');
    }
    
    // If no URL found, return the original text (it might already be just a URL)
    return text.trim();
}

/**
 * Setup form submission handler
 */
function setupFormSubmission() {
    const form = document.getElementById('uploadForm');
    const videoLinkInput = document.getElementById('videoLink');
    
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }
    
    // Add event listener to video link input to auto-extract URL
    if (videoLinkInput) {
        videoLinkInput.addEventListener('blur', function() {
            const extractedUrl = extractUrl(this.value);
            if (extractedUrl !== this.value) {
                this.value = extractedUrl;
            }
        });
    }
}

/**
 * Handle form submission
 */
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const tipName = document.getElementById('tipName').value.trim();
    let videoLink = document.getElementById('videoLink').value.trim();
    const description = document.getElementById('description').value.trim();
    
    // Extract URL from the pasted content
    videoLink = extractUrl(videoLink);
    
    if (!tipName || !videoLink) {
        alert('请填写技巧名称和视频链接！');
        return;
    }
    
    // Create tip object with unique ID
    const tip = {
        id: `tip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: tipName,
        videoLink: videoLink,
        description: description,
        timestamp: Date.now(),
        votes: 0
    };
    
    // Add to tips array
    tips.push(tip);
    
    // Save to storage
    try {
        await saveTips();
        alert('提交成功！感谢您的分享！');
        
        // Clear form
        document.getElementById('uploadForm').reset();
        
        // Reload tips
        loadTips();
    } catch (error) {
        console.error('Error saving tip:', error);
        alert('提交失败，请稍后重试！');
    }
}

/**
 * Save tips to storage
 */
async function saveTips() {
    const tipsData = JSON.stringify(tips);
    return new Promise((resolve, reject) => {
        updateKeyValueStore(earningConfig.tipsKey, tipsData)
            .then(() => {
                console.log('Tips saved successfully');
                resolve();
            })
            .catch((error) => {
                console.error('Error saving tips:', error);
                reject(error);
            });
    });
}

/**
 * Load tips from storage
 */
function loadTips() {
    const loadingMessage = document.getElementById('loadingMessage');
    const tipsList = document.getElementById('tipsList');
    
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }
    
    readKeyValueStore(earningConfig.tipsKey, (data) => {
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        if (data) {
            try {
                tips = JSON.parse(data);
                displayTips(tips);
            } catch (error) {
                console.error('Error parsing tips data:', error);
                tipsList.innerHTML = '<p style="text-align: center; color: #888;">暂无数据</p>';
            }
        } else {
            // Initialize with empty array
            tips = [];
            tipsList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享技巧，快来做第一个吧！</p>';
        }
    });
}

/**
 * Display tips
 */
function displayTips(tipsArray) {
    const tipsList = document.getElementById('tipsList');
    
    if (!tipsArray || tipsArray.length === 0) {
        tipsList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享技巧，快来做第一个吧！</p>';
        return;
    }
    
    // Sort by votes and timestamp
    const sortedTips = [...tipsArray].sort((a, b) => {
        if (b.votes !== a.votes) {
            return b.votes - a.votes;
        }
        return b.timestamp - a.timestamp;
    });
    
    tipsList.innerHTML = '';
    
    sortedTips.forEach(tip => {
        const tipCard = createTipCard(tip);
        tipsList.appendChild(tipCard);
    });
}

/**
 * Create a tip card element
 */
function createTipCard(tip) {
    const card = document.createElement('div');
    card.className = 'tip-card';
    
    const title = document.createElement('h3');
    title.textContent = tip.name;
    card.appendChild(title);
    
    const videoLink = document.createElement('a');
    videoLink.href = tip.videoLink;
    videoLink.target = '_blank';
    videoLink.className = 'video-link';
    videoLink.textContent = '观看视频 →';
    card.appendChild(videoLink);
    
    if (tip.description) {
        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = tip.description;
        card.appendChild(description);
    }
    
    if (tip.votes !== undefined && tip.votes > 0) {
        const votes = document.createElement('div');
        votes.className = 'votes';
        votes.textContent = `❤️ ${tip.votes} 票`;
        card.appendChild(votes);
    }
    
    return card;
}

/**
 * Get tips for voting
 * Utility function that can be called by voting page if needed in future
 * Currently the voting page reads directly from storage for data consistency
 */
function getTipsForVoting() {
    return tips.filter(tip => tip.name && tip.name.trim());
}

// Export for potential use by voting page
if (typeof window !== 'undefined') {
    window.getTipsForVoting = getTipsForVoting;
    window.extractUrl = extractUrl;
}
