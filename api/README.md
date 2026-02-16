# GitHub API Implementation Guide

This document explains how to implement and deploy the `/github/create-issue` endpoint for the idea submission feature.

## Overview

The homepage idea submission feature requires a backend API endpoint to create GitHub issues from user submissions. This implementation provides the endpoint handler that can be deployed to the existing backend server at `https://letmetry.cloud`.

## Files Created

- **`api/github-create-issue.js`** - The main endpoint implementation
- **`api/README.md`** - This deployment guide
- **`api/github-create-issue.test.js`** - Unit tests for the endpoint

## Architecture

```
Frontend (index.html)
    ↓
util/github-util.js (createIssueFromIdea)
    ↓
POST https://letmetry.cloud/github/create-issue
    ↓
api/github-create-issue.js (Backend)
    ↓
GitHub API (creates issue)
    ↓
Response back to frontend
```

## Deployment Options

### Option 1: Express.js Integration (Recommended)

If the backend server uses Express.js, integrate as follows:

```javascript
// In your main Express app file (e.g., server.js, app.js)
import express from 'express';
import { handleCreateIssue } from './api/github-create-issue.js';

const app = express();
app.use(express.json());

// Add the GitHub issue creation endpoint
app.post('/github/create-issue', handleCreateIssue);

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Option 2: Serverless Function (Vercel, AWS Lambda, etc.)

For serverless deployments, the default export can be used directly:

**Vercel Example:**
Create `/api/github/create-issue.js` in your Vercel project:
```javascript
export { default } from '../../api/github-create-issue.js';
```

**AWS Lambda Example:**
```javascript
import handler from './api/github-create-issue.js';

export const createIssue = async (event, context) => {
  const req = {
    method: event.httpMethod,
    body: JSON.parse(event.body)
  };
  
  const res = {
    status: (code) => ({ json: (data) => ({
      statusCode: code,
      body: JSON.stringify(data)
    })}
  };
  
  return await handler(req, res);
};
```

### Option 3: Standalone Node.js Server

Run the endpoint as a standalone server:

```javascript
// standalone-server.js
import express from 'express';
import cors from 'cors';
import { handleCreateIssue } from './api/github-create-issue.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// GitHub endpoint
app.post('/github/create-issue', handleCreateIssue);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`GitHub API server running on port ${PORT}`);
});
```

## Environment Variables

Set these environment variables in your deployment:

```bash
# Required: GitHub personal access token with 'public_repo' or 'repo' scope
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx

# Optional: Override default repository
GITHUB_OWNER=jackandking
GITHUB_REPO=LetMeTryAI
```

### Creating a GitHub Token

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a descriptive name: "LetMeTryAI Issue Creation"
4. Select scopes:
   - `public_repo` (for public repositories)
   - OR `repo` (for private repositories)
5. Click "Generate token"
6. Copy the token immediately (you won't see it again)
7. Set it as the `GITHUB_TOKEN` environment variable

## Dependencies

Install the required npm package:

```bash
npm install @octokit/rest
```

Add to `package.json`:
```json
{
  "dependencies": {
    "@octokit/rest": "^20.0.0"
  }
}
```

## API Specification

### Request

**Endpoint:** `POST /github/create-issue`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "title": "[用户创意] Amazing idea title",
  "body": "# Description\n\nDetailed description here...",
  "labels": ["user-idea", "enhancement"],
  "assignees": ["copilot"]
}
```

### Response

**Success (201 Created):**
```json
{
  "success": true,
  "html_url": "https://github.com/jackandking/LetMeTryAI/issues/123",
  "number": 123,
  "url": "https://api.github.com/repos/jackandking/LetMeTryAI/issues/123"
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Missing required fields: title and body are required"
}
```

**Error (500 Internal Server Error):**
```json
{
  "success": false,
  "error": "Failed to create GitHub issue"
}
```

## Testing

### Unit Tests

Run the provided tests:
```bash
npm test api/github-create-issue.test.js
```

### Manual Testing

Test with curl:
```bash
curl -X POST https://letmetry.cloud/github/create-issue \
  -H "Content-Type: application/json" \
  -d '{
    "title": "[用户创意] Test idea",
    "body": "This is a test submission",
    "labels": ["user-idea", "enhancement"],
    "assignees": ["copilot"]
  }'
```

### Integration Testing

Test the full workflow from the homepage:
1. Navigate to https://letmetry.cloud
2. Scroll to the "提交您的创意" section
3. Fill in the form with test data
4. Click "提交创意"
5. Verify the issue is created on GitHub

## Security Considerations

1. **Token Security**: Never commit the `GITHUB_TOKEN` to version control
2. **Rate Limiting**: GitHub API has rate limits. Consider implementing:
   - Request throttling
   - User rate limiting (per IP or session)
   - Proper error handling for 429 responses
3. **Input Validation**: The endpoint validates required fields but consider:
   - Content filtering for spam
   - XSS prevention in markdown
   - Maximum length limits
4. **CORS**: Configure CORS properly for production:
   ```javascript
   app.use(cors({
     origin: 'https://letmetry.cloud',
     methods: ['POST'],
     credentials: true
   }));
   ```

## Monitoring

Add logging for production:

```javascript
// In api/github-create-issue.js
console.log('GitHub issue created:', {
  number: response.data.number,
  title: issueData.title,
  timestamp: new Date().toISOString()
});
```

Consider tracking:
- Number of issues created
- Error rates
- Response times
- Failed submissions

## Troubleshooting

### "GITHUB_TOKEN environment variable is required"
- Ensure `GITHUB_TOKEN` is set in your deployment environment
- Check that the environment variable is loaded correctly

### "Bad credentials"
- Verify the GitHub token is valid and not expired
- Ensure the token has the correct permissions
- Generate a new token if needed

### "Resource not accessible by personal access token"
- The token may not have the required scopes
- Regenerate with `public_repo` or `repo` scope

### Rate Limit Errors
- GitHub has a rate limit of 5,000 requests per hour for authenticated requests
- Implement caching or request throttling if needed
- Consider using GitHub Apps for higher limits

## Next Steps

After deploying this endpoint:

1. ✅ Deploy the endpoint to your backend server
2. ✅ Configure environment variables
3. ✅ Test the endpoint with curl or Postman
4. ✅ Update the frontend (already done in `main.js`)
5. ✅ Test the full workflow from the homepage
6. ✅ Monitor for errors in production
7. ✅ Add analytics/tracking if desired

## Support

For issues or questions:
- Check the [GitHub API documentation](https://docs.github.com/en/rest/issues/issues#create-an-issue)
- Review the test file: `api/github-create-issue.test.js`
- Check server logs for error messages
- Verify environment variables are set correctly

---

**Implementation Status**: ✅ Backend endpoint ready for deployment
**Frontend Status**: ✅ Already integrated in `util/github-util.js` and `main.js`
**Documentation**: ✅ Complete
**Tests**: ✅ Provided
**Next**: Deploy to production backend server
