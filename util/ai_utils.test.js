// ai_utils.test.js - Unit tests for AI utility functions
import { API_ENDPOINT, sendChatMessage, generateInnovativePrompt } from './ai_utils';
import { API_ENDPOINTS } from './config';

// Mock fetch
global.fetch = jest.fn();
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
};

describe('AI Utilities', () => {
  beforeEach(() => {
    fetch.mockClear();
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('API_ENDPOINT', () => {
    it('should use centralized configuration', () => {
      expect(API_ENDPOINT).toBe(API_ENDPOINTS.AI_CHAT);
    });

    it('should use correct domain and path', () => {
      expect(API_ENDPOINT).toBe('https://letmetry.cloud/lws/ai/chat');
      expect(API_ENDPOINT).toContain('/lws/ai/chat');
      expect(API_ENDPOINT).not.toContain('letmetryai.cn');
    });
  });

  describe('sendChatMessage', () => {
    it('should send a message successfully', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          response: 'AI response',
          timestamp: '2023-01-01T00:00:00Z'
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await sendChatMessage('test message');

      expect(fetch).toHaveBeenCalledWith(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'test message' })
      });

      expect(result).toEqual({
        response: 'AI response',
        timestamp: '2023-01-01T00:00:00Z'
      });
    });

    it('should throw error for empty message', async () => {
      await expect(sendChatMessage('')).rejects.toThrow('Invalid parameters provided');
      await expect(sendChatMessage(null)).rejects.toThrow('Invalid parameters provided');
      await expect(sendChatMessage(undefined)).rejects.toThrow('Invalid parameters provided');
    });

    it('should handle HTTP errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      await expect(sendChatMessage('test')).rejects.toThrow('Request to AI chat API failed');
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: false,
          error: 'API specific error'
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(sendChatMessage('test')).rejects.toThrow('API specific error');
    });

    it('should use centralized endpoint configuration', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ success: true, response: 'test', timestamp: 'now' })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await sendChatMessage('test');

      expect(fetch).toHaveBeenCalledWith(API_ENDPOINTS.AI_CHAT, expect.any(Object));
    });
  });

  describe('generateInnovativePrompt', () => {
    it('should generate innovative prompt successfully', (done) => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          response: 'Enhanced creative prompt',
          timestamp: 'now'
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      generateInnovativePrompt('base prompt', 0.5, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe('Enhanced creative prompt');
        done();
      });
    });

    it('should validate parameters', (done) => {
      generateInnovativePrompt('', 0.5, (error, result) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Invalid parameters');
        done();
      });
    });

    it('should validate creativity factor range', (done) => {
      generateInnovativePrompt('test', 1.5, (error, result) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Invalid parameters');
        done();
      });
    });

    it('should handle sendChatMessage errors', (done) => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      generateInnovativePrompt('base prompt', 0.5, (error, result) => {
        expect(error).toBeInstanceOf(Error);
        expect(result).toBeUndefined();
        done();
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should not use hardcoded endpoints', () => {
      expect(API_ENDPOINT).not.toContain('letmetryai.cn');
      expect(API_ENDPOINT).toContain('letmetry.cloud');
    });

    it('should maintain HTTPS protocol', () => {
      expect(API_ENDPOINT).toStartWith('https://');
    });

    it('should use correct API path structure', () => {
      expect(API_ENDPOINT).toMatch(/^https:\/\/letmetry\.cloud\/lws\/ai\/chat$/);
    });
  });
});