/**
 * VIP Room Application
 * Displays gallery of images with videos, tracks click counts, and shows ads before video playback
 */

/**
 * Configuration object
 */
const CONFIG_KEY = 'viproom.conf';
const CLICKS_KEY = 'viproom.clicks';

/**
 * Application state
 */
let galleryItems = [];
let clickData = {};

/**
 * Initializes the application
 */
function initializeApp() {
    try {
        checkUrlParameters();
        loadConfiguration();
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('初始化失败，请刷新页面重试');
    }
}

/**
 * Checks URL parameters for video playback after ad
 */
function checkUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    console.log('URL parameters:', urlParams.toString());

    // Check if ad is finished - play video if true
    if (urlParams.get('finishedAd') === 'true') {
        const videoUrl = urlParams.get('videoUrl');
        console.log('Ad finished, video URL:', videoUrl);
        if (videoUrl) {
            const decodedUrl = decodeURIComponent(videoUrl);
            console.log('Playing video after ad:', decodedUrl);
            playVideo(decodedUrl);
        } else {
            console.error('Ad finished but no video URL provided in parameters');
        }
    } else if (urlParams.get('finishedAd') === 'false') {
        // Ad was not completed, navigate back if possible
        console.log('Ad was cancelled, navigating back');
        if (typeof ks !== 'undefined' && ks.navigateBack) {
            ks.navigateBack();
        }
    }
}

/**
 * Loads configuration from kvstore
 */
function loadConfiguration() {
    console.log('Loading configuration from kvstore...');
    
    getConfig(CONFIG_KEY, (config) => {
        if (!config || !Array.isArray(config)) {
            console.error('Invalid configuration data:', config);
            showError('配置加载失败，请联系管理员');
            return;
        }

        galleryItems = config;
        console.log('Configuration loaded:', galleryItems);
        
        // Load click data
        loadClickData();
    });
}

/**
 * Loads click tracking data from kvstore
 */
function loadClickData() {
    getConfig(CLICKS_KEY, (data) => {
        if (data && typeof data === 'object') {
            clickData = data;
            console.log('Click data loaded:', clickData);
        } else {
            // Initialize click data for all items
            clickData = {};
            galleryItems.forEach((item, index) => {
                clickData[index] = 0;
            });
        }
        
        // Sort items by click count (highest first)
        sortGalleryByClicks();
        
        // Display the gallery
        displayGallery();
    });
}

/**
 * Sorts gallery items by click count in descending order
 */
function sortGalleryByClicks() {
    // Create array with items and their original indices
    const itemsWithIndices = galleryItems.map((item, index) => ({
        item,
        originalIndex: index,
        clicks: clickData[index] || 0
    }));
    
    // Sort by click count (descending)
    itemsWithIndices.sort((a, b) => b.clicks - a.clicks);
    
    // Create sorted gallery items array, preserving original indices
    galleryItems = itemsWithIndices.map(entry => {
        // Attach the original index to the item for tracking
        return {
            ...entry.item,
            _originalIndex: entry.originalIndex
        };
    });
    
    // Do NOT remap clickData - keep it tied to original indices
    // clickData remains indexed by original configuration position
}

/**
 * Displays the image gallery
 */
function displayGallery() {
    const loadingContainer = document.getElementById('loadingContainer');
    const galleryContainer = document.getElementById('galleryContainer');
    
    if (!galleryContainer) {
        console.error('Gallery container not found');
        return;
    }

    // Hide loading, show gallery
    if (loadingContainer) {
        loadingContainer.style.display = 'none';
    }
    galleryContainer.style.display = 'grid';
    
    // Clear existing content
    galleryContainer.innerHTML = '';
    
    // Create image cards
    galleryItems.forEach((item, currentIndex) => {
        const card = createImageCard(item, currentIndex);
        galleryContainer.appendChild(card);
    });
}

/**
 * Creates an image card element
 * @param {Object} item - Gallery item with imgUrl and videoUrl
 * @param {number} displayIndex - Item display index (sorted position)
 * @returns {HTMLElement} Image card element
 */
