
import { chromium } from 'playwright';
import fs from 'fs';

const AUTH_FILE = 'kuaishou_auth.json';
const LIST_URL = 'https://daren.kuaishou.com/distribution-plan-list';

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    console.log(`Navigating to ${LIST_URL}...`);
    await page.goto(LIST_URL);
    await page.waitForLoadState('networkidle');
    
    // Wait for table
    try {
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
    } catch(e) {
        console.log('Table not found.');
        return;
    }

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    console.log(`Found ${count} rows.`);

    if (count > 0) {
        const row = rows.first();
        const cells = row.locator('td');
        const cellCount = await cells.count();
        console.log(`Row 1 has ${cellCount} cells.`);

        // Inspect the last cell (usually actions)
        const lastCell = cells.last();
        console.log('Last cell text:', await lastCell.innerText());
        console.log('Last cell HTML:', await lastCell.innerHTML());

        const actionButtons = lastCell.locator('button');
        const actionBtnCount = await actionButtons.count();
        console.log(`Last cell has ${actionBtnCount} buttons.`);

        for (let i = 0; i < actionBtnCount; i++) {
             const btn = actionButtons.nth(i);
             const ariaLabel = await btn.getAttribute('aria-label');
             const title = await btn.getAttribute('title');
             // check for icon class or svg
             const icon = await btn.locator('i, svg').count();
             console.log(`  Action Button ${i}: Label="${ariaLabel}", Title="${title}", IconCount=${icon}`);
        }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
}

main();
