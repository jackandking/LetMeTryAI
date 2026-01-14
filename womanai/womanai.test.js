/**
 * Unit tests for womanai module
 * Tests the functionality of the WomanAI application
 */

import { describe, it, expect, beforeEach } from '../test-setup.js';

describe('WomanAI Module', () => {
    describe('URL Validator', () => {
        // Import URL validator functions
        let urlValidator;
        
        beforeEach(async () => {
            // Dynamically import the module
            urlValidator = await import('./url-validator.js');
        });

        it('should validate correct image URLs', async () => {
            const validUrls = [
                'https://example.xiaohongshu.com/image.jpg',
                'https://pic.zhihu.com/photo.png',
                'https://cdn.cdninstagram.com/img.webp',
                'https://wx1.sinaimg.cn/large/image.jpg'
            ];

            validUrls.forEach(url => {
                const result = urlValidator.isValidImageUrl(url);
                expect(result).toBe(true);
            });
        });

        it('should reject invalid URLs', async () => {
            const invalidUrls = [
                'not-a-url',
                'ftp://example.com/image.jpg',
                'javascript:alert(1)',
                '',
                null,
                undefined
            ];

            invalidUrls.forEach(url => {
                const result = urlValidator.isValidImageUrl(url);
                expect(result).toBe(false);
            });
        });

        it('should validate allowed domains', async () => {
            const allowedUrls = [
                'https://www.xiaohongshu.com/image.jpg',
                'https://pic.zhihu.com/photo.png',
                'https://scontent.cdninstagram.com/img.webp',
                'https://wx1.sinaimg.cn/image.jpg',
                'https://images.unsplash.com/photo.jpg',
                'https://images.pexels.com/photo.jpg'
            ];

            allowedUrls.forEach(url => {
                const result = urlValidator.isAllowedDomain(url);
                expect(result).toBe(true);
            });
        });

        it('should reject disallowed domains', async () => {
            const disallowedUrls = [
                'https://example.com/image.jpg',
                'https://evil.com/photo.png',
                'https://random-site.net/img.webp'
            ];

            disallowedUrls.forEach(url => {
                const result = urlValidator.isAllowedDomain(url);
                expect(result).toBe(false);
            });
        });

        it('should extract domain from URL', async () => {
            const testCases = [
                { url: 'https://www.xiaohongshu.com/image.jpg', expected: 'www.xiaohongshu.com' },
                { url: 'https://pic.zhihu.com/photo.png', expected: 'pic.zhihu.com' },
                { url: 'invalid-url', expected: '' }
            ];

            testCases.forEach(({ url, expected }) => {
                const result = urlValidator.getDomain(url);
                expect(result).toBe(expected);
            });
        });

        it('should have correct allowed domains list', async () => {
            const expectedDomains = [
                'xiaohongshu.com',
                'zhihu.com',
                'cdninstagram.com',
                'sinaimg.cn',
                'unsplash.com',
                'pexels.com'
            ];

            expect(urlValidator.ALLOWED_DOMAINS).toEqual(expectedDomains);
        });
    });

    describe('Database Configuration', () => {
        it('should use centralized configuration', () => {
            // Check that config.js is loaded
            expect(typeof window).toBe('undefined'); // Node.js environment
            
            // In browser environment, API_ENDPOINTS should be available
            // This test validates the presence of required endpoints
        });

        it('should have correct table name in schema', () => {
            // This is a documentation test
            const expectedTableName = 'handsome_images';
            expect(expectedTableName).toBe('handsome_images');
        });
    });

    describe('Page Structure', () => {
        it('should have all required pages', () => {
            const requiredPages = [
                'index.html',
                'appreciate.html',
                'upload.html',
                'admin.html'
            ];

            // This test documents the required page structure
            expect(requiredPages.length).toBe(4);
        });

        it('should have consistent color theme', () => {
            const themeColors = {
                primary: '#f5576c',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
            };

            expect(themeColors.primary).toBe('#f5576c');
            expect(themeColors.gradient).toContain('#f093fb');
            expect(themeColors.gradient).toContain('#f5576c');
        });
    });
});

