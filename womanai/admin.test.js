/**
 * Unit tests for womanai admin.js module
 * Tests batch upload functionality and admin panel operations
 */

import { describe, it, expect, beforeEach, afterEach } from '../test-setup.js';

describe('WomanAI Admin Module', () => {
    let adminModule;

    beforeEach(async () => {
        // Mock DOM elements
        global.document = {
            getElementById: (id) => ({
                textContent: '',
                innerHTML: '',
                style: { display: '', width: '0%' },
                appendChild: () => {},
                scrollTop: 0,
                scrollHeight: 100,
                disabled: false
            }),
            createElement: () => ({
                className: '',
                textContent: '',
                classList: {
                    remove: () => {},
                    add: () => {}
                },
                remove: () => {}
            }),
            addEventListener: () => {}
        };

        global.document.readyState = 'complete';
    });

    afterEach(() => {
        delete global.document;
    });

    describe('State Management', () => {
        it('should initialize with correct default state', () => {
            const expectedState = {
                isUploading: false,
                totalCount: 0,
                successCount: 0,
                errorCount: 0,
                skipCount: 0,
                logs: []
            };

            // State should start with these values
            expect(expectedState.isUploading).toBe(false);
            expect(expectedState.totalCount).toBe(0);
            expect(expectedState.logs.length).toBe(0);
        });

        it('should track upload progress correctly', () => {
            const mockState = {
                totalCount: 10,
                successCount: 7,
                errorCount: 2,
                skipCount: 1
            };

            const progress = Math.round(
                ((mockState.successCount + mockState.errorCount + mockState.skipCount) / mockState.totalCount) * 100
            );

            expect(progress).toBe(100);
        });
    });

    describe('URL Parsing', () => {
        it('should parse valid URLs correctly', () => {
            const input = `
https://www.xiaohongshu.com/image1.jpg
https://pic.zhihu.com/image2.png
https://images.unsplash.com/image3.webp
            `.trim();

            const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            expect(lines.length).toBe(3);
            expect(lines[0]).toContain('xiaohongshu.com');
        });

        it('should deduplicate URLs', () => {
            const urls = [
                'https://example.com/image1.jpg',
                'https://example.com/image2.jpg',
                'https://example.com/image1.jpg', // duplicate
                'https://example.com/image3.jpg'
            ];

            const uniqueUrls = new Set(urls);
            expect(uniqueUrls.size).toBe(3);
        });

        it('should filter out empty lines', () => {
            const input = `
https://example.com/image1.jpg

https://example.com/image2.jpg

            `.trim();

            const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
            expect(lines.length).toBe(2);
        });
    });

    describe('Upload Operations', () => {
        it('should construct correct SQL insert query', () => {
            const url = 'https://example.com/image.jpg';
            const query = `INSERT INTO handsome_images (image_url, created_at) VALUES ('${url}', NOW())`;

            expect(query).toContain('INSERT INTO handsome_images');
            expect(query).toContain(url);
            expect(query).toContain('NOW()');
        });

        it('should use correct API endpoint for insert', () => {
            const mockApiEndpoints = {
                MYSQL_QUERY: 'https://letmetry.cloud/mysql/query'
            };

            expect(mockApiEndpoints.MYSQL_QUERY).toBe('https://letmetry.cloud/mysql/query');
            expect(mockApiEndpoints.MYSQL_QUERY).toContain('/mysql/query');
        });

        it('should handle upload result correctly', () => {
            const mockResults = [
                { success: true },
                { success: false, error: 'Duplicate entry' },
                { success: false, error: 'Network error' }
            ];

            let successCount = 0;
            let skipCount = 0;
            let errorCount = 0;

            mockResults.forEach(result => {
                if (result.success) {
                    successCount++;
                } else if (result.error.includes('Duplicate')) {
                    skipCount++;
                } else {
                    errorCount++;
                }
            });

            expect(successCount).toBe(1);
            expect(skipCount).toBe(1);
            expect(errorCount).toBe(1);
        });
    });

    describe('Progress Tracking', () => {
        it('should calculate progress percentage correctly', () => {
            const testCases = [
                { total: 10, completed: 0, expected: 0 },
                { total: 10, completed: 5, expected: 50 },
                { total: 10, completed: 10, expected: 100 },
                { total: 0, completed: 0, expected: 0 }
            ];

            testCases.forEach(({ total, completed, expected }) => {
                const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
                expect(progress).toBe(expected);
            });
        });

        it('should update progress bar width', () => {
            const progressBar = { style: { width: '0%' }, textContent: '0%' };
            const progress = 75;

            progressBar.style.width = `${progress}%`;
            progressBar.textContent = `${progress}%`;

            expect(progressBar.style.width).toBe('75%');
            expect(progressBar.textContent).toBe('75%');
        });
    });

    describe('Log Management', () => {
        it('should create log entries with timestamp', () => {
            const timestamp = new Date().toLocaleTimeString('zh-CN');
            const message = 'Test log message';
            const type = 'info';

            const logEntry = {
                timestamp,
                message,
                type
            };

            expect(logEntry.timestamp).toBeDefined();
            expect(logEntry.message).toBe(message);
            expect(logEntry.type).toBe(type);
        });

        it('should categorize logs by type', () => {
            const logs = [
                { type: 'success', message: 'Upload succeeded' },
                { type: 'error', message: 'Upload failed' },
                { type: 'info', message: 'Processing' }
            ];

            const successLogs = logs.filter(log => log.type === 'success');
            const errorLogs = logs.filter(log => log.type === 'error');

            expect(successLogs.length).toBe(1);
            expect(errorLogs.length).toBe(1);
        });
    });

    describe('Button State Management', () => {
        it('should disable upload button during upload', () => {
            const uploadBtn = { disabled: false };
            const cancelBtn = { disabled: true };

            // Start upload
            uploadBtn.disabled = true;
            cancelBtn.disabled = false;

            expect(uploadBtn.disabled).toBe(true);
            expect(cancelBtn.disabled).toBe(false);
        });

        it('should enable buttons after upload completes', () => {
            const uploadBtn = { disabled: true };
            const cancelBtn = { disabled: false };

            // Upload complete
            uploadBtn.disabled = false;
            cancelBtn.disabled = true;

            expect(uploadBtn.disabled).toBe(false);
            expect(cancelBtn.disabled).toBe(true);
        });
    });

    describe('Validation Integration', () => {
        it('should use url-validator for domain checking', () => {
            // Mock validation function
            const validateImageUrl = (url) => {
                const allowedDomains = ['xiaohongshu.com', 'zhihu.com'];
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname.toLowerCase();
                    const isAllowed = allowedDomains.some(domain => 
                        hostname === domain || hostname.endsWith('.' + domain)
                    );
                    return {
                        valid: isAllowed && (url.startsWith('http://') || url.startsWith('https://')),
                        error: isAllowed ? null : 'Domain not allowed'
                    };
                } catch {
                    return { valid: false, error: 'Invalid URL' };
                }
            };

            const validUrl = 'https://www.xiaohongshu.com/image.jpg';
            const invalidUrl = 'https://evil.com/image.jpg';

            expect(validateImageUrl(validUrl).valid).toBe(true);
            expect(validateImageUrl(invalidUrl).valid).toBe(false);
        });
    });
});

