import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { ensureParentDirectory } from './runtime-paths.js';
import {
  resolveAuthFilePath,
  isSubmissionErrorSignal,
  isSubmissionSuccessSignal,
  validateTaskName
} from './publish-kuaishou-task-utils.js';

// Configuration
const SOURCE_TASK_ID = process.env.SOURCE_TASK_ID || '165805'; // The ID of the template task to copy
// Direct URL to recreate the task - bypasses the list view and menu clicks!
const BASE_URL = `https://daren.kuaishou.com/distribution-plan-create/recreate/${SOURCE_TASK_ID}`;
const AUTH_FILE = resolveAuthFilePath();
const WAIT_AFTER_FINISH_MS = Math.max(0, Number.parseInt(process.env.PUBLISH_WAIT_FOR_MANUAL_MS || '0', 10) || 0);
const SUBMISSION_CONFIRM_TIMEOUT_MS = Math.max(3000, Number.parseInt(process.env.PUBLISH_CONFIRM_TIMEOUT_MS || '15000', 10) || 15000);
const HEADLESS = process.env.HEADLESS !== 'false';

function getLatestReportPath() {
  const reportDir = '/Users/weiping/prod/LetMeTryAI/.automation/.local/exports/metrics/kuaishou/daily';
  if (!fs.existsSync(reportDir)) {
    return null;
  }
  const files = fs.readdirSync(reportDir)
    .filter(f => /^kuaishou_report_\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  return files.length > 0 ? path.join(reportDir, files[files.length - 1]) : null;
}

function isAlreadyPublished(appName) {
  const reportPath = getLatestReportPath();
  if (!reportPath) {
    console.log('⚠️ No historical report found for deduplication, continuing.');
    return false;
  }
  try {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const names = new Set((data.allTasks || []).map(t => t.name).filter(Boolean));
    if (names.has(appName)) {
      console.log(`✅ "${appName}" already exists in latest report (${path.basename(reportPath)}), skipping publication.`);
      return true;
    }
  } catch (e) {
    console.log('⚠️ Failed to read report for deduplication:', e.message);
  }
  return false;
}

async function sendFailureEmail(appId, appName, screenshotPath, htmlPath, errorMessage) {
  const toEmail = process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com';
  const timestamp = new Date().toISOString();
  const subject = `[Kuaishou Publish Failed] ${appName} (${appId})`;
  const body = `Kuaishou publish failed for ${appName} (${appId}) at ${timestamp}.\n\nError: ${errorMessage}\n\nScreenshot: ${screenshotPath}\nHTML dump: ${htmlPath}`;

  const bodyFile = path.join('/tmp', `publish-error-body-${appId}-${Date.now()}.txt`);
  fs.writeFileSync(bodyFile, body);

  const args = [
    path.resolve(process.cwd(), '.automation/scripts/send_email.py'),
    '-a', screenshotPath,
    '-a', htmlPath,
    subject,
    toEmail,
    bodyFile
  ];

  return new Promise((resolve) => {
    const proc = spawn('python3', args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) {
        console.log('📧 Failure alert email sent.');
      } else {
        console.log('⚠️ Failed to send failure alert email.');
      }
      resolve();
    });
  });
}

async function readFirstVisibleText(locator) {
  const count = await locator.count().catch(() => 0);
  if (count === 0) {
    return '';
  }

  for (let index = 0; index < count; index += 1) {
    const candidate = locator.nth(index);
    const visible = await candidate.isVisible().catch(() => false);
    if (!visible) {
      continue;
    }

    return (await candidate.textContent().catch(() => ''))?.trim() || '';
  }

  return '';
}

