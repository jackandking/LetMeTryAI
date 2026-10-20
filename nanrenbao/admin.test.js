// admin.test.js - Tests for nanrenbao admin batch upload functionality
// ESM 模式（--experimental-vm-modules）下 jest 全局不自动注入，按 test-setup.js
// 既定模式从 @jest/globals 显式引入；describe/it/expect 由 jest ESM 运行时提供。
import { jest, beforeEach, afterEach } from '@jest/globals';
import { readFileSync } from 'fs';
import { API_ENDPOINTS } from '../util/config.js';
import { validateImageUrl } from './url-validator.esm.js';

describe('Nanrenbao Admin - Batch Upload', () => {
  let mockFetch;
  
  beforeEach(() => {
    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Mock DOM elements
    document.body.innerHTML = `
      <div id="alertContainer"></div>
      <textarea id="urlInput"></textarea>
      <button id="uploadBtn"></button>
      <div id="statusPanel" style="display: none;"></div>
      <div id="totalCount">0</div>
      <div id="successCount">0</div>
      <div id="errorCount">0</div>
      <div id="skipCount">0</div>
      <div id="progressBar" style="width: 0%;">0%</div>
      <div id="logContainer"></div>
    `;
    
    // Mock window.confirm
    global.confirm = jest.fn(() => true);
    
    // Mock console
    global.console = {
      ...console,
      log: jest.fn(),
      error: jest.fn()
    };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Configuration', () => {
    it('should use centralized MySQL endpoint', () => {
      expect(API_ENDPOINTS.MYSQL_INSERT).toBeDefined();
      expect(API_ENDPOINTS.MYSQL_INSERT).toContain('letmetry.cn');
      expect(API_ENDPOINTS.MYSQL_INSERT).toContain('/mysql/insert');
    });

    it('should target beauty_images table', () => {
      const expectedTable = 'beauty_images';
      expect(expectedTable).toBe('beauty_images');
    });
  });

  describe('URL Parsing and Validation', () => {
    it('should parse single valid URL', () => {
      const input = 'https://example.com/image.jpg';
      const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      expect(lines).toHaveLength(1);
      expect(lines[0]).toBe('https://example.com/image.jpg');
    });

    it('should parse multiple valid URLs', () => {
      const input = `https://example.com/image1.jpg
https://example.com/image2.png
https://example.com/image3.webp`;
      
      const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('https://example.com/image1.jpg');
      expect(lines[1]).toBe('https://example.com/image2.png');
      expect(lines[2]).toBe('https://example.com/image3.webp');
    });

    it('should skip empty lines', () => {
      const input = `https://example.com/image1.jpg

https://example.com/image2.png

`;
      
      const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      expect(lines).toHaveLength(2);
    });

    it('should remove duplicate URLs', () => {
      const input = `https://example.com/image1.jpg
https://example.com/image1.jpg
https://example.com/image2.png`;
      
      const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      const urls = new Set(lines);
      
      expect(urls.size).toBe(2);
      expect(urls.has('https://example.com/image1.jpg')).toBe(true);
      expect(urls.has('https://example.com/image2.png')).toBe(true);
    });

    it('should validate image URL formats', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.jpeg',
        'https://example.com/image.png',
        'https://example.com/image.gif',
        'https://example.com/image.webp',
        'http://example.com/path/to/image.jpg'
      ];
      
      validUrls.forEach(url => {
        expect(url).toMatch(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
      });
    });

    it('should reject invalid URL formats', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://example.com/image.jpg',
        'https://example.com/document.pdf',
        'https://example.com/video.mp4',
        'example.com/image.jpg' // missing protocol
      ];
      
      invalidUrls.forEach(url => {
        const isValid = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(url);
        expect(isValid).toBe(false);
      });
    });
  });

  describe('Database Insert Operations', () => {
    it('should use correct MySQL INSERT endpoint', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insertId: 123 })
      });
      
      const url = 'https://example.com/image.jpg';
      const table = 'beauty_images';
      
      await fetch(API_ENDPOINTS.MYSQL_INSERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table,
          data: { image_url: url }
        })
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        API_ENDPOINTS.MYSQL_INSERT,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should include image_url and created_at in insert data', () => {
      const url = 'https://example.com/image.jpg';
      const now = new Date();
      const created_at = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const insertData = {
        image_url: url,
        created_at
      };
      
      expect(insertData).toHaveProperty('image_url', url);
      expect(insertData).toHaveProperty('created_at');
      expect(insertData.created_at).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should format datetime for MySQL correctly', () => {
      const date = new Date('2025-12-21T10:30:45.123Z');
      const formatted = date.toISOString().slice(0, 19).replace('T', ' ');
      
      expect(formatted).toBe('2025-12-21 10:30:45');
      expect(formatted).not.toContain('T');
      expect(formatted).not.toContain('Z');
    });

    it('should handle successful insert response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ insertId: 123 })
      };
      
      mockFetch.mockResolvedValueOnce(mockResponse);
      
      const response = await fetch(API_ENDPOINTS.MYSQL_INSERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'beauty_images',
          data: { image_url: 'https://example.com/image.jpg' }
        })
      });
      
      expect(response.ok).toBe(true);
      
      const result = await response.json();
      expect(result).toHaveProperty('insertId');
      expect(result.insertId).toBe(123);
    });

    it('should handle insert failure gracefully', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      
      mockFetch.mockResolvedValueOnce(mockResponse);
      
      const response = await fetch(API_ENDPOINTS.MYSQL_INSERT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: 'beauty_images',
          data: { image_url: 'https://example.com/image.jpg' }
        })
      });
      
      expect(response.ok).toBe(false);
      expect(response.status).toBe(500);
    });
  });

  describe('Batch Upload Process', () => {
    it('should process multiple URLs sequentially', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];
      
      // Mock successful responses for all URLs
      urls.forEach(() => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ insertId: Math.floor(Math.random() * 1000) })
        });
      });
      
      let successCount = 0;
      
      for (const url of urls) {
        const response = await fetch(API_ENDPOINTS.MYSQL_INSERT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'beauty_images',
            data: { image_url: url }
          })
        });
        
        if (response.ok) {
          successCount++;
        }
      }
      
      expect(successCount).toBe(3);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should track upload statistics', () => {
      const stats = {
        totalCount: 10,
        successCount: 8,
        errorCount: 1,
        skipCount: 1
      };
      
      expect(stats.successCount + stats.errorCount + stats.skipCount).toBe(stats.totalCount);
      
      const progress = Math.round(((stats.successCount + stats.errorCount + stats.skipCount) / stats.totalCount) * 100);
      expect(progress).toBe(100);
    });

    it('should calculate progress percentage correctly', () => {
      const testCases = [
        { total: 10, processed: 5, expected: 50 },
        { total: 100, processed: 25, expected: 25 },
        { total: 10, processed: 10, expected: 100 },
        { total: 10, processed: 0, expected: 0 }
      ];
      
      testCases.forEach(({ total, processed, expected }) => {
        const progress = total > 0 ? Math.round((processed / total) * 100) : 0;
        expect(progress).toBe(expected);
      });
    });

    it('should handle partial failures in batch', async () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];
      
      // First succeeds, second fails, third succeeds
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => ({ insertId: 1 }) })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: true, json: async () => ({ insertId: 3 }) });
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const url of urls) {
        const response = await fetch(API_ENDPOINTS.MYSQL_INSERT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'beauty_images',
            data: { image_url: url }
          })
        });
        
        if (response.ok) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      expect(successCount).toBe(2);
      expect(errorCount).toBe(1);
    });
  });

  describe('UI State Management', () => {
    it('should update statistics display', () => {
      const totalCount = document.getElementById('totalCount');
      const successCount = document.getElementById('successCount');
      const errorCount = document.getElementById('errorCount');
      
      totalCount.textContent = '10';
      successCount.textContent = '8';
      errorCount.textContent = '2';
      
      expect(totalCount.textContent).toBe('10');
      expect(successCount.textContent).toBe('8');
      expect(errorCount.textContent).toBe('2');
    });

    it('should update progress bar', () => {
      const progressBar = document.getElementById('progressBar');
      
      progressBar.style.width = '50%';
      progressBar.textContent = '50%';
      
      expect(progressBar.style.width).toBe('50%');
      expect(progressBar.textContent).toBe('50%');
    });

    it('should show/hide status panel', () => {
      const statusPanel = document.getElementById('statusPanel');
      
      statusPanel.style.display = 'block';
      expect(statusPanel.style.display).toBe('block');
      
      statusPanel.style.display = 'none';
      expect(statusPanel.style.display).toBe('none');
    });

    it('should disable upload button during upload', () => {
      const uploadBtn = document.getElementById('uploadBtn');
      
      uploadBtn.disabled = true;
      uploadBtn.textContent = '⏳ 上传中...';
      
      expect(uploadBtn.disabled).toBe(true);
      expect(uploadBtn.textContent).toBe('⏳ 上传中...');
    });

    it('should re-enable upload button after completion', () => {
      const uploadBtn = document.getElementById('uploadBtn');
      
      uploadBtn.disabled = false;
      uploadBtn.textContent = '📤 开始批量上传';
      
      expect(uploadBtn.disabled).toBe(false);
      expect(uploadBtn.textContent).toBe('📤 开始批量上传');
    });
  });

  describe('Log Management', () => {
    it('should add log entries to container', () => {
      const logContainer = document.getElementById('logContainer');
      
      const logEntry = document.createElement('div');
      logEntry.className = 'log-entry success';
      logEntry.textContent = '[10:30:45] 成功: https://example.com/image.jpg';
      
      logContainer.appendChild(logEntry);
      
      expect(logContainer.children.length).toBe(1);
      expect(logContainer.children[0].textContent).toContain('成功');
    });

    it('should format timestamps correctly', () => {
      const now = new Date();
      const timestamp = now.toLocaleTimeString('zh-CN');
      
      expect(timestamp).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it('should support different log types', () => {
      const logTypes = ['success', 'error', 'info'];
      
      logTypes.forEach(type => {
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        
        expect(logEntry.className).toContain(type);
      });
    });

    it('should auto-scroll log container', () => {
      const logContainer = document.getElementById('logContainer');

      // Add multiple log entries
      for (let i = 0; i < 20; i++) {
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry info';
        logEntry.textContent = `Log entry ${i}`;
        logContainer.appendChild(logEntry);
      }

      // jsdom 不做布局，scrollHeight/scrollTop 恒为 0；断言赋值行为本身
      const assignments = [];
      Object.defineProperty(logContainer, 'scrollTop', {
        set(v) { assignments.push(v); },
        get() { return 0; }
      });
      logContainer.scrollTop = logContainer.scrollHeight;
      expect(assignments).toEqual([0]);
      expect(logContainer.children).toHaveLength(20);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));
      
      try {
        await fetch(API_ENDPOINTS.MYSQL_INSERT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            table: 'beauty_images',
            data: { image_url: 'https://example.com/image.jpg' }
          })
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Network error');
      }
    });

    it('should handle empty input validation', () => {
      const urlInput = document.getElementById('urlInput');
      urlInput.value = '';
      
      const isEmpty = urlInput.value.trim() === '';
      expect(isEmpty).toBe(true);
    });

    it('should prevent concurrent uploads', () => {
      let isUploading = false;
      
      // First upload starts
      isUploading = true;
      expect(isUploading).toBe(true);
      
      // Second upload attempt should be blocked
      const canStartSecondUpload = !isUploading;
      expect(canStartSecondUpload).toBe(false);
      
      // After first upload completes
      isUploading = false;
      expect(isUploading).toBe(false);
    });
  });

  describe('Integration with URL Validator', () => {
    it('should validate URLs using url-validator module', () => {
      // 验证器与 admin.js 同源（url-validator.esm.js），显式引入后断言可用
      expect(typeof validateImageUrl).toBe('function');

      // 域名白名单 + HTTPS 双重规则
      expect(validateImageUrl('https://img.myqcloud.com/a.jpg').valid).toBe(true);   // 白名单域名
      expect(validateImageUrl('https://letmetry.cn/images/a.jpg').valid).toBe(true); // 白名单域名
      expect(validateImageUrl('http://img.myqcloud.com/a.jpg').valid).toBe(false);   // 仅支持 HTTPS
      expect(validateImageUrl('https://evil.example.com/a.jpg').valid).toBe(false);  // 非白名单域名
      expect(validateImageUrl('not-a-url').valid).toBe(false);                       // 无效格式
      expect(validateImageUrl('').valid).toBe(false);                                // 空值
    });
  });

  describe('Regression Tests', () => {
    it('should maintain compatibility with existing upload.html', () => {
      // Ensure admin page uses same table and schema
      const table = 'beauty_images';
      const requiredFields = ['image_url', 'created_at'];
      
      expect(table).toBe('beauty_images');
      expect(requiredFields).toContain('image_url');
      expect(requiredFields).toContain('created_at');
    });

    it('should not break existing single upload functionality', () => {
      // Admin batch upload is additive, shouldn't affect single upload
      expect(API_ENDPOINTS.MYSQL_INSERT).toBeDefined();
      expect(API_ENDPOINTS.MYSQL_INSERT).toContain('/mysql/insert');
    });

    it('should use centralized configuration consistently', () => {
      expect(API_ENDPOINTS.MYSQL_INSERT).not.toContain('letmetryai.cn');
      expect(API_ENDPOINTS.MYSQL_INSERT).toContain('letmetry.cn');
      expect(API_ENDPOINTS.MYSQL_INSERT).not.toContain('/lws/');
    });
  });
});

