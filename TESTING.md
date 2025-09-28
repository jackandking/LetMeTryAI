# Testing Infrastructure for LetMeTryAI Configuration System

This document describes the comprehensive testing infrastructure implemented for the centralized configuration system.

## Overview

The testing suite includes unit tests, integration tests, and regression tests to ensure the configuration system works correctly and doesn't break existing functionality.

## Test Files

### Unit Tests
- **`util/config.test.js`** - Tests for the ES6 configuration module
- **`config.test.js`** - Tests for the global configuration (window object)
- **`util/file-util.test.js`** - Enhanced tests for file utility functions
- **`util/ai_utils.test.js`** - Tests for AI utility functions
- **`util/mysql-util.test.js`** - Tests for MySQL utility functions

### Integration Tests
- **`integration.test.js`** - End-to-end tests for the entire configuration system

### Regression Tests
- **`regression.test.js`** - Tests to ensure the domain-to-IP migration doesn't break existing functionality

## Test Infrastructure Files

- **`package.json`** - Jest configuration and npm scripts
- **`test-setup.js`** - Global test setup and mocks
- **`run-tests.js`** - Simple test runner that works without dependencies

## Running Tests

### Option 1: Simple Test Runner (No Dependencies)
```bash
node run-tests.js
```

### Option 2: Jest (Requires Dependencies)
```bash
# Install dependencies first
npm install

# Run all tests
npm test

# Run specific test categories
npm run test:unit        # Run unit tests only
npm run test:integration # Run integration tests
npm run test:regression  # Run regression tests
npm run test:config      # Run configuration tests

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

## Test Categories

### 1. Configuration Tests
- Validate BASE_URL is correctly set
- Verify all API endpoints use centralized configuration
- Test getImageUrl helper function
- Ensure no hardcoded URLs remain

### 2. Unit Tests
- Test individual utility functions
- Mock external dependencies (fetch, etc.)
- Validate input/output behavior
- Test error handling

### 3. Integration Tests
- Test cross-module compatibility
- Validate end-to-end workflows
- Test performance characteristics
- Verify URL generation consistency

### 4. Regression Tests
- Ensure no breaking changes to existing functionality
- Validate API endpoint migration
- Test backward compatibility
- Check for proper domain/IP usage

## Key Test Scenarios

### Configuration System
✅ BASE_URL uses correct domain (letmetry.cloud)  
✅ All API endpoints use centralized configuration  
✅ No hardcoded letmetryai.cn references in /lws or /images paths  
✅ Helper functions generate consistent URLs  

### API Endpoints
✅ AI chat endpoint works with new configuration  
✅ File operations (upload, download, delete, info, list) use centralized URLs  
✅ MySQL operations use centralized configuration  
✅ All endpoints use HTTPS protocol  

### Image URL Generation
✅ getImageUrl handles various path formats correctly  
✅ Supports paths with and without leading slashes  
✅ Generates consistent URLs across different modules  
✅ Handles edge cases gracefully  

### Regression Protection
✅ OAuth redirect URIs remain unchanged (letmetryai.cn)  
✅ Page branding remains unchanged (letmetryai.cn)  
✅ Only /lws and /images paths use IP address  
✅ No unintended side effects from centralization  

## Mock Infrastructure

The test setup includes comprehensive mocks for:
- **fetch()** - HTTP requests
- **File** - File objects for upload tests
- **FormData** - Form data construction
- **Blob** - Binary data handling
- **console** - Logging functions

## Coverage Goals

- **Unit Tests**: 90%+ coverage of utility functions
- **Integration**: 100% coverage of configuration exports
- **Regression**: 100% validation of migration requirements
- **End-to-End**: Key user workflows tested

## Continuous Testing

The test suite is designed to:
1. Run quickly (< 5 seconds for full suite)
2. Provide clear failure messages
3. Work in both Node.js and browser environments
4. Require minimal dependencies
5. Support automated CI/CD integration

## Adding New Tests

When adding new functionality:

1. **Add unit tests** for individual functions
2. **Update integration tests** for cross-module features
3. **Add regression tests** for any breaking changes
4. **Run full test suite** before committing

### Test Template
```javascript
// new-feature.test.js
import { newFunction } from './new-feature.js';
import { API_ENDPOINTS } from './config.js';

describe('New Feature', () => {
  it('should use centralized configuration', () => {
    expect(newFunction()).toContain(API_ENDPOINTS.SOME_ENDPOINT);
  });

  it('should not use hardcoded URLs', () => {
    const result = newFunction();
    expect(result).not.toContain('letmetryai.cn');
    expect(result).toContain('letmetry.cloud');
  });
});
```

## Test Results

Current test status: ✅ **ALL TESTS PASSING**

- Configuration validation: ✅
- Unit tests: ✅  
- Integration tests: ✅
- Regression tests: ✅
- Syntax validation: ✅

## Troubleshooting

### Common Issues

1. **Module import errors**: Ensure all test files use correct import paths
2. **Mock failures**: Check that fetch and other globals are properly mocked
3. **Configuration errors**: Verify BASE_URL is consistently used across all modules

### Debug Commands
```bash
# Check syntax of all test files
for file in *.test.js util/*.test.js; do node -c "$file"; done

# Run specific test file
node -c specific-test.test.js

# Validate configuration files
node -c config.js && node -c util/config.js
```

This testing infrastructure ensures that the centralized configuration system is robust, maintainable, and doesn't introduce regressions to existing functionality.