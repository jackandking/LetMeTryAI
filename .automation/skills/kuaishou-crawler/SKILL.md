---
name: kuaishou-crawler
description: Complete Kuaishou (快手) Creator Platform crawler. Combines session management, pagination handling, data deduplication, and anti-blocking. Use when extracting task lists, statistics, or performance data from daren.kuaishou.com.
---

# Kuaishou Crawler

Complete solution for scraping Kuaishou Creator Platform.

## Features

- ✅ Automatic login with session persistence
- ✅ Multi-page task list extraction
- ✅ Statistics extraction from each task
- ✅ Automatic data deduplication
- ✅ Anti-blocking for drawer/overlays
- ✅ Screenshot evidence collection
- ✅ CSV/JSON export

## Quick Start

The crawler is used as a conceptual module. In practice, Kuaishou data extraction is handled by the scripts in .automation/scripts/ and .harness/scripts/.

```javascript
// Conceptual usage pattern
const crawler = new KuaishouCrawler({
    authFile: 'kuaishou_auth.json',
    outputDir: 'metrics/kuaishou'
});

// Get all tasks with statistics
const results = await crawler.scrapeAllTasks({
    includeStats: true,
    maxTasks: 36  // or 'all'
});

console.log(`Scraped ${results.length} tasks`);
```

## Usage Patterns

### Pattern 1: Full Scrape (All Tasks + Statistics)

```javascript
async function fullScrape() {
    const crawler = new KuaishouCrawler();
    
    try {
        await crawler.init();
        
        // Get all tasks across all pages
        const tasks = await crawler.getAllTasks();
        console.log(`Found ${tasks.length} unique tasks`);
        
        // Get statistics for each task
        const tasksWithStats = [];
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            console.log(`Processing ${i + 1}/${tasks.length}: ${task.name}`);
            
            const stats = await crawler.getTaskStats(task);
            tasksWithStats.push({
                ...task,
                stats
            });
            
            // Small delay between requests
            await crawler.delay(1000);
        }
        
        // Save results
        await crawler.saveResults(tasksWithStats, 'full_report');
        
    } finally {
        await crawler.close();
    }
}
```

### Pattern 2: Task List Only (Fast)

```javascript
const crawler = new KuaishouCrawler();
await crawler.init();

const tasks = await crawler.getAllTasks();
await crawler.saveResults(tasks, 'task_list');

await crawler.close();
```

### Pattern 3: Statistics Only (Specific Tasks)

```javascript
const crawler = new KuaishouCrawler();
await crawler.init();

const targetTasks = [
    { planId: '167291', name: 'AI水印公投', page: 1, rowIndex: 0 },
    { planId: '64508', name: '爸爸带女儿...', page: 1, rowIndex: 8 }
];

const results = [];
for (const task of targetTasks) {
    const stats = await crawler.getTaskStats(task);
    results.push({ ...task, stats });
}

await crawler.saveResults(results, 'selected_stats');
await crawler.close();
```

### Pattern 4: Batch Processing

```javascript
const crawler = new KuaishouCrawler();
await crawler.init();

const allTasks = await crawler.getAllTasks();

// Process in batches
const batchSize = 10;
for (let i = 0; i < allTasks.length; i += batchSize) {
    const batch = allTasks.slice(i, i + batchSize);
    console.log(`\n=== Batch ${i/batchSize + 1}/${Math.ceil(allTasks.length/batchSize)} ===`);
    
    const results = [];
    for (const task of batch) {
        const stats = await crawler.getTaskStats(task);
        results.push({ ...task, stats });
    }
    
    // Save batch immediately (checkpoint)
    await crawler.saveResults(results, `batch_${i/batchSize + 1}`);
}

await crawler.close();
```

## Configuration

```javascript
const crawler = new KuaishouCrawler({
    // Session persistence
    authFile: 'kuaishou_auth.json',
    
    // Output directory
    outputDir: 'metrics/kuaishou',
    
    // Browser options
    headless: false,  // Set true for production
    viewport: { width: 1280, height: 800 },
    
    // Anti-blocking options
    antiBlocking: {
        closeOverlayBeforeAction: true,
        maxRetries: 3,
        useForceClick: true
    },
    
    // Rate limiting
    delayBetweenRequests: 1000,  // ms
    
    // Pagination
    pagination: {
        maxPages: 10,  // Limit for safety
        waitBetweenPages: 2000
    }
});
```

