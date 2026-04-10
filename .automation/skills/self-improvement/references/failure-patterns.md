# Common Failure Patterns

## Timeout Errors

### Pattern: `page.goto: Timeout 30000ms exceeded`

**Cause**: Network slow or resource loading timeout

**Solution**:
```typescript
await page.goto(url, { 
  waitUntil: 'networkidle',
  timeout: 60000 // Increase timeout
});
```

### Pattern: `ffmpeg failed`

**Cause**: Video processing timeout or codec issues

**Solution**:
```typescript
// Reduce video quality for faster processing
ffmpeg -preset fast -crf 28
// Or use hardware acceleration
ffmpeg -hwaccel videotoolbox
```

## Network Errors

### Pattern: `net::ERR_CONNECTION_CLOSED`

**Cause**: Server closed connection unexpectedly

**Solution**:
```typescript
// Add retry logic
const fetchWithRetry = async (url, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url);
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(1000 * (i + 1)); // Exponential backoff
    }
  }
};
```

### Pattern: `ECONNREFUSED`

**Cause**: Service not running or wrong port

**Solution**:
- Check service status
- Verify port configuration
- Add health check before requests

## Resource Errors

### Pattern: `ENOENT: no such file or directory`

**Cause**: File path incorrect or file not created

**Solution**:
```typescript
import { existsSync } from 'fs';

// Pre-validation
if (!existsSync(filePath)) {
  throw new Error(`File not found: ${filePath}`);
}
```

### Pattern: `ENOSPC: no space left on device`

**Cause**: Disk full

**Solution**:
- Clean up temporary files
- Add disk space monitoring
- Implement automatic cleanup

## AI Generation Errors

### Pattern: `MiniMax error: input new_sensitive`

**Cause**: Prompt contains sensitive words

**Solution**:
- Sanitize prompts
- Use alternative wording
- Add prompt validation

### Pattern: `Copilot exited with code 1`

**Cause**: AI service error or rate limit

**Solution**:
- Implement fallback to Kimi
- Add rate limit handling
- Cache results to reduce calls

## Validation Errors

### Pattern: `Validation failed: missing required files`

**Cause**: Output incomplete

**Solution**:
- Add pre-flight checks
- Validate all outputs before completion
- Implement rollback on validation failure
