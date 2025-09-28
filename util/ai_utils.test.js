// ai_utils.test.js - Unit tests for AI utility functions with DeepSeek API
import { API_ENDPOINT, sendChatMessage, generateInnovativePrompt, ERROR_MESSAGES } from './ai_utils';
import { API_ENDPOINTS } from './config';

// Mock fetch
global.fetch = jest.fn();
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn()
};

// Mock process.env
const originalEnv = process.env;

describe('AI Utilities - DeepSeek Integration', () => {
  beforeEach(() => {
    fetch.mockClear();
    console.log.mockClear();
    console.error.mockClear();
    
    // Reset environment
    process.env = { ...originalEnv };
    process.env.DEEPSEEK_API_KEY = 'test-api-key-12345';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('API_ENDPOINT', () => {
    it('should use DeepSeek API URL', () => {
      expect(API_ENDPOINT).toBe(API_ENDPOINTS.AI_CHAT);
      expect(API_ENDPOINT).toBe('https://api.deepseek.com/v1/chat/completions');
    });

    it('should not use old proxy endpoint', () => {
      expect(API_ENDPOINT).not.toContain('/lws/ai/chat');
      expect(API_ENDPOINT).not.toContain('43.143.241.181');
    });
  });

  describe('sendChatMessage', () => {
    it('should send a message successfully to DeepSeek API', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'AI response from DeepSeek'
              }
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const result = await sendChatMessage('test message');

      expect(fetch).toHaveBeenCalledWith('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-api-key-12345'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: 'test message'
            }
          ],
          max_tokens: 2048,
          temperature: 0.7,
          stream: false
        })
      });

      expect(result).toEqual({
        response: 'AI response from DeepSeek',
        timestamp: expect.any(String),
        usage: {
          prompt_tokens: 10,
          completion_tokens: 20,
          total_tokens: 30
        }
      });
    });

    it('should throw error when API key is missing', async () => {
      delete process.env.DEEPSEEK_API_KEY;
      
      await expect(sendChatMessage('test')).rejects.toThrow(ERROR_MESSAGES.API_KEY_MISSING);
    });

    it('should throw error for empty message', async () => {
      await expect(sendChatMessage('')).rejects.toThrow(ERROR_MESSAGES.INVALID_PARAMS);
      await expect(sendChatMessage(null)).rejects.toThrow(ERROR_MESSAGES.INVALID_PARAMS);
      await expect(sendChatMessage(undefined)).rejects.toThrow(ERROR_MESSAGES.INVALID_PARAMS);
    });

    it('should handle HTTP errors from DeepSeek API', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 401,
        json: async () => ({
          error: {
            message: 'Invalid API key'
          }
        })
      };
      fetch.mockResolvedValueOnce(mockErrorResponse);

      await expect(sendChatMessage('test')).rejects.toThrow('Request to AI chat API failed: Invalid API key');
    });

    it('should handle HTTP errors without error details', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      await expect(sendChatMessage('test')).rejects.toThrow(ERROR_MESSAGES.REQUEST_FAILED);
    });

    it('should handle unexpected API response format', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          // Missing choices array
          usage: {}
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await expect(sendChatMessage('test')).rejects.toThrow(ERROR_MESSAGES.REQUEST_FAILED);
    });

    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(sendChatMessage('test')).rejects.toThrow('Network error');
    });
  });

  describe('generateInnovativePrompt', () => {
    it('should generate innovative prompt successfully', (done) => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'Enhanced creative prompt'
              }
            }
          ]
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

    it('should handle missing API key in callback', (done) => {
      delete process.env.DEEPSEEK_API_KEY;

      generateInnovativePrompt('base prompt', 0.5, (error, result) => {
        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe(ERROR_MESSAGES.API_KEY_MISSING);
        expect(result).toBeUndefined();
        done();
      });
    });
  });

  describe('Configuration Integration', () => {
    it('should use DeepSeek API endpoint', () => {
      expect(API_ENDPOINT).toBe('https://api.deepseek.com/v1/chat/completions');
      expect(API_ENDPOINT).not.toContain('letmetryai.cn');
      expect(API_ENDPOINT).not.toContain('43.143.241.181');
    });

    it('should maintain HTTPS protocol', () => {
      expect(API_ENDPOINT).toStartWith('https://');
    });

    it('should use correct DeepSeek API path structure', () => {
      expect(API_ENDPOINT).toMatch(/^https:\/\/api\.deepseek\.com\/v1\/chat\/completions$/);
    });
  });

  describe('Security', () => {
    it('should not expose API key in logs or responses', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'response' } }]
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      await sendChatMessage('test');

      // Check that console.log was called but doesn't contain the API key
      const logCalls = console.log.mock.calls.flat();
      const logText = logCalls.join(' ');
      expect(logText).not.toContain('test-api-key-12345');
    });

    it('should not expose API key in error messages', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      try {
        await sendChatMessage('test');
      } catch (error) {
        expect(error.message).not.toContain('test-api-key-12345');
      }
    });
  });
});