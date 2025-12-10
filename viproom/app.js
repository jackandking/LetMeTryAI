/**
 * VIP Room Application
 * Displays gallery of images with videos, tracks click counts, and shows ads before video playback
 */

/**
 * Configuration object
 */
const CONFIG_KEY = 'viproom.conf';
const CLICKS_KEY = 'viproom.clicks';
const PENDING_VIDEO_KEY = 'viproom.pendingVideo';

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
    console.log('URL parameters:', urlParams);

    // Check if ad is finished - play video if true
    if (urlParams.get('finishedAd') === 'true') {
        // Retrieve the stored video URL from localStorage
        const storedVideoUrl = localStorage.getItem(PENDING_VIDEO_KEY);
        if (storedVideoUrl) {
            // Clear the stored video URL
            localStorage.removeItem(PENDING_VIDEO_KEY);
            // Play the video
            playVideo(storedVideoUrl);
        }
    } else if (urlParams.get('finishedAd') === 'false') {
        // Ad was not completed, navigate back if possible
        // Clear any pending video
        localStorage.removeItem(PENDING_VIDEO_KEY);
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
    
    // Update galleryItems array and clickData with new indices
    const newClickData = {};
    galleryItems = itemsWithIndices.map((entry, newIndex) => {
        newClickData[newIndex] = entry.clicks;
        return entry.item;
    });
    clickData = newClickData;
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
    galleryItems.forEach((item, originalIndex) => {
        const card = createImageCard(item, originalIndex);
        galleryContainer.appendChild(card);
    });
}

/**
 * Creates an image card element
 * @param {Object} item - Gallery item with imgUrl and videoUrl
 * @param {number} index - Item index
 * @returns {HTMLElement} Image card element
 */
function createImageCard(item, index) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.style.setProperty('--card-index', index);
    
    // Create image
    const img = document.createElement('img');
    img.src = item.imgUrl;
    img.alt = `美女图片 ${index + 1}`;
    img.onerror = function() {
        this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23ddd" width="300" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3E图片加载失败%3C/text%3E%3C/svg%3E';
    };
    
    // Create info section
    const info = document.createElement('div');
    info.className = 'image-info';
    
    const clickCount = document.createElement('div');
    clickCount.className = 'click-count';
    clickCount.innerHTML = `点击量: <span class="count">${clickData[index] || 0}</span>`;
    
    info.appendChild(clickCount);
    
    // Add click handler
    card.onclick = () => handleImageClick(item, index);
    
    card.appendChild(img);
    card.appendChild(info);
    
    return card;
}

/**
 * Handles image click event
 * @param {Object} item - Gallery item
 * @param {number} index - Item index
 */
function handleImageClick(item, index) {
    console.log('Image clicked:', index, item);
    
    // Increment click count
    clickData[index] = (clickData[index] || 0) + 1;
    
    // Save updated click data
    updateConfig(CLICKS_KEY, clickData);
    
    // Show ad before playing the clicked photo's corresponding video
    showAdBeforeVideo(item.videoUrl);
}

/**
 * Shows advertisement before playing video
 * @param {string} videoUrl - URL of the video to play after ad
 */
function showAdBeforeVideo(videoUrl) {
    console.log('Showing ad before video:', videoUrl);
    
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        // Store the video URL in localStorage to retrieve after ad completes
        localStorage.setItem(PENDING_VIDEO_KEY, videoUrl);
        
        // Navigate to ad page
        ks.navigateTo({
            url: `/pages/showRewardedVideoAd/showRewardedVideoAd?result_page_id=viproom`,
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
    console.log('Playing video:', videoUrl);
    
    if (typeof ks !== 'undefined' && ks.navigateTo) {
        // Navigate to video page or open video
        // In mini-program environment, this might open external browser or video player
        ks.navigateTo({
            url: `/pages/video/video?url=${encodeURIComponent(videoUrl)}`,
        });
    } else {
        // Fallback: open video URL in new window/tab
        window.open(videoUrl, '_blank');
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
