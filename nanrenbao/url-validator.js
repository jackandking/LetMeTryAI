// 通用图片链接校验工具，供 nanrenbao 目录下页面复用
// 用法：isValidImageUrl(url) 返回 {valid, error}
(function(global) {
    const allowedDomains = [
        '.bcebos.com',
        '.myqcloud.com',
        '.byteimg.com',
        'letmetry.cloud',
        '.qpic.cn',
        '.klingai.com'
    ];
    function isValidImageUrl(url) {
        if (!url || typeof url !== 'string') {
            return { valid: false, error: 'URL不能为空' };
        }
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol !== 'https:') {
                return { valid: false, error: '仅支持HTTPS链接' };
            }
            const hostname = urlObj.hostname;
            const isAllowed = allowedDomains.some(domain => {
                if (domain.startsWith('.')) {
                    return hostname.endsWith(domain.slice(1)) || hostname === domain.slice(1);
                }
                return hostname === domain;
            });
            if (!isAllowed) {
                const supportedDomains = allowedDomains.map(domain => 
                    domain.startsWith('.') ? `*${domain}` : domain
                ).join('、');
                return {
                    valid: false,
                    error: `不支持的图片来源。支持的域名：${supportedDomains}`
                };
            }
            
            return { valid: true };
        } catch (e) {
            return { valid: false, error: '无效的URL格式' };
        }
    }
    global.isValidImageUrl = isValidImageUrl;
})(window);
