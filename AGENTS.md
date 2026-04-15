# LetMeTryAI - Agent Documentation

## Project Overview

LetMeTryAI is a modern, responsive web application platform featuring interactive mini-apps, games, and utilities. The project follows a centralized configuration architecture with comprehensive testing infrastructure.

**Live Site**: https://letmetryai.cn  
**API Base URL**: https://letmetry.cloud

## Technology Stack

### Core Technologies
- **Frontend**: HTML5, CSS3, JavaScript (ES6+ modules)
- **Build Tools**: Node.js, npm
- **Testing**: Jest (unit/integration tests), Playwright (E2E tests)
- **Code Quality**: ESLint, Prettier
- **Server**: Python 3 (for local development server)

### MCP Server Integration
- **TypeScript-based MCP Server** for GitHub Copilot MySQL operations
- **Location**: `mcp-servers/letmetry-mysql/`
- **Purpose**: Database operations without API keys
- **Setup**: Run `./scripts/setup-mcp.sh`

## Project Structure

```
LetMeTryAI/
├── index.html              # Main application entry point
├── main.js                 # Main app logic (ES module)
├── styles.css              # Global styles
├── config.js               # Global configuration (for HTML script tags)
├── util.js                 # Legacy utility functions
├── firework.js             # Firework animation system
│
├── util/                   # Utility modules (ES6)
│   ├── config.js           # Centralized configuration exports
│   ├── ai_utils.js         # AI chat integration
│   ├── file-util.js        # File upload/download utilities
│   ├── mysql-util.js       # MySQL database operations
│   ├── github-util.js      # GitHub API utilities
│   └── weather-util.js     # Weather API utilities
│
├── apps-metadata.json      # App catalog configuration
│
├── mcp-servers/            # MCP Server for GitHub Copilot
│   └── letmetry-mysql/     # MySQL MCP Server
│       ├── src/            # TypeScript source
│       ├── dist/           # Compiled JavaScript
│       └── package.json    # Server dependencies
│
├── scripts/                # Website-dev tooling only
│   ├── setup-mcp.sh        # MCP Server setup
│   └── build-and-commit-mcp.sh  # MCP build script
│
├── .automation/            # All automation tooling (tracked)
│   ├── scripts/            # Automation scripts (cron jobs, CLI)
│   │   ├── daily-orchestrator.js
│   │   ├── daily_run.sh
│   │   ├── run-daily-profile.sh
│   │   ├── setup-cron.sh
│   │   ├── runtime-paths.js
│   │   ├── send_email.py
│   │   ├── publish-kuaishou-task.js
│   │   ├── fetch-*.js
│   │   ├── templates/          # Brand theme templates
│   │   └── topics/             # Topic queue management
│   ├── skills/             # Agent skills (16 skills)
│   │   ├── brand-profiles/
│   │   ├── topic-selector/
│   │   ├── kuaishou-publisher/
│   │   ├── voting-app-scaffold/
│   │   └── ...
│   ├── docs/               # Automation documentation
│   ├── config/             # Automation config files
│   └── .local/             # Runtime data (gitignored)
│       ├── auth/           # Session/auth files
│       ├── state/          # Email drafts, topics, processed IDs
│       ├── exports/        # Metrics, task exports
│       ├── logs/           # All automation logs
│       ├── screenshots/    # Automation screenshots
│       └── tmp/            # Temporary files
│
├── .github/                # GitHub configuration
│   ├── copilot-instructions.md  # Copilot coding guidelines
│   ├── copilot-mcp.json    # MCP server configuration
│   └── ISSUE_TEMPLATE/     # Issue templates
│
├── Component directories/  # Individual mini-apps (100+)
│   ├── firework/           # Fireworks animation app
│   ├── nanrenbao/          # Entertainment app
│   └── ...
│
├── tests/                  # Playwright E2E tests
├── images/                 # Static image assets
├── icons/                  # Favicon and icons
├── docs/                   # Website documentation
└── admin/                  # Admin tools
```

## Build and Development Commands

### Installation
```bash
npm install
```

### Development Server
```bash
# Option 1: npm script
npm run serve

# Option 2: helper script
./start_server.sh

# Server runs on http://localhost:8080
```

### MCP Server Setup (Optional)
```bash
./scripts/setup-mcp.sh
```

## Testing Commands

