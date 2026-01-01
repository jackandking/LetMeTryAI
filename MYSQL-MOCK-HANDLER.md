# MySQL API Mock Handler

## Overview
The MySQL API Mock Handler provides automatic fallback to mock data when the real API is unavailable. This is useful for testing and development when dealing with `ERR_CONNECTION_RESET` or other network errors.

## Features

- **Automatic Connection Error Handling**: Catches `ERR_CONNECTION_RESET`, network timeouts, and fetch failures
- **Mock Data Generation**: Provides realistic mock data for `handsome_images` and `beauty_images` tables
- **Query Processing**: Simulates SELECT, INSERT, UPDATE, and DELETE operations
- **Configurable**: Enable/disable via code or URL parameter
- **Testing-Friendly**: Includes simulated network delay for realistic testing

## Usage

### Method 1: Via Code (in config.js)
```javascript
window.ENABLE_MYSQL_MOCK = true;
```

### Method 2: Via URL Parameter
```
https://letmetry.cloud/womanai/appreciate.html?mock=true
```

Once enabled, all fetch calls to the MySQL API that fail will automatically use mock data.

## Configuration

### In config.js:
```javascript
/**
 * TESTING MODE: Enable MySQL API mocking for testing when connection fails
 * Set to true to use mock data when ERR_CONNECTION_RESET or network errors occur
 * Also can be enabled via URL parameter: ?mock=true
 */
window.ENABLE_MYSQL_MOCK = false; // Set to true to enable mock mode
```

## How It Works

1. **Error Detection**: The `fetchMySQLWithMock` wrapper detects connection errors
2. **Mock Enablement Check**: Verifies if mock mode is enabled
3. **Query Parsing**: Parses SQL to determine table and operation type
4. **Mock Execution**: Executes the query against mock data
5. **Response Generation**: Returns a properly formatted Response object

## Mock Data Structure

### handsome_images Table
```javascript
{
  id: number,
  image_url: string,
  created_at: string (ISO timestamp),
  view_count: number
}
```

### beauty_images Table
```javascript
{
  id: number,
  image_url: string,
  created_at: string (ISO timestamp),
  view_count: number
}
```

## Supported Queries

### SELECT
```sql
SELECT id, image_url FROM handsome_images LIMIT 20 OFFSET 0
```

### UPDATE
```sql
UPDATE handsome_images SET view_count = view_count + 1 WHERE id = 1
```

### INSERT
```sql
INSERT INTO handsome_images (image_url, created_at) VALUES (?, ?)
```

### DELETE
```sql
DELETE FROM handsome_images WHERE id = 1
```

## Testing

Run the test suite:
```bash
npm test -- mysql-api-mock.test.js
```

Or use the simple test runner:
```bash
node run-tests.js
```

## Error Handling

The mock handler gracefully falls back to real API when:
1. Mock mode is disabled
2. Error is not a connection/network error
3. Unable to parse the query

Original errors will be re-thrown if mock mode is not enabled.

## Examples

### Womanai Appreciate Page
When visiting: `https://letmetry.cloud/womanai/appreciate.html?mock=true`
- If API is unavailable, mock data will be displayed automatically
- No code changes needed
- Perfect for offline testing or CI/CD pipelines

### Development
```javascript
// Enable for all pages
window.ENABLE_MYSQL_MOCK = true;

// Or enable per-page via URL
// https://localhost:3000/womanai/appreciate.html?mock=true
```

## Benefits

- ✅ Develop offline without database connection
- ✅ Test without external dependencies
- ✅ Consistent test data
- ✅ Reliable CI/CD pipelines
- ✅ Faster development cycle
- ✅ No production code changes needed
- ✅ Graceful degradation

## Files Modified

- `util.js`: Added `MySQLMock` module and `fetchMySQLWithMock` wrapper
- `config.js`: Added `ENABLE_MYSQL_MOCK` configuration flag
- `mysql-api-mock.test.js`: Test suite for mock functionality

## Notes

- Mock data includes simulated 100ms network delay for realistic behavior
- Mock data is limited (2-3 items per table) - suitable for UI testing
- For comprehensive data testing, use actual database or seed more mock data
- URL parameter `?mock=true` takes precedence over config flag
