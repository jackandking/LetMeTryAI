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
};

async function ensureLogin(page) {
  try {
    if (page.url().includes('login')) {
      console.log('⚠️  Please log in manually.');
      await page.waitForURL((url) => !url.toString().includes('login'), { timeout: 300000 });
      console.log('✅ Login detected.');
    }
  } catch (e) {
    console.log('Login check skipped/passed.');
  }
}

async function captureSnapshot(page, name) {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const screenshotPath = path.join(OUTPUT_DIR, `${name}_${timestamp}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`📸 Saved snapshot: ${screenshotPath}`);
}

async function main() {
  console.log('🚀 Starting Kuaishou Data Fetcher (Robust Event Dispatch Mode)...');

  const browser = await chromium.launch({ headless: false }); 
  const context = await browser.newContext({
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

    // Capture console logs
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning')
            console.log(`  PAGE LOG (${msg.type()}): ${msg.text()}`);
    });

    try {
        // 1. Visit List
        console.log('\n--- Visiting Distribution Plan List ---');
        await page.goto(URLS.DISTRIBUTION_LIST);
        await ensureLogin(page);
        await page.waitForLoadState('networkidle');
        await captureSnapshot(page, 'distribution_list_initial');

        // Wait for table
        try {
            await page.waitForSelector('table tbody tr', { timeout: 10000 });
        } catch(e) {
            console.log('⚠️ Table rows not found within 10s.');
        }
        
        // Initial count check
        const initialRows = await page.locator('table tbody tr').count();
        console.log(`Found ${initialRows} plans initially.`);
        
        // Helper to handle overlay
        const handleOverlay = async (contextName) => {
             const overlays = page.locator('.detail, .ks-drawer, .distribution-plan-detail-dialog, [role="dialog"]');
             const count = await overlays.count();
             let handled = false;
             
             for (let j = 0; j < count; j++) {
                 const el = overlays.nth(j);
                 const isVisible = await el.isVisible().catch(() => false);
                 // Also check computed style for visibility/display/opacity
                 const styleVisible = await el.evaluate(e => {
                     const s = window.getComputedStyle(e);
                     return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
                 }).catch(() => false);

                 if (isVisible || styleVisible) {
                     console.log(`  ✅ [${contextName}] Overlay detected (Index ${j})!`);
                     
                     // Dump text
                     const text = await el.innerText().catch(() => '');
                     console.log(`  [${contextName}] Overlay Text: "${text.replace(/\n/g, ' ').substring(0, 100)}..."`);

                     if (text.includes('效果数据') || text.includes('点击量') || text.includes('收益') || text.includes('曝光')) {
                         console.log(`  [${contextName}] 🚨 Found Data Overlay! Saving content.`);
                         fs.writeFileSync(path.join(OUTPUT_DIR, `plan_data_text_RESCUED_${contextName}.txt`), text);
                         await captureSnapshot(page, `plan_data_overlay_RESCUED_${contextName}`);
                         // Do NOT close it if it's data
                         return true;
                     }
                     
                     await page.waitForTimeout(1000);
                     await captureSnapshot(page, `overlay_${contextName}`);
                     
                     if (text.length > 0) {
                        fs.writeFileSync(path.join(OUTPUT_DIR, `overlay_text_${contextName}.txt`), text);
                     }
                     
                     // Close
                     console.log(`  [${contextName}] Closing overlay...`);

                     
                     // Dump HTML for debugging
                     const overlayHtml = await el.innerHTML();
                     fs.writeFileSync(path.join(OUTPUT_DIR, `overlay_html_${contextName}.html`), overlayHtml);

                     // 1. Try explicit footer buttons by class/position
                     // The cancel button is usually the first button in the footer or has 'default' style
                     const footer = el.locator('.ks-dialog__footer');
                     if (await footer.count() > 0) {
                         const buttons = footer.locator('button');
                         const btnCount = await buttons.count();
                         
                         for (let k = 0; k < btnCount; k++) {
                             const btn = buttons.nth(k);
                             const rawText = await btn.innerText().catch(() => '');
                             const text = rawText.replace(/\s/g, ''); // Remove spaces
                             console.log(`  [${contextName}] Footer button ${k}: "${rawText}" -> "${text}"`);
                             
                             if (text.includes('取消') || text.includes('Cancel') || text.includes('Close') || text.includes('知道了')) {
                                 console.log(`  [${contextName}] Clicking footer button: ${rawText}`);
                                 // Use evaluate to bypass visibility checks completely
                                 await btn.evaluate(b => b.click());
                                 await page.waitForTimeout(500);
                                 handled = true;
                                 break;
                             }
                         }
                         if (handled) continue;
                     }
                     
                     // 2. Check for Close Icon explicitly
                     const closeIcon = el.locator('.ks-dialog__close, .sys-icon-close').first();
                     if (await closeIcon.count() > 0) {
                          console.log(`  [${contextName}] Clicking Close Icon...`);
                          // Parent button might be the clickable one
                          const parentBtn = closeIcon.locator('xpath=..');
                          if (await parentBtn.count() > 0 && await parentBtn.getAttribute('type') === 'button') {
                              await parentBtn.evaluate(b => b.click());
                          } else {
                              await closeIcon.evaluate(b => b.click());
                          }
                          await page.waitForTimeout(500);
                          handled = true;
                          continue;
                     }

                     // 2. Check for Close Icon
                     const closeBtn = el.locator('.close, .ks-drawer__close, [aria-label="Close"], .ks-drawer__header .ks-icon-close, .sys-icon-close');
                     const closeBtnVisible = await closeBtn.first().isVisible().catch(() => false);
                     
                     if (await closeBtn.count() > 0 && closeBtnVisible) {
                         console.log(`  [${contextName}] Clicking Close Icon...`);
                         await closeBtn.first().click();
                     } else {
                         console.log(`  [${contextName}] Close button hidden/missing. Clicking outside/Esc...`);
                         // Force click outside
                         await page.mouse.click(10, 300);
                         await page.keyboard.press('Escape');
                     }
                     await page.waitForTimeout(1000);
                     handled = true;
                     
                     // Stop after handling one overlay to avoid iterating through hidden ones or duplicates
                     break;
                 }
             }
             return handled;
        };

        for (let i = 0; i < Math.min(initialRows, 5); i++) {
            console.log(`\n--- Processing Plan Index ${i+1} ---`);
            
            // 0. CLEANUP: Ensure no overlay is blocking
            await handleOverlay(`cleanup_${i+1}`);

            // Re-locate rows because page might have refreshed/navigated
            if (!page.url().includes('distribution-plan-list')) {
                console.log('  Navigating back to list...');
                await page.goto(URLS.DISTRIBUTION_LIST);
                await page.waitForLoadState('networkidle');
                await page.waitForSelector('table tbody tr', { timeout: 10000 });
            }
            
            const rows = page.locator('table tbody tr');
            if (i >= await rows.count()) {
                console.log('  Index out of bounds (list changed?), skipping.');
                break;
            }

            const row = rows.nth(i);
            const nameEl = row.locator('td').nth(1);
            const planName = await nameEl.innerText().catch(() => `Plan_${i+1}`);
            console.log(`  Target: ${planName}`);
            
            const lastCell = row.locator('td').last();
            
            // Debug: Dump cell HTML
            const cellHtml = await lastCell.innerHTML();
            fs.writeFileSync(path.join(OUTPUT_DIR, `cell_debug_${i+1}.html`), cellHtml);
            console.log(`  Saved cell HTML to metrics/kuaishou/cell_debug_${i+1}.html`);

            // Look for button by index 1 (Data) - Correct Target
            const targetIndex = 1; 
            const dataBtn = lastCell.locator('button').nth(targetIndex);
            
            if (await dataBtn.count() > 0) {
                // Get text content via evaluate to bypass visibility checks
                const btnText = await dataBtn.evaluate(el => el.textContent || el.innerText).catch(() => '');
                console.log(`  Target Button [${targetIndex}] text (raw): "${btnText.trim()}"`);

                // Check computed styles
                const btnStyles = await dataBtn.evaluate(el => {
                    const s = window.getComputedStyle(el);
                    return {
                        pointerEvents: s.pointerEvents,
                        display: s.display,
                        visibility: s.visibility,
                        opacity: s.opacity
                    };
                });
                console.log(`  Button Styles: ${JSON.stringify(btnStyles)}`);

                // FORCE VISIBILITY if hidden
                if (btnStyles.visibility === 'hidden' || btnStyles.display === 'none') {
                    console.log('  ⚠️ Button is hidden! Forcing visibility...');
                    await dataBtn.evaluate(el => {
                        el.style.visibility = 'visible';
                        el.style.display = 'inline-block';
                        el.style.opacity = '1';
                    });
                    await page.waitForTimeout(500); // Wait for render
                }
                
                // Hover the row/cell first (might trigger listeners)
                console.log('  Hovering row...');
                try {
                    await row.hover({ timeout: 2000 });
                } catch (e) {
                    console.log('  Hover failed (timeout), proceeding anyway.');
                }
                await page.waitForTimeout(500);

                if (await dataBtn.isDisabled()) {
                    console.log('  ⚠️ Button is disabled! Skipping.');
                    continue;
                }

                // const currentUrl = page.url(); // Unused here
                // const pagePromise = context.waitForEvent('page').catch(() => null);

                // --- ACTION STRATEGY ---
                
                // 1. CLICK STRATEGY
                console.log('  Attempting Click Strategy: evaluate click()');
                await dataBtn.evaluate(el => el.click());
                
                // Wait for reaction
                await page.waitForTimeout(3000);
                
                // Check for overlay
                let overlay = page.locator('.detail, .ks-drawer, .distribution-plan-detail-dialog, [role="dialog"], .ks-overlay-content').first();
                
                if (!await overlay.isVisible()) {
                     console.log('  ❌ Direct click failed. Trying DispatchEvent...');
                     await dataBtn.evaluate(el => {
                         el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
                     });
                     await page.waitForTimeout(3000);
                }

                if (await overlay.isVisible()) {
                    console.log('  ✅ Overlay detected!');
                    const overlayText = await overlay.innerText();
                    console.log(`  Overlay Text (first 100 chars): ${overlayText.substring(0, 100)}...`);
                    
                    if (overlayText.includes('预算超出')) {
                        console.log('  ⚠️ "Budget Exceed" warning detected.');
                        // Attempt to close budget overlay specifically
                        const closeBtn = overlay.locator('.ks-icon-close, button:has-text("关闭"), button:has-text("知道")').first();
                        if (await closeBtn.isVisible()) {
                            await closeBtn.click();
                            await page.waitForTimeout(1000);
                        }
                    } else {
                        console.log('  🎉 Data Overlay captured! Saving and exiting.');
                        await captureSnapshot(page, `plan_data_overlay_${i+1}_${planName.replace(/\s+/g, '_')}`);
                        fs.writeFileSync(path.join(OUTPUT_DIR, `plan_data_text_${i+1}.txt`), overlayText);
                        // Exit the loop and finish
                        break; 
                    }
                } else {
                    console.log('  ❌ No overlay detected.');
                }
                
                // If we didn't break, continue loop
                continue;
            } else {
                console.log('  ⚠️ Data Button not found.');
            }
        }


        
        await context.storageState({ path: AUTH_FILE });
        console.log(`\n✅ Sequence completed.`);
  
    } catch (error) {
      console.error('❌ Error:', error);
      // await captureSnapshot(page, 'error'); // page might be closed or invalid
    } finally {
      await browser.close();
    }
  }
  
  main();
