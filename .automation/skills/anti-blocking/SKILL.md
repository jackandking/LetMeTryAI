---
name: anti-blocking
description: Handle blocking overlays, invisible elements, and automation detection. Provides strategies for force clicking, overlay closing, and recovery from stuck states. Essential for resilient web scraping.
---

# Anti-Blocking

Handle UI blocking and automation obstacles.

## The Problem

Web scraping often gets stuck on:
- Modal dialogs / Overlays that block interaction
- Elements that need hover to become visible
- Invisible/disabled buttons
- Stale element references
- Infinite loading states

## Quick Start

```javascript
import { 
    forceClick, 
    closeOverlay, 
    withRecovery,
    ensureClickable 
} from './scripts/anti-blocking.js';

// Force click hidden element
await forceClick(page, rowIndex, 1); // row, button index

// Close blocking overlay
await closeOverlay(page);

// Wrap with auto-recovery
await withRecovery(page, async () => {
    await page.click('.data-button');
});
```

## Pattern 1: Force Click (JavaScript Injection)

When Playwright's click fails due to visibility/stability issues:

```javascript
async function forceClick(page, rowIndex, buttonIndex = 1) {
    return await page.evaluate((rowIdx, btnIdx) => {
        const rows = document.querySelectorAll('table tbody tr');
        if (rowIdx >= rows.length) {
            return { success: false, error: 'Row index out of range' };
        }
        
        const row = rows[rowIdx];
        const actionCell = row.querySelector('td:last-child');
        if (!actionCell) {
            return { success: false, error: 'No action cell found' };
        }
        
        const buttons = actionCell.querySelectorAll('button');
        if (buttons.length <= btnIdx) {
            return { 
                success: false, 
                error: 'Not enough buttons',
                available: buttons.length 
            };
        }
        
        // Force click via JavaScript
        buttons[btnIdx].click();
        buttons[btnIdx].dispatchEvent(new MouseEvent('click', { bubbles: true }));
        
        return { success: true, clicked: buttons[btnIdx].textContent };
    }, rowIndex, buttonIndex);
}

// Usage
const result = await forceClick(page, 5, 1);
if (!result.success) {
    console.error('Click failed:', result.error);
}
```

## Pattern 2: Close Overlays

```javascript
async function closeOverlay(page, options = {}) {
    const { 
        timeout = 5000,
        methods = ['escape', 'clickOutside', 'closeButton']
    } = options;
    
    for (const method of methods) {
        try {
            switch (method) {
                case 'escape':
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(300);
                    break;
                    
                case 'clickOutside':
                    // Click on left side of page (away from drawer)
                    await page.mouse.click(100, 400);
                    await page.waitForTimeout(300);
                    break;
                    
                case 'closeButton':
                    const closeSelectors = [
                        '.ks-drawer__close',
                        '.ks-icon-close',
                        '.ks-dialog__close',
                        'button:has-text("取消")',
                        'button:has-text("关闭")',
                        'button:has-text("知道了")',
                        '[aria-label="Close"]'
                    ];
                    
                    for (const selector of closeSelectors) {
                        const btn = page.locator(selector).first();
                        if (await btn.isVisible({ timeout: 500 })) {
                            await btn.click({ timeout: 2000 });
                            await page.waitForTimeout(300);
                            return true;
                        }
                    }
                    break;
            }
        } catch (e) {
            // Try next method
        }
    }
    
    return false;
}
```

## Pattern 3: Hover to Reveal

```javascript
async function hoverToReveal(page, rowSelector, buttonSelector) {
    const row = page.locator(rowSelector);
    
    // Hover over row
    await row.hover();
    await page.waitForTimeout(500);
    
    // Now button should be visible
    const button = row.locator(buttonSelector);
    
    // Wait for visibility with fallback
    try {
        await button.waitFor({ state: 'visible', timeout: 3000 });
    } catch (e) {
        console.log('Button not visible, trying force click...');
    }
    
    return button;
}
```

## Pattern 4: Auto-Recovery Wrapper

