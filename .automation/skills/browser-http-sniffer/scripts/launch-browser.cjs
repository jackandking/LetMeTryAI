#!/usr/bin/env node
/**
 * Launch a headed Chromium browser with CDP enabled for sniffing
 *
 * Usage:
 *   node launch-browser.cjs [url]
 *
 * Default URL: about:blank
 * CDP port: 9222
 */

const { chromium } = require('playwright');

const targetUrl = process.argv[2] || 'about:blank';
const cdpPort = 9222;

(async () => {
    const browser = await chromium.launch({
        headless: false,
        args: [`--remote-debugging-port=${cdpPort}`]
    });

    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });

    const page = await context.newPage();
    await page.goto(targetUrl);

    console.log(`Browser launched`);
    console.log(`CDP port: ${cdpPort}`);
    console.log(`Current URL: ${page.url()}`);
    console.log(`Keep browser open. Attach sniffer with:`);
    console.log(`  node sniffer.js --port ${cdpPort}`);

    // Keep alive
    await new Promise(() => {});
})();
