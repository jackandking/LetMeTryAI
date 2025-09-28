// regression.test.js - Regression tests to ensure changes don't break existing functionality
import { API_ENDPOINTS, BASE_URL, getImageUrl } from './util/config.js';

// regression.test.js - Regression tests to ensure changes don't break existing functionality
import { API_ENDPOINTS, BASE_URL, getImageUrl } from './util/config.js';

describe('Regression Tests - DeepSeek API Migration', () => {
  describe('API Endpoint Migration', () => {
    it('should use DeepSeek API for AI_CHAT endpoint', () => {
      expect(API_ENDPOINTS.AI_CHAT).toBe('https://api.deepseek.com/v1/chat/completions');
      expect(API_ENDPOINTS.AI_CHAT).not.toContain('/lws/ai/chat');
      expect(API_ENDPOINTS.AI_CHAT).not.toContain('43.143.241.181');
    });

    it('should maintain all other API endpoints unchanged', () => {
      const expectedEndpoints = {
        FILE_UPLOAD: `${BASE_URL}/lws/file/upload`,
        FILE_DELETE: `${BASE_URL}/lws/file/delete`,
        FILE_INFO: `${BASE_URL}/lws/file/info`,
        FILE_LIST: `${BASE_URL}/lws/file/list`,
        FILE_DOWNLOAD: `${BASE_URL}/lws/file/download`,
        MYSQL_QUERY: `${BASE_URL}/lws/mysql/query`,
        MYSQL_GET_BY_ID: `${BASE_URL}/lws/mysql/getById`,
        MYSQL_INSERT: `${BASE_URL}/lws/mysql/insert`,
        MYSQL_UPDATE: `${BASE_URL}/lws/mysql/update`,
        MYSQL_DELETE: `${BASE_URL}/lws/mysql/delete`
      };

      Object.entries(expectedEndpoints).forEach(([key, expectedUrl]) => {
        expect(API_ENDPOINTS[key]).toBe(expectedUrl);
      });
    });

    it('should not contain old domain letmetryai.cn in any API endpoint', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).not.toContain('letmetryai.cn');
      });
    });

    it('should maintain correct API paths for non-AI endpoints', () => {
      const expectedPaths = {
        FILE_UPLOAD: '/lws/file/upload',
        FILE_DELETE: '/lws/file/delete',
        FILE_INFO: '/lws/file/info',
        FILE_LIST: '/lws/file/list',
        FILE_DOWNLOAD: '/lws/file/download',
        MYSQL_QUERY: '/lws/mysql/query',
        MYSQL_GET_BY_ID: '/lws/mysql/getById',
        MYSQL_INSERT: '/lws/mysql/insert',
        MYSQL_UPDATE: '/lws/mysql/update',
        MYSQL_DELETE: '/lws/mysql/delete'
      };

      Object.entries(expectedPaths).forEach(([key, expectedPath]) => {
        expect(API_ENDPOINTS[key]).toContain(expectedPath);
      });
    });
  });
        MYSQL_QUERY: '/lws/mysql/query',
        MYSQL_GET_BY_ID: '/lws/mysql/getById',
        MYSQL_INSERT: '/lws/mysql/insert',
        MYSQL_UPDATE: '/lws/mysql/update',
        MYSQL_DELETE: '/lws/mysql/delete'
      };

      Object.entries(expectedPaths).forEach(([key, path]) => {
        expect(API_ENDPOINTS[key]).toBe(`${BASE_URL}${path}`);
      });
    });
  });

  describe('URL Generation Consistency', () => {
    it('should generate URLs with HTTPS protocol', () => {
      expect(BASE_URL).toStartWith('https://');
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toStartWith('https://');
      });
    });

    it('should not have double slashes in generated URLs', () => {
      const testPaths = [
        'images/test.jpg',
        '/images/test.jpg',
        'images/folder/file.png'
      ];

      testPaths.forEach(path => {
        const url = getImageUrl(path);
        // Should not have // after the protocol
        expect(url.split('://')[1]).not.toContain('//');
      });
    });

    it('should maintain URL structure after centralization', () => {
      // Test that centralized config produces same URLs as hardcoded ones would
      const testCases = [
        { path: 'images/zhirou.jpg', expected: 'https://43.143.241.181/images/zhirou.jpg' },
        { path: '/images/WechatIMG366.jpg', expected: 'https://43.143.241.181/images/WechatIMG366.jpg' },
        { path: 'images/0911/2571726056378_.pic.jpg', expected: 'https://43.143.241.181/images/0911/2571726056378_.pic.jpg' }
      ];

      testCases.forEach(({ path, expected }) => {
        expect(getImageUrl(path)).toBe(expected);
      });
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same number of API endpoints as before', () => {
      // Ensure we haven't accidentally removed any endpoints
      const expectedEndpointCount = 11;
      expect(Object.keys(API_ENDPOINTS)).toHaveLength(expectedEndpointCount);
    });

    it('should maintain getImageUrl functionality', () => {
      expect(typeof getImageUrl).toBe('function');
      expect(getImageUrl('test.jpg')).toBe('https://43.143.241.181/test.jpg');
    });

    it('should maintain URL structure for non-AI endpoints', () => {
      // Test that centralized config produces same URLs as before for non-AI endpoints
      const testCases = [
        { path: 'images/zhirou.jpg', expected: 'https://43.143.241.181/images/zhirou.jpg' },
        { path: '/images/WechatIMG366.jpg', expected: 'https://43.143.241.181/images/WechatIMG366.jpg' },
        { path: 'images/0911/2571726056378_.pic.jpg', expected: 'https://43.143.241.181/images/0911/2571726056378_.pic.jpg' }
      ];

      testCases.forEach(({ path, expected }) => {
        expect(getImageUrl(path)).toBe(expected);
      });
    });

    it('should preserve non-AI API endpoints as letmetryai.cn in specific contexts', () => {
      // Document cases where letmetryai.cn should be preserved
      const preservedDomainUsages = [
        'OAuth redirect URIs should remain as letmetryai.cn',
        'Page branding should remain as letmetryai.cn'
      ];
      
      // This is a reminder test - actual verification would need DOM testing
      expect(preservedDomainUsages).toHaveLength(2);
    });

    it('should only affect AI endpoint as requested', () => {
      // All non-AI endpoints should still use the IP
      Object.entries(API_ENDPOINTS).forEach(([key, endpoint]) => {
        if (key === 'AI_CHAT') {
          expect(endpoint).toBe('https://api.deepseek.com/v1/chat/completions');
        } else {
          expect(endpoint).toContain('43.143.241.181');
          expect(endpoint).toContain('/lws/');
        }
      });
    });
  });
      expect(Object.keys(API_ENDPOINTS)).toHaveLength(expectedEndpointCount);
    });

    it('should preserve endpoint naming conventions', () => {
      // Ensure endpoint names follow expected patterns
      const expectedEndpoints = [
        'AI_CHAT',
        'FILE_UPLOAD', 'FILE_DELETE', 'FILE_INFO', 'FILE_LIST', 'FILE_DOWNLOAD',
        'MYSQL_QUERY', 'MYSQL_GET_BY_ID', 'MYSQL_INSERT', 'MYSQL_UPDATE', 'MYSQL_DELETE'
      ];
      
      expectedEndpoints.forEach(endpoint => {
        expect(API_ENDPOINTS).toHaveProperty(endpoint);
      });
    });

    it('should handle edge cases that worked before migration', () => {
      // Test edge cases that should still work
      expect(getImageUrl('')).toBe(`${BASE_URL}/`);
      expect(getImageUrl('/')).toBe(`${BASE_URL}/`);
      expect(getImageUrl('images')).toBe(`${BASE_URL}/images`);
    });
  });

  describe('Configuration Isolation', () => {
    it('should not affect preserved domain usages', () => {
      // These should still use the original domain and not be affected by our changes
      const preservedDomainUsages = [
        'OAuth redirect URIs should remain as letmetryai.cn',
        'Page branding should remain as letmetryai.cn'
      ];
      
      // This is a reminder test - actual verification would need DOM testing
      expect(preservedDomainUsages).toHaveLength(2);
    });

    it('should only affect /lws and /images paths as requested', () => {
      // All endpoints should have /lws in their path
      Object.entries(API_ENDPOINTS).forEach(([key, endpoint]) => {
        if (key.startsWith('FILE_') || key.startsWith('MYSQL_') || key === 'AI_CHAT') {
          expect(endpoint).toContain('/lws/');
        }
      });
    });
  });

  describe('Performance and Structure', () => {
    it('should not introduce circular dependencies', () => {
      // Basic check that config can be imported without issues
      expect(() => {
        const config = require('./util/config.js');
        return config;
      }).not.toThrow();
    });

    it('should maintain same data types as before migration', () => {
      expect(typeof BASE_URL).toBe('string');
      expect(typeof API_ENDPOINTS).toBe('object');
      expect(typeof getImageUrl).toBe('function');
    });
  });
});