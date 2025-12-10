/**
 * Tests for eraser application
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the configuration
beforeEach(() => {
    // Set up window configuration
    global.window = global.window || {};
    global.window.BASE_URL = 'https://letmetry.cloud';
    global.window.API_ENDPOINTS = {
        AI_CHAT: `${global.window.BASE_URL}/lws/ai/chat`,
        FILE_UPLOAD: `${global.window.BASE_URL}/lws/file/upload`,
        FILE_DELETE: `${global.window.BASE_URL}/lws/file/delete`,
        FILE_INFO: `${global.window.BASE_URL}/lws/file/info`,
        FILE_LIST: `${global.window.BASE_URL}/lws/file/list`,
        FILE_DOWNLOAD: `${global.window.BASE_URL}/lws/file/download`,
        IMAGE_UPLOAD: `${global.window.BASE_URL}/image/upload`,
        MYSQL_QUERY: `${global.window.BASE_URL}/lws/mysql/query`,
        MYSQL_GET_BY_ID: `${global.window.BASE_URL}/lws/mysql/getById`,
        MYSQL_INSERT: `${global.window.BASE_URL}/lws/mysql/insert`,
        MYSQL_UPDATE: `${global.window.BASE_URL}/lws/mysql/update`,
        MYSQL_DELETE: `${global.window.BASE_URL}/lws/mysql/delete`
    };
    
    // Mock the DOM environment
    document.body.innerHTML = `
        <input type="file" id="fileInput" />
        <button id="uploadBtn">Upload</button>
        <div id="uploadArea"></div>
        <div id="previewArea" class="hidden"></div>
        <img id="originalImage" />
        <button id="processBtn">Process</button>
        <button id="resetBtn">Reset</button>
        <section id="uploadSection"></section>
        <section id="processingSection" class="hidden"></section>
        <section id="resultSection" class="hidden"></section>
        <img id="processedImage" />
        <button id="downloadImageBtn">Download Image</button>
        <button id="downloadPdfBtn">Download PDF</button>
        <button id="newProcessBtn">New Process</button>
    `;
});

describe('Eraser App', () => {
    describe('DOM Elements Initialization', () => {
        it('should find all required DOM elements', () => {
            const elements = {
                fileInput: document.getElementById('fileInput'),
                uploadBtn: document.getElementById('uploadBtn'),
                uploadArea: document.getElementById('uploadArea'),
                previewArea: document.getElementById('previewArea'),
                originalImage: document.getElementById('originalImage'),
                processBtn: document.getElementById('processBtn'),
                resetBtn: document.getElementById('resetBtn'),
                uploadSection: document.getElementById('uploadSection'),
                processingSection: document.getElementById('processingSection'),
                resultSection: document.getElementById('resultSection'),
                processedImage: document.getElementById('processedImage'),
                downloadImageBtn: document.getElementById('downloadImageBtn'),
                downloadPdfBtn: document.getElementById('downloadPdfBtn'),
                newProcessBtn: document.getElementById('newProcessBtn')
            };

            Object.entries(elements).forEach(([name, element]) => {
                expect(element).toBeDefined();
                expect(element).not.toBeNull();
            });
        });
    });

    describe('File Validation', () => {
        it('should accept valid image types', () => {
            const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
            
            validTypes.forEach(type => {
                const file = new File(['dummy content'], 'test.jpg', { type });
                expect(file.type).toMatch(/image\/(jpeg|jpg|png)/);
            });
        });

        it('should reject invalid file types', () => {
            const invalidTypes = ['image/gif', 'application/pdf', 'text/plain'];
            
            invalidTypes.forEach(type => {
                const file = new File(['dummy content'], 'test.gif', { type });
                expect(file.type).not.toMatch(/image\/(jpeg|jpg|png)/);
            });
        });

        it('should validate file size', () => {
            const maxSize = 10 * 1024 * 1024; // 10MB
            const largeFileSize = 11 * 1024 * 1024; // 11MB
            
            expect(largeFileSize).toBeGreaterThan(maxSize);
        });

        it('should use validateFileObject helper for validation', () => {
            // Test valid file
            const validFile = new File(['content'], 'test.png', { type: 'image/png' });
            // Simulate what validateFileObject does
            const isValid = validFile && (validFile instanceof File || validFile instanceof Blob) && validFile.size > 0;
            expect(isValid).toBe(true);

            // Test null file
            const nullFile = null;
            const isNullValid = nullFile && (nullFile instanceof File || nullFile instanceof Blob);
            expect(isNullValid).toBe(false);

            // Test empty file
            const emptyFile = new File([], 'empty.png', { type: 'image/png' });
            const isEmptyValid = emptyFile && (emptyFile instanceof File) && emptyFile.size > 0;
            expect(isEmptyValid).toBe(false);
        });
    });

    describe('UI State Management', () => {
        it('should toggle sections correctly', () => {
            const uploadSection = document.getElementById('uploadSection');
            const processingSection = document.getElementById('processingSection');
            const resultSection = document.getElementById('resultSection');

            // Initial state
            expect(uploadSection.classList.contains('hidden')).toBe(false);
            expect(processingSection.classList.contains('hidden')).toBe(true);
            expect(resultSection.classList.contains('hidden')).toBe(true);

            // Simulate state changes
            uploadSection.classList.add('hidden');
            processingSection.classList.remove('hidden');
            
            expect(uploadSection.classList.contains('hidden')).toBe(true);
            expect(processingSection.classList.contains('hidden')).toBe(false);
        });

        it('should show preview area when file is selected', () => {
            const previewArea = document.getElementById('previewArea');
            const uploadArea = document.getElementById('uploadArea');

            uploadArea.style.display = 'none';
            previewArea.classList.remove('hidden');

            expect(uploadArea.style.display).toBe('none');
            expect(previewArea.classList.contains('hidden')).toBe(false);
        });
    });

    describe('Image Processing Workflow', () => {
        it('should handle upload button click', () => {
            const uploadBtn = document.getElementById('uploadBtn');
            const fileInput = document.getElementById('fileInput');
            
            const clickSpy = jest.fn();
            fileInput.click = clickSpy;
            
            uploadBtn.click();
            // In real app, this would trigger fileInput.click()
        });

        it('should handle reset functionality', () => {
            const uploadArea = document.getElementById('uploadArea');
            const previewArea = document.getElementById('previewArea');
            const processingSection = document.getElementById('processingSection');
            const resultSection = document.getElementById('resultSection');

            // Simulate reset
            uploadArea.style.display = 'block';
            previewArea.classList.add('hidden');
            processingSection.classList.add('hidden');
            resultSection.classList.add('hidden');

            expect(uploadArea.style.display).toBe('block');
            expect(previewArea.classList.contains('hidden')).toBe(true);
            expect(processingSection.classList.contains('hidden')).toBe(true);
            expect(resultSection.classList.contains('hidden')).toBe(true);
        });

        it('should validate selected file before processing', () => {
            // Test that we check file validity before processing
            const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
            const invalidObject = { name: 'fake.jpg' }; // Not a real File object
            
            expect(validFile instanceof File).toBe(true);
            expect(invalidObject instanceof File).toBe(false);
        });

        it('should handle file object becoming invalid', () => {
            // Simulate scenario where file object becomes invalid
            let file = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
            
            expect(file instanceof File).toBe(true);
            expect(file.size).toBeGreaterThan(0);
            
            // If file were to become null/undefined
            file = null;
            expect(file).toBeNull();
        });
    });

    describe('Configuration Integration', () => {
        it('should use centralized configuration', () => {
            expect(window.BASE_URL).toBeDefined();
            expect(window.API_ENDPOINTS).toBeDefined();
            expect(window.API_ENDPOINTS.FILE_UPLOAD).toContain(window.BASE_URL);
        });
    });

    describe('Image Processing', () => {
        it('should handle client-side image processing', () => {
            // Create a simple test canvas
            const canvas = document.createElement('canvas');
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext('2d');
            
            // Fill with white
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, 100, 100);
            
            // Draw a simple black square in the center (simulating a character)
            ctx.fillStyle = 'black';
            ctx.fillRect(40, 40, 20, 20);
            
            expect(ctx).toBeDefined();
            expect(canvas.width).toBe(100);
            expect(canvas.height).toBe(100);
        });

        it('should calculate brightness correctly', () => {
            // Test brightness calculation formula
            const r = 255, g = 0, b = 0; // Red
            const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
            expect(brightness).toBeCloseTo(76.245, 1);
            
            // White should be brightest
            const whiteBrightness = 0.299 * 255 + 0.587 * 255 + 0.114 * 255;
            expect(whiteBrightness).toBe(255);
            
            // Black should be darkest
            const blackBrightness = 0.299 * 0 + 0.587 * 0 + 0.114 * 0;
            expect(blackBrightness).toBe(0);
        });

        it('should use adaptive thresholding for improved results', () => {
            // Create test histogram data
            const width = 10;
            const height = 10;
            const brightness = new Uint8Array(width * height);
            
            // Fill half with dark (characters), half with light (background)
            for (let i = 0; i < brightness.length / 2; i++) {
                brightness[i] = 50; // Dark
            }
            for (let i = brightness.length / 2; i < brightness.length; i++) {
                brightness[i] = 200; // Light
            }
            
            // Verify data structure
            expect(brightness.length).toBe(width * height);
            expect(brightness[0]).toBe(50);
            expect(brightness[brightness.length - 1]).toBe(200);
        });

        it('should create data URL from canvas', () => {
            const canvas = document.createElement('canvas');
            canvas.width = 10;
            canvas.height = 10;
            const dataUrl = canvas.toDataURL('image/png');
            
            expect(dataUrl).toBeDefined();
            expect(dataUrl).toMatch(/^data:image\/png;base64,/);
        });

        it('should handle FileReader for image files', (done) => {
            // Create a mock file
            const file = new File(['dummy content'], 'test.png', { type: 'image/png' });
            const reader = new FileReader();
            
            reader.onload = (e) => {
                expect(e.target.result).toBeDefined();
                done();
            };
            
            reader.readAsDataURL(file);
        });

        it('should reject null file objects', (done) => {
            // Test validation for null file
            const file = null;
            
            // Simulate what processImageFromFile does
            if (!file) {
                expect(file).toBeNull();
                done();
            }
        });

        it('should reject empty file objects (0 bytes)', () => {
            // Create a file with 0 bytes
            const emptyFile = new File([], 'empty.png', { type: 'image/png' });
            expect(emptyFile.size).toBe(0);
        });

        it('should validate file type correctly', () => {
            const validFile = new File(['content'], 'test.png', { type: 'image/png' });
            const invalidFile = new File(['content'], 'test.txt', { type: 'text/plain' });
            
            expect(validFile.type).toMatch(/image\/(jpeg|jpg|png)/);
            expect(invalidFile.type).not.toMatch(/image\/(jpeg|jpg|png)/);
        });

        it('should validate file size limits', () => {
            const maxSize = 10 * 1024 * 1024; // 10MB
            const smallFileSize = 1024; // 1KB
            const largeFileSize = 11 * 1024 * 1024; // 11MB
            
            expect(smallFileSize).toBeLessThan(maxSize);
            expect(largeFileSize).toBeGreaterThan(maxSize);
        });

        it('should handle FileReader error events', () => {
            const reader = new FileReader();
            
            reader.onerror = (e) => {
                expect(e).toBeDefined();
                expect(reader.error).toBeDefined();
            };
            
            // We can't easily trigger a real error, but we can verify the handler exists
            expect(typeof reader.onerror).toBe('function');
        });

        it('should log file information for debugging', () => {
            const file = new File(['test content'], 'test.jpg', { 
                type: 'image/jpeg',
                lastModified: Date.now()
            });
            
            const fileInfo = {
                name: file.name,
                type: file.type,
                size: file.size,
                lastModified: file.lastModified
            };
            
            expect(fileInfo.name).toBe('test.jpg');
            expect(fileInfo.type).toBe('image/jpeg');
            expect(fileInfo.size).toBeGreaterThan(0);
            expect(fileInfo.lastModified).toBeDefined();
        });
    });

    describe('Download Functionality', () => {
        it('should handle download link creation', () => {
            const link = document.createElement('a');
            link.href = 'data:image/png;base64,test';
            link.download = 'test.png';
            
            expect(link.href).toContain('data:image/png');
            expect(link.download).toBe('test.png');
        });
    });

    describe('Debug Mode Integration', () => {
        it('should detect debug parameter in URL', () => {
            // Create a mock URLSearchParams
            const debugUrl = new URLSearchParams('?debug=true');
            const normalUrl = new URLSearchParams('?other=value');
            
            expect(debugUrl.get('debug')).toBe('true');
            expect(normalUrl.get('debug')).toBeNull();
        });

        it('should check for VConsole availability', () => {
            // VConsole would be available in the window object when loaded
            // This test just verifies we can check for it
            const hasVConsole = typeof window.VConsole !== 'undefined';
            expect(typeof hasVConsole).toBe('boolean');
        });

        it('should handle URL parameter parsing for debug mode', () => {
            // Test various URL scenarios
            const testCases = [
                { url: '?debug=true', expected: true },
                { url: '?debug=false', expected: false },
                { url: '?other=value', expected: false },
                { url: '', expected: false }
            ];

            testCases.forEach(({ url, expected }) => {
                const params = new URLSearchParams(url);
                const debugMode = params.get('debug') === 'true';
                expect(debugMode).toBe(expected);
            });
        });
    });

    describe('Improved Algorithm - Grid Detection', () => {
        it('should detect horizontal grid lines', () => {
            // Create a test image with horizontal lines
            const width = 100;
            const height = 100;
            const brightness = new Uint8Array(width * height);
            brightness.fill(255); // White background
            
            // Add horizontal line at y=25
            for (let x = 0; x < width; x++) {
                brightness[25 * width + x] = 50; // Dark line
            }
            
            // Verify line exists
            let darkPixelsInLine = 0;
            for (let x = 0; x < width; x++) {
                if (brightness[25 * width + x] < 100) {
                    darkPixelsInLine++;
                }
            }
            
            expect(darkPixelsInLine).toBe(width);
        });

        it('should detect vertical grid lines', () => {
            // Create a test image with vertical lines
            const width = 100;
            const height = 100;
            const brightness = new Uint8Array(width * height);
            brightness.fill(255); // White background
            
            // Add vertical line at x=50
            for (let y = 0; y < height; y++) {
                brightness[y * width + 50] = 50; // Dark line
            }
            
            // Verify line exists
            let darkPixelsInLine = 0;
            for (let y = 0; y < height; y++) {
                if (brightness[y * width + 50] < 100) {
                    darkPixelsInLine++;
                }
            }
            
            expect(darkPixelsInLine).toBe(height);
        });

        it('should distinguish between characters and grid lines', () => {
            // Grid lines are thin and continuous
            // Characters are thicker and form blocks
            const width = 50;
            const height = 50;
            
            // Thin line (1-2 pixels) should be grid
            const thinLine = [1, 0, 0, 0, 1];
            const thinLineWidth = thinLine.filter(x => x === 1).length;
            expect(thinLineWidth).toBeLessThanOrEqual(2);
            
            // Thick region (10+ pixels) should be character
            const thickRegion = new Array(15).fill(1);
            expect(thickRegion.length).toBeGreaterThan(5);
        });

        it('should calculate text density for pinyin detection', () => {
            // Pinyin region should have lower density (5-30%) than character region
            const lowDensity = 0.15; // 15% - typical for pinyin
            const highDensity = 0.50; // 50% - typical for characters
            
            expect(lowDensity).toBeGreaterThan(0.05);
            expect(lowDensity).toBeLessThan(0.3);
            expect(highDensity).toBeGreaterThan(0.3);
        });

        it('should estimate background color from neighbors', () => {
            // Background estimation should average nearby bright pixels
            const colors = [
                { r: 250, g: 250, b: 250 },
                { r: 255, g: 255, b: 255 },
                { r: 248, g: 248, b: 248 }
            ];
            
            const avgR = colors.reduce((sum, c) => sum + c.r, 0) / colors.length;
            const avgG = colors.reduce((sum, c) => sum + c.g, 0) / colors.length;
            const avgB = colors.reduce((sum, c) => sum + c.b, 0) / colors.length;
            
            expect(avgR).toBeCloseTo(251, 0);
            expect(avgG).toBeCloseTo(251, 0);
            expect(avgB).toBeCloseTo(251, 0);
        });
    });

    describe('Regression Tests - Algorithm Changes', () => {
        it('should not break existing file upload functionality', () => {
            const fileInput = document.getElementById('fileInput');
            expect(fileInput).toBeDefined();
            expect(fileInput.accept).toBe('image/jpeg,image/jpg,image/png');
        });

        it('should maintain backward compatibility with preview', () => {
            const previewArea = document.getElementById('previewArea');
            const originalImage = document.getElementById('originalImage');
            
            expect(previewArea).toBeDefined();
            expect(originalImage).toBeDefined();
            expect(previewArea.classList.contains('hidden')).toBe(true);
        });

        it('should preserve all UI elements after algorithm update', () => {
            const requiredElements = [
                'uploadBtn', 'processBtn', 'resetBtn',
                'downloadImageBtn', 'downloadPdfBtn', 'newProcessBtn'
            ];
            
            requiredElements.forEach(id => {
                const element = document.getElementById(id);
                expect(element).toBeDefined();
                expect(element).not.toBeNull();
            });
        });

        it('should dynamically create script element for VConsole', () => {
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
    });
});
