# .automation - Agent Documentation

## Scope

This directory contains all automation tooling, cron jobs, CLI scripts, and agent skills for the LetMeTryAI platform.

## Hard Rules

1. **Log Redirection Rule**: If a shell script uses `tee -a "$LOG_FILE"` internally, the cron command must **NOT** append `>> "$LOG_FILE" 2>&1`. If the script only prints to stdout/stderr, the redirection goes in the cron command.
2. **Harness Path Isolation**: `.harness` scripts and logs must **never** write to `.automation/.local/`. Their runtime directory is `.harness/.local/`.
3. **MySQL API**: Always use `sql` parameter (NOT `query`).
4. **No Hardcoded URLs**: Use `BASE_URL` from `util/config.js` for all API calls.
5. **File Upload Security**: Always validate `targetPath` (reject `..` sequences).

## Build and Development Commands

### Installation
```bash
npm install
```

### Development Server
```bash
npm run serve
# or
./start_server.sh
```

### MCP Server Setup
```bash
./scripts/setup-mcp.sh
```

## Testing Commands

```bash
npm test
npm run test:unit        # Unit tests only (util/)
npm run test:integration # Integration tests
npm run test:regression  # Regression tests
npm run test:config      # Configuration tests
npm run test:coverage
npm run test:watch
node run-tests.js        # Simple test runner (no dependencies)
npx playwright test      # E2E tests
```

## Code Quality Commands

```bash
npm run lint           # Check for issues
npm run lint:fix       # Fix auto-fixable issues
npm run format         # Format all files with Prettier
npm run quality        # Lint + Test
```

## Automation Script Conventions

### Adding New Scripts
1. Place executable scripts in `.automation/scripts/`
2. Use `.test.js` for script unit tests when logic is complex
3. Add setup steps to `setup-cron.sh` if the script needs cron scheduling
4. Document log file location and rotation strategy

### Cron Job Setup
- Use `.automation/scripts/setup-cron.sh` for Kuaishou + multi-brand daily runs
- Use `.automation/scripts/add-refine-cron.sh` for vote-app refinement jobs
- All cron commands must be reviewed for log duplication before activation

### Script Structure
- Start with `#!/bin/bash` and `set -euo pipefail`
- Derive `PROJECT_DIR` from `$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)`
- Use centralized `BASE_URL` and `API_ENDPOINTS` for any HTTP calls

### Component Directories (Mini-Apps)
- Create directory with lowercase-kebab-name
- Include `index.html`, `app.js`, `styles.css`
- Add entry to `apps-metadata.json`
- Include tests if complex logic

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
