/**
 * Main Application JavaScript
 * Handles image loading with fallbacks and responsive behavior for the home page
 */

/**
 * Sets an image source with fallback to local version
 * @param {string} imageId - The ID of the image element
 * @param {string} primaryUrl - The primary URL to try first
 * @param {string} fallbackUrl - The fallback URL if primary fails
 */
function setImageWithFallback(imageId, primaryUrl, fallbackUrl) {
    const img = document.getElementById(imageId);
    
    if (!img) {
        console.warn(`Image element with ID '${imageId}' not found`);
        return;
    }

    // Create a new image to test loading
    const testImg = new Image();
    
    testImg.onload = function() {
        // Primary URL loaded successfully
        img.src = primaryUrl;
        img.alt = img.alt || 'Loaded image';
        console.log(`Successfully loaded primary image for ${imageId}`);
    };
    
    testImg.onerror = function() {
        // Primary URL failed, use fallback
        console.warn(`Primary URL failed for ${imageId}, using fallback: ${fallbackUrl}`);
        img.src = fallbackUrl;
        img.alt = img.alt || 'Fallback image';
        
        // Add error handling for fallback too
        img.onerror = function() {
            console.error(`Both primary and fallback URLs failed for ${imageId}`);
            // Could set a placeholder or default image here
        };
    };
    
    // Start loading the test image
    testImg.src = primaryUrl;
}

/**
 * Image configuration data
 * Contains all image mappings for easy maintenance
 */
const imageConfig = {
    'fireworks-img': {
        primary: 'https://eb118-file.cdn.bcebos.com/assistant/20250221/cee18cdc3ec141d99ac77096b422300e_16507586794?x-bce-process=style/i_e',
        fallback: 'images/game1.jpg',
        alt: '爱烟花'
    },
    'beauty-img': {
        primary: 'https://eb118-file.cdn.bcebos.com/upload/0a8055acdbaf4d87b87e04b2e60f632c_1100025253.png',
        fallback: 'images/1621725673908_.pic.jpg',
        alt: '美女图片'
    },
    'magic-img': {
        primary: 'https://eb118-file.cdn.bcebos.com/upload/5bb92b7e5fe840bcb80be62b17458453_1100027031.png',
        fallback: 'images/game2.png',
        alt: '魔法游戏'
    },
    'study-img': {
        primary: 'https://eb118-file.cdn.bcebos.com/upload/5813a87a74374d8eb3625a40d5b25f3b_2056945912.png',
        fallback: 'images/sample1.png',
        alt: '学习内容'
    },
    'zuowen-img': {
        primary: 'https://eb118-file.cdn.bcebos.com/upload/zuowen-default.png',
        fallback: 'images/game1.jpg',
        alt: '语文作文过关'
    },
    'parent-love-img': {
        primary: 'https://eb118-file.cdn.bcebos.com/upload/parent-love-default.png',
        fallback: 'images/1621725673908_.pic.jpg',
        alt: '家长爱'
    },
    'elder-love-img': {
        primary: 'https://eb118-file.cdn.bcebos.com/upload/elder-love-default.png',
        fallback: 'images/1621725673908_.pic.jpg',
        alt: '老人爱'
    }
};

/**
 * Initializes all images using the configuration
 */
function initializeImages() {
    try {
        Object.entries(imageConfig).forEach(([imageId, config]) => {
            setImageWithFallback(imageId, config.primary, config.fallback);
            
            // Set alt text if available
            const img = document.getElementById(imageId);
            if (img && config.alt) {
                img.alt = config.alt;
            }
        });
        
        console.log('Image initialization completed');
    } catch (error) {
        console.error('Error initializing images:', error);
    }
}

/**
 * Application initialization
 */
function initializeApp() {
    console.log('Initializing main application');
    
    try {
        // Initialize images with fallbacks
        initializeImages();
        
        // Any other initialization code can go here
        console.log('Main application initialized successfully');
    } catch (error) {
        console.error('Error initializing main application:', error);
    }
}

/**
 * Initialize when DOM is loaded
 */
document.addEventListener('DOMContentLoaded', initializeApp);