function createImageCard(item, displayIndex) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.style.setProperty('--card-index', displayIndex);
    
    // Get the original index for click tracking
    // If _originalIndex is not set, items are in original order (not sorted yet)
    const originalIndex = item._originalIndex !== undefined ? item._originalIndex : displayIndex;
    
    if (item._originalIndex === undefined) {
        console.log('Item missing _originalIndex, using displayIndex:', displayIndex);
    }
    
    // Create image
    const img = document.createElement('img');
    img.src = item.imgUrl;
    img.alt = `美女图片 ${displayIndex + 1}`;
    img.onerror = function() {
        this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ddd" width="300" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E图片加载失败%3C/text%3E%3C/svg%3E';
    };
    
    // Create info section
    const info = document.createElement('div');
    info.className = 'image-info';
    
    const clickCount = document.createElement('div');
    clickCount.className = 'click-count';
    // Use originalIndex to get the correct click count
    clickCount.innerHTML = `点击量: <span class="count">${clickData[originalIndex] || 0}</span>`;
    
    info.appendChild(clickCount);
    
    // Add click handler - pass both item and originalIndex
    card.onclick = () => handleImageClick(item, originalIndex);
    
    card.appendChild(img);
    card.appendChild(info);
    
    return card;
}

/**
 * Handles image click event
 * @param {Object} item - Gallery item
 * @param {number} originalIndex - Item's original index in the configuration
 */
function handleImageClick(item, originalIndex) {
    console.log('Image clicked - Original Index:', originalIndex, 'Item:', item);
    console.log('Video URL to be played:', item.videoUrl);
    
    // Validate that item has videoUrl
    if (!item || !item.videoUrl) {
        console.error('Invalid item or missing videoUrl:', item);
        showError('视频信息无效，请刷新页面重试');
        return;
    }
    
    // Increment click count using original index
    clickData[originalIndex] = (clickData[originalIndex] || 0) + 1;
    console.log('Updated click count for original index', originalIndex, ':', clickData[originalIndex]);
    
    // Save updated click data
    updateConfig(CLICKS_KEY, clickData);
    
    // Show ad before playing video
    showAdBeforeVideo(item.videoUrl);
}

/**
 * Shows advertisement before playing video
 * @param {string} videoUrl - URL of the video to play after ad
 */
function showAdBeforeVideo(videoUrl) {
    console.log('Preparing to show ad before video:', videoUrl);
    
    // Validate videoUrl
    if (!videoUrl || typeof videoUrl !== 'string') {
        console.error('Invalid video URL:', videoUrl);
        showError('视频链接无效');
        return;
    }
    
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        // Navigate to ad page with video URL as parameter
        const encodedVideoUrl = encodeURIComponent(videoUrl);
        const adPageUrl = `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom&videoUrl=${encodedVideoUrl}`;
        console.log('Navigating to ad page with URL:', adPageUrl);
        console.log('Encoded video URL:', encodedVideoUrl);
        console.log('Original video URL:', videoUrl);
        
        ks.navigateTo({
            url: adPageUrl,
        });
    } else {
        // Fallback: directly play video if mini-program environment not available
        console.warn('Mini-program navigation not available, playing video directly');
        playVideo(videoUrl);
    }
}

/**
 * Plays the video
 * @param {string} videoUrl - URL of the video to play
 */
function playVideo(videoUrl) {
    console.log('=== PLAYING VIDEO ===');
    console.log('Video URL:', videoUrl);
    
    // Validate videoUrl
    if (!videoUrl || typeof videoUrl !== 'string') {
        console.error('Cannot play video - invalid URL:', videoUrl);
        showError('无法播放视频：链接无效');
        return;
    }
    
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        // Navigate to video page or open video
        // In mini-program environment, this might open external browser or video player
        const encodedUrl = encodeURIComponent(videoUrl);
        console.log('Using mini-program navigation to play video');
        ks.navigateTo({
            url: `/pages/video/video?url=${encodedUrl}`,
        });
    } else {
        // Fallback: open video URL in new window/tab
        console.log('Using fallback: opening video in new window');
        window.open(videoUrl, '_blank');
    }
    console.log('=== END PLAYING VIDEO ===');
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
 * Shows error message
 * @param {string} message - Error message to display
 */
function showError(message) {
    const loadingContainer = document.getElementById('loadingContainer');
    if (loadingContainer) {
        loadingContainer.textContent = message;
        loadingContainer.style.color = '#ff6b6b';
    }
}

/**
 * Initialize the application when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initializeApp);
