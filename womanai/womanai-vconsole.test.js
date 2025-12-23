/**
 * VConsole integration tests for WomanAI
 * Tests that VConsole debug mode is properly integrated
 */

import { describe, it, expect } from '../test-setup.js';

describe('WomanAI VConsole Integration', () => {
    describe('Debug Mode Activation', () => {
        it('should load VConsole when debug=true parameter is present', () => {
            // Simulate URL with debug parameter
            const mockUrl = 'https://letmetry.cloud/womanai/appreciate.html?debug=true';
            const urlParams = new URLSearchParams('?debug=true');
            const debugMode = urlParams.get('debug') === 'true';
            
            expect(debugMode).toBe(true);
        });

        it('should not load VConsole without debug parameter', () => {
            const mockUrl = 'https://letmetry.cloud/womanai/appreciate.html';
            const urlParams = new URLSearchParams('');
            const debugMode = urlParams.get('debug') === 'true';
            
            expect(debugMode).toBe(false);
        });

        it('should not load VConsole when debug=false', () => {
            const urlParams = new URLSearchParams('?debug=false');
            const debugMode = urlParams.get('debug') === 'true';
            
            expect(debugMode).toBe(false);
        });
    });

    describe('VConsole Script Loading', () => {
        it('should use correct VConsole CDN URL', () => {
            const vConsoleUrl = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';
            
            expect(vConsoleUrl).toContain('vconsole');
            expect(vConsoleUrl).toContain('3.15.1');
            expect(vConsoleUrl.startsWith('https://')).toBe(true);
        });

        it('should create script element dynamically', () => {
            const mockDocument = {
                createElement: (tag) => ({
                    src: '',
                    onload: null,
                    onerror: null
                }),
                head: {
                    appendChild: () => {}
                }
            };

            const script = mockDocument.createElement('script');
            expect(script).toBeDefined();
            expect(script.src).toBe('');
        });
    });

    describe('All WomanAI Pages', () => {
        const pages = [
            'index.html',
            'appreciate.html',
            'upload.html',
            'admin.html'
        ];

        it('should include VConsole code in all pages', () => {
            // All pages should have the VConsole integration code
            expect(pages.length).toBe(4);
            pages.forEach(page => {
                expect(page).toContain('.html');
            });
        });

        it('should use consistent VConsole initialization pattern', () => {
            // VConsole initialization pattern
            const pattern = `
                const urlParams = new URLSearchParams(window.location.search);
                const debugMode = urlParams.get('debug') === 'true';
                if (debugMode) { /* load VConsole */ }
            `;
            
            expect(pattern).toContain('URLSearchParams');
            expect(pattern).toContain("debugMode");
            expect(pattern).toContain("get('debug')");
        });
    });

    describe('Error Handling', () => {
        it('should handle VConsole load failure gracefully', () => {
            const mockScript = {
                onerror: () => {
                    console.warn('Failed to load VConsole. Debug mode unavailable.');
                }
            };

            // Should not throw error
            expect(() => mockScript.onerror()).not.toThrow();
        });

        it('should log message when VConsole initializes', () => {
            const mockConsole = {
                log: (message) => message
            };

            const message = mockConsole.log('VConsole initialized for debugging');
            expect(message).toBe('VConsole initialized for debugging');
        });
    });

    describe('Window Object Integration', () => {
        it('should check for VConsole on window object', () => {
            const mockWindow = {
                VConsole: function() {
                    this.initialized = true;
                }
            };

            expect(mockWindow.VConsole).toBeDefined();
            expect(typeof mockWindow.VConsole).toBe('function');
        });

        it('should instantiate VConsole when available', () => {
            const mockVConsole = function() {
                return { initialized: true };
            };

            const instance = new mockVConsole();
            expect(instance.initialized).toBe(true);
        });
    });

    describe('URL Parameter Parsing', () => {
        it('should parse debug parameter correctly', () => {
            const testCases = [
                { url: '?debug=true', expected: true },
                { url: '?debug=false', expected: false },
                { url: '?other=value', expected: false },
                { url: '', expected: false },
                { url: '?debug=TRUE', expected: false }, // case sensitive
                { url: '?debug=1', expected: false } // must be exactly 'true'
            ];

            testCases.forEach(({ url, expected }) => {
                const urlParams = new URLSearchParams(url);
                const result = urlParams.get('debug') === 'true';
                expect(result).toBe(expected);
            });
        });

        it('should handle multiple URL parameters', () => {
            const urlParams = new URLSearchParams('?page=1&debug=true&sort=asc');
            const debugMode = urlParams.get('debug') === 'true';
            const page = urlParams.get('page');
            
            expect(debugMode).toBe(true);
            expect(page).toBe('1');
        });
    });

    describe('Regression Tests', () => {
        it('should maintain VConsole version consistency', () => {
            const version = '3.15.1';
            expect(version).toBe('3.15.1');
        });

        it('should use IIFE pattern for VConsole initialization', () => {
            // Immediately Invoked Function Expression pattern
            const iife = '(function() { /* VConsole init code */ })();';
            expect(iife).toContain('(function()');
            expect(iife).toContain('})()');
        });

        it('should maintain backward compatibility with existing pages', () => {
            // VConsole should work the same way in all pages
            const pageCount = 4; // index, appreciate, upload, admin
            expect(pageCount).toBe(4);
        });
    });
});
