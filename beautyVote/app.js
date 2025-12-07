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
        loadImagesAndSetupVoting();
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
    img.src = imageData.url;
    img.alt = `候选人 ${index + 1}`;
    img.onerror = () => {
        console.error(`Failed to load image: ${imageData.url}`);
        img.style.display = 'none';
        wrapper.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#999;">加载失败</div>';
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
        // For web testing, directly navigate to results
        console.warn('Mini-program navigation not available, redirecting to results');
        window.location.href = 'result.html?finishedAd=true';
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
