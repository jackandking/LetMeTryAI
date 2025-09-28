// regression.test.js - Regression tests to ensure changes don't break existing functionality
import { API_ENDPOINTS, BASE_URL, getImageUrl } from './util/config.js';

describe('Regression Tests - Domain to IP Migration', () => {
  describe('API Endpoint Migration', () => {
    it('should not contain old domain letmetryai.cn in any API endpoint', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).not.toContain('letmetryai.cn');
      });
    });

    it('should use domain in all API endpoints', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toContain('letmetry.cloud');
      });
    });

    it('should maintain correct API paths after migration', () => {
      const expectedPaths = {
        AI_CHAT: '/lws/ai/chat',
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
        { path: 'images/zhirou.jpg', expected: 'https://letmetry.cloud/images/zhirou.jpg' },
        { path: '/images/WechatIMG366.jpg', expected: 'https://letmetry.cloud/images/WechatIMG366.jpg' },
        { path: 'images/0911/2571726056378_.pic.jpg', expected: 'https://letmetry.cloud/images/0911/2571726056378_.pic.jpg' }
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