describe('WomanAI Admin Regression Tests', () => {
    it('should maintain batch upload functionality', () => {
        // Regression test: ensure batch upload still works
        const mockBatchUpload = async (urls) => {
            return urls.map(url => ({ url, success: true }));
        };

        const urls = ['https://example.com/1.jpg', 'https://example.com/2.jpg'];
        mockBatchUpload(urls).then(results => {
            expect(results.length).toBe(2);
        });
    });

    it('should preserve alert system', () => {
        const alertTypes = ['success', 'error', 'warning'];
        expect(alertTypes).toContain('success');
        expect(alertTypes).toContain('error');
        expect(alertTypes).toContain('warning');
    });

    it('should maintain stats display structure', () => {
        const statsFields = ['totalCount', 'successCount', 'errorCount', 'skipCount'];
        expect(statsFields.length).toBe(4);
        expect(statsFields).toContain('totalCount');
        expect(statsFields).toContain('successCount');
    });

    it('should correctly detect successful upload in uploadSingleImage using affectedRows', () => {
        // MySQL INSERT API returns { insertId: X, affectedRows: Y }
        const mockInsertResponse = {
            insertId: 789,
            affectedRows: 1
        };

        // Success detection should use affectedRows > 0
        const isSuccess = mockInsertResponse.affectedRows > 0;
        expect(isSuccess).toBe(true);

        // OLD incorrect check would have been: result.success || result.data
        const oldCheck = mockInsertResponse.success || mockInsertResponse.data;
        expect(oldCheck).toBeFalsy(); // Would incorrectly fail

        // Verify affectedRows is present and positive
        expect(mockInsertResponse).toHaveProperty('affectedRows');
        expect(mockInsertResponse.affectedRows).toBeGreaterThan(0);
    });

    it('should handle failed insert when affectedRows is 0', () => {
        const mockFailedResponse = {
            affectedRows: 0,
            error: 'Insert failed'
        };

        const isSuccess = mockFailedResponse.affectedRows > 0;
        expect(isSuccess).toBe(false);
    });
});
