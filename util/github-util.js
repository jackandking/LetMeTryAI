// GitHub API utility functions for issue creation
// This module handles creating GitHub issues from user ideas

import { BASE_URL } from './config.js';

/**
 * GitHub API endpoint for creating issues
 * Note: This should be proxied through the backend to keep tokens secure
 */
const GITHUB_API_ENDPOINT = `${BASE_URL}/github/create-issue`;

/**
 * Error messages for GitHub operations
 */
export const ERROR_MESSAGES = {
  INVALID_IDEA: 'Idea title and description are required',
  REQUEST_FAILED: 'Failed to create GitHub issue',
  NETWORK_ERROR: 'Network error occurred while creating issue'
};

/**
 * Format user idea into a GitHub issue body
 * @param {Object} idea - The user's idea
 * @param {string} idea.title - The idea title
 * @param {string} idea.description - The idea description
 * @param {string} [idea.category] - Optional category
 * @returns {string} Formatted issue body
 */
export function formatIssueBody(idea) {
  const { title, description, category } = idea;
  
  const body = `# 用户创意提交

## 创意名称
${title}

## 创意描述
${description}

${category ? `## 分类\n${category}\n` : ''}

## 元数据
- 提交时间: ${new Date().toISOString()}
- 来源: 主页创意提交表单

---

**注意**: 此issue由用户通过主页创意提交表单自动创建。
请 @copilot 评估此创意的可行性，并在项目根目录创建相应的应用目录。
`;

  return body;
}

/**
 * Create a GitHub issue from user idea
 * @param {Object} idea - The user's idea
 * @param {string} idea.title - The idea title
 * @param {string} idea.description - The idea description
 * @param {string} [idea.category] - Optional category
 * @returns {Promise<Object>} The created issue data
 */
export async function createIssueFromIdea(idea) {
  // Validate input
  if (!idea || !idea.title || !idea.description) {
    throw new Error(ERROR_MESSAGES.INVALID_IDEA);
  }

  console.log('Creating GitHub issue from idea:', idea);

  try {
    const issueData = {
      title: `[用户创意] ${idea.title}`,
      body: formatIssueBody(idea),
      labels: ['user-idea', 'enhancement'],
      assignees: ['copilot']
    };

    const response = await fetch(GITHUB_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(issueData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', errorText);
      throw new Error(ERROR_MESSAGES.REQUEST_FAILED);
    }

    const result = await response.json();
    console.log('GitHub issue created successfully:', result);
    
    return {
      success: true,
      issueUrl: result.html_url || result.url,
      issueNumber: result.number,
      message: '创意已提交成功！'
    };
  } catch (error) {
    console.error('Error creating GitHub issue:', error);
    
    if (error.message === ERROR_MESSAGES.INVALID_IDEA) {
      throw error;
    }
    
    throw new Error(ERROR_MESSAGES.NETWORK_ERROR);
  }
}

/**
 * Validate idea before submission
 * @param {Object} idea - The idea to validate
 * @returns {Object} Validation result with isValid and errors
 */
export function validateIdea(idea) {
  const errors = [];
  
  if (!idea.title || idea.title.trim().length === 0) {
    errors.push('请输入创意标题');
  } else if (idea.title.length < 3) {
    errors.push('创意标题至少需要3个字符');
  } else if (idea.title.length > 100) {
    errors.push('创意标题不能超过100个字符');
  }
  
  if (!idea.description || idea.description.trim().length === 0) {
    errors.push('请输入创意描述');
  } else if (idea.description.length < 10) {
    errors.push('创意描述至少需要10个字符');
  } else if (idea.description.length > 2000) {
    errors.push('创意描述不能超过2000个字符');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
