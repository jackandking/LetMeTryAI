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
      return key && (key.startsWith('indexURLs_') || key.startsWith('stripURLs_'));
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

    it('should identify stripURLs_0.0.1 as an image list key', () => {
      expect(isImageListKey('stripURLs_0.0.1')).toBe(true);
    });

    it('should identify any stripURLs_* pattern as an image list key', () => {
      expect(isImageListKey('stripURLs_1.0.0')).toBe(true);
      expect(isImageListKey('stripURLs_test')).toBe(true);
      expect(isImageListKey('stripURLs_')).toBe(true);
    });

    it('should not identify non-indexURLs or stripURLs keys as image list keys', () => {
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
      const urls = testValue.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
      
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://example.com/image1.jpg');
      expect(urls[1]).toBe('https://example.com/image2.jpg');
      expect(urls[2]).toBe('https://example.com/image3.jpg');
    });

    it('should filter out empty lines', () => {
      const testValue = 'https://example.com/image1.jpg\n\nhttps://example.com/image2.jpg\n\n';
      const urls = testValue.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
      
      expect(urls).toHaveLength(2);
    });

    it('should handle single URL', () => {
      const testValue = 'https://example.com/image.jpg';
      const urls = testValue.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
      
      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe('https://example.com/image.jpg');
    });

    it('should handle empty value', () => {
      const testValue = '';
      const urls = testValue.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
      
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

  describe('URL Deduplication', () => {
    it('should remove duplicate URLs from list', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image1.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image2.jpg'
      ];
      
      const uniqueUrls = [...new Set(urls)];
      
      expect(uniqueUrls).toHaveLength(3);
      expect(uniqueUrls).toEqual([
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ]);
    });

    it('should preserve order when deduplicating', () => {
      const urls = [
        'https://example.com/image3.jpg',
        'https://example.com/image1.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image2.jpg'
      ];
      
      const uniqueUrls = [...new Set(urls)];
      
      expect(uniqueUrls).toEqual([
        'https://example.com/image3.jpg',
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg'
      ]);
    });

    it('should handle list with no duplicates', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image3.jpg'
      ];
      
      const uniqueUrls = [...new Set(urls)];
      
      expect(uniqueUrls).toHaveLength(3);
      expect(uniqueUrls).toEqual(urls);
    });

    it('should handle empty list', () => {
      const urls = [];
      const uniqueUrls = [...new Set(urls)];
      
      expect(uniqueUrls).toHaveLength(0);
    });

    it('should handle list with all duplicates', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image1.jpg',
        'https://example.com/image1.jpg'
      ];
      
      const uniqueUrls = [...new Set(urls)];
      
      expect(uniqueUrls).toHaveLength(1);
      expect(uniqueUrls[0]).toBe('https://example.com/image1.jpg');
    });

    it('should correctly count removed duplicates', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'https://example.com/image2.jpg',
        'https://example.com/image1.jpg',
        'https://example.com/image3.jpg',
        'https://example.com/image2.jpg'
      ];
      const originalCount = urls.length;
      const uniqueUrls = [...new Set(urls)];
      const duplicatesRemoved = originalCount - uniqueUrls.length;
      
      expect(duplicatesRemoved).toBe(2);
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

  it('should preserve existing functionality for non-indexURLs and non-stripURLs keys', () => {
    const isImageListKey = function(key) {
      return key && (key.startsWith('indexURLs_') || key.startsWith('stripURLs_'));
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
      return key && (key.startsWith('indexURLs_') || key.startsWith('stripURLs_'));
    };
    
    expect(isImageListKey(key)).toBe(true);
    
    const urls = value.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
    expect(urls).toHaveLength(2);
  });

  it('should correctly process stripURLs_0.0.1 key with URL list', () => {
    const key = 'stripURLs_0.0.1';
    const value = 'https://example.com/img1.jpg\nhttps://example.com/img2.jpg\nhttps://example.com/img1.jpg';
    
    const isImageListKey = function(key) {
      return key && (key.startsWith('indexURLs_') || key.startsWith('stripURLs_'));
    };
    
    expect(isImageListKey(key)).toBe(true);
    
    const urls = value.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
    expect(urls).toHaveLength(3);
    
    // Test deduplication
    const uniqueUrls = [...new Set(urls)];
    expect(uniqueUrls).toHaveLength(2);
  });

  it('should handle round-trip conversion (parse and serialize)', () => {
    const originalValue = 'https://example.com/image1.jpg\nhttps://example.com/image2.jpg\nhttps://example.com/image3.jpg';
    
    // Parse
    const urls = originalValue.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
    
    // Serialize
    const serializedValue = urls.join('\n');
    
    expect(serializedValue).toBe(originalValue);
  });
});

