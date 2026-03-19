# Copilot Instructions for LetMeTryAI

This document provides guidance for GitHub Copilot and developers on adding unit tests and regression tests for every change in the LetMeTryAI project.

## 🧪 Testing Requirements

**Every change must include:**
1. **Unit tests** for new functions or modified functionality
2. **Regression tests** to ensure existing functionality continues to work
3. **Integration tests** for cross-module changes (when applicable)

## 📁 Test File Organization

### Test File Patterns
- **Unit Tests**: `[module-name].test.js` (e.g., `util/config.test.js`)
- **Integration Tests**: `integration.test.js`
- **Regression Tests**: `regression.test.js`

### Test Location Rules
- Tests for utility files go in the same directory as the module (e.g., `util/ai_utils.test.js`)
- Global configuration tests go in the root directory
- Integration and regression tests go in the root directory

## 🔧 Test Types and Templates

### 1. Unit Tests for JavaScript Functions

When adding or modifying JavaScript functions, always add unit tests:

```javascript
// Example: util/new-feature.test.js
import { newFunction, anotherFunction } from './new-feature.js';
import { API_ENDPOINTS, BASE_URL } from './config.js';

describe('New Feature Module', () => {
  describe('newFunction', () => {
    it('should handle normal input correctly', () => {
      const result = newFunction('test-input');
      expect(result).toBe('expected-output');
    });

    it('should use centralized configuration', () => {
      const result = newFunction();
      expect(result).toContain(BASE_URL);
      expect(result).not.toContain('letmetryai.cn'); // Ensure old domain not used
    });

    it('should handle edge cases', () => {
      expect(() => newFunction(null)).not.toThrow();
      expect(() => newFunction('')).not.toThrow();
      expect(() => newFunction(undefined)).not.toThrow();
    });

    it('should validate input parameters', () => {
      expect(newFunction('valid-input')).toBeDefined();
      expect(typeof newFunction('test')).toBe('string'); // or expected type
    });
  });
});
```

### 2. Regression Tests for Breaking Changes

When modifying existing functionality, add regression tests:

```javascript
// Add to regression.test.js
describe('Regression Tests - [Feature Name]', () => {
  it('should maintain backward compatibility', () => {
    // Test that old usage patterns still work
    const oldResult = existingFunction('old-style-input');
    expect(oldResult).toBeDefined();
    expect(oldResult).toContain('expected-pattern');
  });

  it('should preserve existing API surface', () => {
    // Ensure function signatures haven't changed
    expect(typeof existingFunction).toBe('function');
    expect(existingFunction.length).toBe(expectedParameterCount);
  });

  it('should not break existing integrations', () => {
    // Test that the change doesn't break how other modules use this function
    const integrationResult = dependentFunction();
    expect(integrationResult).toBeDefined();
  });
});
```

### 3. Configuration Change Tests

When modifying configuration (config.js, util/config.js):

```javascript
// Add to appropriate config test file
describe('Configuration Changes', () => {
  it('should maintain all required endpoints', () => {
    const requiredEndpoints = [
      'AI_CHAT', 'FILE_UPLOAD', 'FILE_DELETE', 
      'MYSQL_QUERY', 'MYSQL_INSERT'
      // Add any new endpoints here
    ];
    
    requiredEndpoints.forEach(endpoint => {
      expect(API_ENDPOINTS).toHaveProperty(endpoint);
      expect(API_ENDPOINTS[endpoint]).toMatch(/^https?:\/\//);
    });
  });

  it('should use correct base URL', () => {
    expect(BASE_URL).toBe('https://letmetry.cloud');
    Object.values(API_ENDPOINTS).forEach(endpoint => {
      expect(endpoint).toStartWith(BASE_URL);
    });
  });
});
```

### 4. HTML/Frontend Change Tests

When modifying HTML files or frontend code:

