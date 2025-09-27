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
    expect(BASE_URL).toBe('https://43.143.241.181');
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
    expect(imageUrl).toBe('https://43.143.241.181/images/test.jpg');
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
  expect(result).toContain('/lws/'); // Ensure correct path
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

**Remember**: Tests are not optional - they protect the codebase and enable confident changes. Every commit should leave the project in a more tested state than before.