async function waitForSubmissionOutcome(activePage, baseUrl, timeoutMs = SUBMISSION_CONFIRM_TIMEOUT_MS) {
  const startedAt = Date.now();
  const feedbackLocator = activePage.locator('.el-message__content, .ks-message__content, .ks-notification, .el-message');

  while (Date.now() - startedAt < timeoutMs) {
    const currentUrl = activePage.url();
    const messageText = await readFirstVisibleText(feedbackLocator);

    if (isSubmissionSuccessSignal({ currentUrl, baseUrl, messageText })) {
      return {
        success: true,
        currentUrl,
        messageText
      };
    }

    if (isSubmissionErrorSignal(messageText)) {
      return {
        success: false,
        currentUrl,
        messageText
      };
    }

    await activePage.waitForTimeout(1000);
  }

  return {
    success: false,
    currentUrl: activePage.url(),
    messageText: await readFirstVisibleText(feedbackLocator)
  };
}

async function main() {
  // Argument parsing
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error('Usage: node .automation/scripts/publish-kuaishou-task.js <AppID> <AppName> <Description>');
    console.error('Example: node .automation/scripts/publish-kuaishou-task.js rockets-king "Rocket Battle" "Vote for the best rocket!"');
    process.exit(1);
  }
  const [appId, appName, appDesc] = args;

  // Validate task name for forbidden words before launching browser
  const nameCheck = validateTaskName(appName);
  if (!nameCheck.valid) {
    console.error(`❌ ${nameCheck.message}`);
    process.exit(1);
  }

  // Deduplication: skip if already published in latest daily report
  if (isAlreadyPublished(appName)) {
    process.exit(0);
  }

  console.log(`Starting Kuaishou Task Publisher for app: ${appId}`);
  console.log(`Source Task: ${SOURCE_TASK_ID}`);
  console.log(`Headless Mode: ${HEADLESS}`);

  // Launch browser with persistent context for login
  const browser = await chromium.launch({ headless: HEADLESS });
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
      ensureParentDirectory(AUTH_FILE);
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
            
            const aiBtn = dialog.locator('button', { hasText: /AI.*生成|智能.*生成/ }).first();
            if (await aiBtn.isVisible()) {
                 // Try to click to the right of the button
                 const btnBox = await aiBtn.boundingBox();
                 if (btnBox) {
                     // Click 100px to the right of the button (likely empty space)
                     console.log('Clicking whitespace to the right of AI button...');
                     await activePage.mouse.click(btnBox.x + btnBox.width + 100, btnBox.y + btnBox.height / 2);
                 } else {
                     // Fallback: Click top-rightish of dialog
                     await dialog.click({ position: { x: 400, y: 50 } }); 
                 }
                 
                 console.log('⏳ Waiting 8 seconds for AI button activation...');
                 await activePage.waitForTimeout(8000);
                 
                 // Retry loop to enable button
                 for (let attempt = 1; attempt <= 3; attempt++) {
                     const isEnabled = await aiBtn.isEnabled().catch(() => false);
                     if (isEnabled) {
                         console.log('✨ AI button is now ENABLED!');
                         break;
                     }
                     console.log(`⚠️ Attempt ${attempt}: AI button still disabled. Clicking dialog body...`);
                     // Click elsewhere in dialog to trigger blur
                     await dialog.click({ position: { x: 50, y: 150 } });
                     await activePage.waitForTimeout(3000);
                 }
            } else {
                 console.log('⚠️ AI button locator found nothing initially.');
            }
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
                     console.log('⚠️ AI Button still appears disabled. Skipping click to avoid error.');
                 } else {
                     await aiBtn.click({ timeout: 5000 });
                     console.log('✅ Clicked "AI Generate" button.');
                     
                     // Wait for generation result
                     // Extended wait to 15s as generation might take time
                     console.log('Waiting 15s for AI generation...');
                     await activePage.waitForTimeout(15000); 
                 }
            } catch(err) {
                 console.log('❌ Failed to click AI button:', err.message);
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
             
             // IMPORTANT: Wait for dialog/overlay to disappear
             console.log('Waiting for dialog to close...');
             try {
                await expect(dialog).toBeHidden({ timeout: 5000 });
             } catch(e) {
                // Manual wait if expect is not available (we didn't import expect)
                await activePage.waitForTimeout(2000);
                await activePage.locator('.ks-overlay').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
             }
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

    let submissionSucceeded = false;

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

        const outcome = await waitForSubmissionOutcome(activePage, BASE_URL);
        if (outcome.success) {
            console.log(`✅ Task Submitted Successfully! ${outcome.messageText || '(detected by URL/message)'}`);
            submissionSucceeded = true;
        } else {
            console.log('⚠️ Task might not have submitted. Checking for errors...');
            if (outcome.messageText) {
                console.log('❌ Submission Error:', outcome.messageText);
            } else {
                 console.log(`❓ Unknown status. Current URL: ${outcome.currentUrl}`);
            }
        }
    } else {
        console.log('❌ Could not find Submit button with specific selector. Trying generic...');
        // Fallback
        const genericSubmit = activePage.locator('button', { hasText: /提交|发布|确认/ }).last();
        if (await genericSubmit.isVisible()) {
            await genericSubmit.click();
            const outcome = await waitForSubmissionOutcome(activePage, BASE_URL);
            if (outcome.success) {
                console.log(`✅ Task Submitted Successfully! ${outcome.messageText || '(detected after generic submit)'}`);
                submissionSucceeded = true;
            } else if (outcome.messageText) {
                console.log('❌ Submission Error:', outcome.messageText);
            } else {
                console.log(`❓ Unknown status after generic submit. Current URL: ${outcome.currentUrl}`);
            }
        } else {
            console.log('❌ Could not find any Submit button.');
        }
    }

    if (!submissionSucceeded) {
        console.log('❌ Automation sequence finished without a confirmed submission.');
        process.exitCode = 1;
    } else {
        console.log('✅ Automation sequence finished with confirmed submission.');
    }

    if (WAIT_AFTER_FINISH_MS > 0) {
        await activePage.waitForTimeout(WAIT_AFTER_FINISH_MS);
    }

  } catch (error) {
    console.error('❌ Error during automation:', error);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const errorDir = path.resolve('/Users/weiping/prod/LetMeTryAI/.automation/.local/logs/publish-errors');
    ensureParentDirectory(path.join(errorDir, '.keep'));
    const screenshotPath = path.join(errorDir, `${appId}-error-${timestamp}.png`);
    const htmlPath = path.join(errorDir, `${appId}-error-${timestamp}.html`);
    const logPath = path.join(errorDir, `${appId}-error-${timestamp}.log`);
    try {
        await page.screenshot({ path: screenshotPath });
        console.log(`📸 Error screenshot saved to ${screenshotPath}`);
    } catch (e) {
        console.log('⚠️ Failed to save screenshot:', e.message);
    }
    try {
        const html = await page.content();
        fs.writeFileSync(htmlPath, html);
        console.log(`📄 Page HTML dumped to ${htmlPath}`);
    } catch (e) {
        console.log('⚠️ Failed to dump HTML:', e.message);
    }
    try {
        const logContent = `[${new Date().toISOString()}] Kuaishou publish failed for ${appName} (${appId})\nError: ${error.message || String(error)}\n`;
        fs.writeFileSync(logPath, logContent);
        console.log(`📝 Error log saved to ${logPath}`);
    } catch (e) {
        console.log('⚠️ Failed to save error log:', e.message);
    }
    try {
        await sendFailureEmail(appId, appName, screenshotPath, htmlPath, error.message || String(error));
    } catch (e) {
        console.log('⚠️ Failed to send failure email:', e.message);
    }
    process.exitCode = 1;
    if (process.env.PUBLISH_DEBUG === 'true') {
      await page.pause();
    }
  } finally {
    try {
      await browser.close();
      console.log('🧹 Browser closed.');
    } catch (closeError) {
      console.log('⚠️ Failed to close browser cleanly:', closeError.message);
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
