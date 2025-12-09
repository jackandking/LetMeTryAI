/**
 * Beauty Vote Application
 * Allows users to vote for the most beautiful person from randomly selected masked images
 */

/**
 * Configuration object
 */
const beautyVoteConfig = {
    title: "谁美一点",
    imageListKey: "indexURLs_0.1.0",
    storageKey: "beautyVote.data",
    numberOfImages: 5
};

/**
 * Application state
 */
let allImageUrls = [];
let selectedImages = [];
let selectedImageIndex = null;

/**
 * Initializes the application
 */
function initializeApp() {
    try {
        checkUrlParameters();
        handleResultDisplay();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('初始化失败，请刷新页面重试');
    }
}

/**
 * Checks URL parameters for navigation control
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL parameters:', urlParams);

    // Check if ad is finished - navigate back if not
    if (urlParams.get('finishedAd') === 'false') {
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
    }
}

/**
 * Load images from key-value store and setup voting interface
 */
function loadImagesAndSetupVoting() {
    readKeyValueStore(beautyVoteConfig.imageListKey, (data) => {
        if (data) {
            try {
                // Parse image URLs from newline-separated string
                allImageUrls = data.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
                console.log(`Loaded ${allImageUrls.length} images`);
                
                if (allImageUrls.length < beautyVoteConfig.numberOfImages) {
                    showError(`图片数量不足，至少需要${beautyVoteConfig.numberOfImages}张图片`);
                    return;
                }

                // Select random images and display them
                selectedImages = getRandomImages(allImageUrls, beautyVoteConfig.numberOfImages);
                displayImages(selectedImages);
                
                // Hide loading message and show voting section
                document.getElementById('loadingMessage').style.display = 'none';
                document.getElementById('votingSection').style.display = 'block';
            } catch (error) {
                console.error('Error processing images:', error);
                showError('加载图片失败，请刷新页面重试');
            }
        } else {
            showError('无法加载图片数据，请稍后重试');
        }
    });
}

/**
 * Get random images from the image list
 * @param {Array<string>} imageList - List of image URLs
 * @param {number} count - Number of images to select
 * @returns {Array<Object>} Array of selected image objects with URL and mask position
 */
function getRandomImages(imageList, count) {
    // Create a copy to avoid modifying original
    const shuffled = [...imageList].sort(() => Math.random() - 0.5);
    
    // Take first 'count' images and add random mask position
    return shuffled.slice(0, count).map(url => ({
        url: url,
        maskPosition: Math.random() < 0.5 ? 'top' : 'bottom'
    }));
}

/**
 * Display images in the gallery
 * @param {Array<Object>} images - Array of image objects
 */
function displayImages(images) {
    const gallery = document.getElementById('imageGallery');
    gallery.innerHTML = '';

    images.forEach((imageData, index) => {
        const container = createImageContainer(imageData, index);
        gallery.appendChild(container);
    });
}

/**
 * Normalize image URL to fix common loading issues
 * @param {string} url - Original image URL
 * @returns {string} Normalized URL
 */
function normalizeImageUrl(url) {
    if (!url) return url;
    
    // Remove trailing question marks that can cause loading issues
    let normalized = url.replace(/\?+$/, '');
    
    // Upgrade HTTP to HTTPS for better webview compatibility
    if (normalized.startsWith('http://')) {
        normalized = normalized.replace('http://', 'https://');
    }
    
    return normalized;
}

/**
 * Create an image container with masking
 * @param {Object} imageData - Image data object with url and maskPosition
 * @param {number} index - Index of the image
 * @returns {HTMLElement} Image container element
 */
