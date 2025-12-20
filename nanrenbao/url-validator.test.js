import { validateImageUrl, matchesDomainPattern, ALLOWED_DOMAINS } from './url-validator.js';

describe('Beauty Image URL Validator', () => {
    describe('validateImageUrl', () => {
        it('should accept valid HTTPS URLs from allowed domains', () => {
            const validUrls = [
                'https://eb118-file.cdn.bcebos.com/image.jpg',
                'https://example.myqcloud.com/photo.png',
                'https://cdn.byteimg.com/avatar.gif',
                'https://letmetry.cloud/images/beauty.jpg',
                'https://img.qpic.cn/test.jpg'
            ];

            validUrls.forEach(url => {
                const result = validateImageUrl(url);
                expect(result.valid).toBe(true);
                expect(result.error).toBeUndefined();
            });
        });

        it('should reject HTTP URLs (non-HTTPS)', () => {
            const result = validateImageUrl('http://eb118-file.cdn.bcebos.com/image.jpg');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('仅支持HTTPS链接');
        });

        it('should reject URLs from non-allowed domains', () => {
            const result = validateImageUrl('https://untrusted-site.com/image.jpg');
            expect(result.valid).toBe(false);
            expect(result.error).toBe('不支持的图片来源域名');
        });

        it('should reject invalid URL formats', () => {
            const invalidUrls = [
                'not-a-url',
                'ftp://example.com/file',
                'javascript:alert(1)',
                '//example.com/image.jpg'
            ];

            invalidUrls.forEach(url => {
                const result = validateImageUrl(url);
                expect(result.valid).toBe(false);
                expect(result.error).toBe('无效的URL格式');
            });
        });

        it('should reject empty or null URLs', () => {
            expect(validateImageUrl('').valid).toBe(false);
            expect(validateImageUrl(null).valid).toBe(false);
            expect(validateImageUrl(undefined).valid).toBe(false);
            expect(validateImageUrl('').error).toBe('URL不能为空');
        });

        it('should accept URLs from subdomains of wildcard domains', () => {
            const subdomainUrls = [
                'https://img.myqcloud.com/test.jpg',
                'https://static.myqcloud.com/image.png',
                'https://cdn.byteimg.com/photo.jpg',
                'https://p1.qpic.cn/avatar.jpg'
            ];

            subdomainUrls.forEach(url => {
                const result = validateImageUrl(url);
                expect(result.valid).toBe(true);
            });
        });

        it('should accept URLs from exact match domains', () => {
            const result = validateImageUrl('https://eb118-file.cdn.bcebos.com/test.jpg');
            expect(result.valid).toBe(true);
        });
    });

    describe('matchesDomainPattern', () => {
        it('should match exact domain patterns', () => {
            expect(matchesDomainPattern('example.com', 'example.com')).toBe(true);
            expect(matchesDomainPattern('other.com', 'example.com')).toBe(false);
        });

        it('should match wildcard domain patterns', () => {
            expect(matchesDomainPattern('sub.example.com', '.example.com')).toBe(true);
            expect(matchesDomainPattern('example.com', '.example.com')).toBe(true);
            expect(matchesDomainPattern('other.com', '.example.com')).toBe(false);
        });

        it('should handle multi-level subdomains', () => {
            expect(matchesDomainPattern('cdn.img.myqcloud.com', '.myqcloud.com')).toBe(true);
            expect(matchesDomainPattern('a.b.c.byteimg.com', '.byteimg.com')).toBe(true);
        });
    });

    describe('ALLOWED_DOMAINS configuration', () => {
        it('should have all required domains', () => {
            const requiredDomains = [
                'eb118-file.cdn.bcebos.com',
                '.myqcloud.com',
                '.byteimg.com'
            ];

            requiredDomains.forEach(domain => {
                expect(ALLOWED_DOMAINS).toContain(domain);
            });
        });

        it('should be an array of strings', () => {
            expect(Array.isArray(ALLOWED_DOMAINS)).toBe(true);
            ALLOWED_DOMAINS.forEach(domain => {
                expect(typeof domain).toBe('string');
            });
        });
    });
});