```javascript
// Add to integration.test.js
describe('Frontend Integration', () => {
  it('should use centralized configuration in HTML', () => {
    // Mock DOM environment if needed
    global.window = { ...global.window };
    require('./config.js'); // Load global config
    
    expect(window.BASE_URL).toBeDefined();
    expect(window.getImageUrl).toBeDefined();
  });

  it('should generate correct URLs for frontend use', () => {
    const imageUrl = window.getImageUrl('images/test.jpg');
    expect(imageUrl).toBe('https://letmetry.cloud/images/test.jpg');
  });
});
```

## 🚨 Common Testing Patterns

### Configuration Validation
Always test that new code uses centralized configuration:

```javascript
it('should use centralized configuration', () => {
  const result = yourFunction();
  expect(result).toContain(BASE_URL);
  expect(result).not.toContain('letmetryai.cn');
  expect(result).not.toContain('hardcoded-url');
});
```

### Error Handling
Test error conditions and edge cases:

```javascript
it('should handle error conditions gracefully', () => {
  expect(() => yourFunction(null)).not.toThrow();
  expect(() => yourFunction('')).not.toThrow();
  expect(yourFunction(invalidInput)).toBe(expectedFallback);
});
```

### API Endpoint Testing
For functions that use API endpoints:

```javascript
it('should use correct API endpoint', () => {
  const result = apiFunction();
  expect(result).toContain(API_ENDPOINTS.EXPECTED_ENDPOINT);
  expect(result).toContain('/mysql/'); // Ensure correct path
});
```

## 🏃 Running Tests

### Before Committing Changes
```bash
# Run the simple test runner (no dependencies)
node run-tests.js

# Or run with Jest (requires npm install)
npm test

# Run specific test categories
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests  
npm run test:regression  # Regression tests
```

### Test Success Criteria
- All existing tests must continue to pass
- New functionality must have >= 90% test coverage
- Edge cases and error conditions must be tested
- Configuration changes must be validated

## 📋 Testing Checklist

For every change, ensure you have:

- [ ] **Unit tests** for new or modified functions
- [ ] **Regression tests** to verify existing functionality still works
- [ ] **Configuration validation** tests if config is changed
- [ ] **Error handling** tests for edge cases
- [ ] **Integration tests** if multiple modules are affected
- [ ] **Backward compatibility** tests for breaking changes
- [ ] Run `node run-tests.js` and verify all tests pass

## 🔍 Test Review Guidelines

When reviewing code changes:

1. **Coverage**: Ensure new code has appropriate test coverage
2. **Quality**: Tests should be clear, focused, and maintainable  
3. **Completeness**: Both happy path and edge cases are tested
4. **Integration**: Cross-module impacts are tested
5. **Regression**: Existing functionality is protected

## 📚 Additional Resources

- See `TESTING.md` for comprehensive testing infrastructure documentation
- Check existing `*.test.js` files for testing patterns and examples
- Use `test-setup.js` for global test configuration and mocks
- Follow the project's configuration centralization patterns

---

## � API Documentation and Usage

### API Documentation Reference

**Always refer to the official API documentation for correct usage:**
- **API Docs URL**: https://letmetry.cloud/api-docs
- Check this documentation for the latest API endpoints, parameters, and response formats
- All API operations should follow the patterns defined in the API docs

### MySQL Database Operations

**IMPORTANT: All MySQL database operations must use the query endpoint:**

```javascript
// ✅ CORRECT: Use /mysql/query for ALL database operations
const API_ENDPOINTS = {
    MYSQL_QUERY: 'https://letmetry.cloud/mysql/query',  // Use for SELECT, INSERT, UPDATE, DELETE
    // Note: MYSQL_INSERT is deprecated, always use MYSQL_QUERY
};
```

**Database Operation Examples:**

**CRITICAL: The API uses `sql` as the parameter name, NOT `query`!**

