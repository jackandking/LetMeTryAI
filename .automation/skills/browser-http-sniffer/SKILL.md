---
name: browser-http-sniffer
description: Attach to a running Playwright/CDP browser and sniff HTTP requests/responses. Use when learning new web workflows, reverse engineering APIs, or debugging browser interactions.
---

# Browser HTTP Sniffer

Attach to a Playwright browser (headed mode with CDP enabled) and log all HTTP traffic.

## Purpose

- Learn how web apps work by observing actual API calls
- Reverse engineer undocumented endpoints
- Capture request/response bodies for automation scripts
- Debug why a browser workflow fails

## Prerequisites

- A Playwright browser running with `--remote-debugging-port=9222`
- Node.js with `playwright` package installed

## How to Start a Sniffable Browser

```javascript
const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({
        headless: false,
        args: ['--remote-debugging-port=9222']
    });
    // ... navigate to target site ...
})();
```

Or use the helper in this skill:

```bash
node .agents/skills/browser-http-sniffer/scripts/launch-browser.cjs
```

## Script

`scripts/sniffer.js`

## Usage

### Basic: log all traffic

```bash
node .agents/skills/browser-http-sniffer/scripts/sniffer.js
```

### Filter by URL pattern

```bash
node .agents/skills/browser-http-sniffer/scripts/sniffer.js --filter distribution
```

### Capture request/response bodies

```bash
node .agents/skills/browser-http-sniffer/scripts/sniffer.js --capture-body
```

### Custom CDP port

```bash
node .agents/skills/browser-http-sniffer/scripts/sniffer.js --port 9223
```

## Options

| Option | Description | Default |
|---|---|---|
| `--port` | Chrome DevTools Protocol port | `9222` |
| `--filter` | Only log URLs containing this string | (all) |
| `--capture-body` | Capture request/response bodies | false |

## Workflow

1. **Launch browser with CDP**
   ```bash
   node .agents/skills/browser-http-sniffer/scripts/launch-browser.cjs
   ```

2. **User performs actions in browser**

3. **Attach sniffer in another terminal**
   ```bash
   node .agents/skills/browser-http-sniffer/scripts/sniffer.js --capture-body --filter distribution
   ```

4. **Analyze captured API calls**
   - Identify endpoints
   - Extract request bodies
   - Understand response formats

## Output Format

```
[REQUEST] POST https://daren.kuaishou.com/rest/pc/creator/marketing/distribution/detail
[REQ_BODY] {"distributionPlanId":313564,"detailType":"Online"}
---
[RESPONSE] 200 https://daren.kuaishou.com/rest/pc/creator/marketing/distribution/detail
[RESP_BODY] {"result":1,"message":"成功","data":{"distributionPlanId":313564,...}}
---
```

## Tips

- Use `--capture-body` only when needed — it can be verbose
- Combine with `--filter` to reduce noise
- The sniffer runs until Ctrl+C
- Works with any site, not just Kuaishou