function createImageContainer(imageData, index) {
    const container = document.createElement('div');
    container.className = 'image-container';
    container.onclick = () => selectImage(index);

    const wrapper = document.createElement('div');
    wrapper.className = 'masked-image-wrapper';

    const img = document.createElement('img');
    img.className = 'masked-image';
    
    // Normalize URL before setting
    const normalizedUrl = normalizeImageUrl(imageData.url);
    img.src = normalizedUrl;
    img.alt = `候选人 ${index + 1}`;
    
    let retryCount = 0;
    const maxRetries = 2;
    
    img.onerror = () => {
        console.error(`Failed to load image (attempt ${retryCount + 1}): ${img.src}`);
        
        // Try retry with delay for network issues
        if (retryCount < maxRetries) {
            retryCount++;
            const retryDelay = retryCount * 1000; // 1s, 2s delays
            
            setTimeout(() => {
                console.log(`Retrying image load (attempt ${retryCount + 1}): ${normalizedUrl}`);
                // Force reload by adding timestamp
                img.src = normalizedUrl + (normalizedUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
            }, retryDelay);
        } else {
            // All retries failed, show error placeholder
            img.style.display = 'none';
            wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">加载失败</div>';
        }
    };

    const mask = document.createElement('div');
    mask.className = `mask-overlay ${imageData.maskPosition}`;

    wrapper.appendChild(img);
    wrapper.appendChild(mask);
    container.appendChild(wrapper);

    return container;
}

/**
 * Handle image selection
 * @param {number} index - Index of selected image
 */
function selectImage(index) {
    // Remove previous selection
    const containers = document.querySelectorAll('.image-container');
    containers.forEach(c => c.classList.remove('selected'));

    // Mark new selection
    containers[index].classList.add('selected');
    selectedImageIndex = index;

    // Record the vote
    recordVote(selectedImages[index].url);

    // Show result button
    const showResultBtn = document.getElementById('showResultBtn');
    if (showResultBtn) {
        showResultBtn.style.display = 'block';
    }
}

/**
 * Record a vote for the selected image
 * @param {string} imageUrl - URL of the selected image
 */
function recordVote(imageUrl) {
    getConfig(beautyVoteConfig.storageKey, (data) => {
        try {
            let voteData = {};
            
            // Load existing vote data
            if (data !== null && typeof data === 'object') {
                voteData = { ...data };
            }
            
            // Increment vote for selected image
            voteData[imageUrl] = (voteData[imageUrl] || 0) + 1;

            // Save updated voting results
            updateConfig(beautyVoteConfig.storageKey, voteData);
            
            console.log('Vote recorded for:', imageUrl);
            console.log('Current vote data:', voteData);
        } catch (error) {
            console.error('Error recording vote:', error);
        }
    });
}

/**
 * Wrapper for getConfig that uses readKeyValueStore
 * @param {string} key - Storage key
 * @param {Function} callback - Callback function
 */
function getConfig(key, callback) {
    readKeyValueStore(key, (value) => {
        if (value) {
            try {
                const parsedValue = JSON.parse(value);
                callback(parsedValue);
            } catch (e) {
                console.error('Error parsing config:', e);
                callback(null);
            }
        } else {
            callback(null);
        }
    });
}

/**
 * Wrapper for updateConfig that uses updateKeyValueStore
 * @param {string} key - Storage key
 * @param {Object} value - Value to store
 */
function updateConfig(key, value) {
    const jsonValue = JSON.stringify(value);
    updateKeyValueStore(key, jsonValue)
        .then(() => {
            console.log('Config updated successfully');
        })
        .catch((error) => {
            console.error('Error updating config:', error);
        });
}

/**
 * Show error message to user
 * @param {string} message - Error message
 */
function showError(message) {
    const loadingMessage = document.getElementById('loadingMessage');
    if (loadingMessage) {
        loadingMessage.textContent = message;
        loadingMessage.style.color = 'red';
    }
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Navigation Functions - Mini-program specific
 */

/**
 * Shows advertisement before displaying results
 */
function showAd() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=beautyVote",
        });
    } else {
        // For web testing, reload with finishedAd parameter
        console.warn('Mini-program navigation not available, reloading with finishedAd parameter');
        window.location.href = 'index.html?finishedAd=true';
    }
}

/**
 * Navigates to index page
 */
function jumpToIndex() {
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        ks.navigateTo({
            url: "/pages/index/index",
        });
    } else {
        console.warn('Mini-program navigation not available');
    }
}

/**
 * Results Display Functions
 */

/**
 * Handles URL parameters for result display
 */
function handleResultDisplay() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('finishedAd') !== null) {
        const finishedAd = urlParams.get('finishedAd') === 'true';

        if (finishedAd) {
            // Hide voting section and show results
            const loadingMessage = document.getElementById('loadingMessage');
            const votingSection = document.getElementById('votingSection');
            const resultsContainer = document.getElementById('resultsContainer');
            
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (votingSection) votingSection.style.display = 'none';
            if (resultsContainer) resultsContainer.style.display = 'block';
            
            // Load and display results
            loadAndDisplayResults();
        } else {
            // Show voting interface
            loadImagesAndSetupVoting();
        }
    } else {
        // Default: show voting interface
        loadImagesAndSetupVoting();
    }
}

/**
 * Load and display voting results
 */
function loadAndDisplayResults() {
    getConfig(beautyVoteConfig.storageKey, (voteData) => {
        if (voteData && Object.keys(voteData).length > 0) {
            displayResults(voteData);
        } else {
            const resultsContainer = document.getElementById('resultsContainer');
            if (resultsContainer) {
                resultsContainer.innerHTML = '<p style="text-align: center; padding: 40px; font-size: 18px; color: #666;">暂无投票数据</p>';
            }
        }
    });
}

