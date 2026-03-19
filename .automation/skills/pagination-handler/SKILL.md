---
name: pagination-handler
description: Handle paginated data extraction from websites with multiple pagination patterns (numbered pages, infinite scroll, load more button). Use when scraping large datasets spread across multiple pages.
---

# Pagination Handler

Universal pagination handling for web scraping.

## Supported Patterns

1. **Numbered Pages** (1, 2, 3, 4...)
2. **Next/Previous Buttons**
3. **Infinite Scroll**
4. **Load More Button**

## Quick Start

```javascript
import { handleNumberedPagination } from './scripts/pagination.js';

// Extract all pages
const allData = await handleNumberedPagination(page, {
    extractPageData: async (page, pageNum) => {
        // Extract data from current page
        return await page.evaluate(() => {
            return Array.from(document.querySelectorAll('.item')).map(el => ({
                title: el.textContent
            }));
        });
    },
    getTotalPages: async (page) => {
        // Return total page count
        const text = await page.locator('.pagination-info').textContent();
        const match = text.match(/共(\d+)页/);
        return match ? parseInt(match[1]) : 1;
    },
    onPageChange: async (page, pageNum) => {
        // Navigate to specific page
        await page.click(`.pagination a:has-text("${pageNum}")`);
        await page.waitForTimeout(2000);
    }
});
```

## Pattern 1: Numbered Pagination

```javascript
async function handleNumberedPagination(page, options) {
    const { extractPageData, getTotalPages, onPageChange } = options;
    const allData = [];
    
    const totalPages = await getTotalPages(page);
    console.log(`Total pages: ${totalPages}`);
    
    for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
        console.log(`Processing page ${currentPage}/${totalPages}`);
        
        if (currentPage > 1) {
            await onPageChange(page, currentPage);
        }
        
        // Wait for data to load
        await page.waitForSelector('.data-item', { timeout: 10000 });
        
        // Extract data
        const pageData = await extractPageData(page, currentPage);
        allData.push(...pageData);
        
        // Deduplicate within page
        const seen = new Set();
        const unique = allData.filter(item => {
            const key = item.id || JSON.stringify(item);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
        
        console.log(`  Found ${pageData.length} items, ${unique.length} unique total`);
    }
    
    return unique;
}
```

## Pattern 2: Next Button Pagination

```javascript
async function handleNextButtonPagination(page, extractFn) {
    const allData = [];
    let hasNext = true;
    let pageNum = 1;
    
    while (hasNext) {
        console.log(`Processing page ${pageNum}`);
        
        const data = await extractFn(page);
        allData.push(...data);
        
        // Check if next button exists and enabled
        hasNext = await page.evaluate(() => {
            const nextBtn = document.querySelector('.next-page, .pagination__next');
            return nextBtn && !nextBtn.disabled && !nextBtn.classList.contains('disabled');
        });
        
        if (hasNext) {
            await page.click('.next-page, .pagination__next');
            await page.waitForTimeout(2000);
            pageNum++;
        }
    }
    
    return allData;
}
```

## Pattern 3: Infinite Scroll

```javascript
async function handleInfiniteScroll(page, extractFn, options = {}) {
    const { maxScrolls = 10, scrollDelay = 1000 } = options;
    const allData = [];
    let previousHeight = 0;
    let sameHeightCount = 0;
    
    for (let i = 0; i < maxScrolls; i++) {
        // Extract current data
        const data = await extractFn(page);
        allData.push(...data);
        
        // Scroll to bottom
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await page.waitForTimeout(scrollDelay);
        
        // Check if more content loaded
        const currentHeight = await page.evaluate(() => document.body.scrollHeight);
        if (currentHeight === previousHeight) {
            sameHeightCount++;
            if (sameHeightCount >= 3) break; // No more content
        } else {
            sameHeightCount = 0;
            previousHeight = currentHeight;
        }
    }
    
    return allData;
}
```

## Pattern 4: Load More Button

```javascript
async function handleLoadMore(page, extractFn, buttonSelector = '.load-more') {
    const allData = [];
    
    while (true) {
        const data = await extractFn(page);
        allData.push(...data);
        
        const hasMore = await page.evaluate((selector) => {
            const btn = document.querySelector(selector);
            return btn && btn.style.display !== 'none' && !btn.disabled;
        }, buttonSelector);
        
        if (!hasMore) break;
        
        await page.click(buttonSelector);
        await page.waitForTimeout(2000);
    }
    
    return allData;
}
```

## Advanced: Auto-Detect Pagination Type

```javascript
async function detectPaginationType(page) {
    const checks = await page.evaluate(() => {
        const hasNumbers = document.querySelectorAll('.pagination .page-number, .ks-pager li').length > 0;
        const hasNextBtn = !!document.querySelector('.next-page, .pagination__next');
        const hasLoadMore = !!document.querySelector('.load-more');
        const isInfinite = document.body.scrollHeight > window.innerHeight * 2;
        
        return { hasNumbers, hasNextBtn, hasLoadMore, isInfinite };
    });
    
    if (checks.hasNumbers) return 'numbered';
    if (checks.hasLoadMore) return 'loadMore';
    if (checks.hasNextBtn) return 'nextButton';
    if (checks.isInfinite) return 'infinite';
    return 'single';
}
```

## Configuration

```javascript
const paginationConfig = {
    // Selectors for different platforms
    'kuaishou': {
        pageInfo: '.distribution-list__table__pagination-total',
        pageButton: '.ks-pager li.number',
        nextButton: '.ks-pagination__btn-next',
        dataRow: 'table tbody tr'
    },
    'default': {
        pageInfo: '.pagination-info',
        pageButton: '.pagination a',
        nextButton: '.next',
        dataRow: '.data-item'
    }
};
```

## Examples

See `examples/`:
- `numbered_pages.js` - Kuaishou style pagination
- `infinite_scroll.js` - Social media style
- `load_more.js` - E-commerce style

## Integration

```javascript
// With data-deduplication skill
import { deduplicateById } from '../data-deduplication/scripts/dedup.js';
import { handleNumberedPagination } from './scripts/pagination.js';

const rawData = await handleNumberedPagination(page, config);
const uniqueData = deduplicateById(rawData, 'planId');
```
