/**
 * Scams Awareness Application
 * Allows users to share scam cases and video links
 */

/**
 * Configuration
 */
const scamsConfig = {
    scamsKey: "elder-love-scams",
    votingKey: "elder-love-scams-votes"
};

/**
 * Application state
 */
let scams = [];

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
 * Initialize the page
 */
function initializePage() {
    setupFormSubmission();
    loadScams();
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
    
    const scamName = document.getElementById('scamName').value.trim();
    let videoLink = document.getElementById('videoLink').value.trim();
    const description = document.getElementById('description').value.trim();
    
    // Extract URL from the pasted content
    videoLink = extractUrl(videoLink);
    
    if (!scamName || !videoLink) {
        alert('请填写骗局名称和视频链接！');
        return;
    }
    
    // Create scam object with unique ID
    const scam = {
        id: `scam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: scamName,
        videoLink: videoLink,
        description: description,
        timestamp: Date.now(),
        votes: 0
    };
    
    // Add to scams array
    scams.push(scam);
    
    // Save to storage
    try {
        await saveScams();
        alert('提交成功！感谢您的分享！');
        
        // Clear form
        document.getElementById('uploadForm').reset();
        
        // Reload scams
        loadScams();
    } catch (error) {
        console.error('Error saving scam:', error);
        alert('提交失败，请稍后重试！');
    }
}

/**
 * Save scams to storage
 */
async function saveScams() {
    const scamsData = JSON.stringify(scams);
    return new Promise((resolve, reject) => {
        updateKeyValueStore(scamsConfig.scamsKey, scamsData)
            .then(() => {
                console.log('Scams saved successfully');
                resolve();
            })
            .catch((error) => {
                console.error('Error saving scams:', error);
                reject(error);
            });
    });
}

/**
 * Load scams from storage
 */
function loadScams() {
    const loadingMessage = document.getElementById('loadingMessage');
    const scamsList = document.getElementById('scamsList');
    
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }
    
    readKeyValueStore(scamsConfig.scamsKey, (data) => {
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        
        if (data) {
            try {
                scams = JSON.parse(data);
                displayScams(scams);
            } catch (error) {
                console.error('Error parsing scams data:', error);
                scamsList.innerHTML = '<p style="text-align: center; color: #888;">暂无数据</p>';
            }
        } else {
            // Initialize with empty array
            scams = [];
            scamsList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享骗局案例，快来做第一个吧！</p>';
        }
    });
}

/**
 * Display scams
 */
function displayScams(scamsArray) {
    const scamsList = document.getElementById('scamsList');
    
    if (!scamsArray || scamsArray.length === 0) {
        scamsList.innerHTML = '<p style="text-align: center; color: #888;">还没有人分享骗局案例，快来做第一个吧！</p>';
        return;
    }
    
    // Sort by votes and timestamp
    const sortedScams = [...scamsArray].sort((a, b) => {
        if (b.votes !== a.votes) {
            return b.votes - a.votes;
        }
        return b.timestamp - a.timestamp;
    });
    
    scamsList.innerHTML = '';
    
    sortedScams.forEach(scam => {
        const scamCard = createScamCard(scam);
        scamsList.appendChild(scamCard);
    });
}

/**
 * Create a scam card element
 */
function createScamCard(scam) {
    const card = document.createElement('div');
    card.className = 'scam-card';
    
    const title = document.createElement('h3');
    title.textContent = scam.name;
    card.appendChild(title);
    
    const videoLink = document.createElement('a');
    videoLink.href = scam.videoLink;
    videoLink.target = '_blank';
    videoLink.className = 'video-link';
    videoLink.textContent = '观看案例视频 →';
    card.appendChild(videoLink);
    
    if (scam.description) {
        const description = document.createElement('p');
        description.className = 'description';
        description.textContent = scam.description;
        card.appendChild(description);
    }
    
    if (scam.votes !== undefined && scam.votes > 0) {
        const votes = document.createElement('div');
        votes.className = 'votes';
        votes.textContent = `⚠️ ${scam.votes} 票`;
        card.appendChild(votes);
    }
    
    return card;
}

/**
 * Get scams for voting
 * Utility function that can be called by voting page if needed in future
 * Currently the voting page reads directly from storage for data consistency
 */
function getScamsForVoting() {
    return scams.filter(scam => scam.name && scam.name.trim());
}

// Export for potential use by voting page
if (typeof window !== 'undefined') {
    window.getScamsForVoting = getScamsForVoting;
    window.extractUrl = extractUrl;
}
