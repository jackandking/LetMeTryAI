/**
 * Tests to verify Baidu Analytics (百度统计) is present in all HTML pages
 */

import { describe, it, expect } from '@jest/globals';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Expected Baidu Analytics tracking ID
const BAIDU_ANALYTICS_ID = '4ec6d2ddfd5746ce248a74a75c1d4fba';
const BAIDU_ANALYTICS_SCRIPT_PATTERN = /hm\.baidu\.com\/hm\.js\?/;
const BAIDU_UNION_VERIFY = 'a474889f17de23d877149d511beb790d';

// Files/directories to exclude from testing
const EXCLUDED_FILES = [
    'stripurls.html',  // Plain text URL list, not an HTML page
    'urls.html',       // Plain text URL list, not an HTML page
    'webview/index.html', // Dynamic content loader without HTML structure
];

// Function to recursively find all HTML files
function findHtmlFiles(dir, fileList = []) {
    const files = readdirSync(dir);
    
    files.forEach(file => {
        const filePath = join(dir, file);
        const relativePath = filePath.replace(__dirname + '/', '');
        
        if (statSync(filePath).isDirectory()) {
            // Skip node_modules and .git directories
            if (file !== 'node_modules' && file !== '.git' && file !== '.github') {
                findHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html') && !EXCLUDED_FILES.includes(relativePath)) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

describe('Baidu Analytics Integration', () => {
    const htmlFiles = findHtmlFiles(__dirname);

    it('should find HTML files to test', () => {
        expect(htmlFiles.length).toBeGreaterThan(0);
        console.log(`Found ${htmlFiles.length} HTML files to test`);
    });

    describe('All HTML pages should have Baidu Analytics', () => {
        htmlFiles.forEach(filePath => {
            const relativePath = filePath.replace(__dirname + '/', '');
            
            it(`${relativePath} should contain Baidu Analytics script`, () => {
                const content = readFileSync(filePath, 'utf-8');
                
                // Check for Baidu Analytics script URL
                expect(content).toMatch(BAIDU_ANALYTICS_SCRIPT_PATTERN);
                
                // Verify the tracking ID is present
                expect(content).toContain(BAIDU_ANALYTICS_ID);
            });

            it(`${relativePath} should contain Baidu union verify meta tag`, () => {
                const content = readFileSync(filePath, 'utf-8');
                
                // Check for Baidu union verification
                expect(content).toContain('baidu_union_verify');
                expect(content).toContain(BAIDU_UNION_VERIFY);
            });

            it(`${relativePath} should contain _hmt variable initialization`, () => {
                const content = readFileSync(filePath, 'utf-8');
                
                // Check for _hmt array initialization
                expect(content).toContain('var _hmt = _hmt || []');
            });
        });
    });

    describe('Excluded files should not be tested', () => {
        EXCLUDED_FILES.forEach(excludedFile => {
            it(`${excludedFile} should be excluded from testing`, () => {
                const found = htmlFiles.some(file => 
                    file.replace(__dirname + '/', '') === excludedFile
                );
                expect(found).toBe(false);
            });
        });
    });

    describe('Baidu Analytics implementation details', () => {
        it('should use consistent tracking ID across all pages', () => {
            const trackingIds = new Set();
            
            htmlFiles.forEach(filePath => {
                const content = readFileSync(filePath, 'utf-8');
                const match = content.match(/hm\.baidu\.com\/hm\.js\?([a-f0-9]+)/);
                if (match) {
                    trackingIds.add(match[1]);
                }
            });
            
            // All pages should use the same tracking ID
            expect(trackingIds.size).toBe(1);
            expect(trackingIds.has(BAIDU_ANALYTICS_ID)).toBe(true);
        });

        it('should use consistent verification code across all pages', () => {
            const verifyCodes = new Set();
            
            htmlFiles.forEach(filePath => {
                const content = readFileSync(filePath, 'utf-8');
                const match = content.match(/baidu_union_verify["']?\s*content=["']([^"']+)["']/);
                if (match) {
                    verifyCodes.add(match[1]);
                }
            });
            
            // All pages should use the same verification code
            expect(verifyCodes.size).toBe(1);
            expect(verifyCodes.has(BAIDU_UNION_VERIFY)).toBe(true);
        });

        it('should load Baidu Analytics script asynchronously', () => {
            htmlFiles.forEach(filePath => {
                const content = readFileSync(filePath, 'utf-8');
                
                // The script should be inserted dynamically via JavaScript
                expect(content).toContain('document.createElement("script")');
                expect(content).toContain('s.parentNode.insertBefore(hm, s)');
            });
        });
    });
});
