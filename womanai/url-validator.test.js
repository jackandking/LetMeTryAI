/**
 * Unit tests for womanai url-validator.js module
 * Tests URL validation and domain checking functionality
 */

import { describe, it, expect } from '../test-setup.js';
import {
    ALLOWED_DOMAINS,
    isAllowedDomain,
    isValidImageUrl,
    getDomain
} from './url-validator.js';

describe('WomanAI URL Validator', () => {
    describe('ALLOWED_DOMAINS constant', () => {
        it('should contain all required domains', () => {
            const expectedDomains = [
                'xiaohongshu.com',
                'zhihu.com',
                'cdninstagram.com',
                'sinaimg.cn',
                'unsplash.com',
                'pexels.com'
            ];

            expect(ALLOWED_DOMAINS).toEqual(expectedDomains);
        });

        it('should have exactly 6 allowed domains', () => {
            expect(ALLOWED_DOMAINS.length).toBe(6);
        });

        it('should contain lowercase domain names', () => {
            ALLOWED_DOMAINS.forEach(domain => {
                expect(domain).toBe(domain.toLowerCase());
            });
        });
    });

    describe('isAllowedDomain()', () => {
        it('should accept URLs from allowed domains', () => {
            const validUrls = [
                'https://www.xiaohongshu.com/image.jpg',
                'https://pic.zhihu.com/photo.png',
                'https://scontent.cdninstagram.com/img.webp',
                'https://wx1.sinaimg.cn/large/image.jpg',
                'https://images.unsplash.com/photo.jpg',
                'https://images.pexels.com/photo.jpg'
            ];

            validUrls.forEach(url => {
                const result = isAllowedDomain(url);
                expect(result).toBe(true);
            });
        });

        it('should accept subdomains of allowed domains', () => {
            const subdomainUrls = [
                'https://sub.xiaohongshu.com/image.jpg',
                'https://api.zhihu.com/photo.png',
                'https://cdn.cdninstagram.com/img.webp'
            ];

            subdomainUrls.forEach(url => {
                const result = isAllowedDomain(url);
                expect(result).toBe(true);
            });
        });

        it('should reject URLs from disallowed domains', () => {
            const invalidUrls = [
                'https://example.com/image.jpg',
                'https://evil.com/photo.png',
                'https://random-site.net/img.webp',
                'https://notallowed.org/pic.jpg'
            ];

            invalidUrls.forEach(url => {
                const result = isAllowedDomain(url);
                expect(result).toBe(false);
            });
        });

        it('should handle invalid URLs gracefully', () => {
            const invalidInputs = [
                'not-a-url',
                'javascript:alert(1)',
                '',
                null,
                undefined
            ];

            invalidInputs.forEach(input => {
                const result = isAllowedDomain(input);
                expect(result).toBe(false);
            });
        });

        it('should be case-insensitive for hostnames', () => {
            const mixedCaseUrls = [
                'https://WWW.XIAOHONGSHU.COM/image.jpg',
                'https://Pic.Zhihu.Com/photo.png',
                'https://IMAGES.UNSPLASH.COM/photo.jpg'
            ];

            mixedCaseUrls.forEach(url => {
                const result = isAllowedDomain(url);
                expect(result).toBe(true);
            });
        });
    });

    describe('isValidImageUrl()', () => {
        it('should accept valid HTTP URLs', () => {
            const httpUrl = 'http://example.com/image.jpg';
            expect(isValidImageUrl(httpUrl)).toBe(true);
        });

        it('should accept valid HTTPS URLs', () => {
            const httpsUrl = 'https://example.com/image.jpg';
            expect(isValidImageUrl(httpsUrl)).toBe(true);
        });

        it('should reject non-HTTP(S) protocols', () => {
            const invalidProtocols = [
                'ftp://example.com/image.jpg',
                'file:///path/to/image.jpg',
                'javascript:alert(1)',
                'data:image/png;base64,ABC123'
            ];

            invalidProtocols.forEach(url => {
                const result = isValidImageUrl(url);
                expect(result).toBe(false);
            });
        });

        it('should reject malformed URLs', () => {
            const malformedUrls = [
                'not-a-url',
                'http://',
                'https://',
                '//example.com/image.jpg',
                'example.com/image.jpg'
            ];

            malformedUrls.forEach(url => {
                const result = isValidImageUrl(url);
                expect(result).toBe(false);
            });
        });

        it('should reject empty or null inputs', () => {
            expect(isValidImageUrl('')).toBe(false);
            expect(isValidImageUrl(null)).toBe(false);
            expect(isValidImageUrl(undefined)).toBe(false);
        });

        it('should reject non-string inputs', () => {
            expect(isValidImageUrl(123)).toBe(false);
            expect(isValidImageUrl({})).toBe(false);
            expect(isValidImageUrl([])).toBe(false);
        });

        it('should accept URLs with query parameters', () => {
            const urlWithParams = 'https://example.com/image.jpg?size=large&quality=high';
            expect(isValidImageUrl(urlWithParams)).toBe(true);
        });

        it('should accept URLs with fragments', () => {
            const urlWithFragment = 'https://example.com/image.jpg#section';
            expect(isValidImageUrl(urlWithFragment)).toBe(true);
        });
    });

    describe('getDomain()', () => {
        it('should extract domain from valid URLs', () => {
            const testCases = [
                { url: 'https://www.xiaohongshu.com/image.jpg', expected: 'www.xiaohongshu.com' },
                { url: 'https://pic.zhihu.com/photo.png', expected: 'pic.zhihu.com' },
                { url: 'https://images.unsplash.com/photo.jpg', expected: 'images.unsplash.com' },
                { url: 'http://example.com:8080/path', expected: 'example.com' }
            ];

            testCases.forEach(({ url, expected }) => {
                const result = getDomain(url);
                expect(result).toBe(expected);
            });
        });

        it('should return empty string for invalid URLs', () => {
            const invalidUrls = [
                'not-a-url',
                'javascript:alert(1)',
                '',
                null,
                undefined
            ];

            invalidUrls.forEach(url => {
                const result = getDomain(url);
                expect(result).toBe('');
            });
        });

        it('should handle URLs with ports', () => {
            const urlWithPort = 'https://example.com:8080/image.jpg';
            const result = getDomain(urlWithPort);
            expect(result).toBe('example.com');
        });

        it('should handle URLs with authentication', () => {
            const urlWithAuth = 'https://user:pass@example.com/image.jpg';
            const result = getDomain(urlWithAuth);
            expect(result).toBe('example.com');
        });
    });

    describe('Integration Tests', () => {
        it('should validate complete URL workflow', () => {
            const url = 'https://www.xiaohongshu.com/image.jpg';

            // Step 1: Check if URL is valid
            const isValid = isValidImageUrl(url);
            expect(isValid).toBe(true);

            // Step 2: Check if domain is allowed
            const isAllowed = isAllowedDomain(url);
            expect(isAllowed).toBe(true);

            // Step 3: Extract domain
            const domain = getDomain(url);
            expect(domain).toBe('www.xiaohongshu.com');
        });

        it('should reject invalid URL in complete workflow', () => {
            const url = 'https://evil.com/image.jpg';

            // URL is valid but domain is not allowed
            expect(isValidImageUrl(url)).toBe(true);
            expect(isAllowedDomain(url)).toBe(false);
        });

        it('should reject malformed URL in complete workflow', () => {
            const url = 'not-a-url';

            // URL is invalid
            expect(isValidImageUrl(url)).toBe(false);
            expect(isAllowedDomain(url)).toBe(false);
            expect(getDomain(url)).toBe('');
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long URLs', () => {
            const longUrl = 'https://www.xiaohongshu.com/' + 'a'.repeat(2000) + '.jpg';
            expect(isValidImageUrl(longUrl)).toBe(true);
            expect(isAllowedDomain(longUrl)).toBe(true);
        });

        it('should handle URLs with special characters', () => {
            const specialCharUrl = 'https://www.xiaohongshu.com/image%20with%20spaces.jpg';
            expect(isValidImageUrl(specialCharUrl)).toBe(true);
            expect(isAllowedDomain(specialCharUrl)).toBe(true);
        });

        it('should handle URLs with unicode characters', () => {
            const unicodeUrl = 'https://www.xiaohongshu.com/图片.jpg';
            expect(isValidImageUrl(unicodeUrl)).toBe(true);
            expect(isAllowedDomain(unicodeUrl)).toBe(true);
        });

        it('should handle localhost URLs', () => {
            const localhostUrl = 'http://localhost:8080/image.jpg';
            expect(isValidImageUrl(localhostUrl)).toBe(true);
            expect(isAllowedDomain(localhostUrl)).toBe(false); // localhost not in allowed list
        });

        it('should handle IP address URLs', () => {
            const ipUrl = 'http://192.168.1.1/image.jpg';
            expect(isValidImageUrl(ipUrl)).toBe(true);
            expect(isAllowedDomain(ipUrl)).toBe(false); // IP not in allowed list
        });
    });

    describe('Regression Tests', () => {
        it('should maintain consistent validation behavior', () => {
            // This test ensures validation logic doesn't change unexpectedly
            const testUrl = 'https://www.xiaohongshu.com/image.jpg';
            
            // These should always be true
            expect(isValidImageUrl(testUrl)).toBe(true);
            expect(isAllowedDomain(testUrl)).toBe(true);
            expect(getDomain(testUrl)).toBeTruthy();
        });

        it('should preserve allowed domains list', () => {
            // Ensure the allowed domains list doesn't change
            expect(ALLOWED_DOMAINS).toContain('xiaohongshu.com');
            expect(ALLOWED_DOMAINS).toContain('zhihu.com');
            expect(ALLOWED_DOMAINS).toContain('cdninstagram.com');
            expect(ALLOWED_DOMAINS).toContain('sinaimg.cn');
            expect(ALLOWED_DOMAINS).toContain('unsplash.com');
            expect(ALLOWED_DOMAINS).toContain('pexels.com');
        });
    });
});
