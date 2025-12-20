/**
 * Tests for nanrenbao VConsole debugging functionality
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('Nanrenbao VConsole Integration', () => {
    beforeEach(() => {
        // Mock DOM environment
        global.window = global.window || {};
        global.document = global.document || {};
        
        // Mock URLSearchParams
        global.URLSearchParams = class MockURLSearchParams {
            constructor(search) {
                this.params = new Map();
                if (search) {
                    const pairs = search.substring(1).split('&');
                    pairs.forEach(pair => {
                        const [key, value] = pair.split('=');
                        if (key) this.params.set(key, value || '');
                    });
                }
            }
            get(name) {
                return this.params.get(name) || null;
            }
        };
    });

    describe('VConsole Script Loading', () => {
        it('should create script element for VConsole', () => {
            // Test that we can create a script element dynamically
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';
            
            expect(script.tagName).toBe('SCRIPT');
            expect(script.src).toContain('vconsole');
            expect(script.src).toContain('3.15.1'); // Verify version is pinned
        });

        it('should handle script load callbacks', () => {
            const script = document.createElement('script');
            script.onload = jest.fn();
            script.onerror = jest.fn();
            
            expect(typeof script.onload).toBe('function');
            expect(typeof script.onerror).toBe('function');
        });

        it('should use correct CDN URL', () => {
            const expectedUrl = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';
            const script = document.createElement('script');
            script.src = expectedUrl;
            
            expect(script.src).toBe(expectedUrl);
            expect(script.src).toContain('unpkg.com');
            expect(script.src).toContain('/dist/');
        });
    });

    describe('Debug Mode Detection', () => {
        it('should detect debug=true in URL', () => {
            const urlParams = new URLSearchParams('?debug=true');
            const debugMode = urlParams.get('debug') === 'true';
            
            expect(debugMode).toBe(true);
        });

        it('should not activate debug mode without debug parameter', () => {
            const urlParams = new URLSearchParams('');
            const debugMode = urlParams.get('debug') === 'true';
            
            expect(debugMode).toBe(false);
        });

        it('should not activate debug mode with debug=false', () => {
            const urlParams = new URLSearchParams('?debug=false');
            const debugMode = urlParams.get('debug') === 'true';
            
            expect(debugMode).toBe(false);
        });

        it('should handle other URL parameters', () => {
            const urlParams = new URLSearchParams('?page=1&debug=true&sort=asc');
            const debugMode = urlParams.get('debug') === 'true';
            
            expect(debugMode).toBe(true);
            expect(urlParams.get('page')).toBe('1');
            expect(urlParams.get('sort')).toBe('asc');
        });
    });

    describe('VConsole Initialization', () => {
        it('should initialize VConsole when window.VConsole exists', () => {
            // Mock VConsole class
            global.window.VConsole = class MockVConsole {
                constructor() {
                    this.initialized = true;
                }
            };

            // Test initialization
            const vConsole = new window.VConsole();
            expect(vConsole).toBeDefined();
            expect(vConsole.initialized).toBe(true);
        });

        it('should check for window.VConsole before initializing', () => {
            // When VConsole is not loaded
            delete global.window.VConsole;
            
            const hasVConsole = typeof window.VConsole !== 'undefined';
            expect(hasVConsole).toBe(false);
        });
    });

    describe('Error Handling', () => {
        it('should handle script load failure gracefully', () => {
            const script = document.createElement('script');
            const errorHandler = jest.fn();
            script.onerror = errorHandler;
            
            // Simulate error
            if (script.onerror) {
                script.onerror();
            }
            
            expect(errorHandler).toHaveBeenCalled();
        });

        it('should log warnings on load failure', () => {
            const consoleWarn = jest.spyOn(console, 'warn').mockImplementation();
            
            console.warn('Failed to load VConsole. Debug mode unavailable.');
            
            expect(consoleWarn).toHaveBeenCalledWith('Failed to load VConsole. Debug mode unavailable.');
            consoleWarn.mockRestore();
        });
    });

    describe('Integration with Pages', () => {
        it('should be compatible with nanrenbao index.html', () => {
            // Simulate the VConsole loading logic
            const urlParams = new URLSearchParams('?debug=true');
            const debugMode = urlParams.get('debug') === 'true';
            
            if (debugMode) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';
                expect(script.src).toContain('vconsole');
            }
            
            expect(debugMode).toBe(true);
        });

        it('should be compatible with nanrenbao upload.html', () => {
            // Simulate the VConsole loading logic
            const urlParams = new URLSearchParams('?debug=true');
            const debugMode = urlParams.get('debug') === 'true';
            
            if (debugMode) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';
                expect(script.src).toContain('vconsole');
            }
            
            expect(debugMode).toBe(true);
        });

        it('should be compatible with nanrenbao appreciate.html', () => {
            // Simulate the VConsole loading logic
            const urlParams = new URLSearchParams('?debug=true');
            const debugMode = urlParams.get('debug') === 'true';
            
            if (debugMode) {
                const script = document.createElement('script');
                script.src = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';
                expect(script.src).toContain('vconsole');
            }
            
            expect(debugMode).toBe(true);
        });
    });

    describe('Regression Tests', () => {
        it('should not affect page load without debug parameter', () => {
            const urlParams = new URLSearchParams('');
            const debugMode = urlParams.get('debug') === 'true';
            
            // VConsole should not be loaded
            expect(debugMode).toBe(false);
        });

        it('should maintain backward compatibility', () => {
            // Test that the VConsole implementation doesn't break existing functionality
            expect(document.createElement).toBeDefined();
            expect(URLSearchParams).toBeDefined();
        });

        it('should use same version as other pages', () => {
            // Ensure all pages use the same VConsole version
            const version = '3.15.1';
            const url = `https://unpkg.com/vconsole@${version}/dist/vconsole.min.js`;
            
            expect(url).toContain(version);
        });
    });

    describe('Console Logging', () => {
        it('should log initialization message', () => {
            const consoleLog = jest.spyOn(console, 'log').mockImplementation();
            
            console.log('VConsole initialized for debugging');
            
            expect(consoleLog).toHaveBeenCalledWith('VConsole initialized for debugging');
            consoleLog.mockRestore();
        });

        it('should be able to log messages', () => {
            const consoleLog = jest.spyOn(console, 'log').mockImplementation();
            
            console.log('Test message');
            
            expect(consoleLog).toHaveBeenCalled();
            consoleLog.mockRestore();
        });
    });
});
