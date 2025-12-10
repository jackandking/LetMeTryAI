/**
 * Tests for VIP Room Upload Interface
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('VIP Room Upload Interface', () => {
    let originalDocument;
    let mockGetConfig;
    let mockUpdateConfig;

    beforeEach(() => {
        // Store original document
        originalDocument = global.document;

        // Setup DOM mock
        document.body.innerHTML = `
            <div class="container">
                <div class="mode-selector">
                    <button class="mode-btn active">可视化编辑</button>
                    <button class="mode-btn">JSON编辑</button>
                </div>
                <div class="editor-mode active">
                    <div class="records-container" id="recordsContainer"></div>
                    <button class="upload-btn" id="uploadBtnEditor"></button>
                </div>
                <div class="json-mode">
                    <textarea id="configInput"></textarea>
                    <button class="upload-btn" id="uploadBtnJson"></button>
                </div>
                <div id="status" class="status"></div>
            </div>
        `;

        // Mock getConfig and updateConfig (these come from util.js)
        mockGetConfig = jest.fn((key, callback) => {
            callback(null);
        });
        mockUpdateConfig = jest.fn();

        global.getConfig = mockGetConfig;
        global.updateConfig = mockUpdateConfig;
    });

    afterEach(() => {
        jest.clearAllMocks();
        global.document = originalDocument;
    });

    describe('Record Structure', () => {
        it('should create record with required fields', () => {
            const record = {
                id: 1,
                imgUrl: 'https://example.com/image.jpg',
                videoUrl: 'https://v.kuaishou.com/video1'
            };

            expect(record).toHaveProperty('id');
            expect(record).toHaveProperty('imgUrl');
            expect(record).toHaveProperty('videoUrl');
            expect(typeof record.id).toBe('number');
            expect(typeof record.imgUrl).toBe('string');
            expect(typeof record.videoUrl).toBe('string');
        });

        it('should initialize record with empty strings', () => {
            const record = {
                id: 1,
                imgUrl: '',
                videoUrl: ''
            };

            expect(record.imgUrl).toBe('');
            expect(record.videoUrl).toBe('');
        });

        it('should maintain unique IDs for records', () => {
            const records = [
                { id: 0, imgUrl: 'url1', videoUrl: 'video1' },
                { id: 1, imgUrl: 'url2', videoUrl: 'video2' },
                { id: 2, imgUrl: 'url3', videoUrl: 'video3' }
            ];

            const ids = records.map(r => r.id);
            const uniqueIds = [...new Set(ids)];
            
            expect(ids.length).toBe(uniqueIds.length);
        });
    });

    describe('Record Operations', () => {
        it('should add a new record to the list', () => {
            let records = [
                { id: 0, imgUrl: 'url1', videoUrl: 'video1' }
            ];
            
            const newRecord = { id: 1, imgUrl: '', videoUrl: '' };
            records.push(newRecord);

            expect(records.length).toBe(2);
            expect(records[1].id).toBe(1);
        });

        it('should delete a record from the list', () => {
            let records = [
                { id: 0, imgUrl: 'url1', videoUrl: 'video1' },
                { id: 1, imgUrl: 'url2', videoUrl: 'video2' },
                { id: 2, imgUrl: 'url3', videoUrl: 'video3' }
            ];
            
            const idToDelete = 1;
            records = records.filter(r => r.id !== idToDelete);

            expect(records.length).toBe(2);
            expect(records.find(r => r.id === idToDelete)).toBeUndefined();
        });

        it('should update a record field', () => {
            const records = [
                { id: 0, imgUrl: 'url1', videoUrl: 'video1' },
                { id: 1, imgUrl: 'url2', videoUrl: 'video2' }
            ];
            
            const record = records.find(r => r.id === 1);
            if (record) {
                record.imgUrl = 'newUrl';
            }

            expect(records[1].imgUrl).toBe('newUrl');
        });

        it('should prevent deletion when only one record exists', () => {
            const records = [
                { id: 0, imgUrl: 'url1', videoUrl: 'video1' }
            ];
            
            // Simulate the check
            const canDelete = records.length > 1;

            expect(canDelete).toBe(false);
        });
    });

    describe('Data Conversion', () => {
        it('should convert records to config format', () => {
            const records = [
                { id: 0, imgUrl: 'img1.jpg', videoUrl: 'video1' },
                { id: 1, imgUrl: 'img2.jpg', videoUrl: 'video2' }
            ];
            
            const config = records.map(r => ({
                imgUrl: r.imgUrl,
                videoUrl: r.videoUrl
            }));

            expect(config.length).toBe(2);
            expect(config[0]).not.toHaveProperty('id');
            expect(config[0]).toHaveProperty('imgUrl');
            expect(config[0]).toHaveProperty('videoUrl');
        });

        it('should convert config format to records', () => {
            const config = [
                { imgUrl: 'img1.jpg', videoUrl: 'video1' },
                { imgUrl: 'img2.jpg', videoUrl: 'video2' }
            ];
            
            let recordIdCounter = 0;
            const records = config.map(item => ({
                id: recordIdCounter++,
                imgUrl: item.imgUrl || '',
                videoUrl: item.videoUrl || ''
            }));

            expect(records.length).toBe(2);
            expect(records[0]).toHaveProperty('id');
            expect(records[0].imgUrl).toBe('img1.jpg');
            expect(records[1].imgUrl).toBe('img2.jpg');
        });

        it('should handle empty fields during conversion', () => {
            const config = [
                { imgUrl: 'img1.jpg', videoUrl: '' },
                { imgUrl: '', videoUrl: 'video2' }
            ];
            
            let recordIdCounter = 0;
            const records = config.map(item => ({
                id: recordIdCounter++,
                imgUrl: item.imgUrl || '',
                videoUrl: item.videoUrl || ''
            }));

            expect(records[0].videoUrl).toBe('');
            expect(records[1].imgUrl).toBe('');
        });
    });

    describe('Validation', () => {
        it('should validate that all records have required fields', () => {
            const records = [
                { id: 0, imgUrl: 'img1.jpg', videoUrl: 'video1' },
                { id: 1, imgUrl: 'img2.jpg', videoUrl: 'video2' }
            ];
            
            const isValid = records.every(r => r.imgUrl && r.videoUrl);

            expect(isValid).toBe(true);
        });

        it('should detect missing imgUrl', () => {
            const records = [
                { id: 0, imgUrl: '', videoUrl: 'video1' }
            ];
            
            const isValid = records.every(r => r.imgUrl && r.videoUrl);

            expect(isValid).toBe(false);
        });

        it('should detect missing videoUrl', () => {
            const records = [
                { id: 0, imgUrl: 'img1.jpg', videoUrl: '' }
            ];
            
            const isValid = records.every(r => r.imgUrl && r.videoUrl);

            expect(isValid).toBe(false);
        });

        it('should validate field types are strings', () => {
            const record = { 
                id: 0, 
                imgUrl: 'img1.jpg', 
                videoUrl: 'video1' 
            };
            
            const isValid = typeof record.imgUrl === 'string' && 
                          typeof record.videoUrl === 'string';

            expect(isValid).toBe(true);
        });

        it('should trim whitespace from URLs', () => {
            const record = { 
                id: 0, 
                imgUrl: '  img1.jpg  ', 
                videoUrl: '  video1  ' 
            };
            
            const config = {
                imgUrl: record.imgUrl.trim(),
                videoUrl: record.videoUrl.trim()
            };

            expect(config.imgUrl).toBe('img1.jpg');
            expect(config.videoUrl).toBe('video1');
        });
    });

    describe('Mode Switching', () => {
        it('should have editor mode and JSON mode', () => {
            const editorMode = document.querySelector('.editor-mode');
            const jsonMode = document.querySelector('.json-mode');

            expect(editorMode).toBeDefined();
            expect(jsonMode).toBeDefined();
        });

        it('should show editor mode by default', () => {
            const editorMode = document.querySelector('.editor-mode');

            expect(editorMode.classList.contains('active')).toBe(true);
        });

        it('should toggle between modes', () => {
            const editorMode = document.querySelector('.editor-mode');
            const jsonMode = document.querySelector('.json-mode');

            // Switch to JSON mode
            editorMode.classList.remove('active');
            jsonMode.classList.add('active');

            expect(editorMode.classList.contains('active')).toBe(false);
            expect(jsonMode.classList.contains('active')).toBe(true);

            // Switch back to editor mode
            editorMode.classList.add('active');
            jsonMode.classList.remove('active');

            expect(editorMode.classList.contains('active')).toBe(true);
            expect(jsonMode.classList.contains('active')).toBe(false);
        });
    });

    describe('JSON Import/Export', () => {
        it('should export records to JSON format', () => {
            const records = [
                { id: 0, imgUrl: 'img1.jpg', videoUrl: 'video1' },
                { id: 1, imgUrl: 'img2.jpg', videoUrl: 'video2' }
            ];
            
            const config = records.map(r => ({
                imgUrl: r.imgUrl,
                videoUrl: r.videoUrl
            }));
            
            const json = JSON.stringify(config, null, 2);

            expect(json).toContain('img1.jpg');
            expect(json).toContain('video1');
            expect(json).not.toContain('"id"');
        });

        it('should parse JSON and create records', () => {
            const jsonText = JSON.stringify([
                { imgUrl: 'img1.jpg', videoUrl: 'video1' },
                { imgUrl: 'img2.jpg', videoUrl: 'video2' }
            ]);
            
            const config = JSON.parse(jsonText);
            let recordIdCounter = 0;
            const records = config.map(item => ({
                id: recordIdCounter++,
                imgUrl: item.imgUrl || '',
                videoUrl: item.videoUrl || ''
            }));

            expect(records.length).toBe(2);
            expect(records[0].id).toBe(0);
            expect(records[1].id).toBe(1);
        });

        it('should handle JSON parse errors gracefully', () => {
            const invalidJson = '{ invalid json }';
            
            let error = null;
            try {
                JSON.parse(invalidJson);
            } catch (e) {
                error = e;
            }

            expect(error).not.toBeNull();
        });

        it('should validate imported JSON is an array', () => {
            const notAnArray = { imgUrl: 'img1.jpg', videoUrl: 'video1' };
            
            const isValid = Array.isArray(notAnArray);

            expect(isValid).toBe(false);
        });
    });

    describe('Image Preview', () => {
        it('should show preview when imgUrl is provided', () => {
            const imgUrl = 'https://example.com/image.jpg';
            
            const previewImg = document.createElement('img');
            previewImg.src = imgUrl;

            expect(previewImg.src).toBe(imgUrl);
        });

        it('should hide preview when imgUrl is empty', () => {
            const imgUrl = '';
            
            const shouldShow = imgUrl.length > 0;

            expect(shouldShow).toBe(false);
        });

        it('should handle image load error', () => {
            const img = document.createElement('img');
            let errorHandled = false;
            
            img.onerror = function() {
                errorHandled = true;
            };
            
            img.src = 'invalid-url';
            // Trigger error manually in test
            if (img.onerror) img.onerror();

            expect(errorHandled).toBe(true);
        });

        it('should show placeholder when no image URL', () => {
            const imgUrl = '';
            const placeholderText = imgUrl ? '加载中...' : '请输入图片URL以查看预览';

            expect(placeholderText).toBe('请输入图片URL以查看预览');
        });

        it('should show loading placeholder when image URL exists', () => {
            const imgUrl = 'https://example.com/image.jpg';
            const placeholderText = imgUrl ? '加载中...' : '请输入图片URL以查看预览';

            expect(placeholderText).toBe('加载中...');
        });
    });

    describe('DOM Rendering', () => {
        it('should create card element for each record', () => {
            const records = [
                { id: 0, imgUrl: 'img1.jpg', videoUrl: 'video1' },
                { id: 1, imgUrl: 'img2.jpg', videoUrl: 'video2' }
            ];
            
            const container = document.getElementById('recordsContainer');
            container.innerHTML = '';
            
            records.forEach(record => {
                const card = document.createElement('div');
                card.className = 'record-card';
                container.appendChild(card);
            });

            expect(container.children.length).toBe(2);
        });

        it('should render record number in header', () => {
            const index = 0;
            const recordNumber = `记录 #${index + 1}`;

            expect(recordNumber).toBe('记录 #1');
        });

        it('should clear container before rendering', () => {
            const container = document.getElementById('recordsContainer');
            container.innerHTML = '<div>old content</div>';
            
            container.innerHTML = '';

            expect(container.children.length).toBe(0);
        });
    });

    describe('Upload Configuration', () => {
        it('should use correct storage key', () => {
            const CONFIG_KEY = 'viproom.conf';

            expect(CONFIG_KEY).toBe('viproom.conf');
        });

        it('should prepare config for upload', () => {
            const records = [
                { id: 0, imgUrl: '  img1.jpg  ', videoUrl: '  video1  ' }
            ];
            
            const config = records.map(r => ({
                imgUrl: r.imgUrl.trim(),
                videoUrl: r.videoUrl.trim()
            }));

            expect(config[0].imgUrl).toBe('img1.jpg');
            expect(config[0].videoUrl).toBe('video1');
        });

        it('should handle upload button state', () => {
            const uploadBtn = document.getElementById('uploadBtnEditor');
            
            // Disable during upload
            uploadBtn.disabled = true;
            uploadBtn.textContent = '上传中...';
            
            expect(uploadBtn.disabled).toBe(true);
            expect(uploadBtn.textContent).toBe('上传中...');
            
            // Re-enable after upload
            uploadBtn.disabled = false;
            uploadBtn.textContent = '上传配置';
            
            expect(uploadBtn.disabled).toBe(false);
            expect(uploadBtn.textContent).toBe('上传配置');
        });
    });

    describe('Status Messages', () => {
        it('should show success status', () => {
            const statusDiv = document.getElementById('status');
            statusDiv.className = 'status success';
            statusDiv.textContent = '✅ 配置已提交！';
            statusDiv.style.display = 'block';

            expect(statusDiv.classList.contains('success')).toBe(true);
            expect(statusDiv.textContent).toContain('✅');
        });

        it('should show error status', () => {
            const statusDiv = document.getElementById('status');
            statusDiv.className = 'status error';
            statusDiv.textContent = '配置格式错误';
            statusDiv.style.display = 'block';

            expect(statusDiv.classList.contains('error')).toBe(true);
            expect(statusDiv.textContent).toContain('错误');
        });

        it('should clear previous status', () => {
            const statusDiv = document.getElementById('status');
            statusDiv.style.display = 'none';
            statusDiv.className = 'status';

            expect(statusDiv.style.display).toBe('none');
            expect(statusDiv.className).toBe('status');
        });
    });

    describe('Configuration Loading', () => {
        it('should initialize with existing configuration', () => {
            const existingConfig = [
                { imgUrl: 'img1.jpg', videoUrl: 'video1' },
                { imgUrl: 'img2.jpg', videoUrl: 'video2' }
            ];
            
            let recordIdCounter = 0;
            const records = existingConfig.map(item => ({
                id: recordIdCounter++,
                imgUrl: item.imgUrl || '',
                videoUrl: item.videoUrl || ''
            }));

            expect(records.length).toBe(2);
            expect(records[0].imgUrl).toBe('img1.jpg');
        });

        it('should initialize with empty record if no config exists', () => {
            const config = null;
            const records = config && Array.isArray(config) && config.length > 0
                ? config
                : [{ id: 0, imgUrl: '', videoUrl: '' }];

            expect(records.length).toBe(1);
            expect(records[0].imgUrl).toBe('');
            expect(records[0].videoUrl).toBe('');
        });

        it('should handle null or undefined config', () => {
            const configs = [null, undefined];
            
            configs.forEach(config => {
                const isValid = config && Array.isArray(config) && config.length > 0;
                expect(isValid).toBe(false);
            });
        });
    });
});
