// config.test.js - Unit tests for the configuration module
import { BASE_URL, API_ENDPOINTS, getImageUrl } from './config.js';

describe('Configuration Module', () => {
  describe('BASE_URL', () => {
    it('should be defined', () => {
      expect(BASE_URL).toBeDefined();
    });

    it('should be a valid URL string', () => {
      expect(typeof BASE_URL).toBe('string');
      expect(BASE_URL).toMatch(/^https?:\/\//);
    });

    it('should use the correct IP address', () => {
      expect(BASE_URL).toBe('https://43.143.241.181');
    });
  });

  describe('API_ENDPOINTS', () => {
    it('should be defined', () => {
      expect(API_ENDPOINTS).toBeDefined();
    });

    it('should contain all required endpoints', () => {
      const requiredEndpoints = [
        'AI_CHAT',
        'FILE_UPLOAD',
        'FILE_DELETE',
        'FILE_INFO',
        'FILE_LIST',
        'FILE_DOWNLOAD',
        'MYSQL_QUERY',
        'MYSQL_GET_BY_ID',
        'MYSQL_INSERT',
        'MYSQL_UPDATE',
        'MYSQL_DELETE'
      ];

      requiredEndpoints.forEach(endpoint => {
        expect(API_ENDPOINTS).toHaveProperty(endpoint);
        expect(typeof API_ENDPOINTS[endpoint]).toBe('string');
        expect(API_ENDPOINTS[endpoint]).toMatch(/^https?:\/\//);
      });
    });

    it('should use BASE_URL in all endpoints', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toStartWith(BASE_URL);
      });
    });

    it('should have correct API paths', () => {
      expect(API_ENDPOINTS.AI_CHAT).toBe(`${BASE_URL}/lws/ai/chat`);
      expect(API_ENDPOINTS.FILE_UPLOAD).toBe(`${BASE_URL}/lws/file/upload`);
      expect(API_ENDPOINTS.FILE_DELETE).toBe(`${BASE_URL}/lws/file/delete`);
      expect(API_ENDPOINTS.MYSQL_QUERY).toBe(`${BASE_URL}/lws/mysql/query`);
    });
  });

  describe('getImageUrl', () => {
    it('should be defined as a function', () => {
      expect(getImageUrl).toBeDefined();
      expect(typeof getImageUrl).toBe('function');
    });

    it('should generate correct image URLs', () => {
      const imagePath = 'images/test.jpg';
      const result = getImageUrl(imagePath);
      expect(result).toBe(`${BASE_URL}/images/test.jpg`);
    });

    it('should handle paths with leading slash', () => {
      const imagePath = '/images/test.jpg';
      const result = getImageUrl(imagePath);
      expect(result).toBe(`${BASE_URL}/images/test.jpg`);
    });

    it('should handle paths without leading slash', () => {
      const imagePath = 'images/test.jpg';
      const result = getImageUrl(imagePath);
      expect(result).toBe(`${BASE_URL}/images/test.jpg`);
    });

    it('should handle empty string', () => {
      const result = getImageUrl('');
      expect(result).toBe(BASE_URL + '/');
    });

    it('should handle nested paths', () => {
      const imagePath = 'images/subfolder/test.jpg';
      const result = getImageUrl(imagePath);
      expect(result).toBe(`${BASE_URL}/images/subfolder/test.jpg`);
    });
  });
});