## Data Structure

### Task Object
```javascript
{
    planId: '167291',
    name: 'AI水印公投',
    source: '小程序 - 人人爱男人宝',
    status: '进行中',
    page: 1,
    rowIndex: 0,
    stats: {
        组件曝光数: '63',
        组件点击数: null,
        任务下发人数: null,
        已履单达人数量: '5',
        已发布作品数: '5',
        已结算金额: '--'
    },
    screenshot: 'task_1_167291_AI水印公投.png',
    fetchTime: '2026-03-10T07:47:25.289Z'
}
```

### Output Files
- `kuaishou_tasks_*.json` - Full JSON data
- `kuaishou_tasks_*.csv` - Excel-compatible CSV
- `task_*.png` - Screenshots for verification

## Platform-Specific Selectors

```javascript
const KUAISHOU_SELECTORS = {
    // List page
    table: 'table tbody tr',
    planId: 'td:nth-child(1)',
    planName: 'td:nth-child(2)',
    source: 'td:nth-child(3)',
    status: 'td:nth-child(4)',
    actionButtons: 'td:last-child button',
    dataButtonIndex: 1,  // Second button
    
    // Pagination
    paginationInfo: '.distribution-list__table__pagination-total',
    pageNumbers: '.ks-pager li.number',
    nextButton: '.ks-pagination__btn-next',
    
    // Stats drawer
    drawer: '.ks-drawer, .distribution-plan-detail-dialog',
    metrics: {
        组件曝光数: /组件曝光数\s*([\d,]+|--)/,
        组件点击数: /组件点击数\s*([\d,]+|--)/,
        任务下发人数: /任务下发人数\s*([\d,]+|--)/,
        已履单达人数量: /已履单达人数量\s*([\d,]+|--)/,
        已发布作品数: /已发布作品数\s*([\d,]+|--)/,
        已结算金额: /已结算金额\(([^(]+)\)\s*([\d,.]+|--)/
    },
    
    // Overlay closing
    closeButtons: [
        '.ks-drawer__close',
        '.ks-icon-close',
        'button:has-text("取消")',
        'button:has-text("关闭")'
    ]
};
```

## Error Handling

```javascript
try {
    const crawler = new KuaishouCrawler();
    await crawler.init();
    
    const results = await crawler.scrapeAllTasks();
    
} catch (error) {
    if (error.message.includes('login')) {
        console.error('Login required - please check auth file');
    } else if (error.message.includes('timeout')) {
        console.error('Page load timeout - check network or increase timeout');
    } else {
        console.error('Scraping failed:', error);
    }
} finally {
    await crawler.close();
}
```

## Integration with Other Skills

```javascript
// Combine with report-sender
async function scrapeAndReport() {
    // Scrape data using daily_kuaishou_report.js
    // or run-kuaishou-scrape.sh
    
    // Send email report via send_email.py
}
```

## CLI Usage

```bash
# Full scrape (run from repo root)
node .automation/scripts/daily_kuaishou_report.js

# Task list only
node .automation/scripts/fetch-task-list-smart.js

# Statistics extraction
node .automation/scripts/fetch-task-stats.js

# Batch processing
node .automation/scripts/fetch-all-tasks-paginated.js
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Stuck on login | Delete `kuaishou_auth.json` and re-login manually |
| Overlay not closing | Increase delay or use force click |
| Missing tasks | Check pagination - may need to increase maxPages |
| Empty stats | Task may have no data yet (newly created) |
| Rate limited | Increase `delayBetweenRequests` |

## References

- Uses `web-scraper-playwright` for browser automation
- Uses `pagination-handler` for multi-page extraction
- Uses `data-deduplication` for cleaning duplicate entries
- Uses `anti-blocking` for overlay/drawer handling
