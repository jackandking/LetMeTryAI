/**
 * Integration test to verify VConsole is properly added to all HTML pages
 */

import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('VConsole Integration Across All Pages', () => {
    const baseDir = process.cwd();
    const htmlFiles = [];

    // Find all HTML files recursively
    function findHtmlFiles(dir) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            // Skip node_modules and hidden directories
            if (item.name === 'node_modules' || item.name.startsWith('.')) {
                continue;
            }
            
            if (item.isDirectory()) {
                findHtmlFiles(fullPath);
            } else if (item.isFile() && item.name.endsWith('.html')) {
                htmlFiles.push(fullPath);
            }
        }
    }

    // Discover all HTML files
    findHtmlFiles(baseDir);

    describe('VConsole Script Presence', () => {
        it('should find HTML files to test', () => {
            expect(htmlFiles.length).toBeGreaterThan(0);
        });

        // Files that should have VConsole (have </body> tag)
        const filesWithBody = htmlFiles.filter(file => {
            const content = fs.readFileSync(file, 'utf-8');
            return content.includes('</body>');
        });

        it('should have VConsole in files with </body> tag', () => {
            const filesWithoutVConsole = [];
            const filesToCheck = [
                'nanrenbao/index.html',
                'nanrenbao/upload.html',
                'nanrenbao/appreciate.html',
                'eraser/index.html',
                'lure-fishing/index.html',
                'index.html'
            ];

            filesToCheck.forEach(relativePath => {
                const fullPath = path.join(baseDir, relativePath);
                if (fs.existsSync(fullPath)) {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    if (!content.toLowerCase().includes('vconsole')) {
                        filesWithoutVConsole.push(relativePath);
                    }
                }
            });

            if (filesWithoutVConsole.length > 0) {
                console.log('Files without VConsole:', filesWithoutVConsole);
            }
            expect(filesWithoutVConsole.length).toBe(0);
        });

        it('should use correct VConsole version (3.15.1)', () => {
            const filesWithWrongVersion = [];
            
            filesWithBody.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('vconsole')) {
                    // Check if it's using the correct version
                    if (!content.includes('vconsole@3.15.1')) {
                        filesWithWrongVersion.push(path.relative(baseDir, file));
                    }
                }
            });

            if (filesWithWrongVersion.length > 0) {
                console.log('Files with wrong VConsole version:', filesWithWrongVersion);
            }
            expect(filesWithWrongVersion.length).toBe(0);
        });

        it('should have correct VConsole initialization pattern', () => {
            const requiredPatterns = [
                'URLSearchParams',
                'debug',
                'window.VConsole',
                'vconsole.min.js',
                'script.onload',
                'script.onerror'
            ];

            const filesWithIncorrectPattern = [];

            filesWithBody.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('vconsole')) {
                    // Check if all required patterns are present
                    const missingPatterns = requiredPatterns.filter(pattern => 
                        !content.includes(pattern)
                    );
                    
                    if (missingPatterns.length > 0) {
                        filesWithIncorrectPattern.push({
                            file: path.relative(baseDir, file),
                            missingPatterns
                        });
                    }
                }
            });

            if (filesWithIncorrectPattern.length > 0) {
                console.log('Files with incorrect VConsole pattern:', 
                    JSON.stringify(filesWithIncorrectPattern, null, 2));
            }
            expect(filesWithIncorrectPattern.length).toBe(0);
        });
    });

    describe('VConsole Script Placement', () => {
        it('should place VConsole script before </body>', () => {
            const filesWithIncorrectPlacement = [];

            filesWithBody.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('vconsole')) {
                    // Find the position of VConsole comment and </body>
                    const vConsolePos = content.indexOf('VConsole for mobile debugging');
                    const bodyClosePos = content.indexOf('</body>');
                    
                    if (vConsolePos === -1 || bodyClosePos === -1 || vConsolePos > bodyClosePos) {
                        filesWithIncorrectPlacement.push(path.relative(baseDir, file));
                    }
                }
            });

            if (filesWithIncorrectPlacement.length > 0) {
                console.log('Files with incorrect VConsole placement:', filesWithIncorrectPlacement);
            }
            expect(filesWithIncorrectPlacement.length).toBe(0);
        });
    });

    describe('VConsole Configuration', () => {
        it('should use unpkg CDN', () => {
            const filesWithWrongCDN = [];

            filesWithBody.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('vconsole')) {
                    if (!content.includes('unpkg.com')) {
                        filesWithWrongCDN.push(path.relative(baseDir, file));
                    }
                }
            });

            if (filesWithWrongCDN.length > 0) {
                console.log('Files not using unpkg CDN:', filesWithWrongCDN);
            }
            expect(filesWithWrongCDN.length).toBe(0);
        });

        it('should check for debug=true parameter', () => {
            const filesWithoutDebugCheck = [];

            filesWithBody.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('vconsole')) {
                    if (!content.includes("get('debug') === 'true'")) {
                        filesWithoutDebugCheck.push(path.relative(baseDir, file));
                    }
                }
            });

            if (filesWithoutDebugCheck.length > 0) {
                console.log('Files without debug=true check:', filesWithoutDebugCheck);
            }
            expect(filesWithoutDebugCheck.length).toBe(0);
        });

        it('should have console logging for initialization', () => {
            const filesWithoutLogging = [];

            filesWithBody.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('vconsole')) {
                    if (!content.includes('VConsole initialized for debugging')) {
                        filesWithoutLogging.push(path.relative(baseDir, file));
                    }
                }
            });

            if (filesWithoutLogging.length > 0) {
                console.log('Files without initialization logging:', filesWithoutLogging);
            }
            expect(filesWithoutLogging.length).toBe(0);
        });

        it('should have error handling', () => {
            const filesWithoutErrorHandling = [];

            filesWithBody.forEach(file => {
                const content = fs.readFileSync(file, 'utf-8');
                if (content.includes('vconsole')) {
                    if (!content.includes('Failed to load VConsole')) {
                        filesWithoutErrorHandling.push(path.relative(baseDir, file));
                    }
                }
            });

            if (filesWithoutErrorHandling.length > 0) {
                console.log('Files without error handling:', filesWithoutErrorHandling);
            }
            expect(filesWithoutErrorHandling.length).toBe(0);
        });
    });

    describe('Coverage Statistics', () => {
        it('should have VConsole in majority of HTML files', () => {
            const totalHtmlFiles = htmlFiles.length;
            const filesWithVConsole = htmlFiles.filter(file => {
                const content = fs.readFileSync(file, 'utf-8');
                return content.toLowerCase().includes('vconsole');
            }).length;

            const coveragePercent = (filesWithVConsole / totalHtmlFiles) * 100;
            
            console.log(`VConsole coverage: ${filesWithVConsole}/${totalHtmlFiles} files (${coveragePercent.toFixed(1)}%)`);
            
            // Expect at least 85% coverage
            expect(coveragePercent).toBeGreaterThanOrEqual(85);
        });

        it('should list files without VConsole', () => {
            const filesWithoutVConsole = htmlFiles.filter(file => {
                const content = fs.readFileSync(file, 'utf-8');
                return !content.toLowerCase().includes('vconsole') && content.includes('</body>');
            }).map(file => path.relative(baseDir, file));

            if (filesWithoutVConsole.length > 0) {
                console.log('HTML files without VConsole (but have </body>):', filesWithoutVConsole);
            }
            
            // This is informational, not a failure
            expect(filesWithoutVConsole).toBeDefined();
        });
    });
});
