---
name: report-sender
description: Automated report generation and delivery via email (AgentMail). Supports data summarization, attachment handling, and formatted output. Use when sending scraping results or periodic reports.
---

# Report Sender

Automated report generation and email delivery.

## Quick Start

```javascript
import { sendEmail } from './.automation/scripts/send_email.py';

await sendEmail({
    to: 'user@example.com',
    subject: 'Data Report - 36 tasks',
    body: reportBody,
    attachments: ['data.csv', 'data.json']
});
```

## Usage Patterns

### Pattern 1: Simple Data Report

```javascript
await sendEmail({
    to: 'jackandking@163.com',
    subject: 'Kuaishou Tasks Report',
    body: reportBody,
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
// Format data as markdown table for email body
const table = tasks.map(t => `| ${t.planId} | ${t.name} | ${t.stats?.组件曝光数 || '--'} |`).join('\n');
```

### Summary Statistics

```javascript
// Calculate summary statistics manually
const stats = {
    totalExposure: tasks.reduce((sum, t) => sum + (parseInt(t.stats?.组件曝光数) || 0), 0),
    totalClicks: tasks.reduce((sum, t) => sum + (parseInt(t.stats?.组件点击数) || 0), 0),
    totalDaren: tasks.reduce((sum, t) => sum + (parseInt(t.stats?.已履单达人数量) || 0), 0)
};
```

### Top N Items

```javascript
// Get top N items by exposure
const top10 = tasks
    .sort((a, b) => (parseInt(b.stats?.组件曝光数) || 0) - (parseInt(a.stats?.组件曝光数) || 0))
    .slice(0, 10);
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
async function scrapeAndSend() {
    // Scrape data using existing automation scripts
    // e.g., node .automation/scripts/daily_kuaishou_report.js
    
    // Send report via Python email script
    // .automation/scripts/send_email.py
}
```

## CLI Usage

```bash
# Send report via Python script
python3 .automation/scripts/send_email.py "Subject" "to@example.com" /path/to/report.txt

# Or use the daily report orchestrator
node .automation/scripts/daily-orchestrator.js
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
