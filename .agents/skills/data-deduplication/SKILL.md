---
name: data-deduplication
description: Deduplicate data from multiple sources or paginated scraping. Supports various strategies: exact match, fuzzy match, ID-based, and content similarity. Use when merging datasets or cleaning scraped data.
---

# Data Deduplication

Clean and deduplicate data from web scraping.

## Quick Start

```javascript
import { deduplicateById, deduplicateByContent, findSimilar } from './scripts/dedup.js';

// Simple ID-based deduplication
const uniqueData = deduplicateById(rawData, 'planId');

// Content-based deduplication
const uniqueContent = deduplicateByContent(rawData, {
    fields: ['title', 'description'],
    similarity: 0.9
});
```

## Deduplication Strategies

### 1. ID-Based (Fastest)

```javascript
function deduplicateById(data, idField = 'id') {
    const seen = new Set();
    return data.filter(item => {
        const key = item[idField];
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Preserve order (first occurrence wins)
function deduplicateByIdOrdered(data, idField = 'id') {
    const seen = new Map(); // Use Map to preserve insertion order
    
    data.forEach(item => {
        const key = item[idField];
        if (key && !seen.has(key)) {
            seen.set(key, item);
        }
    });
    
    return Array.from(seen.values());
}

// Keep latest (last occurrence wins)
function deduplicateByIdKeepLatest(data, idField = 'id', timestampField = 'updatedAt') {
    const map = new Map();
    
    data.forEach(item => {
        const key = item[idField];
        if (!key) return;
        
        const existing = map.get(key);
        if (!existing || item[timestampField] > existing[timestampField]) {
            map.set(key, item);
        }
    });
    
    return Array.from(map.values());
}
```

### 2. Content-Based Similarity

```javascript
function deduplicateByContent(data, options = {}) {
    const { fields = ['title'], threshold = 0.9 } = options;
    const unique = [];
    
    data.forEach(item => {
        const content = fields.map(f => item[f] || '').join(' ').toLowerCase().trim();
        
        // Check similarity with existing items
        const isDuplicate = unique.some(existing => {
            const existingContent = fields.map(f => existing[f] || '').join(' ').toLowerCase().trim();
            const similarity = calculateSimilarity(content, existingContent);
            return similarity >= threshold;
        });
        
        if (!isDuplicate) {
            unique.push(item);
        }
    });
    
    return unique;
}

// Simple similarity calculation (can use libraries like string-similarity)
function calculateSimilarity(str1, str2) {
    if (str1 === str2) return 1.0;
    if (!str1 || !str2) return 0.0;
    
    // Jaccard similarity for words
    const set1 = new Set(str1.split(/\s+/));
    const set2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
}
```

### 3. Fuzzy Matching

```javascript
import stringSimilarity from 'string-similarity'; // npm install string-similarity

function fuzzyDeduplicate(data, field = 'name', threshold = 0.8) {
    const unique = [];
    
    data.forEach(item => {
        const name = item[field] || '';
        
        const isDuplicate = unique.some(existing => {
            const similarity = stringSimilarity.compareTwoStrings(
                name.toLowerCase(),
                existing[field].toLowerCase()
            );
            return similarity >= threshold;
        });
        
        if (!isDuplicate) {
            unique.push(item);
        }
    });
    
    return unique;
}
```

### 4. Composite Keys

```javascript
function deduplicateByCompositeKey(data, fields = ['name', 'date']) {
    const seen = new Set();
    
    return data.filter(item => {
        const key = fields.map(f => item[f]).join('|');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
```

## Advanced: Find Duplicates (Without Removing)

```javascript
function findDuplicates(data, idField = 'id') {
    const seen = new Map();
    const duplicates = [];
    
    data.forEach((item, index) => {
        const key = item[idField];
        if (seen.has(key)) {
            duplicates.push({
                key,
                firstIndex: seen.get(key),
                duplicateIndex: index,
                firstItem: data[seen.get(key)],
                duplicateItem: item
            });
        } else {
            seen.set(key, index);
        }
    });
    
    return duplicates;
}

// Usage
const duplicates = findDuplicates(rawData, 'planId');
console.log(`Found ${duplicates.length} duplicates`);
duplicates.forEach(d => {
    console.log(`  Duplicate: "${d.key}" at index ${d.duplicateIndex}`);
});
```

## Batch Processing for Large Datasets

```javascript
async function deduplicateInBatches(data, idField, batchSize = 1000) {
    const seen = new Set();
    const unique = [];
    
    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);
        
        batch.forEach(item => {
            const key = item[idField];
            if (!key || seen.has(key)) return;
            seen.add(key);
            unique.push(item);
        });
        
        console.log(`Processed ${Math.min(i + batchSize, data.length)}/${data.length}`);
    }
    
    return unique;
}
```

## Statistics

```javascript
function getDeduplicationStats(original, deduplicated, idField = 'id') {
    const originalCount = original.length;
    const uniqueCount = deduplicated.length;
    const duplicateCount = originalCount - uniqueCount;
    
    // Find most common duplicates
    const counts = {};
    original.forEach(item => {
        const key = item[idField];
        counts[key] = (counts[key] || 0) + 1;
    });
    
    const mostDuplicated = Object.entries(counts)
        .filter(([k, v]) => v > 1)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
    
    return {
        originalCount,
        uniqueCount,
        duplicateCount,
        duplicateRate: (duplicateCount / originalCount * 100).toFixed(2) + '%',
        mostDuplicated
    };
}
```

## Examples

See `examples/`:
- `basic_dedup.js` - Simple ID-based
- `content_similarity.js` - Text similarity
- `large_dataset.js` - Batch processing

## Integration

```javascript
// Full pipeline
import { handlePagination } from '../pagination-handler/scripts/pagination.js';
import { deduplicateById, getDeduplicationStats } from './scripts/dedup.js';

async function scrapeAndClean(page) {
    // 1. Get paginated data
    const rawData = await handlePagination(page, extractor);
    
    // 2. Deduplicate
    const uniqueData = deduplicateById(rawData, 'planId');
    
    // 3. Get stats
    const stats = getDeduplicationStats(rawData, uniqueData, 'planId');
    console.log(`Removed ${stats.duplicateCount} duplicates (${stats.duplicateRate})`);
    
    return uniqueData;
}
```
