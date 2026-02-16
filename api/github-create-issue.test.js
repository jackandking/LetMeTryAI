/**
 * Tests for GitHub Issue Creation API Endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock Octokit before importing the module
const mockCreate = jest.fn();
jest.unstable_mockModule('@octokit/rest', () => ({
  Octokit: jest.fn(() => ({
    rest: {
      issues: {
        create: mockCreate
      }
    }
  }))
}));

// Import after mocking
const { handleCreateIssue, createGitHubIssue } = await import('./github-create-issue.js');

describe('GitHub Issue Creation API', () => {
  let req, res;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock request and response objects
    req = {
      method: 'POST',
      body: {
        title: '[用户创意] Test Idea',
        body: 'Test description',
        labels: ['user-idea', 'enhancement'],
        assignees: ['copilot']
      }
    };

    res = {
      statusCode: null,
      jsonData: null,
      status: jest.fn(function(code) {
        this.statusCode = code;
        return this;
      }),
      json: jest.fn(function(data) {
        this.jsonData = data;
        return this;
      })
    };

    // Set required environment variables
    process.env.GITHUB_TOKEN = 'test_token';
    process.env.GITHUB_OWNER = 'jackandking';
    process.env.GITHUB_REPO = 'LetMeTryAI';
  });

  describe('handleCreateIssue', () => {
    it('should create a GitHub issue successfully', async () => {
      const mockIssue = {
        data: {
          html_url: 'https://github.com/jackandking/LetMeTryAI/issues/123',
          number: 123,
          url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/123'
        }
      };

      mockCreate.mockResolvedValue(mockIssue);

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonData).toEqual({
        success: true,
        html_url: 'https://github.com/jackandking/LetMeTryAI/issues/123',
        number: 123,
        url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/123'
      });

      expect(mockCreate).toHaveBeenCalledWith({
        owner: 'jackandking',
        repo: 'LetMeTryAI',
        title: '[用户创意] Test Idea',
        body: 'Test description',
        labels: ['user-idea', 'enhancement'],
        assignees: ['copilot']
      });
    });

    it('should return 400 for missing title', async () => {
      req.body = { body: 'Test description' };

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toContain('Missing required fields');
    });

    it('should return 400 for missing body', async () => {
      req.body = { title: 'Test Title' };

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toContain('Missing required fields');
    });

    it('should return 400 for empty request body', async () => {
      req.body = null;

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
    });

    it('should return 500 on GitHub API error', async () => {
      mockCreate.mockRejectedValue(new Error('GitHub API error'));

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toContain('Failed to create GitHub issue');
    });

    it('should handle issues without labels or assignees', async () => {
      req.body = {
        title: 'Test Title',
        body: 'Test Body'
      };

      const mockIssue = {
        data: {
          html_url: 'https://github.com/jackandking/LetMeTryAI/issues/124',
          number: 124,
          url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/124'
        }
      };

      mockCreate.mockResolvedValue(mockIssue);

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith({
        owner: 'jackandking',
        repo: 'LetMeTryAI',
        title: 'Test Title',
        body: 'Test Body',
        labels: [],
        assignees: []
      });
    });
  });

  describe('createGitHubIssue', () => {
    it('should create issue with correct parameters', async () => {
      const issueData = {
        title: '[用户创意] My Idea',
        body: 'Description here',
        labels: ['user-idea'],
        assignees: ['copilot']
      };

      const mockIssue = {
        data: {
          html_url: 'https://github.com/jackandking/LetMeTryAI/issues/125',
          number: 125,
          url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/125'
        }
      };

      mockCreate.mockResolvedValue(mockIssue);

      const result = await createGitHubIssue(issueData);

      expect(result).toEqual({
        success: true,
        html_url: 'https://github.com/jackandking/LetMeTryAI/issues/125',
        number: 125,
        url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/125'
      });
    });

    it('should throw error if GITHUB_TOKEN is not set', async () => {
      delete process.env.GITHUB_TOKEN;

      const issueData = {
        title: 'Test',
        body: 'Test'
      };

      await expect(createGitHubIssue(issueData)).rejects.toThrow(
        'GITHUB_TOKEN environment variable is required'
      );
    });

    it('should use default owner and repo if not set', async () => {
      delete process.env.GITHUB_OWNER;
      delete process.env.GITHUB_REPO;
      process.env.GITHUB_TOKEN = 'test_token';

      const issueData = {
        title: 'Test',
        body: 'Test'
      };

      const mockIssue = {
        data: {
          html_url: 'https://github.com/jackandking/LetMeTryAI/issues/126',
          number: 126,
          url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/126'
        }
      };

      mockCreate.mockResolvedValue(mockIssue);

      await createGitHubIssue(issueData);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'jackandking',
          repo: 'LetMeTryAI'
        })
      );
    });
  });

  describe('HTTP Method Validation', () => {
    it('should reject non-POST requests', async () => {
      // Import the default handler
      const module = await import('./github-create-issue.js');
      const handler = module.default;

      req.method = 'GET';

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.error).toContain('Method not allowed');
    });

    it('should accept POST requests', async () => {
      const module = await import('./github-create-issue.js');
      const handler = module.default;

      const mockIssue = {
        data: {
          html_url: 'https://github.com/jackandking/LetMeTryAI/issues/127',
          number: 127,
          url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/127'
        }
      };

      mockCreate.mockResolvedValue(mockIssue);

      req.method = 'POST';

      await handler(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonData.success).toBe(true);
    });
  });

  describe('Integration with util/github-util.js format', () => {
    it('should handle issue body format from github-util.js', async () => {
      const formattedBody = `# 用户创意提交

## 创意名称
Test Idea

## 创意描述
This is a great idea

## 分类
教育

## 元数据
- 提交时间: 2026-02-16T23:00:00.000Z
- 来源: 主页创意提交表单

---

**注意**: 此issue由用户通过主页创意提交表单自动创建。
请 @copilot 评估此创意的可行性，并在项目根目录创建相应的应用目录。
`;

      req.body = {
        title: '[用户创意] Test Idea',
        body: formattedBody,
        labels: ['user-idea', 'enhancement'],
        assignees: ['copilot']
      };

      const mockIssue = {
        data: {
          html_url: 'https://github.com/jackandking/LetMeTryAI/issues/128',
          number: 128,
          url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/128'
        }
      };

      mockCreate.mockResolvedValue(mockIssue);

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(201);
      expect(res.jsonData.success).toBe(true);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: formattedBody
        })
      );
    });
  });

  describe('Error Response Format', () => {
    it('should include error message in response', async () => {
      mockCreate.mockRejectedValue(new Error('Rate limit exceeded'));

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toEqual({
        success: false,
        error: 'Rate limit exceeded'
      });
    });

    it('should include generic error message if error.message is undefined', async () => {
      mockCreate.mockRejectedValue({});

      await handleCreateIssue(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.jsonData).toEqual({
        success: false,
        error: 'Failed to create GitHub issue'
      });
    });
  });
});
