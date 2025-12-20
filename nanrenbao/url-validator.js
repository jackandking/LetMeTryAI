// URL validation utility for beauty image uploads

/**
 * Allowed domains for image uploads
 */
export const ALLOWED_DOMAINS = [
    'eb118-file.cdn.bcebos.com',
    '.myqcloud.com',
    '.byteimg.com',
    'letmetry.cloud',
    '.qpic.cn'
];

/**
 * Validate if a URL is from an allowed domain and uses HTTPS
 * @param {string} url - The URL to validate
 * @returns {object} - { valid: boolean, error?: string }
 */
export function validateImageUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'URL不能为空' };
    }

    try {
        const urlObj = new URL(url);
        
        // Check if it's HTTPS
        if (urlObj.protocol !== 'https:') {
            return { valid: false, error: '仅支持HTTPS链接' };
        }

        // Check if domain is allowed
        const hostname = urlObj.hostname;
        const isAllowed = ALLOWED_DOMAINS.some(domain => {
            if (domain.startsWith('.')) {
                // For wildcard domains like .myqcloud.com
                return hostname.endsWith(domain.slice(1)) || hostname === domain.slice(1);
            }
            // For exact domain match
            return hostname === domain;
        });

        if (!isAllowed) {
            return { valid: false, error: '不支持的图片来源域名' };
        }

        return { valid: true };
    } catch (e) {
        return { valid: false, error: '无效的URL格式' };
    }
}

/**
 * Check if a hostname matches an allowed domain pattern
 * @param {string} hostname - The hostname to check
 * @param {string} pattern - The pattern to match (can start with . for wildcard)
 * @returns {boolean}
 */
export function matchesDomainPattern(hostname, pattern) {
    if (pattern.startsWith('.')) {
        // Wildcard pattern: matches subdomains
        const domain = pattern.slice(1);
        return hostname.endsWith(domain) || hostname === domain;
    }
    // Exact match
    return hostname === pattern;
}
