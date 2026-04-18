---
name: web-scraper-playwright
description: Universal web scraping foundation using Playwright with session persistence, stealth mode, and error recovery. Use when building any browser-based data extraction tool that needs login state, anti-detection, or resilient automation.
---

# Web Scraper Playwright

Universal browser automation foundation for resilient web scraping.

## Quick Start

```javascript
import { chromium } from 'playwright';
import fs from 'fs';

const AUTH_FILE = 'auth_session.json';

async function scrapeWithSession(url, scraperLogic) {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        // Load existing session
        storageState: fs.existsSync(AUTH_FILE) 
            ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) 
            : undefined,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    
    try {
        await page.goto(url, { timeout: 30000 });
        
        // Check and handle login
        if (await isLoginRequired(page)) {
            console.log('Login required, waiting for manual login...');
            await waitForLogin(page);
            // Save session for next time
            await context.storageState({ path: AUTH_FILE });
        }
        
        // Execute custom scraping logic
        const data = await scraperLogic(page);
        return data;
        
    } finally {
        await browser.close();
    }
}
```

## Key Patterns

### 1. Session Persistence

```javascript
// Check if login required
async function isLoginRequired(page) {
    return page.url().includes('login') || 
           await page.locator('text=登录').isVisible().catch(() => false);
}

// Wait for manual login
async function waitForLogin(page, timeout = 120000) {
    await page.waitForURL((url) => !url.toString().includes('login'), { timeout });
}
```

### 2. Stealth Mode

```javascript
const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai'
});

// Bypass webdriver detection
await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
```

### 3. Error Recovery

```javascript
async function withRetry(action, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            return await action();
        } catch (e) {
            if (i === maxRetries - 1) throw e;
            console.log(`Retry ${i + 1}/${maxRetries}...`);
            await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        }
    }
}
```

### 4. JavaScript Injection (When Playwright fails)

```javascript
// Force click when element is hidden/unstable
async function forceClick(page, rowIndex, buttonIndex = 1) {
    return await page.evaluate((rowIdx, btnIdx) => {
        const rows = document.querySelectorAll('table tbody tr');
        if (rowIdx >= rows.length) return { success: false };
        
        const buttons = rows[rowIdx].querySelectorSelector('td:last-child')?.querySelectorAll('button');
        if (!buttons || buttons.length <= btnIdx) return { success: false };
        
        buttons[btnIdx].click();
        return { success: true };
    }, rowIndex, buttonIndex);
}
```

## Configuration

### Environment Variables
```bash
PLAYWRIGHT_HEADLESS=true      # Run in headless mode
PLAYWRIGHT_TIMEOUT=30000      # Default timeout
PLAYWRIGHT_SLOW_MO=100        # Slow down operations
```

### Auth File Format
```json
{
  "cookies": [
    {
      "name": "session_id",
      "value": "xxx",
      "domain": ".example.com",
      "path": "/"
    }
  ],
  "origins": []
}
```

## Examples

See `examples/` directory for:
- `basic_scraper.js` - Simple scraping with login
- `multi_page.js` - Session reuse across pages
- `stealth_mode.js` - Anti-detection techniques

## Integration with Other Skills

```javascript
// Combine with pagination-handler
import { handlePagination } from '../pagination-handler/scripts/pagination.js';
import { scrapeWithSession } from './scripts/scraper.js';

async function scrapeAllPages(startUrl) {
    return await scrapeWithSession(startUrl, async (page) => {
        return await handlePagination(page, extractData);
    });
}
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Element not clickable | Use `force: true` or JavaScript injection |
| Timeout on navigation | Increase timeout or check for redirects |
| Session expired | Detect login page and re-authenticate |
| Infinite scroll | Use scroll-to-bottom pattern |

## References

- Playwright official documentation: https://playwright.dev
- Common selectors and best practices are documented inline above
