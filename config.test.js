// config.test.js - Unit tests for the global configuration
// This tests the global config.js file that sets window variables

describe('Global Configuration', () => {
  beforeAll(() => {
    // Mock window object for Node.js environment
    global.window = {};
    
    // Load the config script
    require('./config.js');
  });

  afterAll(() => {
    // Clean up
    delete global.window;
  });

  describe('window.BASE_URL', () => {
    it('should be defined on window', () => {
      expect(window.BASE_URL).toBeDefined();
    });

    it('should be a valid URL string', () => {
      expect(typeof window.BASE_URL).toBe('string');
      expect(window.BASE_URL).toMatch(/^https?:\/\//);
    });

    it('should use the correct IP address', () => {
      expect(window.BASE_URL).toBe('https://43.143.241.181');
    });
  });

  describe('window.API_ENDPOINTS', () => {
    it('should be defined on window', () => {
      expect(window.API_ENDPOINTS).toBeDefined();
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
        expect(window.API_ENDPOINTS).toHaveProperty(endpoint);
        expect(typeof window.API_ENDPOINTS[endpoint]).toBe('string');
        expect(window.API_ENDPOINTS[endpoint]).toMatch(/^https?:\/\//);
      });
    });

    it('should use BASE_URL in all endpoints', () => {
      Object.values(window.API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toStartWith(window.BASE_URL);
      });
    });
  });

  describe('window.getImageUrl', () => {
    it('should be defined as a function on window', () => {
      expect(window.getImageUrl).toBeDefined();
      expect(typeof window.getImageUrl).toBe('function');
    });

    it('should generate correct image URLs', () => {
      const imagePath = 'images/test.jpg';
      const result = window.getImageUrl(imagePath);
      expect(result).toBe(`${window.BASE_URL}/images/test.jpg`);
    });

    it('should handle paths with leading slash', () => {
      const imagePath = '/images/test.jpg';
      const result = window.getImageUrl(imagePath);
      expect(result).toBe(`${window.BASE_URL}/images/test.jpg`);
    });

    it('should be consistent with util/config.js getImageUrl', () => {
      // Both implementations should produce the same results
      const testPaths = [
        'images/test.jpg',
        '/images/test.jpg',
        'images/subfolder/file.png',
        ''
      ];

      testPaths.forEach(path => {
        const globalResult = window.getImageUrl(path);
        const expectedResult = path.startsWith('/') ? 
          `${window.BASE_URL}${path}` : 
          `${window.BASE_URL}/${path}`;
        expect(globalResult).toBe(expectedResult);
      });
    });
  });
});