```javascript
async function withRecovery(page, action, options = {}) {
    const { 
        maxRetries = 3,
        onError,
        closeOverlayBefore = true 
    } = options;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (closeOverlayBefore) {
                await closeOverlay(page);
            }
            
            return await action();
            
        } catch (error) {
            console.log(`Attempt ${attempt}/${maxRetries} failed: ${error.message}`);
            
            if (attempt === maxRetries) {
                if (onError) await onError(error);
                throw error;
            }
            
            // Recovery actions
            await closeOverlay(page);
            await page.waitForTimeout(1000 * attempt); // Exponential backoff
            
            // Scroll into view if needed
            try {
                await page.evaluate(() => window.scrollTo(0, 0));
            } catch (e) {}
        }
    }
}

// Usage
await withRecovery(page, async () => {
    await page.click('.data-button');
    await extractData(page);
}, {
    maxRetries: 3,
    onError: async (e) => {
        await page.screenshot({ path: 'error.png' });
    }
});
```

## Pattern 5: Detect and Handle Blocking Elements

```javascript
async function isBlockedByOverlay(page) {
    return await page.evaluate(() => {
        const overlays = document.querySelectorAll(
            '.modal, .dialog, .drawer, .overlay, [role="dialog"]'
        );
        
        for (const el of overlays) {
            const style = window.getComputedStyle(el);
            const isVisible = style.display !== 'none' && 
                             style.visibility !== 'hidden' && 
                             style.opacity !== '0';
            
            if (isVisible) {
                return {
                    blocked: true,
                    element: el.className,
                    text: el.textContent.substring(0, 100)
                };
            }
        }
        
        return { blocked: false };
    });
}

// Auto-unblock
async function ensureUnblocked(page) {
    const status = await isBlockedByOverlay(page);
    if (status.blocked) {
        console.log('Blocked by:', status.element);
        await closeOverlay(page);
    }
}
```

## Pattern 6: Stale Element Handling

```javascript
async function safeElementAction(page, getElement, action) {
    let lastError;
    
    for (let i = 0; i < 3; i++) {
        try {
            const element = await getElement();
            return await action(element);
        } catch (error) {
            lastError = error;
            
            if (error.message.includes('stale')) {
                console.log('Stale element, re-querying...');
                await page.waitForTimeout(500);
                continue;
            }
            
            throw error;
        }
    }
    
    throw lastError;
}

// Usage - Don't cache element references
await safeElementAction(
    page,
    () => page.locator('table tbody tr').nth(5), // Re-query each time
    (row) => row.click()
);
```

## Configuration

```javascript
const antiBlockingConfig = {
    // For Kuaishou
    kuaishou: {
        overlaySelectors: ['.ks-drawer', '.ks-dialog', '.detail'],
        closeButtonSelectors: ['.ks-drawer__close', '.ks-icon-close'],
        dataButtonIndex: 1, // Second button in row
        needHover: true
    },
    
    // Generic
    default: {
        overlaySelectors: ['.modal', '.dialog', '[role="dialog"]'],
        closeButtonSelectors: ['.close', '[aria-label="Close"]'],
        dataButtonIndex: 0,
        needHover: false
    }
};
```

## Examples

See `examples/`:
- `force_click.js` - JavaScript injection clicking
- `overlay_management.js` - Handling modal dialogs
- `recovery_patterns.js` - Error recovery strategies

## Integration

```javascript
import { chromium } from 'playwright';
import { closeOverlay, forceClick, withRecovery } from '../anti-blocking/scripts/anti-blocking.js';

async function resilientScraping(page) {
    for (let i = 0; i < tasks.length; i++) {
        await withRecovery(page, async () => {
            // Ensure no overlay blocking
            await closeOverlay(page);
            
            // Try normal click first
            try {
                await page.click(`tr:nth-child(${i}) button:nth-child(2)`);
            } catch (e) {
                // Fallback to force click
                await forceClick(page, i, 1);
            }
            
            // Extract data
            const data = await extractData(page);
            
            // Close before next iteration
            await closeOverlay(page);
            
            return data;
        }, { maxRetries: 3 });
    }
}
```
