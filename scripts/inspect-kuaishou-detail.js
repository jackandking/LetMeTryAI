
import { chromium } from 'playwright';
import fs from 'fs';
import { resolveKuaishouAuthFile } from './runtime-paths.js';

const AUTH_FILE = resolveKuaishouAuthFile(import.meta.url);
const DETAIL_URL = 'https://daren.kuaishou.com/distribution-plan-create/check/167291?distributionStatusValue=2&status=false';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${DETAIL_URL}...`);
    await page.goto(DETAIL_URL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000); // Wait for dynamic content

    const title = await page.title();
    console.log(`Page Title: ${title}`);

    // Dump all text content
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('\n--- Page Text Content (Snippet) ---');
    console.log(bodyText.substring(0, 1000)); 
    console.log('...\n');

    // Look for keywords
    const keywords = ['曝光', '点击', '收益', 'GMV', '播放', '发布'];
    console.log('\n--- Keyword Search ---');
    for (const keyword of keywords) {
        // Find elements containing the keyword
        const elements = page.locator(`text=${keyword}`);
        const count = await elements.count();
        console.log(`Found ${count} elements for "${keyword}":`);
        for (let i = 0; i < Math.min(count, 5); i++) {
            const text = await elements.nth(i).innerText();
            const html = await elements.nth(i).innerHTML();
            console.log(`  [${i}] Text: "${text.trim()}"`);
            // Check parent/sibling for values
            const parentText = await elements.nth(i).locator('..').innerText();
             console.log(`       Parent Text: "${parentText.trim().replace(/\n/g, ' | ')}"`);
        }
    }

    // Dump specific structure if it looks like a card or table
    const cards = page.locator('.ks-card, .card, .data-card'); // Guessing class names
    const cardCount = await cards.count();
    if (cardCount > 0) {
        console.log(`\nFound ${cardCount} potential cards.`);
        for (let i = 0; i < Math.min(cardCount, 3); i++) {
            console.log(`Card ${i}:`, await cards.nth(i).innerText());
        }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main();