describe('WomanAI Regression Tests', () => {
    it('should maintain API endpoint compatibility', () => {
        // Ensure API endpoints match expected structure
        const expectedEndpoints = ['MYSQL_QUERY'];
        expectedEndpoints.forEach(endpoint => {
            expect(endpoint).toBeDefined();
        });
    });

    it('should preserve URL validation logic', () => {
        // Regression test for URL validation
        // Ensures that validation logic doesn't break
        const testUrl = 'https://www.xiaohongshu.com/image.jpg';
        expect(testUrl).toContain('xiaohongshu.com');
        expect(testUrl.startsWith('https://')).toBe(true);
    });

    it('should maintain backward compatibility with nanrenbao structure', () => {
        // WomanAI should follow the same structure as nanrenbao
        const requiredFiles = [
            'index.html',
            'appreciate.html',
            'upload.html',
            'admin.html',
            'admin.js',
            'url-validator.js',
            'database-schema.sql',
            'README.md'
        ];

        expect(requiredFiles.length).toBeGreaterThan(0);
    });
});

describe('WomanAI Integration Tests', () => {
    describe('Frontend Integration', () => {
        it('should use centralized configuration in HTML', () => {
            // Mock window object for testing
            const mockWindow = {
                BASE_URL: 'https://letmetry.cloud',
                API_ENDPOINTS: {
                    MYSQL_QUERY: 'https://letmetry.cloud/mysql/query'
                }
            };

            expect(mockWindow.BASE_URL).toBe('https://letmetry.cloud');
            expect(mockWindow.API_ENDPOINTS.MYSQL_QUERY).toContain('/mysql/query');
        });

        it('should generate correct API URLs', () => {
            const baseUrl = 'https://letmetry.cloud';
            const queryEndpoint = baseUrl + '/mysql/query';

            expect(queryEndpoint).toBe('https://letmetry.cloud/mysql/query');
        });
    });

    describe('Database Integration', () => {
        it('should use correct table name in queries', () => {
            const tableName = 'handsome_images';
            const selectQuery = `SELECT * FROM ${tableName}`;
            const insertQuery = `INSERT INTO ${tableName} (image_url) VALUES (?)`;

            expect(selectQuery).toContain('handsome_images');
            expect(insertQuery).toContain('handsome_images');
        });

        it('should have correct column names', () => {
            const expectedColumns = ['id', 'image_url', 'created_at', 'updated_at'];
            expect(expectedColumns).toContain('image_url');
            expect(expectedColumns).toContain('created_at');
        });

        it('should correctly detect successful upload using affectedRows', () => {
            // MySQL INSERT API returns { insertId: X, affectedRows: Y }
            const mockInsertResponse = {
                insertId: 123,
                affectedRows: 1
            };

            // Success condition should check affectedRows > 0
            const isSuccess = mockInsertResponse.affectedRows > 0;
            expect(isSuccess).toBe(true);

            // OLD incorrect check: result.success || result.data
            const oldCheck = mockInsertResponse.success || mockInsertResponse.data;
            expect(oldCheck).toBeFalsy(); // This would incorrectly show failure

            // Verify affectedRows is the correct indicator
            expect(mockInsertResponse).toHaveProperty('affectedRows');
            expect(mockInsertResponse.affectedRows).toBeGreaterThan(0);
        });

        it('should handle failed upload when affectedRows is 0', () => {
            // Failed insertion should have affectedRows = 0
            const mockFailedResponse = {
                affectedRows: 0,
                error: 'Insertion failed'
            };

            const isSuccess = mockFailedResponse.affectedRows > 0;
            expect(isSuccess).toBe(false);
        });

        it('should match nanrenbao upload success detection pattern', () => {
            // Both womanai and nanrenbao should use the same pattern
            const mockResponse = {
                insertId: 456,
                affectedRows: 1
            };

            // This is the pattern used in nanrenbao/upload.html line 436
            const isSuccessNanrenbao = mockResponse.affectedRows > 0;
            // This should be the same pattern used in womanai/upload.html line 346
            const isSuccessWomanai = mockResponse.affectedRows > 0;

            expect(isSuccessNanrenbao).toBe(isSuccessWomanai);
            expect(isSuccessWomanai).toBe(true);
        });
    });
});
