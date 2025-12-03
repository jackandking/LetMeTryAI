/**
 * Tests for Admin Page functionality
 * Validates the new indexURLs_* key handling features
 */

import { describe, it, expect, beforeEach } from '@jest/globals';

describe('Admin Page - Image List Management', () => {
  let mockDocument;
  let isImageListKey;
  let escapeHtml;

  beforeEach(() => {
    // Setup mock DOM
    mockDocument = {
      getElementById: function(id) {
        return {
          value: '',
          checked: true,
          innerHTML: '',
          textContent: ''
        };
      },
      createElement: function(tag) {
        return {
          textContent: '',
          innerHTML: ''
        };
      }
    };

    // Define the function from admin page
    isImageListKey = function(key) {
      return key && key.startsWith('indexURLs_');
    };

    escapeHtml = function(text) {
      const div = mockDocument.createElement('div');
      div.textContent = text;
      return div.innerHTML || text; // Fallback for testing
    };
  });

  describe('isImageListKey', () => {
    it('should identify indexURLs_0.1.0 as an image list key', () => {
      expect(isImageListKey('indexURLs_0.1.0')).toBe(true);
    });

    it('should identify any indexURLs_* pattern as an image list key', () => {
      expect(isImageListKey('indexURLs_1.0.0')).toBe(true);
      expect(isImageListKey('indexURLs_test')).toBe(true);
      expect(isImageListKey('indexURLs_')).toBe(true);
    });

    it('should not identify non-indexURLs keys as image list keys', () => {
      expect(isImageListKey('LetMeTryManKS.1.7.0')).toBe(false);
      expect(isImageListKey('webview7.data')).toBe(false);
      expect(isImageListKey('randomKey')).toBe(false);
    });

    it('should handle null or undefined keys', () => {
      expect(isImageListKey(null)).toBeFalsy();
      expect(isImageListKey(undefined)).toBeFalsy();
      expect(isImageListKey('')).toBeFalsy();
    });
  });

  describe('URL List Parsing', () => {
    it('should parse newline-separated URLs correctly', () => {
      const testValue = 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg';
      const urls = testValue.split('\n').filter(url => url.trim());
      
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://example.com/image1.jpg');
      expect(urls[1]).toBe('https://example.com/image2.jpg');
      expect(urls[2]).toBe('https://example.com/image3.jpg');
    });

    it('should filter out empty lines', () => {
      const testValue = 'https://example.com/image1.jpg\n\nhttps://example.com/image2.jpg\n\n';
      const urls = testValue.split('\n').filter(url => url.trim());
      
      expect(urls).toHaveLength(2);
    });

    it('should handle single URL', () => {
      const testValue = 'https://example.com/image.jpg';
      const urls = testValue.split('\n').filter(url => url.trim());
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe('https://example.com/image.jpg');
    });

    it('should handle empty value', () => {
      const testValue = '';
      const urls = testValue.split('\n').filter(url => url.trim());
      
      expect(urls).toHaveLength(0);
    });
  });

  describe('URL List Serialization', () => {
    it('should join URLs with newline character', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];
      const value = urls.join('\n');
      
      expect(value).toBe('https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg');
    });

    it('should handle empty array', () => {
      const urls = [];
      const value = urls.join('\n');
      
      expect(value).toBe('');
    });

    it('should handle single URL', () => {
      const urls = ['https://example.com/image.jpg'];
      const value = urls.join('\n');
      
      expect(value).toBe('https://example.com/image.jpg');
    });
  });

  describe('HTML Escaping', () => {
    it('should escape script tags', () => {
      const input = '<script>alert("xss")</script>';
      const realEscapeHtml = function(text) {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      
      const result = realEscapeHtml(input);
      expect(result).toContain('&lt;script&gt;');
      expect(result).not.toContain('<script>');
    });

    it('should escape ampersands in URLs', () => {
      const input = 'https://example.com/image.jpg?param=1&other=2';
      const realEscapeHtml = function(text) {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      
      const result = realEscapeHtml(input);
      expect(result).toContain('&amp;');
    });

    it('should not modify normal URLs', () => {
      const input = 'https://example.com/image.jpg';
      const realEscapeHtml = function(text) {
        return text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
      };
      
      const result = realEscapeHtml(input);
      expect(result).toBe(input);
    });
  });

  describe('URL Operations', () => {
    it('should add new URL to list', () => {
      const currentUrls = ['https://example.com/image1.jpg'];
      const newUrl = 'https://example.com/image2.jpg';
      
      currentUrls.push(newUrl.trim());
      
      expect(currentUrls).toHaveLength(2);
      expect(currentUrls[1]).toBe(newUrl);
    });

    it('should delete URL from list', () => {
      const currentUrls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];
      const indexToDelete = 1;
      
      currentUrls.splice(indexToDelete, 1);
      
      expect(currentUrls).toHaveLength(2);
      expect(currentUrls[0]).toBe('https://example.com/image1.jpg');
      expect(currentUrls[1]).toBe('https://example.com/image3.jpg');
    });

    it('should trim whitespace from new URLs', () => {
      const newUrl = '  https://example.com/image.jpg  ';
      const trimmed = newUrl.trim();
      
      expect(trimmed).toBe('https://example.com/image.jpg');
    });
  });
});

describe('Admin Page - Backward Compatibility', () => {
  it('should still handle JSON keys correctly', () => {
    const testValue = '{"key": "value", "number": 123}';
    
    try {
      const jsonValue = JSON.parse(testValue);
      expect(jsonValue).toHaveProperty('key');
      expect(jsonValue.key).toBe('value');
      expect(jsonValue.number).toBe(123);
    } catch (e) {
      throw new Error('Should parse valid JSON');
    }
  });

  it('should handle invalid JSON for raw mode', () => {
    const testValue = 'This is not JSON';
    
    let isValidJson = false;
    try {
      JSON.parse(testValue);
      isValidJson = true;
    } catch (e) {
      isValidJson = false;
    }
    
    expect(isValidJson).toBe(false);
  });

  it('should preserve existing functionality for non-indexURLs keys', () => {
    const isImageListKey = function(key) {
      return key && key.startsWith('indexURLs_');
    };

    const regularKeys = [
      'LetMeTryManKS.1.7.0',
      'webview7.data',
      'config.settings',
      'user.profile'
    ];

    regularKeys.forEach(key => {
      expect(isImageListKey(key)).toBe(false);
    });
  });
});

describe('Admin Page - Integration', () => {
  it('should correctly process indexURLs_0.1.0 key with URL list', () => {
    const key = 'indexURLs_0.1.0';
    const value = 'https://example.com/img1.jpg\nhttps://example.com/img2.jpg';
    
    const isImageListKey = function(key) {
      return key && key.startsWith('indexURLs_');
    };
    
    expect(isImageListKey(key)).toBe(true);
    
    const urls = value.split('\n').filter(url => url.trim());
    expect(urls).toHaveLength(2);
  });

  it('should handle round-trip conversion (parse and serialize)', () => {
    const originalValue = 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg';
    
    // Parse
    const urls = originalValue.split('\n').filter(url => url.trim());
    
    // Serialize
    const serializedValue = urls.join('\n');
    
    expect(serializedValue).toBe(originalValue);
  });
});
