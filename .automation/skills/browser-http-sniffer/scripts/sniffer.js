#!/usr/bin/env node
/**
 * Browser HTTP Sniffer — Attach to Playwright/CDP browser and log network traffic
 *
 * Usage:
 *   node sniffer.js                    # Attach to localhost:9222, log all
 *   node sniffer.js --port 9222        # Custom CDP port
 *   node sniffer.js --filter distribution  # Only log URLs containing "distribution"
 *   node sniffer.js --capture-body     # Also capture request/response bodies
 */

const { chromium } = require('playwright');

const args = process.argv.slice(2);
const port = args.includes('--port') ? parseInt(args[args.indexOf('--port') + 1], 10) : 9222;
const filterPattern = args.includes('--filter') ? args[args.indexOf('--filter') + 1] : '';
const captureBody = args.includes('--capture-body');
const cdpUrl = `http://localhost:${port}`;

function shouldLog(url) {
    if (!filterPattern) return true;
    return url.includes(filterPattern);
}

(async () => {
    try {
        console.log(`Connecting to CDP at ${cdpUrl}...`);
        const browser = await chromium.connectOverCDP(cdpUrl);
        const context = browser.contexts()[0];
        const page = context.pages()[0];

        console.log('Sniffer attached. URL:', page.url());
        console.log('Filter:', filterPattern || '(none)');
        console.log('Capture body:', captureBody);
        console.log('---');

        page.on('request', async request => {
            const url = request.url();
            if (!shouldLog(url)) return;

            const method = request.method();
            console.log(`[REQUEST] ${method} ${url}`);

            if (captureBody) {
                const postData = request.postData();
                if (postData) {
                    console.log(`[REQ_BODY] ${postData.substring(0, 2000)}`);
                }
            }

            const headers = request.headers();
            if (headers['content-type']) {
                console.log(`[REQ_HDR] Content-Type: ${headers['content-type']}`);
            }
            console.log('---');
        });

        page.on('response', async response => {
            const url = response.url();
            if (!shouldLog(url)) return;

            const status = response.status();
            console.log(`[RESPONSE] ${status} ${url}`);

            if (captureBody) {
                try {
                    const body = await response.text();
                    console.log(`[RESP_BODY] ${body.substring(0, 2000)}`);
                } catch (e) {
                    console.log(`[RESP_BODY] <binary or unreadable>`);
                }
            }
            console.log('---');
        });

        // Keep alive
        await new Promise(() => {});
    } catch (e) {
        console.error('Error:', e.message);
        console.error('Make sure a Playwright browser is running with --remote-debugging-port=' + port);
        process.exit(1);
    }
})();