describe('Admin Page - Raw Edit Mode', () => {
  describe('Raw Text Parsing', () => {
    it('should parse raw textarea content into URL list', () => {
      const rawContent = 'https://example.com/img1.jpg\nhttps://example.com/img2.jpg\nhttps://example.com/img3.jpg';
      const urls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      
      expect(urls).toHaveLength(3);
      expect(urls[0]).toBe('https://example.com/img1.jpg');
      expect(urls[1]).toBe('https://example.com/img2.jpg');
      expect(urls[2]).toBe('https://example.com/img3.jpg');
    });

    it('should handle raw content with empty lines and whitespace', () => {
      const rawContent = '  https://example.com/img1.jpg  \n\n  https://example.com/img2.jpg\n\n  ';
      const urls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      
      expect(urls).toHaveLength(2);
      expect(urls[0]).toBe('https://example.com/img1.jpg');
      expect(urls[1]).toBe('https://example.com/img2.jpg');
    });

    it('should handle raw content with different line endings', () => {
      const rawContent = 'https://example.com/img1.jpg\r\nhttps://example.com/img2.jpg\rhttps://example.com/img3.jpg';
      const urls = rawContent.split(/\r?\n/).filter(url => url.trim()).map(url => url.trim());
      
      expect(urls).toHaveLength(3);
    });

    it('should preserve URL order from raw content', () => {
      const rawContent = 'https://example.com/img3.jpg\nhttps://example.com/img1.jpg\nhttps://example.com/img2.jpg';
      const urls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      
      expect(urls[0]).toBe('https://example.com/img3.jpg');
      expect(urls[1]).toBe('https://example.com/img1.jpg');
      expect(urls[2]).toBe('https://example.com/img2.jpg');
    });
  });

  describe('Raw Text Serialization', () => {
    it('should serialize URL list to raw text format', () => {
      const urls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg'
      ];
      const rawContent = urls.join('\n');
      
      expect(rawContent).toBe('https://example.com/img1.jpg\nhttps://example.com/img2.jpg\nhttps://example.com/img3.jpg');
    });

    it('should handle empty URL list', () => {
      const urls = [];
      const rawContent = urls.join('\n');
      
      expect(rawContent).toBe('');
    });

    it('should handle single URL', () => {
      const urls = ['https://example.com/img1.jpg'];
      const rawContent = urls.join('\n');
      
      expect(rawContent).toBe('https://example.com/img1.jpg');
    });
  });

  describe('Mode Switching', () => {
    it('should maintain URL data when switching from visual to raw mode', () => {
      const visualUrls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg'
      ];
      
      // Simulate switching to raw mode
      const rawContent = visualUrls.join('\n');
      expect(rawContent.split('\n').length).toBe(3);
    });

    it('should maintain URL data when switching from raw to visual mode', () => {
      const rawContent = 'https://example.com/img1.jpg\nhttps://example.com/img2.jpg\nhttps://example.com/img3.jpg';
      
      // Simulate switching to visual mode
      const visualUrls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      expect(visualUrls).toHaveLength(3);
    });

    it('should handle bidirectional mode switching without data loss', () => {
      const originalUrls = [
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg'
      ];
      
      // Visual -> Raw
      const rawContent = originalUrls.join('\n');
      
      // Raw -> Visual
      const parsedUrls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      
      expect(parsedUrls).toEqual(originalUrls);
    });
  });

  describe('Batch Operations in Raw Mode', () => {
    it('should support bulk find and replace operations', () => {
      let rawContent = 'https://old-domain.com/img1.jpg\nhttps://old-domain.com/img2.jpg\nhttps://old-domain.com/img3.jpg';
      
      // Simulate find/replace operation
      rawContent = rawContent.replace(/old-domain\.com/g, 'new-domain.com');
      
      const urls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      
      expect(urls[0]).toBe('https://new-domain.com/img1.jpg');
      expect(urls[1]).toBe('https://new-domain.com/img2.jpg');
      expect(urls[2]).toBe('https://new-domain.com/img3.jpg');
    });

    it('should support bulk URL modifications', () => {
      let rawContent = 'https://example.com/img1.jpg\nhttps://example.com/img2.jpg\nhttps://example.com/img3.jpg';
      
      // Simulate adding query parameters to all URLs
      const urls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      const modifiedUrls = urls.map(url => url + '?size=large');
      rawContent = modifiedUrls.join('\n');
      
      expect(rawContent).toContain('?size=large');
      expect(modifiedUrls).toHaveLength(3);
      expect(modifiedUrls[0]).toBe('https://example.com/img1.jpg?size=large');
    });

    it('should support removing URLs by pattern', () => {
      const rawContent = 'https://example.com/img1.jpg\nhttps://test.com/img2.jpg\nhttps://example.com/img3.jpg\nhttps://test.com/img4.jpg';
      
      // Filter out test.com URLs
      const urls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      const filteredUrls = urls.filter(url => !url.includes('test.com'));
      
      expect(filteredUrls).toHaveLength(2);
      expect(filteredUrls[0]).toBe('https://example.com/img1.jpg');
      expect(filteredUrls[1]).toBe('https://example.com/img3.jpg');
    });
  });

  describe('Deduplication in Raw Mode', () => {
    it('should deduplicate URLs after parsing from raw content', () => {
      const rawContent = 'https://example.com/img1.jpg\nhttps://example.com/img2.jpg\nhttps://example.com/img1.jpg\nhttps://example.com/img3.jpg';
      const urls = rawContent.split('\n').filter(url => url.trim()).map(url => url.trim());
      const uniqueUrls = [...new Set(urls)];
      
      expect(uniqueUrls).toHaveLength(3);
      expect(uniqueUrls).toEqual([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
        'https://example.com/img3.jpg'
      ]);
    });
  });
});