### Run All Tests
```bash
npm test
```

### Specific Test Categories
```bash
npm run test:unit        # Unit tests only (util/)
npm run test:integration # Integration tests
npm run test:regression  # Regression tests
npm run test:config      # Configuration tests
```

### Test Coverage
```bash
npm run test:coverage
```

### Watch Mode
```bash
npm run test:watch
```

### Simple Test Runner (No Dependencies)
```bash
node run-tests.js
```

### Playwright E2E Tests
```bash
npx playwright test
```

## Code Quality Commands

### Linting
```bash
npm run lint           # Check for issues
npm run lint:fix       # Fix auto-fixable issues
```

### Formatting
```bash
npm run format         # Format all files with Prettier
```

### Quality Check (Lint + Test)
```bash
npm run quality
```

## Code Style Guidelines

### JavaScript/ES6
- **Indentation**: 4 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Trailing commas**: Never
- **Max line width**: 100 characters
- **Module system**: ES6 modules (`import`/`export`)

### Naming Conventions
- **Variables/Functions**: camelCase
- **Constants**: UPPER_SNAKE_CASE
- **Classes**: PascalCase
- **Files**: kebab-case or descriptive names

### Documentation
- All public functions require JSDoc comments
- Use `@param`, `@returns` tags appropriately
- Include descriptions for complex logic

### ESLint Rules (Key)
- `eqeqeq: error` - Always use strict equality
- `no-var: error` - Use `const`/`let` only
- `prefer-const: error` - Use `const` when possible
- `camelcase: error` - Enforce camelCase
- `require-jsdoc: warn` - JSDoc required for functions

### Prettier Configuration
- See `.prettierrc.js` for details
- JSON/Markdown: 2-space indentation
- HTML/CSS: 2-space indentation
- JavaScript: 4-space indentation

## Testing Instructions

### Test File Organization
- **Unit Tests**: `[module-name].test.js` in same directory
- **Integration Tests**: `integration.test.js` (root)
- **Regression Tests**: `regression.test.js` (root)
- **Config Tests**: `config.test.js` (root)

### Test Patterns
```javascript
// Import pattern
import { myFunction } from './my-module.js';
import { API_ENDPOINTS, BASE_URL } from './config.js';

// Test structure
describe('Feature Name', () => {
  it('should do something specific', () => {
    const result = myFunction('input');
    expect(result).toBe('expected-output');
  });

  it('should use centralized configuration', () => {
    expect(myFunction()).toContain(BASE_URL);
    expect(myFunction()).not.toContain('letmetryai.cn');
  });
});
```

### Required Test Coverage
- New functions: >= 90% coverage
- Configuration changes: 100% validation
- Edge cases and error handling must be tested
- All existing tests must continue to pass

### Mock Infrastructure
The `test-setup.js` provides global mocks for:
- `fetch()` - HTTP requests
- `File` - File objects
- `FormData` - Form data
- `Blob` - Binary data
- `console` - Logging functions

## Configuration System

### Dual Configuration Pattern
The project uses two configuration files for different contexts:

1. **`util/config.js`** - ES6 module exports (for modern JS)
   ```javascript
   import { BASE_URL, API_ENDPOINTS, getImageUrl } from './util/config.js';
   ```

2. **`config.js`** (root) - Global window properties (for HTML)
   ```html
   <script src="config.js"></script>
   <script>console.log(window.BASE_URL);</script>
   ```

### API Endpoints
All API calls must use centralized endpoints:
```javascript
API_ENDPOINTS = {
  AI_CHAT: `${BASE_URL}/ai/chat`,
  FILE_UPLOAD: `${BASE_URL}/file/upload`,
  FILE_DELETE: `${BASE_URL}/file/delete`,
  FILE_INFO: `${BASE_URL}/file/info`,
  FILE_LIST: `${BASE_URL}/file/list`,
  FILE_DOWNLOAD: `${BASE_URL}/file/download`,
  IMAGE_UPLOAD: `${BASE_URL}/image/upload`,
  MYSQL_QUERY: `${BASE_URL}/mysql/query`,
  MYSQL_GET_BY_ID: `${BASE_URL}/mysql/getById`,
  MYSQL_INSERT: `${BASE_URL}/mysql/insert`,
  MYSQL_UPDATE: `${BASE_URL}/mysql/update`,
  MYSQL_DELETE: `${BASE_URL}/mysql/delete`
}
```

