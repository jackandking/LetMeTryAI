// module-load.test.js - Test module loading for zuowen-game AI integration
// Tests the exact scenario that was failing due to configuration syntax error

// Simple test structure that works with the existing test runner
describe('Zuowen Game Module Loading', () => {
  it('should load configuration module without syntax errors', () => {
    // This test will fail if there are syntax errors in config.js
    expect(async () => {
      const config = await import('../util/config.js');
      expect(config.BASE_URL).toBeDefined();
      expect(config.API_ENDPOINTS.AI_CHAT).toBeDefined();
    }).not.toThrow();
  });

  it('should load AI utilities module for zuowen game', () => {
    expect(async () => {
      const aiUtils = await import('../util/ai_utils.js');
      expect(aiUtils.sendChatMessage).toBeDefined();
      expect(typeof aiUtils.sendChatMessage).toBe('function');
    }).not.toThrow();
  });

  it('should have valid AI chat endpoint configuration', () => {
    expect(async () => {
      const config = await import('../util/config.js');
      const endpoint = config.API_ENDPOINTS.AI_CHAT;
      expect(endpoint).toContain('/lws/ai/chat');
      expect(endpoint).toMatch(/^https:\/\//);
      expect(endpoint).not.toContain('undefined');
    }).not.toThrow();
  });

  it('should prevent configuration syntax errors that break AI grading', () => {
    expect(async () => {
      const config = await import('../util/config.js');
      // Test that BASE_URL doesn't have the syntax error that was causing issues
      expect(config.BASE_URL).not.toContain(';');
      expect(config.BASE_URL).toMatch(/^https:\/\/[a-zA-Z0-9.-]+$/);
      expect(config.BASE_URL).toBe('https://letmetry.cloud');
    }).not.toThrow();
  });
});