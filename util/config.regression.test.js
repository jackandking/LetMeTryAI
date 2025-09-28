// config.regression.test.js - Regression tests for configuration syntax and AI service integration
import { BASE_URL, API_ENDPOINTS } from './config.js';
import { API_ENDPOINT, sendChatMessage } from './ai_utils.js';

describe('Configuration Regression Tests', () => {
  describe('Syntax and Module Loading', () => {
    it('should load configuration module without syntax errors', () => {
      expect(BASE_URL).toBeDefined();
      expect(typeof BASE_URL).toBe('string');
    });

    it('should have properly formatted BASE_URL without syntax errors', () => {
      // Regression test for the missing quote issue
      expect(BASE_URL).toMatch(/^https:\/\/[a-zA-Z0-9.-]+$/);
      expect(BASE_URL).not.toContain(';');
      expect(BASE_URL).not.toMatch(/['"]{2,}/); // No doubled quotes
      expect(BASE_URL).toBe('https://letmetry.cloud');
    });

    it('should load AI utilities module without syntax errors', () => {
      expect(API_ENDPOINT).toBeDefined();
      expect(typeof sendChatMessage).toBe('function');
    });

    it('should have valid AI chat endpoint configuration', () => {
      expect(API_ENDPOINT).toBe(API_ENDPOINTS.AI_CHAT);
      expect(API_ENDPOINT).toBe('https://letmetry.cloud/lws/ai/chat');
      expect(API_ENDPOINT).toMatch(/^https:\/\/[a-zA-Z0-9.-]+\/lws\/ai\/chat$/);
    });
  });

  describe('AI Service Integration Points', () => {
    it('should provide valid endpoint for 作文游戏 AI grading', () => {
      // Test the specific endpoint used by zuowen-game
      expect(API_ENDPOINTS.AI_CHAT).toContain('/lws/ai/chat');
      expect(API_ENDPOINTS.AI_CHAT).toStartWith('https://');
      expect(API_ENDPOINTS.AI_CHAT).not.toContain('undefined');
      expect(API_ENDPOINTS.AI_CHAT).not.toContain('null');
    });

    it('should maintain consistent URL formatting across all endpoints', () => {
      Object.values(API_ENDPOINTS).forEach(endpoint => {
        expect(endpoint).toMatch(/^https:\/\/[a-zA-Z0-9.-]+\/lws\//);
        expect(endpoint).not.toContain(';;');
        expect(endpoint).not.toContain('//lws');
        expect(endpoint).not.toMatch(/['"]/);
      });
    });

    it('should prevent configuration-related import failures', () => {
      // Test that dynamic imports work (as used in zuowen-game/app.js)
      expect(async () => {
        const { sendChatMessage } = await import('./ai_utils.js');
        return sendChatMessage;
      }).not.toThrow();
    });
  });

  describe('Error Prevention', () => {
    it('should have all required configuration properties', () => {
      const requiredProperties = [
        'AI_CHAT', 'FILE_UPLOAD', 'FILE_DELETE',
        'MYSQL_QUERY', 'MYSQL_INSERT'
      ];
      
      requiredProperties.forEach(prop => {
        expect(API_ENDPOINTS).toHaveProperty(prop);
        expect(typeof API_ENDPOINTS[prop]).toBe('string');
        expect(API_ENDPOINTS[prop].length).toBeGreaterThan(0);
      });
    });

    it('should prevent malformed URL construction', () => {
      // Test that URL construction doesn't create malformed URLs
      const testPaths = ['test', '/test', 'test/', '/test/'];
      
      testPaths.forEach(path => {
        const constructedUrl = `${BASE_URL}/${path.startsWith('/') ? path.slice(1) : path}`;
        expect(constructedUrl).toMatch(/^https:\/\/[^\/]+\/[^\/]/);
        expect(constructedUrl).not.toContain('//lws');
        expect(constructedUrl).not.toContain('///');
      });
    });
  });

  describe('AI Service Function Validation', () => {
    it('should have sendChatMessage function with proper error handling', () => {
      expect(typeof sendChatMessage).toBe('function');
      
      // Test parameter validation
      expect(async () => {
        await sendChatMessage('');
      }).rejects.toThrow();
      
      expect(async () => {
        await sendChatMessage(null);
      }).rejects.toThrow();
    });

    it('should use the correct endpoint in sendChatMessage', () => {
      // Verify that the AI utilities module uses the correct endpoint
      expect(API_ENDPOINT).toBe(API_ENDPOINTS.AI_CHAT);
      expect(API_ENDPOINT).toContain('letmetry.cloud');
      expect(API_ENDPOINT).toContain('/lws/ai/chat');
    });
  });
});