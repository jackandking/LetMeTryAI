import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configuration
const SOURCE_TASK_ID = '165805'; // The ID of 'fighter-jets' task to copy
// Direct URL to recreate the task - bypasses the list view and menu clicks!
const BASE_URL = `https://daren.kuaishou.com/distribution-plan-create/recreate/${SOURCE_TASK_ID}`;
const AUTH_FILE = 'kuaishou_auth.json';

async function main() {
  // Argument parsing
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node scripts/publish-kuaishou-task.js <AppID> <AppName> <Description>');
    console.error('Example: node scripts/publish-kuaishou-task.js rockets-king "Rocket Battle" "Vote for the best rocket!"');
    process.exit(1);
  }
  const [appId, appName, appDesc] = args;

  console.log(`Starting Kuaishou Task Publisher for app: ${appId}`);
  console.log(`Source Task: ${SOURCE_TASK_ID}`);

  // Launch browser with persistent context for login
  const browser = await chromium.launch({ headless: true }); // Headless: false to see what's happening
  const context = await browser.newContext({
    // Load auth state if exists
    storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to task list...');
    await page.goto(BASE_URL);

    // Check login status
    // Look for a specific element that indicates we are logged in (e.g., the task list table or user avatar)
    // We'll try to find the "Create Plan" button or the list container
    try {
      await page.waitForSelector('.distribution-plan-list-container, .create-plan-btn', { timeout: 10000 });
      console.log('✅ Logged in successfully.');
    } catch (e) {
      console.log('⚠️ Not logged in or session expired.');
      console.log('👉 Please log in manually in the browser window now.');
      console.log('   (Script will wait for you to navigate to the task list page)');
      
      // Wait for user to log in and eventually land on the creation page
      // The user might need to navigate back to the URL if the redirect is messy, 
      // so we print it out.
      console.log(`👉 If you are redirected to the homepage after login, please navigate to: ${BASE_URL}`);
      
      // We wait for the form to appear, which confirms we are on the right page AND logged in
      console.log('🔍 Waiting for form inputs... (If you see the form but this hangs, the selectors are wrong)');
      
      // Try to find ANY text input to start with
      try {
        const anyInput = await page.waitForSelector('input[type="text"], textarea', { timeout: 60000 });
        console.log('✅ Found an input field!');
        // Log its attributes to help debug
        const outerHTML = await anyInput.evaluate(el => el.outerHTML);
        console.log('Found element:', outerHTML);
      } catch (e) {
        console.log('❌ Could not find ANY input field. Page might be empty or in an iframe.');
        // Dump page content for debugging
        const content = await page.content();
        console.log('Page content length:', content.length);
        throw e;
      }
      
      console.log('✅ Login detected and form loaded.');
      
      // Save auth state for next time
      await context.storageState({ path: AUTH_FILE });
      console.log(`💾 Login state saved to ${AUTH_FILE}`);
    }

    // Direct navigation means we are already on the form page
    // No need to search for task list row anymore

    // Wait for the form/modal to appear
    // We look for common input fields
    // Increased timeout to 60s to allow manual intervention
    // Note: If we just logged in, we might already have waited in the catch block, but it's safe to wait again
    console.log('⏳ Confirming form is ready...');
    try {
      await page.waitForSelector('input[placeholder*="任务名称"], input[name="taskName"], input[type="text"]', { timeout: 30000 });
    } catch(e) {
      console.log('⚠️ Could not find standard inputs. Continuing anyway to try broad detection...');
    }

    console.log('📝 Filling task details on active page...');
    
    // Use the current page as active page since we are already there
    const activePage = page;

    // 1. Task Name
    // The recording shows this is the first input on the first page
    const nameInput = activePage.locator('input.ks-input__inner').first();
    if (await nameInput.count() > 0) {
        console.log('Filling name into:', await nameInput.evaluate(el => el.outerHTML));
        await nameInput.fill(appName);
    } else {
        console.log('⚠️ Name input not found (visible).');
    }
    
    // 2. Click "Next Step" (下一步)
    // The recording shows a "Next Step" button must be clicked to reach the resource table
    console.log('Looking for "Next Step" button...');
    try {
        const nextStepBtn = activePage.locator('button', { hasText: '下一步' }).first();
        // Wait a bit for it to be interactive
        await nextStepBtn.waitFor({ state: 'visible', timeout: 5000 });
        await nextStepBtn.click();
        console.log('✅ Clicked "Next Step".');
        await activePage.waitForTimeout(2000); // Wait for transition
    } catch (e) {
        console.log('⚠️ "Next Step" button not found or not clickable. Maybe we are already on the resource page?');
    }

    // 3. Edit Resource (The Table)
    // The recording shows clicking "Edit" (编辑) in a table row
    console.log('Looking for "Edit" button in resource table...');
    try {
        const editBtn = activePage.locator('button', { hasText: '编辑' }).first();
        await editBtn.waitFor({ state: 'visible', timeout: 10000 });
        await editBtn.click();
        console.log('✅ Clicked "Edit" button.');
    } catch (e) {
        console.log('❌ Could not find "Edit" button. Are there resources in the list?');
    }

    // 4. In the Dialog: Resource Path / URL
    // The recording shows this is inside a dialog
    // We look for the dialog body first
    const dialog = activePage.locator('.ks-dialog__body'); 
    try {
        await dialog.waitFor({ state: 'visible', timeout: 5000 });
        console.log('Dialog opened. Looking for URL input...');
        
        // Try to find the input with "pages/" value or the specific input structure from recording
        // Recording showed typing into: pages/rewardedWebview/rewardedWebview?target=...
        // We'll search for inputs with "pages/" in value OR just the 3rd input
        
        // Wait a moment for dialog animation
        await activePage.waitForTimeout(1000);

        let urlInput = dialog.locator('input[value*="pages/"]').first();
        
        if (await urlInput.count() === 0) {
            // Fallback: It might be the 3rd input in the dialog form as per recording
            // But let's be safer: look for inputs in the dialog
            const inputs = dialog.locator('input');
            const count = await inputs.count();
            console.log(`Found ${count} inputs in dialog.`);
            if (count >= 3) {
                 urlInput = inputs.nth(2); // 0-indexed, so 3rd is index 2
            } else if (count > 0) {
                 // Maybe it's the last one?
                 urlInput = inputs.last();
            }
        }

        if (await urlInput.isVisible()) {
            const oldUrl = await urlInput.inputValue();
            console.log(`Found URL input. Old value: ${oldUrl}`);
            
            // Construct new URL
            // Format: pages/rewardedWebview/rewardedWebview?target=rockets-king&showAd=true
            const newUrl = `pages/rewardedWebview/rewardedWebview?target=${appId}&showAd=true`;
            
            await urlInput.fill(newUrl);
            console.log(`✅ Updated URL to: ${newUrl}`);
        } else {
            console.error('❌ Could not find URL input in dialog!');
        }

        // 5. In the Dialog: Resource Name (Optional but good to update)
        // It's usually the first input in the dialog
        const resourceNameInput = dialog.locator('input').first();
        if (await resourceNameInput.isVisible()) {
            await resourceNameInput.fill(appName);
            console.log('Updated resource name.');
            
            // CRITICAL FIX: Trigger "blur" and wait to enable AI button
            // User feedback: "Click whitespace near AI button, wait a few seconds"
            console.log('Triggering input blur to activate AI button...');
            // Click a label or the dialog background
            await dialog.click({ position: { x: 20, y: 20 } }); 
            // Also try clicking the label for "Resource Cover" if it exists
            const coverLabel = dialog.locator('label', { hasText: /封面|图片/ }).first();
            if (await coverLabel.isVisible()) {
                await coverLabel.click();
            }
            
            console.log('⏳ Waiting 5 seconds for AI button activation...');
            await activePage.waitForTimeout(5000);
        }
        
        // 6. Cover Image (AI Generate) inside Dialog
        console.log('🤖 Generating AI Cover Image...');
        // Look for "AI Generate" inside dialog
        const aiBtn = dialog.locator('button', { hasText: /AI.*生成|智能.*生成/ }).first();
        if (await aiBtn.isVisible()) {
            try {
                 // Check if it's disabled via class (common in Vue/React apps)
                 const isClassDisabled = await aiBtn.evaluate(btn => btn.classList.contains('is-disabled') || btn.disabled);
                 if (isClassDisabled) {
                     console.log('⚠️ AI Button still appears disabled. Trying one more click on whitespace...');
                     await dialog.click({ position: { x: 50, y: 50 } });
                     await activePage.waitForTimeout(2000);
                 }
                 
                 await aiBtn.click({ timeout: 5000 });
                 console.log('✅ Clicked "AI Generate" button.');
                 
                 // Wait for generation result
                 // Extended wait to 10s as generation might take time
                 console.log('Waiting 10s for AI generation...');
                 await activePage.waitForTimeout(10000); 
                 
                 // Try to find a "Use" button if the AI generator opens a sub-dialog
                 // Often just clicking generate updates the image, or there is a "Select"
                 // For now we assume it auto-selects or updates.
            } catch(err) {
                 console.log('❌ Failed to click AI button (might still be disabled):', err.message);
            }
        } else {
            console.log('⚠️ "AI Generate" button not found in dialog.');
        }

        // 7. In the Dialog: Confirm (确认)
        // Recording: click confirm
        // Ensure we are clicking the dialog footer confirm, not a sub-dialog
        const confirmBtn = activePage.locator('.ks-dialog__footer button, .ks-dialog button', { hasText: /确认|确定/ }).last(); // Use last in case of multiple
        if (await confirmBtn.isVisible()) {
             await confirmBtn.click();
             console.log('✅ Confirmed resource dialog.');
             await activePage.waitForTimeout(2000);
        } else {
             console.log('⚠️ Could not find Confirm button in dialog.');
        }

    } catch (e) {
        console.log('❌ Error interacting with dialog:', e.message);
    }

    // 8. Second "Next Step" (to go to Date Selection)
    console.log('Looking for 2nd "Next Step" button...');
    try {
        // It might be the same "Next Step" button or a new one. 
        // We look for any visible "Next Step" button.
        const nextStepBtn2 = activePage.locator('button', { hasText: '下一步' }).last();
        if (await nextStepBtn2.isVisible()) {
            await nextStepBtn2.click();
            console.log('✅ Clicked 2nd "Next Step".');
            await activePage.waitForTimeout(2000);
        } else {
             console.log('⚠️ 2nd "Next Step" button not found. Maybe we are already on the submit page?');
        }
    } catch(e) {
        console.log('⚠️ Error clicking 2nd "Next Step":', e.message);
    }

    // 9. Date Selection
    console.log('📅 Handling Date Selection (Today -> 5 Years later)...');
    try {
        const dateInput = activePage.locator('.ks-range-input, input[placeholder*="日期"], input[placeholder*="开始"]').first();
        if (await dateInput.isVisible()) {
            await dateInput.click();
            console.log('Opened Date Picker.');
            await activePage.waitForTimeout(1000);
            
            // 1. Select Start Date (Today)
            // Need to be careful not to pick a disabled one, but "today" usually is valid for start
            const todayCell = activePage.locator('td.available.today').first();
            if (await todayCell.isVisible()) {
                await todayCell.click();
                console.log('Selected Start Date (Today).');
            } else {
                // Fallback: Click the first available date
                console.log('⚠️ "Today" not found, clicking first available date.');
                await activePage.locator('td.available').first().click();
            }
            await activePage.waitForTimeout(500);

            // 2. Advance 5 years
            // Find the "Next Year" (double right arrow) button
            const nextYearBtn = activePage.locator('button.ks-picker-panel__icon-btn.sys-icon-double-arrow-right').first();
            
            if (await nextYearBtn.isVisible()) {
                console.log('Advancing 5 years...');
                for (let i = 0; i < 5; i++) {
                    await nextYearBtn.click();
                    await activePage.waitForTimeout(200);
                }
            } else {
                console.log('⚠️ "Next Year" button not found.');
            }
            
            // 3. Select End Date
            // Pick a date in the middle of the month to be safe
            // We search for available cells in the visible panel
            const availableCells = activePage.locator('td.available');
            const count = await availableCells.count();
            if (count > 0) {
                // Pick one in the middle (e.g., 15th available) or last
                const targetIndex = Math.min(15, count - 1);
                await availableCells.nth(targetIndex).click();
                console.log('Selected End Date (5 years later).');
            } else {
                console.log('⚠️ No available dates found for end date.');
            }
            await activePage.waitForTimeout(500);

            // 4. Confirm Date Selection (Critical!)
            // Look for the Confirm button inside the picker dropdown
            const pickerConfirmBtn = activePage.locator('.ks-picker-panel__footer button, button.ks-picker-panel__link-btn', { hasText: /确定|Confirm/ }).last();
            if (await pickerConfirmBtn.isVisible()) {
                await pickerConfirmBtn.click();
                console.log('✅ Clicked "Confirm" in Date Picker.');
            } else {
                console.log('ℹ️ No "Confirm" button found in picker (might have auto-closed).');
            }
            
            // Wait for picker to close
            await activePage.waitForTimeout(1000);

        } else {
             console.log('⚠️ Date input not found.');
        }
    } catch (e) {
        console.log('❌ Error selecting dates:', e.message);
    }

    // 10. Final Submit on Main Page
    console.log('🚀 Attempting to Submit Task...');
    
    // Scroll to bottom to ensure visibility
    await activePage.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await activePage.waitForTimeout(1000);

    // User provided specific selector for the Submit button
    const specificSubmitSelector = '#app > div > div > div.app__main > div:nth-child(2) > div.advertise-task > div.ks-form-item > div > div > button:nth-child(1)';
    const submitBtn = activePage.locator(specificSubmitSelector).first();

    if (await submitBtn.isVisible()) {
        console.log('Found Submit button (specific selector), clicking...');
        await submitBtn.click();
        
        // Check for success or validation error
        await activePage.waitForTimeout(3000);
        
        // If we are redirected, success!
        if (activePage.url() !== BASE_URL) {
            console.log('✅ Task Submitted Successfully! (URL changed)');
        } else {
            console.log('⚠️ Task might not have submitted. Checking for errors...');
            // Check for error messages
            const errorMsg = await activePage.locator('.el-message__content, .ks-message__content').first();
            if (await errorMsg.isVisible()) {
                console.log('❌ Submission Error:', await errorMsg.textContent());
            } else {
                 console.log('❓ Unknown status. Please check browser.');
            }
        }
    } else {
        console.log('❌ Could not find Submit button with specific selector. Trying generic...');
        // Fallback
        const genericSubmit = activePage.locator('button', { hasText: /提交|发布|确认/ }).last();
        if (await genericSubmit.isVisible()) {
            await genericSubmit.click();
        } else {
            console.log('❌ Could not find any Submit button.');
        }
    }

    console.log('✅ Automation sequence finished.');
    // Short wait to allow user to see result, then close or exit
    await activePage.waitForTimeout(300000); // Wait 5 mins for manual submit
    // await browser.close(); // Uncomment to auto-close 

  } catch (error) {
    console.error('❌ Error during automation:', error);
    try {
        await page.screenshot({ path: 'automation-error.png' });
        console.log('📸 Error screenshot saved to automation-error.png');
    } catch (e) {}
    // Keep browser open to debug if needed
    await page.pause();
  } finally {
    // await browser.close(); 
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}