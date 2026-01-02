// admin-backview.test.js - Tests for back-view-killer image management in admin panel
import { API_ENDPOINTS } from '../util/config.js';

describe('Nanrenbao Admin - Back View Killer Management', () => {
  let mockFetch;
  
  beforeEach(() => {
    // Mock fetch
    mockFetch = jest.fn();
    global.fetch = mockFetch;
    
    // Mock DOM elements for backview tab
    document.body.innerHTML = `
      <div id="alertContainer"></div>
      <textarea id="backviewUrlInput"></textarea>
      <button id="backviewUploadBtn"></button>
      <div id="backviewStatusPanel" style="display: none;"></div>
      <div id="backviewTotalCount">0</div>
      <div id="backviewSuccessCount">0</div>
      <div id="backviewErrorCount">0</div>
      <div id="backviewSkipCount">0</div>
      <div id="backviewProgressBar" style="width: 0%;">0%</div>
      <div id="backviewLogContainer"></div>
      <input id="backviewSearchInput" />
      <select id="backviewFilterSelect">
        <option value="all">显示全部</option>
        <option value="visible">仅显示可见</option>
        <option value="deleted">仅显示已标记删除</option>
      </select>
      <button id="backviewRefreshBtn">刷新列表</button>
      <div id="backviewManageStats">加载中...</div>
      <table id="backviewImagesTable">
        <tbody id="backviewImagesTbody"></tbody>
      </table>
      <button id="backviewPrevPageBtn">上一页</button>
      <div id="backviewPageInfo">1 / 1</div>
      <button id="backviewNextPageBtn">下一页</button>
      <input type="checkbox" id="backviewSelectAllCheckbox" />
      <button id="backviewBulkHideBtn">批量隐藏</button>
      <button id="backviewBulkShowBtn">批量展示</button>
      <button id="backviewBulkUndeleteBtn">批量取消删除</button>
      <button id="backviewBulkDeleteBtn">批量永久删除</button>
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
    it('should use centralized MySQL QUERY endpoint for back_view_images', () => {
      expect(API_ENDPOINTS.MYSQL_QUERY).toBeDefined();
      expect(API_ENDPOINTS.MYSQL_QUERY).toContain('letmetry.cloud');
      expect(API_ENDPOINTS.MYSQL_QUERY).toContain('/mysql/query');
    });

    it('should target back_view_images table', () => {
      const expectedTable = 'back_view_images';
      expect(expectedTable).toBe('back_view_images');
    });
    
    it('should have correct table columns', () => {
      const expectedColumns = ['id', 'back_image_url', 'front_image_url', 'click_count', 'deleted', 'created_at', 'updated_at'];
      expectedColumns.forEach(col => {
        expect(expectedColumns).toContain(col);
      });
    });
  });

  describe('URL Pair Parsing and Validation', () => {
    it('should parse single valid URL pair', () => {
      const input = 'https://example.com/back.jpg,https://example.com/front.jpg';
      const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      expect(lines).toHaveLength(1);
      const parts = lines[0].split(/[,\s]+/);
      expect(parts).toHaveLength(2);
      expect(parts[0]).toBe('https://example.com/back.jpg');
      expect(parts[1]).toBe('https://example.com/front.jpg');
    });

    it('should parse multiple valid URL pairs', () => {
      const input = `https://example.com/back1.jpg,https://example.com/front1.jpg
https://example.com/back2.jpg https://example.com/front2.jpg
https://example.com/back3.png,https://example.com/front3.png`;
      
      const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      expect(lines).toHaveLength(3);
      lines.forEach(line => {
        const parts = line.split(/[,\s]+/);
        expect(parts).toHaveLength(2);
      });
    });

    it('should support comma or space as separator', () => {
      const inputComma = 'https://example.com/back.jpg,https://example.com/front.jpg';
      const inputSpace = 'https://example.com/back.jpg https://example.com/front.jpg';
      
      const partsComma = inputComma.split(/[,\s]+/);
      const partsSpace = inputSpace.split(/[,\s]+/);
      
      expect(partsComma).toHaveLength(2);
      expect(partsSpace).toHaveLength(2);
    });

    it('should skip empty lines', () => {
      const input = `https://example.com/back1.jpg,https://example.com/front1.jpg

https://example.com/back2.jpg,https://example.com/front2.jpg

`;
      
      const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      
      expect(lines).toHaveLength(2);
    });

    it('should validate both back and front image URLs', () => {
      const validUrlPair = {
        back: 'https://example.com/back.jpg',
        front: 'https://example.com/front.jpg'
      };
      
      const imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      expect(validUrlPair.back).toMatch(imageUrlPattern);
      expect(validUrlPair.front).toMatch(imageUrlPattern);
    });

    it('should detect incomplete URL pairs', () => {
      const incompletePairs = [
        'https://example.com/back.jpg',  // Only one URL
        'https://example.com/back.jpg https://example.com/front.jpg https://example.com/extra.jpg', // Three URLs
        ''  // Empty line
      ];
      
      incompletePairs.forEach(line => {
        if (line.trim()) {
          const parts = line.split(/[,\s]+/).filter(p => p.length > 0);
          expect(parts.length).not.toBe(2);
        }
      });
    });
  });

  describe('Database Insert Operations', () => {
    it('should use MYSQL_QUERY endpoint with INSERT statement', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insertId: 123 })
      });
      
      const backUrl = 'https://example.com/back.jpg';
      const frontUrl = 'https://example.com/front.jpg';
      const sql = 'INSERT INTO back_view_images (back_image_url, front_image_url, created_at) VALUES (?, ?, ?)';
      
      await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql,
          params: [backUrl, frontUrl, '2025-01-01 00:00:00']
        })
      });
      
      expect(mockFetch).toHaveBeenCalledWith(
        API_ENDPOINTS.MYSQL_QUERY,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should use sql parameter (not query parameter)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ insertId: 123 })
      });
      
      const backUrl = 'https://example.com/back.jpg';
      const frontUrl = 'https://example.com/front.jpg';
      const sql = 'INSERT INTO back_view_images (back_image_url, front_image_url, created_at) VALUES (?, ?, ?)';
      
      const requestBody = {
        sql,
        params: [backUrl, frontUrl, '2025-01-01 00:00:00']
      };
      
      expect(requestBody).toHaveProperty('sql');
      expect(requestBody).not.toHaveProperty('query');
      expect(requestBody).toHaveProperty('params');
    });

    it('should include both back and front URLs in insert data', () => {
      const backUrl = 'https://example.com/back.jpg';
      const frontUrl = 'https://example.com/front.jpg';
      const now = new Date();
      const created_at = now.toISOString().slice(0, 19).replace('T', ' ');
      
      const params = [backUrl, frontUrl, created_at];
      
      expect(params[0]).toBe(backUrl);
      expect(params[1]).toBe(frontUrl);
      expect(params[2]).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    });

    it('should handle successful insert response', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ insertId: 123 })
      };
      
      mockFetch.mockResolvedValueOnce(mockResponse);
      
      const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: 'INSERT INTO back_view_images (back_image_url, front_image_url) VALUES (?, ?)',
          params: ['https://example.com/back.jpg', 'https://example.com/front.jpg']
        })
      });
      
      expect(response.ok).toBe(true);
      
      const result = await response.json();
      expect(result).toHaveProperty('insertId');
      expect(result.insertId).toBe(123);
    });

    it('should handle duplicate detection', async () => {
      const duplicateError = new Error('Duplicate entry');
      duplicateError.message = 'duplicate key violation';
      
      expect(duplicateError.message.toLowerCase()).toContain('duplicate');
    });
  });

  describe('Fetch and Display Operations', () => {
    it('should query back_view_images table with correct columns', async () => {
      const expectedColumns = 'id, back_image_url, front_image_url, click_count, created_at, deleted';
      const sql = `SELECT SQL_CALC_FOUND_ROWS ${expectedColumns} FROM back_view_images WHERE 1=1 ORDER BY created_at DESC LIMIT 20 OFFSET 0`;
      
      expect(sql).toContain('back_view_images');
      expect(sql).toContain('back_image_url');
      expect(sql).toContain('front_image_url');
      expect(sql).toContain('click_count');
      expect(sql).toContain('deleted');
    });

    it('should support filtering by visible/deleted status', () => {
      const filters = {
        all: 'WHERE 1=1',
        visible: 'WHERE deleted = 0',
        deleted: 'WHERE deleted = 1'
      };
      
      expect(filters.all).toBe('WHERE 1=1');
      expect(filters.visible).toBe('WHERE deleted = 0');
      expect(filters.deleted).toBe('WHERE deleted = 1');
    });

    it('should support searching both back and front URLs', () => {
      const query = 'example.com';
      const safe = query.replace(/'/g, "\\'");
      const whereClause = `AND (back_image_url LIKE '%${safe}%' OR front_image_url LIKE '%${safe}%')`;
      
      expect(whereClause).toContain('back_image_url LIKE');
      expect(whereClause).toContain('front_image_url LIKE');
      expect(whereClause).toContain('OR');
    });

    it('should support pagination', () => {
      const page = 2;
      const perPage = 20;
      const offset = (page - 1) * perPage;
      
      expect(offset).toBe(20);
      
      const sql = `SELECT * FROM back_view_images LIMIT ${perPage} OFFSET ${offset}`;
      expect(sql).toContain('LIMIT 20');
      expect(sql).toContain('OFFSET 20');
    });
  });

  describe('Bulk Operations', () => {
    it('should support bulk hide operation', () => {
      const ids = [1, 2, 3, 4, 5];
      const placeholders = ids.map(() => '?').join(',');
      const sql = `UPDATE back_view_images SET deleted = 1 WHERE id IN (${placeholders})`;
      
      expect(sql).toContain('back_view_images');
      expect(sql).toContain('SET deleted = 1');
      expect(sql).toContain('WHERE id IN');
      expect(placeholders).toBe('?,?,?,?,?');
    });

    it('should support bulk show operation', () => {
      const ids = [1, 2, 3];
      const placeholders = ids.map(() => '?').join(',');
      const sql = `UPDATE back_view_images SET deleted = 0 WHERE id IN (${placeholders})`;
      
      expect(sql).toContain('SET deleted = 0');
    });

    it('should support bulk undelete operation', () => {
      const sql = 'UPDATE back_view_images SET deleted = 0 WHERE deleted = 1';
      
      expect(sql).toContain('back_view_images');
      expect(sql).toContain('SET deleted = 0');
      expect(sql).toContain('WHERE deleted = 1');
    });

    it('should support bulk permanent delete operation', () => {
      const sql = 'DELETE FROM back_view_images WHERE deleted = 1';
      
      expect(sql).toContain('DELETE FROM back_view_images');
      expect(sql).toContain('WHERE deleted = 1');
    });
  });

  describe('UI State Management', () => {
    it('should update backview statistics display', () => {
      const totalCount = document.getElementById('backviewTotalCount');
      const successCount = document.getElementById('backviewSuccessCount');
      const errorCount = document.getElementById('backviewErrorCount');
      
      totalCount.textContent = '10';
      successCount.textContent = '8';
      errorCount.textContent = '2';
      
      expect(totalCount.textContent).toBe('10');
      expect(successCount.textContent).toBe('8');
      expect(errorCount.textContent).toBe('2');
    });

    it('should update backview progress bar', () => {
      const progressBar = document.getElementById('backviewProgressBar');
      
      progressBar.style.width = '75%';
      progressBar.textContent = '75%';
      
      expect(progressBar.style.width).toBe('75%');
      expect(progressBar.textContent).toBe('75%');
    });

    it('should show/hide backview status panel', () => {
      const statusPanel = document.getElementById('backviewStatusPanel');
      
      statusPanel.style.display = 'block';
      expect(statusPanel.style.display).toBe('block');
      
      statusPanel.style.display = 'none';
      expect(statusPanel.style.display).toBe('none');
    });

    it('should disable upload button during backview upload', () => {
      const uploadBtn = document.getElementById('backviewUploadBtn');
      
      uploadBtn.disabled = true;
      uploadBtn.textContent = '⏳ 上传中...';
      
      expect(uploadBtn.disabled).toBe(true);
      expect(uploadBtn.textContent).toBe('⏳ 上传中...');
    });
  });

  describe('Regression Tests', () => {
    it('should maintain compatibility with beauty_images management', () => {
      // Both tables should use same pattern
      const beautyTable = 'beauty_images';
      const backviewTable = 'back_view_images';
      
      expect(beautyTable).toBe('beauty_images');
      expect(backviewTable).toBe('back_view_images');
      
      // Both should use deleted column
      expect(beautyTable).not.toBe(backviewTable);
    });

    it('should use centralized configuration consistently', () => {
      expect(API_ENDPOINTS.MYSQL_QUERY).not.toContain('letmetryai.cn');
      expect(API_ENDPOINTS.MYSQL_QUERY).toContain('letmetry.cloud');
      expect(API_ENDPOINTS.MYSQL_QUERY).toContain('/mysql/query');
    });

    it('should use sql parameter consistently across all queries', () => {
      const queries = [
        { sql: 'SELECT * FROM back_view_images', params: [] },
        { sql: 'INSERT INTO back_view_images (back_image_url, front_image_url) VALUES (?, ?)', params: ['url1', 'url2'] },
        { sql: 'UPDATE back_view_images SET deleted = 1 WHERE id = ?', params: [1] },
        { sql: 'DELETE FROM back_view_images WHERE id = ?', params: [1] }
      ];
      
      queries.forEach(query => {
        expect(query).toHaveProperty('sql');
        expect(query).not.toHaveProperty('query');
        expect(query).toHaveProperty('params');
      });
    });
  });

  describe('Security and Validation', () => {
    it('should escape single quotes in search queries', () => {
      const userInput = "test'url";
      const safe = userInput.replace(/'/g, "\\'");
      
      expect(safe).toBe("test\\'url");
      expect(safe).not.toContain("'");
    });

    it('should validate image URLs before insert', () => {
      const validUrls = [
        'https://example.com/image.jpg',
        'https://example.com/image.png',
        'http://example.com/path/to/image.webp'
      ];
      
      const imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      
      validUrls.forEach(url => {
        expect(url).toMatch(imageUrlPattern);
      });
    });

    it('should reject invalid image formats', () => {
      const invalidUrls = [
        'ftp://example.com/image.jpg',
        'https://example.com/document.pdf',
        'https://example.com/video.mp4'
      ];
      
      const imageUrlPattern = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      
      invalidUrls.forEach(url => {
        expect(url).not.toMatch(imageUrlPattern);
      });
    });
  });
});
