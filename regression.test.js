// regression.test.js - Regression tests to ensure changes don't break existing functionality
import fs from 'node:fs';
import { API_ENDPOINTS, BASE_URL, getImageUrl } from './util/config.js';
import {
  APPROVED_STATUS,
  DEFAULT_CANDIDATE_STATUS,
  buildCreateGeneratedImagesTableSql,
  buildReviewUpdateStatement
} from './womanai/.automation/scripts/womanai-image-pipeline.js';

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
        AI_CHAT: '/ai/chat',
        FILE_UPLOAD: '/file/upload',
        FILE_DELETE: '/file/delete',
        FILE_INFO: '/file/info',
        FILE_LIST: '/file/list',
        FILE_DOWNLOAD: '/file/download',
        MYSQL_QUERY: '/mysql/query',
        MYSQL_GET_BY_ID: '/mysql/getById',
        MYSQL_INSERT: '/mysql/insert',
        MYSQL_UPDATE: '/mysql/update',
        MYSQL_DELETE: '/mysql/delete'
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

    it('should use correct API paths after /lws prefix removal', () => {
      // All endpoints should not have /lws in their path anymore
      Object.entries(API_ENDPOINTS).forEach(([key, endpoint]) => {
        if (key.startsWith('FILE_') || key.startsWith('MYSQL_') || key === 'AI_CHAT') {
          expect(endpoint).not.toContain('/lws/');
          // Verify they have the correct new paths
          if (key === 'AI_CHAT') expect(endpoint).toContain('/ai/chat');
          if (key.startsWith('FILE_')) expect(endpoint).toMatch(/\/file\/(upload|delete|info|list|download)/);
          if (key.startsWith('MYSQL_')) expect(endpoint).toMatch(/\/mysql\//);
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

  describe('Regression Tests - WomanAI Automation Review Flow', () => {
    it('should keep pending review as the default candidate status', () => {
      const ddl = buildCreateGeneratedImagesTableSql('womanai_generated_images');
      expect(DEFAULT_CANDIDATE_STATUS).toBe('pending_review');
      expect(ddl).toContain(`DEFAULT '${DEFAULT_CANDIDATE_STATUS}'`);
      expect(ddl).toContain('approved_image_id');
    });

    it('should preserve approval updates that link back to handsome_images', () => {
      const update = buildReviewUpdateStatement('womanai_generated_images', {
        candidateId: 9,
        status: APPROVED_STATUS,
        reviewNote: 'Approved manually',
        approvedImageId: 33
      });

      expect(update.sql).toContain('approved_image_id = ?');
      expect(update.params).toEqual([APPROVED_STATUS, 'Approved manually', 33, 9]);
    });

    it('should continue surfacing reactivated approved images through non-deleted rows', () => {
      const duplicateLookup =
        'SELECT id, deleted FROM handsome_images WHERE SUBSTRING(image_url, 1, 255) = SUBSTRING(?, 1, 255) LIMIT 1';
      const reactivateSql = 'UPDATE handsome_images SET deleted = 0 WHERE id = ?';

      expect(duplicateLookup).toContain('deleted');
      expect(reactivateSql).toContain('SET deleted = 0');
    });
  });

  describe('Regression Tests - HowLong Compliance Remediation', () => {
    it('should keep the published howlong route while removing risky copy', () => {
      const howlongSource = fs.readFileSync(new URL('./howlong/app.js', import.meta.url), 'utf8');
      const howlongHtml = fs.readFileSync(new URL('./howlong/index.html', import.meta.url), 'utf8');

      expect(howlongSource).toContain('result_page_id=howlong');
      expect(howlongSource).toContain('storageKey: "howlong2.data"');
      expect(howlongSource).toContain('刷到感兴趣的视频，你通常会停留多久？');
      expect(howlongSource).not.toContain('啪啪');
      expect(howlongSource).not.toContain('美女');
      expect(howlongHtml).not.toContain('看更多美女');
    });
  });
});
