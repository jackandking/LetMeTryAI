# Performance Optimization Guidelines

## Video Generation

### Current Bottlenecks
1. **Screenshot capture** - 30s timeout
2. **FFmpeg encoding** - CPU intensive
3. **Audio generation** - Sequential blocking

### Optimizations

**Parallel Processing**:
```typescript
// Generate audio while capturing screenshot
const [screenshot, audio] = await Promise.all([
  captureScreenshot(),
  generateAudio()
]);
```

**Reduced Quality for Preview**:
```typescript
// Use lower quality for faster generation
const videoConfig = {
  quality: isPreview ? 'low' : 'high',
  fps: isPreview ? 15 : 30
};
```

## AI Generation

### Caching Strategy
```typescript
const cache = new Map();

const generateWithCache = async (prompt) => {
  const key = hash(prompt);
  if (cache.has(key)) {
    return cache.get(key);
  }
  const result = await generate(prompt);
  cache.set(key, result);
  return result;
};
```

### Fallback Chain
```typescript
const generateWithFallback = async (prompt) => {
  try {
    return await copilot.generate(prompt);
  } catch {
    try {
      return await kimi.generate(prompt);
    } catch {
      return await openai.generate(prompt);
    }
  }
};
```

## Image Processing

### Lazy Loading
```typescript
// Load images only when needed
const loadImage = async (src) => {
  const img = new Image();
  img.loading = 'lazy';
  img.src = src;
  await img.decode();
  return img;
};
```

### Resize Before Upload
```typescript
// Resize large images before processing
const resizeImage = async (file, maxWidth = 1080) => {
  if (file.width <= maxWidth) return file;
  return await sharp(file)
    .resize(maxWidth)
    .toBuffer();
};
```

## Network Requests

### Batching
```typescript
// Batch multiple requests
const batchRequests = async (urls, batchSize = 5) => {
  const results = [];
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(url => fetch(url))
    );
    results.push(...batchResults);
  }
  return results;
};
```

### Connection Pooling
```typescript
// Reuse connections
const agent = new http.Agent({ keepAlive: true });
const fetchWithPool = (url) => fetch(url, { agent });
```

## Memory Management

### Stream Processing
```typescript
// Process large files as streams
const processLargeFile = (filePath) => {
  return createReadStream(filePath)
    .pipe(new Transform({
      transform(chunk, encoding, callback) {
        // Process chunk
        callback(null, processed);
      }
    }));
};
```

### Cleanup
```typescript
// Automatic cleanup
const withTempFile = async (fn) => {
  const tmpPath = getTmpPath();
  try {
    return await fn(tmpPath);
  } finally {
    await unlink(tmpPath).catch(() => {});
  }
};
```

## Monitoring

### Track Key Metrics
- Task duration (p50, p95, p99)
- Success rate by task type
- Resource utilization (CPU, memory, disk)
- API call latency

### Alert Thresholds
- Success rate < 90%
- p95 latency > 60s
- Error rate > 5%
- Disk usage > 80%
