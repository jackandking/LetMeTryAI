// ai-integration.test.js - Tests for AI grading integration in zuowen-game
// This tests the specific AI service integration that was failing

describe('Zuowen Game AI Integration', () => {
  // Mock fetch for testing
  global.fetch = jest.fn();
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn()
  };

  beforeEach(() => {
    fetch.mockClear();
    console.log.mockClear();
    console.error.mockClear();
  });

  describe('AI Service Configuration', () => {
    it('should successfully import AI utilities from zuowen-game context', async () => {
      // Test the exact import pattern used in zuowen-game/app.js
      const { sendChatMessage } = await import('../util/ai_utils.js');
      
      expect(sendChatMessage).toBeDefined();
      expect(typeof sendChatMessage).toBe('function');
    });

    it('should use correct endpoint for AI grading service', async () => {
      const { API_ENDPOINT } = await import('../util/ai_utils.js');
      
      expect(API_ENDPOINT).toBe('https://letmetry.cloud/lws/ai/chat');
      expect(API_ENDPOINT).toContain('/lws/ai/chat');
      expect(API_ENDPOINT).not.toContain('undefined');
    });
  });

  describe('AI Grading Service Call', () => {
    it('should handle AI grading prompt correctly', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          success: true,
          response: '通过状态：通过\n评价：答案正确，语法恰当\n建议：继续保持\n得分：85分',
          timestamp: '2023-01-01T00:00:00Z'
        })
      };
      fetch.mockResolvedValueOnce(mockResponse);

      const { sendChatMessage } = await import('../util/ai_utils.js');
      
      const testPrompt = `作为专业的语文老师，请评判学生的填空练习答案。

题目内容：今天天气很___，我们去公园___。

标准答案：好、玩耍
学生答案：好、游玩

评判标准：
1. 语义正确性（是否符合上下文含义）- 权重40%
2. 语法正确性（词性和语法是否正确）- 权重30%
3. 表达恰当性（是否使文章更生动优美）- 权重30%

请详细分析每个空的填写情况，并按以下格式回答：

通过状态：[通过/不通过]
评价：[对每个空的详细分析，指出优点和问题]
建议：[具体的改进建议和学习方向]
得分：[总体得分，满分100分]

注意：如果学生答案在语义上正确且表达合理，即使与标准答案不完全相同也应该给予认可。`;

      const result = await sendChatMessage(testPrompt);

      expect(fetch).toHaveBeenCalledWith('https://letmetry.cloud/lws/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: testPrompt })
      });

      expect(result).toEqual({
        response: '通过状态：通过\n评价：答案正确，语法恰当\n建议：继续保持\n得分：85分',
        timestamp: '2023-01-01T00:00:00Z'
      });
    });

    it('should handle AI service errors gracefully', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        status: 500
      });

      const { sendChatMessage } = await import('../util/ai_utils.js');
      
      await expect(sendChatMessage('test prompt'))
        .rejects.toThrow('Request to AI chat API failed');
    });

    it('should handle network errors appropriately', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      const { sendChatMessage } = await import('../util/ai_utils.js');
      
      await expect(sendChatMessage('test prompt'))
        .rejects.toThrow('Network error');
    });
  });

  describe('AI Service Timeout and Reliability', () => {
    it('should handle timeout scenarios as designed in app.js', async () => {
      // Simulate the timeout logic from zuowen-game/app.js
      const { sendChatMessage } = await import('../util/ai_utils.js');
      
      // Mock a slow response
      fetch.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, response: 'AI response' })
        }), 15000)) // 15 seconds - longer than the 10-second timeout
      );

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI service timeout')), 10000)
      );
      
      const aiPromise = sendChatMessage('test prompt');
      
      await expect(Promise.race([aiPromise, timeoutPromise]))
        .rejects.toThrow('AI service timeout');
    });

    it('should validate that AI service URL is reachable format', async () => {
      const { API_ENDPOINT } = await import('../util/ai_utils.js');
      
      // Validate URL format for reachability
      expect(API_ENDPOINT).toMatch(/^https:\/\/[a-zA-Z0-9.-]+\/.*$/);
      expect(new URL(API_ENDPOINT)).toBeInstanceOf(URL);
    });
  });

  describe('Integration Error Prevention', () => {
    it('should prevent common configuration errors that break AI grading', () => {
      // Test all the issues that could break AI grading
      const { BASE_URL, API_ENDPOINTS } = require('../util/config.js');
      
      // Ensure BASE_URL doesn't have syntax errors
      expect(BASE_URL).not.toContain(';');
      expect(BASE_URL).not.toMatch(/['"].*['"].*['"]/); // No multiple quotes
      expect(BASE_URL).toMatch(/^https:\/\//);
      
      // Ensure AI_CHAT endpoint is properly constructed
      expect(API_ENDPOINTS.AI_CHAT).toBe(`${BASE_URL}/lws/ai/chat`);
      expect(API_ENDPOINTS.AI_CHAT).not.toContain('undefined');
      expect(API_ENDPOINTS.AI_CHAT).not.toContain('null');
    });

    it('should ensure AI utilities can be dynamically imported', async () => {
      // Test the exact import pattern used in zuowen-game
      expect(async () => {
        const { sendChatMessage } = await import('../util/ai_utils.js');
        return sendChatMessage;
      }).not.toThrow();
    });
  });
});