/**
 * Display voting results
 * @param {Object} voteData - Object with image URLs as keys and vote counts as values
 */
function displayResults(voteData) {
    // Convert to array and sort by votes
    const sortedResults = Object.entries(voteData)
        .map(([url, votes]) => ({ url, votes }))
        .sort((a, b) => b.votes - a.votes);

    if (sortedResults.length === 0) {
        return;
    }

    // Display winner
    const winner = sortedResults[0];
    displayWinner(winner);

    // Display all results
    displayAllResults(sortedResults);

    // Calculate and display total votes
    const totalVotes = sortedResults.reduce((sum, item) => sum + item.votes, 0);
    const totalVotesElement = document.getElementById('totalVotes');
    const timestampElement = document.getElementById('timestamp');
    
    if (totalVotesElement) {
        totalVotesElement.textContent = `总投票数: ${totalVotes}`;
    }
    if (timestampElement) {
        timestampElement.textContent = `统计时间: ${new Date().toLocaleString()}`;
    }
}

/**
 * Display the winner
 * @param {Object} winner - Winner object with url and votes
 */
function displayWinner(winner) {
    const winnerSection = document.getElementById('winnerSection');
    const winnerImage = document.getElementById('winnerImage');
    const winnerVotes = document.getElementById('winnerVotes');

    if (winnerImage) {
        const normalizedUrl = normalizeImageUrl(winner.url);
        winnerImage.src = normalizedUrl;
        
        let retryCount = 0;
        winnerImage.onerror = () => {
            if (retryCount < 2) {
                retryCount++;
                setTimeout(() => {
                    winnerImage.src = normalizedUrl + (normalizedUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
                }, retryCount * 1000);
            } else {
                winnerImage.style.display = 'none';
            }
        };
    }
    if (winnerVotes) {
        winnerVotes.textContent = `获得 ${winner.votes} 票`;
    }
    if (winnerSection) {
        winnerSection.style.display = 'block';
    }
}

/**
 * Display all results with ranking
 * @param {Array} sortedResults - Sorted array of result objects
 */
function displayAllResults(sortedResults) {
    const resultsSection = document.getElementById('resultsSection');
    const resultsList = document.getElementById('resultsList');
    
    if (!resultsList) {
        return;
    }

    // Find max votes for calculating bar width
    const maxVotes = sortedResults[0].votes;

    resultsList.innerHTML = '';
    sortedResults.forEach((result, index) => {
        const resultItem = createResultItem(result, index + 1, maxVotes);
        resultsList.appendChild(resultItem);
    });

    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
}

/**
 * Create a result item element
 * @param {Object} result - Result object with url and votes
 * @param {number} rank - Rank of this result
 * @param {number} maxVotes - Maximum votes for percentage calculation
 * @returns {HTMLElement} Result item element
 */
function createResultItem(result, rank, maxVotes) {
    const item = document.createElement('div');
    item.className = 'result-item';

    const img = document.createElement('img');
    img.className = 'result-image';
    const normalizedUrl = normalizeImageUrl(result.url);
    img.src = normalizedUrl;
    img.alt = `排名 ${rank}`;
    
    let retryCount = 0;
    img.onerror = () => {
        if (retryCount < 2) {
            retryCount++;
            setTimeout(() => {
                img.src = normalizedUrl + (normalizedUrl.includes('?') ? '&' : '?') + 't=' + Date.now();
            }, retryCount * 1000);
        } else {
            img.style.display = 'none';
        }
    };

    const info = document.createElement('div');
    info.className = 'result-info';

    const rankSpan = document.createElement('span');
    rankSpan.className = 'result-rank';
    rankSpan.textContent = `#${rank}`;

    const votesSpan = document.createElement('span');
    votesSpan.className = 'result-votes';
    votesSpan.textContent = `${result.votes} 票`;

    const barContainer = document.createElement('div');
    barContainer.style.backgroundColor = '#e0e0e0';
    barContainer.style.borderRadius = '10px';
    barContainer.style.height = '20px';
    barContainer.style.marginTop = '10px';

    const bar = document.createElement('div');
    bar.className = 'vote-bar';
    const percentage = maxVotes > 0 ? (result.votes / maxVotes) * 100 : 0;
    bar.style.width = `${percentage}%`;

    barContainer.appendChild(bar);

    info.appendChild(rankSpan);
    info.appendChild(votesSpan);
    info.appendChild(barContainer);

    item.appendChild(img);
    item.appendChild(info);

    return item;
}

/**
 * Retry voting - reload page without parameters
 */
function retryVote() {
    window.location.href = 'index.html';
}