```javascript
// ✅ CORRECT: Use 'sql' parameter with optional 'params' array
// SELECT Query
const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        sql: 'SELECT * FROM table_name WHERE condition'
    })
});

// SELECT with Parameters (recommended for security)
const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        sql: 'SELECT * FROM users WHERE id = ?',
        params: [userId]
    })
});

// INSERT Query
const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        sql: 'INSERT INTO table_name (column1, column2) VALUES (?, ?)',
        params: ['value1', 'value2']
    })
});

// UPDATE Query
const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        sql: 'UPDATE table_name SET column1 = ? WHERE id = ?',
        params: ['new_value', 123]
    })
});

// DELETE Query
const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        sql: 'DELETE FROM table_name WHERE id = ?',
        params: [123]
    })
});
```

### API Best Practices

1. **Check API Docs First**: Always consult https://letmetry.cloud/api-docs before implementing new features
2. **Use Centralized Config**: Reference API_ENDPOINTS from config.js
3. **Error Handling**: Always handle API errors gracefully
4. **SQL Injection Prevention**: Use parameterized queries or proper escaping
5. **Consistent Endpoint**: Use MYSQL_QUERY for all database operations

### Testing API Integration

```javascript
describe('API Integration Tests', () => {
  it('should use MYSQL_QUERY endpoint for database operations', () => {
    const endpoint = API_ENDPOINTS.MYSQL_QUERY;
    expect(endpoint).toBe('https://letmetry.cloud/mysql/query');
  });

  it('should send queries in correct format with sql parameter', async () => {
    const sql = 'SELECT * FROM test_table';
    const body = JSON.stringify({ sql });
    expect(JSON.parse(body)).toHaveProperty('sql');
    expect(JSON.parse(body)).not.toHaveProperty('query'); // Wrong parameter name
  });

  it('should support parameterized queries', async () => {
    const body = JSON.stringify({ 
      sql: 'SELECT * FROM users WHERE id = ?',
      params: [1]
    });
    const parsed = JSON.parse(body);
    expect(parsed).toHaveProperty('sql');
    expect(parsed).toHaveProperty('params');
    expect(Array.isArray(parsed.params)).toBe(true);
  });

  it('should handle API errors gracefully', async () => {
    // Test error handling implementation
  });
});
```

---

## �🗄️ Database Operations via MCP Server

This project has a MySQL MCP (Model Context Protocol) server configured for database operations. When working with database-related tasks in GitHub Issues or PRs:

### Available Database Tools

The MCP server provides direct MySQL access to `letmetry.cloud` database:

**Query Operations:**
```
Show me the latest 10 images from beauty_images table
Get all records from [table_name] where [condition]
Count total records in [table_name]
```

**Insert Operations:**
```
Insert a new image with URL https://example.com/img.jpg to beauty_images
Add record to [table_name] with [values]
```

**Schema Operations:**
```
Show me the schema for beauty_images table
What tables are available in the database?
Describe the structure of [table_name]
```

### Database Tables

- **beauty_images**: Stores beauty image URLs for nanrenbao feature
  - Columns: `id`, `image_url`, `created_at`, `updated_at`
  - Schema: [nanrenbao/database-schema.sql](nanrenbao/database-schema.sql)
  
- **handsome_images**: Stores handsome men image URLs for womanai feature
  - Columns: `id`, `image_url`, `created_at`, `updated_at`
  - Schema: [womanai/database-schema.sql](womanai/database-schema.sql)

### Using MCP in GitHub Issues

When creating GitHub Issues that require database operations:

1. **Reference the MCP server**: Mention that database operations can be performed via the MCP server
2. **Be specific**: Include exact table names, column names, and operations needed
3. **Include schema**: Reference or include the relevant schema file
4. **Test queries**: Provide example queries that should work after implementation

**Example Issue Template:**
```markdown
## Database Enhancement Request

**Table**: beauty_images
**Operation**: Add pagination support
**MCP Query Example**: 
- SELECT * FROM beauty_images ORDER BY created_at DESC LIMIT 10 OFFSET 0

**Schema Reference**: See [database-schema.sql](nanrenbao/database-schema.sql)
**MCP Enabled**: Yes - Copilot can test queries directly
```

### MCP Server Configuration

