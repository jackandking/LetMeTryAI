/**
 * URL Validator for WomanAI
 * Validates image URLs and checks if they are from allowed domains
 */

/**
 * List of allowed image hosting domains
 */
const ALLOWED_DOMAINS = [
    'eb118-file.cdn.bcebos.com',
    '.myqcloud.com',
    '.byteimg.com',
    'letmetry.cloud',
    '.qpic.cn',
    'xiaohongshu.com',
    'zhihu.com',
    'cdninstagram.com',
    'sinaimg.cn',
    'unsplash.com',
    'pexels.com'
];

/**
 * Check if a URL is from an allowed domain
 * @param {string} url - The URL to check
 * @returns {boolean} - True if domain is allowed
 */
function isAllowedDomain(url) {
    try {
        const urlObj = new URL(url);
        const hostname = urlObj.hostname.toLowerCase();
        
        return ALLOWED_DOMAINS.some(domain => {
            if (domain.startsWith('.')) {
                // For wildcard domains like .myqcloud.com
                return hostname.endsWith(domain.slice(1)) || hostname === domain.slice(1);
            }
            // For exact domain match or subdomain match
            return hostname === domain || hostname.endsWith('.' + domain);
        });
    } catch (error) {
        console.error('Invalid URL:', error);
        return false;
    }
}

/**
 * Validate if a string is a valid HTTP/HTTPS URL
 * @param {string} url - The URL to validate
 * @returns {boolean} - True if valid URL
 */
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }
    
    try {
        const urlObj = new URL(url);
        return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
        return false;
    }
}

/**
 * Get domain from URL
 * @param {string} url - The URL
 * @returns {string} - The domain or empty string
 */
function getDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch {
        return '';
    }
}

// Export for Node.js testing environment
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ALLOWED_DOMAINS,
        isAllowedDomain,
        isValidImageUrl,
        getDomain
    };
}
