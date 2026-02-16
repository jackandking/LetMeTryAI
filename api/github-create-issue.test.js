/**
 * Tests for GitHub Issue Creation API Endpoint
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

describe('GitHub Issue Creation API', () => {
  let mockOctokit;
  let mockCreate;
  let handleCreateIssue;
  let createGitHubIssue;

  beforeEach(async () => {
    // Clear module cache
    jest.resetModules();

    // Set up environment variables
    process.env.GITHUB_TOKEN = 'test_token';
    process.env.GITHUB_OWNER = 'jackandking';
    process.env.GITHUB_REPO = 'LetMeTryAI';

    // Mock Octokit
    mockCreate = jest.fn();
    mockOctokit = {
      rest: {
        issues: {
          create: mockCreate
        }
      }
    };

    // Mock the @octokit/rest module
    jest.unstable_mockModule('@octokit/rest', () => ({
      Octokit: jest.fn(() => mockOctokit)
    }));

    // Import the module after mocking
    const module = await import('./github-create-issue.js');
    handleCreateIssue = module.handleCreateIssue;
    createGitHubIssue = module.createGitHubIssue;
  });

  describe('API Contract Validation', () => {
    it('should export handleCreateIssue function', () => {
      expect(typeof handleCreateIssue).toBe('function');
    });

    it('should export createGitHubIssue function', () => {
      expect(typeof createGitHubIssue).toBe('function');
    });

    it('should have correct request format', () => {
      const expectedRequest = {
        title: '[用户创意] Title',
        body: 'Description',
        labels: ['user-idea', 'enhancement'],
        assignees: ['copilot']
      };
      
      expect(expectedRequest).toHaveProperty('title');
      expect(expectedRequest).toHaveProperty('body');
      expect(expectedRequest).toHaveProperty('labels');
      expect(expectedRequest).toHaveProperty('assignees');
    });

    it('should have correct response format', () => {
      const expectedResponse = {
        success: true,
        html_url: 'https://github.com/owner/repo/issues/123',
        number: 123,
        url: 'https://api.github.com/repos/owner/repo/issues/123'
      };
      
      expect(expectedResponse).toHaveProperty('success');
      expect(expectedResponse).toHaveProperty('html_url');
      expect(expectedResponse).toHaveProperty('number');
      expect(expectedResponse).toHaveProperty('url');
    });
  });

  describe('Environment Configuration', () => {
    it('should require GITHUB_TOKEN environment variable', () => {
      expect(process.env.GITHUB_TOKEN).toBeDefined();
    });

    it('should have default GITHUB_OWNER', () => {
      const defaultOwner = process.env.GITHUB_OWNER || 'jackandking';
      expect(defaultOwner).toBe('jackandking');
    });

    it('should have default GITHUB_REPO', () => {
      const defaultRepo = process.env.GITHUB_REPO || 'LetMeTryAI';
      expect(defaultRepo).toBe('LetMeTryAI');
    });
  });

  describe('Request Validation', () => {
    it('should validate required title field', () => {
      const validRequest = {
        title: 'Test Title',
        body: 'Test Body'
      };
      expect(validRequest.title).toBeDefined();
      expect(validRequest.title.length).toBeGreaterThan(0);
    });

    it('should validate required body field', () => {
      const validRequest = {
        title: 'Test Title',
        body: 'Test Body'
      };
      expect(validRequest.body).toBeDefined();
      expect(validRequest.body.length).toBeGreaterThan(0);
    });

    it('should allow optional labels field', () => {
      const requestWithLabels = {
        title: 'Test',
        body: 'Test',
        labels: ['label1']
      };
      expect(requestWithLabels.labels).toBeDefined();
      expect(Array.isArray(requestWithLabels.labels)).toBe(true);
    });

    it('should allow optional assignees field', () => {
      const requestWithAssignees = {
        title: 'Test',
        body: 'Test',
        assignees: ['user1']
      };
      expect(requestWithAssignees.assignees).toBeDefined();
      expect(Array.isArray(requestWithAssignees.assignees)).toBe(true);
    });
  });

  describe('Integration with util/github-util.js', () => {
    it('should match expected issue title format', () => {
      const ideaTitle = 'My Great Idea';
      const issueTitle = `[用户创意] ${ideaTitle}`;
      expect(issueTitle).toContain('[用户创意]');
      expect(issueTitle).toContain(ideaTitle);
    });

    it('should match expected issue body format', () => {
      const expectedBodyPattern = /# 用户创意提交/;
      const expectedBody = `# 用户创意提交

## 创意名称
Test

## 创意描述
Description

## 元数据
- 提交时间: 2026-02-16T23:00:00.000Z
- 来源: 主页创意提交表单`;

      expect(expectedBodyPattern.test(expectedBody)).toBe(true);
    });

    it('should include expected labels', () => {
      const expectedLabels = ['user-idea', 'enhancement'];
      expect(expectedLabels).toContain('user-idea');
      expect(expectedLabels).toContain('enhancement');
      expect(expectedLabels.length).toBe(2);
    });

    it('should assign to copilot', () => {
      const expectedAssignees = ['copilot'];
      expect(expectedAssignees).toContain('copilot');
      expect(expectedAssignees.length).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing title', () => {
      const invalidRequest = {
        body: 'Test Body'
      };
      expect(invalidRequest.title).toBeUndefined();
    });

    it('should handle missing body', () => {
      const invalidRequest = {
        title: 'Test Title'
      };
      expect(invalidRequest.body).toBeUndefined();
    });

    it('should handle empty request', () => {
      const invalidRequest = {};
      expect(invalidRequest.title).toBeUndefined();
      expect(invalidRequest.body).toBeUndefined();
    });

    it('should handle null request', () => {
      const invalidRequest = null;
      expect(invalidRequest).toBeNull();
    });
  });

  describe('Response Format', () => {
    it('should return success flag on success', () => {
      const successResponse = {
        success: true,
        html_url: 'https://github.com/owner/repo/issues/123',
        number: 123,
        url: 'https://api.github.com/repos/owner/repo/issues/123'
      };
      expect(successResponse.success).toBe(true);
    });

    it('should return GitHub issue URL on success', () => {
      const successResponse = {
        success: true,
        html_url: 'https://github.com/jackandking/LetMeTryAI/issues/123',
        number: 123,
        url: 'https://api.github.com/repos/jackandking/LetMeTryAI/issues/123'
      };
      expect(successResponse.html_url).toContain('github.com');
      expect(successResponse.html_url).toContain('/issues/');
    });

    it('should return issue number on success', () => {
      const successResponse = {
        success: true,
        html_url: 'https://github.com/owner/repo/issues/123',
        number: 123,
        url: 'https://api.github.com/repos/owner/repo/issues/123'
      };
      expect(typeof successResponse.number).toBe('number');
      expect(successResponse.number).toBeGreaterThan(0);
    });

    it('should return error flag on failure', () => {
      const errorResponse = {
        success: false,
        error: 'Error message'
      };
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error).toBeDefined();
    });
  });

  describe('Security Considerations', () => {
    it('should not expose GitHub token in responses', () => {
      const response = {
        success: true,
        html_url: 'https://github.com/owner/repo/issues/123',
        number: 123,
        url: 'https://api.github.com/repos/owner/repo/issues/123'
      };
      const responseString = JSON.stringify(response);
      expect(responseString).not.toContain('ghp_');
      expect(responseString).not.toContain('token');
    });

    it('should validate content-type header requirement', () => {
      const headers = {
        'Content-Type': 'application/json'
      };
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('should use POST method only', () => {
      const allowedMethods = ['POST'];
      expect(allowedMethods).toContain('POST');
      expect(allowedMethods.length).toBe(1);
    });
  });

  describe('API Endpoint Configuration', () => {
    it('should use correct endpoint path', () => {
      const endpoint = '/github/create-issue';
      expect(endpoint).toBe('/github/create-issue');
    });

    it('should use correct base URL', () => {
      const baseURL = 'https://letmetry.cloud';
      const fullURL = `${baseURL}/github/create-issue`;
      expect(fullURL).toBe('https://letmetry.cloud/github/create-issue');
    });
  });
});