### MySQL API Usage
**CRITICAL**: Always use `sql` parameter (NOT `query`):
```javascript
// CORRECT
await fetch(API_ENDPOINTS.MYSQL_QUERY, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    sql: 'SELECT * FROM table WHERE id = ?',
    params: [id]
  })
});
```

### MySQL Mock Mode
Enable mock responses when database is unavailable:
```javascript
// In config.js or via URL parameter ?mock=true
window.ENABLE_MYSQL_MOCK = true;
```

## Security Considerations

### API Security
- Never hardcode API keys in source files
- Use parameterized queries for SQL operations
- Validate all user inputs
- Sanitize file paths (check for `..` sequences)

### Environment Variables
- Use `.env` file for sensitive configuration (not committed)
- MCP Server API keys are configured in `.github/copilot-mcp.json`

### File Upload Security
```javascript
// Always validate targetPath
if (typeof targetPath !== 'string' || targetPath.includes('..')) {
  throw new Error('Invalid targetPath');
}
```

## Agent Modification Rules

### `.automation/` Directory — Read-Only by Default
The `.automation/` directory contains critical automation tooling, cron jobs, and publisher scripts. **By default, treat this directory as read-only.**

If any task requires modifying code inside `.automation/` (including but not limited to `.automation/scripts/`, `.automation/skills/`, `.automation/config/`), you **must** explicitly ask the user for approval before making changes. Do not assume permission based on prior conversation context.

**Exception**: Reading logs, reports, and state files inside `.automation/.local/` for debugging or verification is always allowed.

## Development Conventions

### Adding New Mini-Apps
1. Create directory with lowercase-kebab-name
2. Include `index.html`, `app.js`, `styles.css`
3. Add entry to `apps-metadata.json`
4. Include tests if complex logic
5. Update this documentation

### Component Structure
Each mini-app should follow:
```
app-name/
├── index.html      # Semantic markup
├── app.js          # Modular logic
├── styles.css      # Component styles
└── images/         # Local assets
```

### Git Workflow
1. Create feature branch
2. Make changes with tests
3. Run `npm run quality`
4. Commit with descriptive messages
5. Create PR
6. **After `git push` in dev (`/Users/weiping/LetMeTryAI`), immediately `git pull --ff-only` in prod (`/Users/weiping/prod/LetMeTryAI`) to catch merge conflicts or deployment issues early**

### Database Schema Changes
- Document in `[feature]/database-schema.sql`
- Update MCP server queries if needed
- Include migration scripts if necessary

## Deployment

### Production Checklist
- [ ] All tests pass (`npm run quality`)
- [ ] No hardcoded URLs (use `BASE_URL`)
- [ ] Error handling implemented
- [ ] Console logs cleaned up (or use proper logging)
- [ ] Assets optimized

### Browser Support
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## MCP Server Usage

### Available Tools
- **MySQL Query**: Execute database queries
- **File System**: Access repository files
- **Sequential Thinking**: Complex problem solving
- **Playwright**: Browser automation
- **AgentMail**: Email capabilities

### Example MCP Queries
```
@workspace Show me the latest 10 images from beauty_images table
@workspace Query the app_visits table for visit counts
@workspace Get the schema for handsome_images table
```

## Troubleshooting

### Common Issues

**Module import errors**: Ensure correct import paths with `.js` extension

**Mock failures**: Check that `test-setup.js` is properly configured in Jest

**Configuration errors**: Verify `BASE_URL` consistency across all modules

**MCP Server not working**: Run `./scripts/setup-mcp.sh` to rebuild

### Debug Commands
```bash
# Validate configuration files
node -c config.js && node -c util/config.js

# Check all test files syntax
for file in *.test.js util/*.test.js; do node -c "$file"; done

# List all mini-apps
cat apps-metadata.json | grep '"id"'
```

## Resources

- **API Documentation**: https://letmetry.cloud/api-docs
- **Testing Guide**: `./TESTING.md`
- **Copilot Instructions**: `./.github/copilot-instructions.md`
- **MCP Server README**: `./mcp-servers/letmetry-mysql/README.md`

## Contact

For issues or questions, refer to the GitHub Issues section or contact the LetMeTryAI Team.
