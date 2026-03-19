---
name: kuaishou-scraper
description: Scrape Kuaishou (快手) creator platform data using MCP Playwright. Handles distribution plan list, task details, and statistics extraction. Use when user wants to crawl data from daren.kuaishou.com including task lists, performance metrics, earnings data, or automate task publishing.
---

# Kuaishou Data Scraper

Scrape Kuaishou creator platform data using MCP Playwright for reliable, self-healing automation.

## Quick Start

### 1. Prerequisites

- MCP Playwright server configured and running
- Valid session in `kuaishou_auth.json` (or manual login)

### 2. Basic Usage

```javascript
// Navigate to distribution plan list
await mcp.playwright.browser_navigate({ 
  url: 'https://daren.kuaishou.com/distribution-plan-list' 
});

// Wait for table to load
await mcp.playwright.browser_wait_for({ 
  selector: 'table tbody tr', 
  timeout: 10000 
});

// Extract task data
const tasks = await mcp.playwright.browser_evaluate({
  function: `() => {
    const rows = document.querySelectorAll('table tbody tr');
    return Array.from(rows).map(row => {
      const cells = row.querySelectorAll('td');
      return {
        name: cells[1]?.textContent?.trim(),
        status: cells[2]?.textContent?.trim(),
        timeRange: cells[3]?.textContent?.trim(),
        createTime: cells[4]?.textContent?.trim()
      };
    });
  }`
});
```

## Workflows

### Extract Task List

```javascript
// Step 1: Navigate
await mcp.playwright.browser_navigate({ 
  url: 'https://daren.kuaishou.com/distribution-plan-list' 
});

// Step 2: Check login status
const snapshot = await mcp.playwright.browser_snapshot({});
if (snapshot.text.includes('登录') || snapshot.text.includes('login')) {
  throw new Error('Not logged in. Please login first and save session.');
}

// Step 3: Wait for data
await mcp.playwright.browser_wait_for({ 
  selector: 'table tbody tr', 
  timeout: 15000 
});

// Step 4: Extract all pages
let allTasks = [];
let hasNextPage = true;

while (hasNextPage) {
  const tasks = await mcp.playwright.browser_evaluate({
    function: `() => {
      const rows = document.querySelectorAll('table tbody tr');
      return Array.from(rows).map(row => {
        const cells = row.querySelectorAll('td');
        return {
          name: cells[1]?.textContent?.trim(),
          status: cells[2]?.textContent?.trim(),
          timeRange: cells[3]?.textContent?.trim(),
          createTime: cells[4]?.textContent?.trim(),
          actions: cells[5]?.textContent?.trim()
        };
      });
    }`
  });
  allTasks = allTasks.concat(tasks);
  
  // Check for next page
  const nextBtn = await mcp.playwright.browser_evaluate({
    function: `() => {
      const btn = document.querySelector('.ks-pagination__btn-next');
      return btn && !btn.disabled;
    }`
  });
  
  if (nextBtn) {
    await mcp.playwright.browser_click({ 
      selector: '.ks-pagination__btn-next' 
    });
    await mcp.playwright.browser_wait_for({ time: 2000 });
  } else {
    hasNextPage = false;
  }
}
```

### Extract Task Statistics (Data Button)

When clicking the "数据" (Data) button opens a drawer/overlay:

```javascript
// Click data button for specific row
await mcp.playwright.browser_click({ 
  selector: 'table tbody tr:nth-child(1) button:nth-child(2)' 
});

// Wait for drawer to open
await mcp.playwright.browser_wait_for({ 
  selector: '.ks-drawer, .distribution-plan-detail-dialog', 
  timeout: 5000 
});

// Take screenshot for verification
await mcp.playwright.browser_take_screenshot({ 
  name: 'task-stats-drawer.png' 
});

// Extract statistics
const stats = await mcp.playwright.browser_evaluate({
  function: `() => {
    const data = {};
    // Common selectors for metrics
    const selectors = {
      exposure: ['曝光', 'exposure', '展现'],
      clicks: ['点击', 'click', '访问'],
      gmv: ['GMV', 'gmv', '交易额'],
      revenue: ['收益', '收入', 'earning', 'revenue'],
      playCount: ['播放', 'play', 'view'],
      publishCount: ['发布', 'publish', '投稿']
    };
    
    // Try to find values by text content
    document.querySelectorAll('.ks-card, .data-card, .stat-item').forEach(card => {
      const text = card.textContent.toLowerCase();
      Object.entries(selectors).forEach(([key, keywords]) => {
        if (keywords.some(kw => text.includes(kw.toLowerCase()))) {
          const valueEl = card.querySelector('.value, .number, [class*="value"], [class*="num"]');
          if (valueEl) data[key] = valueEl.textContent.trim();
        }
      });
    });
    
    return data;
  }`
});

// Close drawer
await mcp.playwright.browser_press_key({ key: 'Escape' });
// Or click close button
await mcp.playwright.browser_click({ 
  selector: '.ks-drawer__close, .ks-icon-close' 
});
```

### Handle Overlays and Dialogs

```javascript
// Check for visible overlay
const hasOverlay = await mcp.playwright.browser_evaluate({
  function: `() => {
    const overlays = document.querySelectorAll('.ks-drawer, .ks-dialog, [role="dialog"]');
    for (const el of overlays) {
      const style = window.getComputedStyle(el);
      if (style.display !== 'none' && style.visibility !== 'hidden') {
        return true;
      }
    }
    return false;
  }`
});

// Close any open overlay
async function closeOverlay() {
  // Try escape key first
  await mcp.playwright.browser_press_key({ key: 'Escape' });
  await mcp.playwright.browser_wait_for({ time: 500 });
  
  // Try close buttons
  const closeSelectors = [
    '.ks-drawer__close',
    '.ks-dialog__close',
    '.ks-icon-close',
    'button:has-text("取消")',
    'button:has-text("关闭")',
    'button:has-text("知道了")'
  ];
  
  for (const selector of closeSelectors) {
    try {
      await mcp.playwright.browser_click({ selector, timeout: 1000 });
      await mcp.playwright.browser_wait_for({ time: 500 });
    } catch (e) {
      // Try next selector
    }
  }
}
```

### Save and Reuse Session

```javascript
// After manual login, save session
const cookies = await mcp.playwright.browser_evaluate({
  function: `() => document.cookie`
});
fs.writeFileSync('kuaishou_auth.json', JSON.stringify({ cookies }));

// Later, restore session via browser context (MCP handles this automatically
// if configured with storageState)
```

## Troubleshooting

### Element Not Found

Use snapshot to debug:

```javascript
const snapshot = await mcp.playwright.browser_snapshot({});
console.log('Page structure:', snapshot);

// Or get full HTML
const html = await mcp.playwright.browser_evaluate({
  function: `() => document.body.innerHTML`
});
```

### Stale Element Reference

If the page updates dynamically, re-query elements:

```javascript
// Bad: Store reference
const button = await mcp.playwright.browser_evaluate({
  function: `() => document.querySelector('button')`
});
// ... page updates ...
await mcp.playwright.browser_click({ element: button }); // May fail

// Good: Use selector each time
await mcp.playwright.browser_click({ 
  selector: 'table tbody tr:nth-child(1) button:nth-child(2)' 
});
```

### Timing Issues

Always wait for elements, not fixed time:

```javascript
// Bad
await mcp.playwright.browser_wait_for({ time: 3000 });

// Good
await mcp.playwright.browser_wait_for({ 
  selector: '.ks-drawer', 
  timeout: 10000 
});
```

## Data Output Format

Standard task data structure:

```json
{
  "tasks": [
    {
      "name": "战机排行榜",
      "status": "进行中",
      "timeRange": "2024-01-01 至 2029-01-01",
      "createTime": "2024-01-15 10:30:00",
      "stats": {
        "exposure": "1.2M",
        "clicks": "45K",
        "gmv": "¥12,500",
        "revenue": "¥3,200",
        "playCount": "890K",
        "publishCount": "156"
      }
    }
  ]
}
```

## References

- [MCP Playwright Documentation](https://github.com/microsoft/playwright-mcp)
- `references/selectors.md` - Complete selector reference
- `scripts/extract-stats.js` - Standalone extraction script
