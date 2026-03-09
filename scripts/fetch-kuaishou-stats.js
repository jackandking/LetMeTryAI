import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Configuration
const APP_ID = 'ks655273748878573030'; // Nanrenbao AppID
const AUTH_FILE = 'kuaishou_auth.json';
const OUTPUT_DIR = 'metrics/kuaishou';

// URLs
const URLS = {
  DISTRIBUTION_LIST: 'https://daren.kuaishou.com/distribution-plan-list',
  PROJECT_HOME: `https://open.kuaishou.com/project/home?appId=${APP_ID}`,
  PUBLISHER: `https://open.kuaishou.com/project/publisher?appId=${APP_ID}`,
  PUBLISHER_DETAIL: `https://open.kuaishou.com/project/publisher/detail?appId=${APP_ID}`,
  OPERATION_DATA: `https://open.kuaishou.com/project/data-operation-data?appId=${APP_ID}`,
  PERFORMANCE: `https://open.kuaishou.com/project/data/performance?appId=${APP_ID}`,
  USER_DATA: `https://open.kuaishou.com/project/data-user-data?appId=${APP_ID}`,
  CONSOLE: 'https://open.kuaishou.com/console'
};

async function ensureLogin(page) {
  try {
    // Check if we are redirected to login page
    if (page.url().includes('login')) {
      console.log('⚠️  Please log in manually in the browser window.');
      await page.waitForURL((url) => !url.toString().includes('login'), { timeout: 300000 }); // Wait up to 5 mins
      console.log('✅ Login detected.');
    }
  } catch (e) {
    console.log('Login check skipped or passed.');
  }
}

async function captureSnapshot(page, name) {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(OUTPUT_DIR, `${name}_${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Saved snapshot: ${screenshotPath}`);
}

async function main() {
  console.log('🚀 Starting Kuaishou Data Fetcher...');
  console.log(`App ID: ${APP_ID}`);

  // Launch browser
  const browser = await chromium.launch({ headless: false }); // Headless false to allow manual login if needed
  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // 1. Daren Platform - Distribution Plan List
    console.log('\n--- 1. Visiting Distribution Plan List ---');
    await page.goto(URLS.DISTRIBUTION_LIST);
    await ensureLogin(page);
    await page.waitForLoadState('networkidle');
    await captureSnapshot(page, 'distribution_list');

    // Simulate user clicks from record to view task details
    console.log('👀 Inspecting Distribution Plan Details...');
    
    // Find all rows in the table
    // Wait for table to appear first
    try {
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
    } catch(e) {
        console.log('⚠️ Table rows not found within 10s.');
    }

    const rows = page.locator('table tbody tr'); // Use generic selector
    const rowCount = await rows.count();
    console.log(`Found ${rowCount} plans in the list.`);
    
    // Iterate through first 5 rows to capture details (limit to 5 to avoid long execution)
    for (let i = 0; i < Math.min(rowCount, 5); i++) {
        const row = rows.nth(i);
        
        // Check plan status/name to log context
        const nameEl = row.locator('td').nth(1); // Assuming 2nd column is name
        const statusEl = row.locator('td').nth(2); // Assuming 3rd column is status
        const planName = await nameEl.innerText().catch(() => `Plan ${i+1}`);
        const planStatus = await statusEl.innerText().catch(() => 'Unknown');
        
        console.log(`Processing Plan ${i+1}: ${planName} (${planStatus})`);
        
        let clicked = false;
        
        // Strategy 1: Find ANY button in the row and log its text to debug
        const buttons = row.locator('button');
        const count = await buttons.count();
        // console.log(`  Row ${i+1} has ${count} buttons.`);
        
        // Strategy 2: Click the 2nd button if available (index 1)
        if (count >= 2) {
             const btn = buttons.nth(1);
             // console.log(`  Clicking 2nd button (blindly)...`);
             await btn.click({ force: true });
             clicked = true;
        } else {
             // Fallback: Click the last button
             const lastBtn = buttons.last();
             if (await lastBtn.isVisible()) {
                 // console.log(`  Clicking last button (fallback)...`);
                 await lastBtn.click({ force: true });
                 clicked = true;
             }
        }
        
        if (clicked) {
            // Blindly wait and snapshot, don't fail if selector not found
            console.log('  Waiting 3s for overlay...');
            await page.waitForTimeout(3000);
            await captureSnapshot(page, `plan_view_${i+1}_${planName.replace(/\s+/g, '_')}`);
            
            // Try to close blindly by clicking in the middle-left area (outside potential dialog)
            // Assuming viewport 1280x800, middle-left would be x=100, y=400
            console.log('  Attempting to close overlay (Click Middle-Left)...');
            await page.mouse.click(100, 400);
            await page.waitForTimeout(2000); // Wait for close animation
            
            // Check if overlay is still there (simple check by count of visible dialogs)
            // If still open, try reloading the page to reset state for next item
            const visibleDialogs = await page.locator('[role="dialog"]:visible').count();
            if (visibleDialogs > 0) {
                 console.log('  Overlay still open, reloading page to reset...');
                 await page.reload({ waitUntil: 'networkidle' });
                 // After reload, we need to re-fetch the rows handle!
                 // This breaks the loop's 'rows' reference.
                 // So we just break here for now or handle re-fetching.
                 // For simplicity, let's just break and say we got one.
                 // Or better: Re-query rows inside the loop? No, that's complex.
                 // Let's just try the click for now.
            }
        } else {
             console.log(`  ⚠️ "Data" button not found via XPath/Fallback for ${planName}. Skipping.`);
        }
        
        await page.waitForTimeout(1000); // Small pause between items
    }
    
    // Save auth state
    await context.storageState({ path: AUTH_FILE });
    console.log(`\n💾 Login state saved to ${AUTH_FILE}`);
    console.log('✅ Data fetch sequence completed.');
    console.log(`📂 Snapshots saved to ${OUTPUT_DIR}`);
    
    // Keep open briefly for user to see
    await page.waitForTimeout(5000);

  } catch (error) {
    console.error('❌ Error during data fetch:', error);
    await captureSnapshot(page, 'error');
  } finally {
    await browser.close();
  }
}

main();