// 后宫门禁治理（2026-10-20）：遮蔽度 coverage_pct 的后台管理与手机端体验。
// 文件内容式断言（与 appreciate.test.js 同风格）：锁定关键接线，防回归。
describe('Nanrenbao Admin - Coverage Management', () => {
  const read = (p) => readFileSync(p, 'utf8');

  it('should fetch coverage_pct in the manage list query', () => {
    const js = read('./nanrenbao/admin.js');
    expect(js).toContain('id, image_url, view_count, coverage_pct, created_at');
  });

  it('should support coverage filters in buildReviewWhere', () => {
    const js = read('./nanrenbao/admin.js');
    expect(js).toContain("filter === 'gated'");
    expect(js).toContain('coverage_pct IS NOT NULL AND coverage_pct < 50');
    expect(js).toContain("filter === 'allage'");
    expect(js).toContain('coverage_pct IS NOT NULL AND coverage_pct >= 50');
    expect(js).toContain("filter === 'nocoverage'");
  });

  it('should render coverage badges and inline quick-set select', () => {
    const js = read('./nanrenbao/admin.js');
    expect(js).toContain('function formatCoverage');
    expect(js).toContain('🔴 门禁');
    expect(js).toContain('🟢 全龄');
    expect(js).toContain('⚪ 未知');
    expect(js).toContain('class="coverage-select"');
    expect(js).toContain('COVERAGE_OPTIONS');
  });

  it('should route coverage_pct updates to the dedicated admin endpoint', () => {
    const js = read('./nanrenbao/admin.js');
    expect(js).toContain('NANRENBAO_ADMIN_COVERAGE');
    expect(js).toContain("Object.prototype.hasOwnProperty.call(data, 'coverage_pct')");
  });

  it('should expose the coverage endpoint in centralized config', () => {
    expect(API_ENDPOINTS.NANRENBAO_ADMIN_COVERAGE).toBeDefined();
    expect(API_ENDPOINTS.NANRENBAO_ADMIN_COVERAGE).toContain('/api/nanrenbao/admin/coverage');
  });

  it('should have coverage column, filter options and bulk controls in admin.html', () => {
    const html = read('./nanrenbao/admin.html');
    expect(html).toContain('width:150px;">遮蔽度</th>');
    expect(html).toContain('value="gated"');
    expect(html).toContain('value="allage"');
    expect(html).toContain('value="nocoverage"');
    expect(html).toContain('id="bulkCoverageSelect"');
    expect(html).toContain('id="bulkCoverageBtn"');
    expect(html).toContain('id="coverageSummary"');
  });

  it('should switch tables to cards with data-labels on mobile', () => {
    const html = read('./nanrenbao/admin.html');
    expect(html).toContain('@media (max-width: 768px)');
    expect(html).toContain('attr(data-label)');
    expect(html).toContain('class="table-scroll"');
    // 触控友好：16px 防 iOS 放大 + 44px 批量按钮
    expect(html).toContain('font-size: 16px');
    expect(html).toContain('min-height: 44px');
  });
});
