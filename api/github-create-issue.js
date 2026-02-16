/**
 * GitHub Issue Creation API Endpoint
 *
 * This endpoint handles creating GitHub issues from user ideas submitted via the homepage.
 * It should be deployed as part of the backend API server at https://letmetry.cloud
 *
 * Endpoint: POST /github/create-issue
 *
 * Request Body:
 * {
 *   "title": "[用户创意] Title",
 *   "body": "Issue description in markdown",
 *   "labels": ["user-idea", "enhancement"],
 *   "assignees": ["copilot"]
 * }
 *
 * Response:
 * {
 *   "success": true,
 *   "html_url": "https://github.com/owner/repo/issues/123",
 *   "number": 123,
 *   "url": "https://api.github.com/repos/owner/repo/issues/123"
 * }
 */

import { Octokit } from '@octokit/rest';

// GitHub configuration
// These should be set as environment variables in the deployment environment
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_OWNER = process.env.GITHUB_OWNER || 'jackandking';
const GITHUB_REPO = process.env.GITHUB_REPO || 'LetMeTryAI';

/**
 * Validate GitHub configuration
 */
function validateConfig() {
    if (!GITHUB_TOKEN) {
        throw new Error('GITHUB_TOKEN environment variable is required');
    }
    return true;
}

/**
 * Create a GitHub issue
 * @param {object} issueData - Issue data from request
 * @returns {Promise<object>} Created issue data
 */
async function createGitHubIssue(issueData) {
    validateConfig();

    const octokit = new Octokit({
        auth: GITHUB_TOKEN
    });

    try {
        const response = await octokit.rest.issues.create({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            title: issueData.title,
            body: issueData.body,
            labels: issueData.labels || [],
            assignees: issueData.assignees || []
        });

        return {
            success: true,
            html_url: response.data.html_url,
            number: response.data.number,
            url: response.data.url
        };
    } catch (error) {
        console.error('Error creating GitHub issue:', error);
        throw error;
    }
}

/**
 * Express route handler for POST /github/create-issue
 *
 * Usage with Express:
 * ```javascript
 * import { handleCreateIssue } from './api/github-create-issue.js';
 * app.post('/github/create-issue', handleCreateIssue);
 * ```
 */
export async function handleCreateIssue(req, res) {
    try {
    // Validate request body
        if (!req.body || !req.body.title || !req.body.body) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields: title and body are required'
            });
        }

        // Create the issue
        const result = await createGitHubIssue(req.body);

        // Return success response
        res.status(201).json(result);
    } catch (error) {
        console.error('Error in handleCreateIssue:', error);

        // Return error response
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to create GitHub issue'
        });
    }
}

/**
 * Standalone function for serverless environments (e.g., Vercel, AWS Lambda)
 *
 * Usage with Vercel:
 * Export this as default in /api/github/create-issue.js
 */
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed. Use POST.'
        });
    }

    return handleCreateIssue(req, res);
}

// Export the main function for use in other contexts
export { createGitHubIssue };