- **Location**: `mcp-servers/letmetry-mysql/`
- **Config**: `.vscode/settings.json` and `.github/copilot-mcp.json`
- **Setup**: Run `./scripts/setup-mcp.sh` to build
- **No API Key Required**: Direct connection to letmetry.cloud

---

**Remember**: Tests are not optional - they protect the codebase and enable confident changes. Every commit should leave the project in a more tested state than before.

## Automation Development

All automation tooling lives in `.automation/` (not the repo root). See `.automation/CLAUDE.md` for the full convention guide.

Key rules:
- **Scripts** go in `.automation/scripts/`
- **Agent skills** go in `.automation/skills/<skill-name>/`
- **Runtime data** (logs, auth, exports) goes in `.automation/.local/` (gitignored)
- **Never write runtime artifacts to the repo root** — use `runtime-paths.js` helpers
- Website code stays at the repo root; `scripts/` only contains website-dev tooling

---

## Automation Skills Catalog

The project has 17 reusable agent skills in `.automation/skills/`. Each skill has a `SKILL.md` with full usage instructions. A Kimi-compatible symlink also exists at `.agents/skills/`.

| Skill | Description | Path |
|-------|-------------|------|
| `ai-image-generator` | AI image generation via MiniMax image-01, OpenAI DALL-E, etc. | `.automation/skills/ai-image-generator/` |
| `anti-blocking` | Handle blocking overlays, invisible elements, and automation detection | `.automation/skills/anti-blocking/` |
| `batch-app-refiner` | Orchestrate batch refinement of multiple vote apps in parallel | `.automation/skills/batch-app-refiner/` |
| `brand-profiles` | Centralized audience strategy for 男人宝、女人爱、爱老人、家长爱 | `.automation/skills/brand-profiles/` |
| `data-deduplication` | Deduplicate data via exact match, fuzzy match, ID-based, or content similarity | `.automation/skills/data-deduplication/` |
| `idea-to-launch` | End-to-end orchestration from topic selection to deploy, publish, and report | `.automation/skills/idea-to-launch/` |
| `kuaishou-crawler` | Complete Kuaishou Creator Platform crawler with session, pagination, dedup | `.automation/skills/kuaishou-crawler/` |
| `kuaishou-login` | Kuaishou login via mobile phone + SMS verification code | `.automation/skills/kuaishou-login/` |
| `kuaishou-publisher` | Publish mini-apps to Kuaishou Spark Plan via existing publish workflow | `.automation/skills/kuaishou-publisher/` |
| `kuaishou-scraper` | Scrape Kuaishou creator platform data (distribution plans, tasks, stats) | `.automation/skills/kuaishou-scraper/` |
| `pagination-handler` | Handle paginated extraction: numbered pages, infinite scroll, load more | `.automation/skills/pagination-handler/` |
| `report-sender` | Automated report generation and email delivery via AgentMail | `.automation/skills/report-sender/` |
| `topic-selector` | Select and rank topics against brand-specific audience profiles | `.automation/skills/topic-selector/` |
| `vote-app-image-gen` | Generate themed SVG images for vote app options using AI | `.automation/skills/vote-app-image-gen/` |
| `vote-app-refiner` | Refactor vote app HTML/CSS/JS to card-based design with brand themes | `.automation/skills/vote-app-refiner/` |
| `voting-app-scaffold` | Generate scaffold outputs for new voting apps (config, markup, metadata) | `.automation/skills/voting-app-scaffold/` |
| `web-scraper-playwright` | Universal web scraping foundation with Playwright, session persistence, stealth | `.automation/skills/web-scraper-playwright/` |

### Using Skills

Each skill directory contains:
- `SKILL.md` — frontmatter with name/description + full usage guide
- `scripts/` — runnable code
- `examples/` — usage examples

To invoke a skill, read its `SKILL.md` for instructions. Skills can be composed together (e.g., `idea-to-launch` orchestrates `brand-profiles` → `topic-selector` → `voting-app-scaffold` → `kuaishou-publisher` → `report-sender`).