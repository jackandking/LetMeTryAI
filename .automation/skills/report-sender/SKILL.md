---
name: report-sender
description: Automated report generation and delivery via email (AgentMail). Supports data summarization, attachment handling, and formatted output. Use when sending scraping results or periodic reports.
---

# Report Sender

Automated report generation and email delivery.

## Quick Start

```javascript
import { ReportSender } from './scripts/sender.js';

const sender = new ReportSender({
    apiKey: process.env.AGENTMAIL_API_KEY,
    inboxId: 'letmetry@agentmail.to'
});

await sender.send({
    to: 'user@example.com',
    subject: 'Data Report - 36 tasks',
    data: scrapedData,
    template: 'kuaishou',
    attachments: ['data.csv', 'data.json']
});
```

## Usage Patterns

### Pattern 1: Simple Data Report

```javascript
import { sendDataReport } from './scripts/sender.js';

await sendDataReport({
    to: 'jackandking@163.com',
    subject: 'Kuaishou Tasks Report',
    title: '快手任务统计报告',
    data: tasks,
    summary: {
        totalTasks: tasks.length,
        totalExposure: 68085,
        totalClicks: 7713
    },
    attachments: ['metrics/kuaishou/all_36_stats.csv']
});
```

### Pattern 2: Custom Template

```javascript
const report = new ReportSender();

await report.send({
    to: 'user@example.com',
    subject: 'Custom Report',
    body: report.renderTemplate('custom', {
        title: 'My Report',
        items: data,
        generatedAt: new Date().toISOString()
    }),
    attachments
});
```

### Pattern 3: Batch Reports

```javascript
const sender = new ReportSender();

const recipients = ['user1@example.com', 'user2@example.com'];

for (const email of recipients) {
    await sender.send({
        to: email,
        subject: 'Daily Report',
        data: dailyData,
        template: 'summary'
    });
    
    await delay(1000); // Rate limiting
}
```

## Templates

### Built-in Templates

#### 1. Kuaishou Template
```javascript
const body = renderTemplate('kuaishou', {
    title: '快手星火计划数据报告',
    totalTasks: 36,
    totalExposure: 68085,
    totalClicks: 7713,
    totalDaren: 2432,
    topTasks: [...],  // Array of top performing tasks
    allTasks: [...],  // Complete task list
    generatedAt: '2026-03-10'
});
```

#### 2. Summary Template
```javascript
const body = renderTemplate('summary', {
    title: 'Data Summary',
    metrics: [
        { label: 'Total Items', value: 100 },
        { label: 'Success Rate', value: '95%' }
    ],
    details: '...'
});
```

#### 3. Table Template
```javascript
const body = renderTemplate('table', {
    headers: ['Name', 'Value', 'Status'],
    rows: data.map(d => [d.name, d.value, d.status])
});
```

### Custom Template

```javascript
// Create custom template
const myTemplate = (data) => `
# ${data.title}

Generated: ${data.date}

## Summary
${data.summary}

## Items
${data.items.map(i => `- ${i.name}: ${i.value}`).join('\n')}
`;

// Register and use
registerTemplate('custom', myTemplate);

await send({
    template: 'custom',
    templateData: { title, date, summary, items }
});
```

## Data Formatters

### JSON to Markdown Table

```javascript
import { toMarkdownTable } from './scripts/formatters.js';

const table = toMarkdownTable(tasks, [
    { key: 'planId', header: 'ID' },
    { key: 'name', header: 'Name' },
    { key: 'stats.组件曝光数', header: 'Exposure' }
]);
```

### Summary Statistics

```javascript
import { calculateStats } from './scripts/formatters.js';

const stats = calculateStats(tasks, {
    exposure: t => parseInt(t.stats?.组件曝光数) || 0,
    clicks: t => parseInt(t.stats?.组件点击数) || 0,
    daren: t => parseInt(t.stats?.已履单达人数量) || 0
});

// Returns: { sum, avg, max, min, count }
```

### Top N Items

```javascript
import { getTopN } from './scripts/formatters.js';

const top10 = getTopN(tasks, {
    by: t => parseInt(t.stats?.组件曝光数) || 0,
    n: 10,
    descending: true
});
```

## Configuration

```javascript
const sender = new ReportSender({
    // AgentMail API
    apiKey: 'am_us_...',
    
    // Default sender
    from: 'letmetry@agentmail.to',
    
    // Email defaults
    defaults: {
        subjectPrefix: '[Auto Report]',
        includeTimestamp: true,
        maxAttachmentSize: 10 * 1024 * 1024  // 10MB
    },
    
    // Rate limiting
    rateLimit: {
        maxPerMinute: 10,
        delayBetween: 1000
    }
});
```

## Attachment Handling

```javascript
// Auto-detect MIME type
await sender.send({
    attachments: [
        'data.csv',           // Auto: text/csv
        'data.json',          // Auto: application/json
        'screenshot.png'      // Auto: image/png
    ]
});

// Manual MIME type
await sender.send({
    attachments: [{
        filename: 'data.txt',
        path: './data.txt',
        contentType: 'text/plain'
    }]
});

// Buffer content
await sender.send({
    attachments: [{
        filename: 'report.pdf',
        content: pdfBuffer,
        contentType: 'application/pdf'
    }]
});
```

## Error Handling & Retries

```javascript
const sender = new ReportSender({
    retries: 3,
    onRetry: (error, attempt) => {
        console.log(`Retry ${attempt}: ${error.message}`);
    }
});

// Or manual retry
try {
    await sender.send({ ... });
} catch (error) {
    if (error.code === 'RATE_LIMITED') {
        await delay(60000);
        await sender.send({ ... });
    }
}
```

## Integration with Crawlers

```javascript
import { KuaishouCrawler } from '../kuaishou-crawler/scripts/crawler.js';
import { ReportSender } from './scripts/sender.js';

async function scrapeAndSend() {
    // Scrape data
    const crawler = new KuaishouCrawler();
    await crawler.init();
    const data = await crawler.scrapeAllTasks();
    await crawler.saveResults(data);
    await crawler.close();
    
    // Generate and send report
    const sender = new ReportSender();
    
    const stats = calculateStats(data);
    const topTasks = getTopN(data, { by: t => t.stats?.组件曝光数, n: 10 });
    
    await sender.send({
        to: 'manager@company.com',
        subject: `Daily Kuaishou Report - ${data.length} tasks`,
        template: 'kuaishou',
        templateData: {
            title: '快手数据日报',
            date: new Date().toISOString(),
            totalTasks: data.length,
            ...stats,
            topTasks,
            allTasks: data
        },
        attachments: [
            'metrics/kuaishou/latest.csv',
            'metrics/kuaishou/latest.json'
        ]
    });
}

// Schedule daily
schedule('0 9 * * *', scrapeAndSend);  // 9 AM daily
```

## CLI Usage

```bash
# Send existing data file
node scripts/sender.js --file data.json --to user@example.com

# Send with template
node scripts/sender.js --file data.json --template kuaishou --to user@example.com

# Preview (don't send)
node scripts/sender.js --file data.json --template kuaishou --preview

# Send to multiple recipients
node scripts/sender.js --file data.json --to user1@example.com,user2@example.com
```

## Examples

See `examples/`:
- `basic_send.js` - Simple email sending
- `kuaishou_report.js` - Full report with template
- `scheduled_report.js` - Daily automation

## Environment Variables

```bash
AGENTMAIL_API_KEY=am_us_...
REPORT_DEFAULT_FROM=letmetry@agentmail.to
REPORT_RATE_LIMIT=10  # per minute
```
