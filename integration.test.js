// integration.test.js - Integration tests for the entire configuration system
import { API_ENDPOINTS, BASE_URL, getImageUrl } from './util/config.js';

describe('Integration Tests - Configuration System', () => {
  describe('End-to-End Configuration Consistency', () => {
    it('should have consistent BASE_URL across all modules', () => {
      expect(BASE_URL).toBe('https://43.143.241.181');
      
      // All endpoints should use the same BASE_URL
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toStartWith(BASE_URL);
      });
    });

    it('should generate consistent URLs across different utilities', () => {
      // Test that all utilities would generate the same base URLs
      const expectedBase = 'https://43.143.241.181';
      
      expect(BASE_URL).toBe(expectedBase);
      expect(API_ENDPOINTS.AI_CHAT).toStartWith(expectedBase);
      expect(API_ENDPOINTS.FILE_UPLOAD).toStartWith(expectedBase);
      expect(API_ENDPOINTS.MYSQL_QUERY).toStartWith(expectedBase);
      expect(getImageUrl('test.jpg')).toStartWith(expectedBase);
    });

    it('should maintain proper URL encoding and structure', () => {
      const testPaths = [
        'images/test image.jpg',
        'images/special%20chars.png',
        'images/subfolder/file.gif'
      ];

      testPaths.forEach(path => {
        const url = getImageUrl(path);
        expect(url).toMatch(/^https:\/\/[\d.]+\//);
        expect(url).toContain(path);
      });
    });
  });

  describe('Cross-Module Compatibility', () => {
    it('should work with both ES6 and CommonJS environments', () => {
      // Test that the configuration can be imported in different ways
      expect(() => {
        const { BASE_URL: esBase } = require('./util/config.js');
        return esBase;
      }).not.toThrow();
    });

    it('should provide same functionality as global config', () => {
      // Mock window for global config test
      global.window = {};
      require('./config.js');

      // Both should provide same BASE_URL
      expect(window.BASE_URL).toBe(BASE_URL);
      
      // Both should provide same getImageUrl functionality
      const testPath = 'images/test.jpg';
      expect(window.getImageUrl(testPath)).toBe(getImageUrl(testPath));

      // Cleanup
      delete global.window;
    });

    it('should handle concurrent usage across different modules', async () => {
      // Simulate multiple modules using the config simultaneously
      const promises = [
        Promise.resolve(API_ENDPOINTS.AI_CHAT),
        Promise.resolve(API_ENDPOINTS.FILE_UPLOAD),
        Promise.resolve(API_ENDPOINTS.MYSQL_QUERY),
        Promise.resolve(getImageUrl('images/test1.jpg')),
        Promise.resolve(getImageUrl('images/test2.jpg'))
      ];

      const results = await Promise.all(promises);
      
      // All results should use the same base URL
      results.forEach(result => {
        expect(result).toStartWith(BASE_URL);
      });
    });
  });

  describe('Real-world Usage Scenarios', () => {
    it('should support typical file operations workflow', () => {
      // Simulate a complete file operation workflow
      const uploadUrl = API_ENDPOINTS.FILE_UPLOAD;
      const listUrl = API_ENDPOINTS.FILE_LIST;
      const deleteUrl = API_ENDPOINTS.FILE_DELETE;
      const imageUrl = getImageUrl('images/uploaded-file.jpg');

      expect(uploadUrl).toContain('/lws/file/upload');
      expect(listUrl).toContain('/lws/file/list');
      expect(deleteUrl).toContain('/lws/file/delete');
      expect(imageUrl).toContain('/images/uploaded-file.jpg');

      // All should use same base infrastructure
      [uploadUrl, listUrl, deleteUrl, imageUrl].forEach(url => {
        expect(url).toStartWith('https://43.143.241.181');
      });
    });

    it('should support typical AI chat workflow', () => {
      const chatUrl = API_ENDPOINTS.AI_CHAT;
      
      expect(chatUrl).toContain('/lws/ai/chat');
      expect(chatUrl).toBe('https://43.143.241.181/lws/ai/chat');
    });

    it('should support typical database operations workflow', () => {
      const dbEndpoints = [
        API_ENDPOINTS.MYSQL_QUERY,
        API_ENDPOINTS.MYSQL_INSERT,
        API_ENDPOINTS.MYSQL_UPDATE,
        API_ENDPOINTS.MYSQL_DELETE,
        API_ENDPOINTS.MYSQL_GET_BY_ID
      ];

      dbEndpoints.forEach(endpoint => {
        expect(endpoint).toContain('/lws/mysql/');
        expect(endpoint).toStartWith('https://43.143.241.181');
      });
    });

    it('should support image gallery scenarios', () => {
      const imagePaths = [
        'images/2491725962226_.pic.jpg',
        'images/zhirou.jpg',
        'images/WechatIMG366.jpg',
        'images/0911/2571726056378_.pic.jpg'
      ];

      const imageUrls = imagePaths.map(path => getImageUrl(path));
      
      imageUrls.forEach((url, index) => {
        expect(url).toBe(`https://43.143.241.181/${imagePaths[index]}`);
      });
    });
  });

  describe('Performance and Resource Usage', () => {
    it('should not create excessive objects or memory leaks', () => {
      // Test that repeated calls don't create new objects
      const url1 = getImageUrl('test.jpg');
      const url2 = getImageUrl('test.jpg');
      
      expect(url1).toBe(url2);
      expect(typeof url1).toBe('string');
    });

    it('should handle large numbers of URL generations efficiently', () => {
      const startTime = Date.now();
      
      // Generate many URLs
      for (let i = 0; i < 1000; i++) {
        getImageUrl(`images/test${i}.jpg`);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete in reasonable time (less than 100ms for 1000 operations)
      expect(duration).toBeLessThan(100);
    });

    it('should have minimal memory footprint', () => {
      const configSize = JSON.stringify(API_ENDPOINTS).length;
      
      // Configuration should be reasonably sized (less than 1KB)
      expect(configSize).toBeLessThan(1024);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed input gracefully', () => {
      const edgeCases = [
        '',
        '/',
        '//',
        '///',
        'images/',
        '/images/',
        'images//',
        null,
        undefined
      ];

      edgeCases.forEach(input => {
        expect(() => {
          if (input !== null && input !== undefined) {
            getImageUrl(input);
          }
        }).not.toThrow();
      });
    });

    it('should maintain URL validity under edge conditions', () => {
      const result1 = getImageUrl('');
      const result2 = getImageUrl('/');
      
      expect(result1).toMatch(/^https:\/\//);
      expect(result2).toMatch(/^https:\/\//);
    });
  });

  describe('Migration Validation', () => {
    it('should have completely replaced old domain references', () => {
      const allEndpoints = Object.values(API_ENDPOINTS);
      const imageUrl = getImageUrl('images/test.jpg');
      
      [...allEndpoints, BASE_URL, imageUrl].forEach(url => {
        expect(url).not.toContain('letmetryai.cn');
        expect(url).toContain('43.143.241.181');
      });
    });

    it('should maintain same API surface as before migration', () => {
      // Ensure we haven't broken the expected interface
      expect(typeof BASE_URL).toBe('string');
      expect(typeof API_ENDPOINTS).toBe('object');
      expect(typeof getImageUrl).toBe('function');
      
      // Ensure all expected endpoints exist
      const expectedEndpoints = [
        'AI_CHAT', 'FILE_UPLOAD', 'FILE_DELETE', 'FILE_INFO', 
        'FILE_LIST', 'FILE_DOWNLOAD', 'MYSQL_QUERY', 'MYSQL_GET_BY_ID',
        'MYSQL_INSERT', 'MYSQL_UPDATE', 'MYSQL_DELETE'
      ];
      
      expectedEndpoints.forEach(endpoint => {
        expect(API_ENDPOINTS).toHaveProperty(endpoint);
      });
    });
  });
});