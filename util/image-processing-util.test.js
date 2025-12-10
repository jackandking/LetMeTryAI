/**
 * Tests for image processing utility
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { processImage, getProcessingStatus, validateImageForProcessing } from './image-processing-util.js';

// Mock fetch globally
global.fetch = jest.fn();

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
  
  // Set up window configuration
  global.window = global.window || {};
  global.window.BASE_URL = 'https://letmetry.cloud';
});

describe('Image Processing Utility', () => {
  describe('processImage', () => {
    it('should successfully process an image', async () => {
      const mockResponse = {
        success: true,
        processedImageUrl: 'https://letmetry.cloud/processed-image.png',
        processingTime: 1500,
        metadata: { width: 800, height: 600 }
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await processImage('https://letmetry.cloud/original.jpg');

      expect(result).toBeDefined();
      expect(result.processedImageUrl).toBe(mockResponse.processedImageUrl);
      expect(result.originalImageUrl).toBe('https://letmetry.cloud/original.jpg');
      expect(result.processingTime).toBe(1500);
    });

    it('should throw error when imageUrl is not provided', async () => {
      await expect(processImage('')).rejects.toThrow('Image URL is required');
    });

    it('should throw error when API request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(processImage('https://letmetry.cloud/test.jpg'))
        .rejects.toThrow('Image processing failed: 500');
    });

    it('should throw error when API returns error response', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Processing failed'
        })
      });

      await expect(processImage('https://letmetry.cloud/test.jpg'))
        .rejects.toThrow('Processing failed');
    });

    it('should use centralized configuration', async () => {
      const mockResponse = {
        success: true,
        processedImageUrl: 'https://letmetry.cloud/processed.png',
        processingTime: 1000,
        metadata: {}
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await processImage('https://letmetry.cloud/test.jpg');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('letmetry.cloud'),
        expect.any(Object)
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/lws/image/process'),
        expect.any(Object)
      );
    });

    it('should send correct options to API', async () => {
      const mockResponse = {
        success: true,
        processedImageUrl: 'https://letmetry.cloud/processed.png',
        processingTime: 1000,
        metadata: {}
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const options = {
        mode: 'eraser',
        preservePinyin: true,
        preserveGrid: false
      };

      await processImage('https://letmetry.cloud/test.jpg', options);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('"preserveGrid":false')
        })
      );
    });
  });

  describe('getProcessingStatus', () => {
    it('should get processing status successfully', async () => {
      const mockResponse = {
        status: 'completed',
        progress: 100
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getProcessingStatus('task-123');

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('task-123'),
        expect.objectContaining({ method: 'GET' })
      );
    });

    it('should throw error when taskId is not provided', async () => {
      await expect(getProcessingStatus('')).rejects.toThrow('Task ID is required');
    });

    it('should throw error when status request fails', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(getProcessingStatus('task-123'))
        .rejects.toThrow('Failed to get processing status');
    });
  });

  describe('validateImageForProcessing', () => {
    it('should validate valid images', () => {
      const validFile = new File(['content'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageForProcessing(validFile);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept PNG images', () => {
      const pngFile = new File(['content'], 'test.png', { type: 'image/png' });
      const result = validateImageForProcessing(pngFile);

      expect(result.isValid).toBe(true);
    });

    it('should reject invalid file types', () => {
      const invalidFile = new File(['content'], 'test.gif', { type: 'image/gif' });
      const result = validateImageForProcessing(invalidFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Invalid file type');
    });

    it('should reject files larger than 10MB', () => {
      const largeFile = new File(
        [new ArrayBuffer(11 * 1024 * 1024)],
        'large.jpg',
        { type: 'image/jpeg' }
      );
      const result = validateImageForProcessing(largeFile);

      expect(result.isValid).toBe(false);
      expect(result.error).toContain('10MB limit');
    });

    it('should reject when no file is provided', () => {
      const result = validateImageForProcessing(null);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('No file provided');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      global.fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(processImage('https://letmetry.cloud/test.jpg'))
        .rejects.toThrow('Network error');
    });

    it('should handle invalid JSON responses', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(processImage('https://letmetry.cloud/test.jpg'))
        .rejects.toThrow('Invalid JSON');
    });
  });

  describe('Configuration Integration', () => {
    it('should use IMAGE_PROCESS endpoint from configuration', async () => {
      const mockResponse = {
        success: true,
        processedImageUrl: 'https://letmetry.cloud/processed.png',
        processingTime: 1000,
        metadata: {}
      };

      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await processImage('https://letmetry.cloud/test.jpg');

      expect(global.fetch).toHaveBeenCalledWith(
        'https://letmetry.cloud/lws/image/process',
        expect.any(Object)
      );
    });
  });
});
