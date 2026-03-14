import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Configuration
const AUTH_FILE = 'kuaishou_auth.json';
const OUTPUT_DIR = 'metrics/kuaishou_debug';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function captureSnapshot(page, name) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(OUTPUT_DIR, `${name}_${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Saved snapshot: ${screenshotPath}`);
  return screenshotPath;
}

// Function to dump page content summary
async function analyzePage(page) {
    const title = await page.title();
    const url = page.url();
    // Count visible elements
    const visibleDialogs = await page.locator('[role="dialog"]:visible').count();
    const buttons = await page.locator('button:visible').count();
    
    console.log('\n--- Page Status ---');
    console.log(`Title: ${title}`);
    console.log(`URL: ${url}`);
    console.log(`Visible Dialogs: ${visibleDialogs}`);
    console.log(`Visible Buttons: ${buttons}`);
    
    // Check specific elements we care about
    const overlay = await page.locator('.ks-overlay, .distribution-plan-detail-dialog').count();
    console.log(`Overlays found in DOM: ${overlay}`);
    
    return { title, url };
}

async function main() {
  console.log('🚀 Starting Kuaishou Debugger (Auto-Run)...');

  const browser = await chromium.launch({ headless: false }); 
  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // Step 1: Visit List
    console.log('\nStep 1: Visiting Distribution Plan List...');
    await page.goto('https://daren.kuaishou.com/distribution-plan-list');
    
    // Initial analysis
    await page.waitForLoadState('networkidle');
    await analyzePage(page);
    await captureSnapshot(page, 'step1_list_loaded');

    // Step 2: Identify Rows
    // Wait for table to appear
    console.log('Waiting for table rows...');
    try {
        await page.waitForSelector('table tbody tr', { timeout: 10000 });
    } catch(e) {
        console.log('⚠️ Table rows not found within 10s.');
    }

    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    console.log(`\nFound ${count} rows.`);
    
    if (count === 0) {
        console.log('❌ No rows found! Please check if list is empty or selector wrong.');
        const html = await page.content();
        fs.writeFileSync(path.join(OUTPUT_DIR, 'page_dump.html'), html);
    } else {
        // Step 3: Try to interact with Row 1
        console.log('\n--- Targeting Row 1 ---');
        const firstRow = rows.first();
        const text = await firstRow.innerText();
        console.log(`Row 1 Text: ${text.substring(0, 50)}...`);
        
        const actionButtons = firstRow.locator('button');
        const btnCount = await actionButtons.count();
        console.log(`Row 1 has ${btnCount} buttons.`);
        
        // Log button texts (safely)
        for(let i=0; i<Math.min(btnCount, 5); i++) {
            const btnText = await actionButtons.nth(i).innerText().catch(() => 'Err');
            console.log(`  Button ${i}: "${btnText}"`);
        }

        // Step 4: Click Button 1 (Index 1 - the 2nd button)
        if (btnCount > 1) {
            console.log('\n--- Action: Clicking Button Index 1 (2nd button) ---');
            await actionButtons.nth(1).click({ force: true });
            console.log('✅ Clicked button!');
            
            // Wait for reaction
            console.log('Waiting 3s for overlay...');
            await page.waitForTimeout(3000);
            
            await analyzePage(page);
            await captureSnapshot(page, 'step4_overlay_open');
            
            console.log('\n--- Testing Close Methods ---');
            
            // Test 1: Click outside (Middle Left)
            console.log('\nTest 1: Attempting to close overlay (Click Middle-Left 100,400)...');
            await page.mouse.click(100, 400);
            await page.waitForTimeout(2000);
            await analyzePage(page);
            await captureSnapshot(page, 'test1_click_outside');
            
            // Test 2: ESC
            console.log('\nTest 2: Attempting to close overlay (ESC)...');
            await page.keyboard.press('Escape');
            await page.waitForTimeout(2000);
            await analyzePage(page);
            await captureSnapshot(page, 'test2_esc');
            
            // Test 3: Reload
            console.log('\nTest 3: Reloading page...');
            await page.reload({ waitUntil: 'networkidle' });
            await page.waitForTimeout(2000);
            await analyzePage(page);
            await captureSnapshot(page, 'test3_reload');
            
        } else {
            console.log('⚠️ Not enough buttons to click index 1.');
        }
    }

  } catch (error) {
    console.error('❌ Error:', error);
    await captureSnapshot(page, 'error');
  } finally {
    // Keep open for a bit
    await page.waitForTimeout(5000);
    await browser.close();
  }
}

main();
