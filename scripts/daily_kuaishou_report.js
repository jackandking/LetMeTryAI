#!/usr/bin/env node
/**
 * Daily Kuaishou Report Generator
 * 每天早上自动抓取快手数据并发送邮件报告
 * 
 * Usage:
 *   node scripts/daily_kuaishou_report.js
 * 
 * Environment Variables:
 *   KUAISHOU_EMAIL_TO=jackandking@163.com
 *   AGENTMAIL_API_KEY=xxx
 *   HEADLESS=true|false (default: true for cron)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.join(__dirname, '..');

// Configuration
const CONFIG = {
    authFile: path.join(PROJECT_ROOT, 'kuaishou_auth.json'),
    outputDir: path.join(PROJECT_ROOT, 'metrics', 'kuaishou', 'daily'),
    headless: process.env.HEADLESS !== 'false', // Default true for cron
    emailTo: process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com',
    apiKey: process.env.AGENTMAIL_API_KEY || 'am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4',
    maxRetries: 3,
    delayBetweenTasks: 800 // ms
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
    fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Logger with timestamp
function log(level, message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${level}] ${message}`);
}

// Initialize browser
async function initBrowser() {
    log('INFO', 'Initializing browser...');
    
    const browser = await chromium.launch({ 
        headless: CONFIG.headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
        storageState: fs.existsSync(CONFIG.authFile) 
            ? JSON.parse(fs.readFileSync(CONFIG.authFile, 'utf-8')) 
            : undefined,
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    });
    
    const page = await context.newPage();
    return { browser, context, page };
}

// Close overlay
async function closeOverlay(page) {
    try {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(300);
        
        const selectors = ['.ks-drawer__close', '.ks-icon-close', 'button:has-text("取消")'];
        for (const sel of selectors) {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 500 }).catch(() => false)) {
                await btn.click({ timeout: 2000 });
                await page.waitForTimeout(300);
            }
        }
    } catch (e) {}
}

// Force click
async function forceClick(page, rowIndex, btnIndex = 1) {
    return await page.evaluate(({ r, b }) => {
        const rows = document.querySelectorAll('table tbody tr');
        if (r >= rows.length) return { success: false, error: 'Row out of range' };
        const btns = rows[r]?.querySelector('td:last-child')?.querySelectorAll('button');
        if (!btns || btns.length <= b) return { success: false, error: 'Not enough buttons' };
        btns[b].click();
        return { success: true };
    }, { r: rowIndex, b: btnIndex });
}

// Get all tasks with pagination
async function getAllTasks(page) {
    log('INFO', 'Getting task list...');
    
    const allTasks = [];
    
    // Get pagination info
    const pageInfo = await page.evaluate(() => {
        const text = document.querySelector('.distribution-list__table__pagination-total')?.textContent || '';
        const match = text.match(/(\d+)/);
        const btns = document.querySelectorAll('.ks-pager li.number');
        return {
            total: match ? parseInt(match[1]) : 0,
            maxPage: Math.max(...Array.from(btns).map(b => parseInt(b.textContent) || 1), 1)
        };
    });
    
    log('INFO', `Found ${pageInfo.total} tasks across ${pageInfo.maxPage} pages`);
    
    // Iterate pages
    for (let p = 1; p <= pageInfo.maxPage; p++) {
        log('INFO', `Processing page ${p}/${pageInfo.maxPage}`);
        
        if (p > 1) {
            const btn = page.locator('.ks-pager li.number').filter({ hasText: String(p) }).first();
            if (await btn.count() > 0) {
                await btn.click();
                await page.waitForTimeout(2000);
            }
        }
        
        const tasks = await page.evaluate((pageNum) => {
            const seen = new Set();
            // 使用更精确的选择器，只选中任务列表表格
            const rows = document.querySelectorAll('.distribution-list__table table tbody tr');
            return Array.from(rows)
                .map((row, idx) => {
                    const cells = row.querySelectorAll('td');
                    // 任务表格有10-11列，页码表格只有1-2列
                    if (cells.length < 6) return null;
                    const planId = cells[0]?.textContent?.trim();
                    const name = cells[1]?.textContent?.trim();
                    if (!planId || !name || seen.has(planId)) return null;
                    seen.add(planId);
                    return {
                        page: pageNum,
                        rowIndex: idx,
                        planId,
                        name,
                        source: cells[2]?.textContent?.trim(),
                        status: cells[3]?.textContent?.trim()
                    };
                })
                .filter(Boolean);
        }, p);
        
        allTasks.push(...tasks);
    }
    
    log('INFO', `Total unique tasks: ${allTasks.length}`);
    return allTasks;
}

// Get statistics for a task
async function getTaskStats(page, task) {
    try {
        await closeOverlay(page);
        
        const result = await forceClick(page, task.rowIndex, 1);
        if (!result.success) {
            return { error: result.error };
        }
        
        await page.waitForTimeout(2000);
        
        const stats = await page.evaluate(() => {
            const text = document.body.innerText;
            const extract = (label) => {
                const match = text.match(new RegExp(`${label}\\s*([\\d,]+|--)`));
                return match ? (match[1] === '--' ? null : match[1]) : null;
            };
            return {
                组件曝光数: extract('组件曝光数'),
                组件点击数: extract('组件点击数'),
                任务下发人数: extract('任务下发人数'),
                已履单达人数量: extract('已履单达人数量'),
                已发布作品数: extract('已发布作品数'),
                已结算金额: extract('已结算金额')
            };
        });
        
        await closeOverlay(page);
        return stats;
    } catch (e) {
        await closeOverlay(page);
        return { error: e.message };
    }
}

// Generate report
function generateReport(tasks) {
    const withData = tasks.filter(t => t.stats && !t.stats.error);
    const totalExposure = withData.reduce((s, t) => s + (parseInt(t.stats.组件曝光数?.replace(/,/g, '')) || 0), 0);
    const totalClicks = withData.reduce((s, t) => s + (parseInt(t.stats.组件点击数) || 0), 0);
    const totalDaren = withData.reduce((s, t) => s + (parseInt(t.stats.已履单达人数量) || 0), 0);
    const totalWorks = withData.reduce((s, t) => s + (parseInt(t.stats.已发布作品数) || 0), 0);
    
    // Top performers
    const topByExposure = withData
        .filter(t => t.stats.组件曝光数)
        .sort((a, b) => parseInt(b.stats.组件曝光数?.replace(/,/g, '')) - parseInt(a.stats.组件曝光数?.replace(/,/g, '')))
        .slice(0, 10);
    
    const topByDaren = withData
        .filter(t => t.stats.已履单达人数量)
        .sort((a, b) => parseInt(b.stats.已履单达人数量) - parseInt(a.stats.已履单达人数量))
        .slice(0, 10);
    
    return {
        summary: {
            totalTasks: tasks.length,
            withData: withData.length,
            totalExposure,
            totalClicks,
            totalDaren,
            totalWorks,
            clickRate: totalExposure > 0 ? ((totalClicks / totalExposure) * 100).toFixed(2) + '%' : 'N/A'
        },
        topByExposure,
        topByDaren,
        allTasks: tasks
    };
}

// Save results
async function saveResults(report, dateStr) {
    const filename = `kuaishou_report_${dateStr}`;
    
    // JSON
    fs.writeFileSync(
        path.join(CONFIG.outputDir, `${filename}.json`),
        JSON.stringify(report, null, 2)
    );
    
    // CSV
    const headers = ['序号', '计划ID', '任务名称', '来源', '状态', '曝光数', '点击数', '达人', '作品'];
    const rows = report.allTasks.map((t, i) => [
        i + 1,
        t.planId,
        `"${t.taskName || t.name}"`,
        `"${t.source}"`,
        `"${t.status}"`,
        t.stats?.组件曝光数 || '',
        t.stats?.组件点击数 || '',
        t.stats?.已履单达人数量 || '',
        t.stats?.已发布作品数 || ''
    ]);
    
    fs.writeFileSync(
        path.join(CONFIG.outputDir, `${filename}.csv`),
        [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    );
    
    log('INFO', `Results saved: ${filename}.json/csv`);
    return filename;
}

// Build email body
function buildEmailBody(report, dateStr, filename) {
    return `Hi,

📊 快手星火计划日报 (${dateStr})

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 数据概览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 总任务数: ${report.summary.totalTasks} 个
• 有数据任务: ${report.summary.withData} 个
• 总曝光数: ${report.summary.totalExposure.toLocaleString()}
• 总点击数: ${report.summary.totalClicks.toLocaleString()}
• 总达人数量: ${report.summary.totalDaren.toLocaleString()}
• 总作品数量: ${report.summary.totalWorks.toLocaleString()}
• 整体点击率: ${report.summary.clickRate}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 TOP 10 曝光任务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${report.topByExposure.map((t, i) => `${i + 1}. [${t.planId}] ${t.name}\n   曝光: ${t.stats.组件曝光数} | 点击: ${t.stats.组件点击数 || 'N/A'} | 达人: ${t.stats.已履单达人数量 || 'N/A'}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 TOP 10 达人参与
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${report.topByDaren.map((t, i) => `${i + 1}. [${t.planId}] ${t.name}\n   达人: ${t.stats.已履单达人数量} | 作品: ${t.stats.已发布作品数 || 'N/A'} | 曝光: ${t.stats.组件曝光数 || 'N/A'}`).join('\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 附件
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• ${filename}.csv - 完整数据表格
• ${filename}.json - JSON格式数据

文件位置: ${CONFIG.outputDir}

Best regards,
Kuaishou Daily Bot 🤖
`;
}

// Send email using system mail command
async function sendEmailWithSystemMail(to, subject, body, attachmentPath) {
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);
    
    // Check for sendmail
    let hasSendmail = false;
    try {
        await execAsync('test -x /usr/sbin/sendmail');
        hasSendmail = true;
    } catch (e) {
        throw new Error('No sendmail found');
    }
    
    // Read CSV if available
    let csvContent = '';
    if (attachmentPath && fs.existsSync(attachmentPath)) {
        csvContent = fs.readFileSync(attachmentPath, 'utf-8');
    }
    
    // Build email content with proper headers for UTF-8
    const date = new Date().toUTCString();
    const emailContent = `To: ${to}
From: daily-report@letmetryai.cn
Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=
Date: ${date}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: base64

${Buffer.from(body + (csvContent ? '\n\n--- CSV Data Preview ---\n' + csvContent.split('\n').slice(0, 15).join('\n') + '\n... (see attachment for full data)' : '')).toString('base64')}`;
    
    const tempEmail = `/tmp/kuaishou_email_${Date.now()}.eml`;
    fs.writeFileSync(tempEmail, emailContent);
    
    try {
        await execAsync(`/usr/sbin/sendmail ${to} < "${tempEmail}"`);
        fs.unlinkSync(tempEmail);
        return true;
    } catch (e) {
        fs.unlinkSync(tempEmail);
        throw e;
    }
}

// Send email report
async function sendEmail(report, dateStr, filename) {
    log('INFO', 'Sending email report...');
    
    const body = buildEmailBody(report, dateStr, filename);
    const subject = `[快手日报] ${dateStr} | ${report.summary.totalTasks}任务 ${report.summary.totalExposure.toLocaleString()}曝光`;
    const attachmentPath = path.join(CONFIG.outputDir, `${filename}.csv`);
    
    // Try AgentMail first
    try {
        log('INFO', 'Trying AgentMail...');
        const { AgentMailClient } = await import('agentmail');
        const client = new AgentMailClient({ apiKey: CONFIG.apiKey });
        
        const inboxesResp = await client.inboxes.list();
        const inboxes = inboxesResp.inboxes || inboxesResp.data || inboxesResp;
        const inbox = inboxes.find(i => (i.inbox_id || i.id).includes('letmetry')) || inboxes[0];
        
        await client.inboxes.messages.send({
            inbox_id: inbox.inbox_id || inbox.id,
            to: [CONFIG.emailTo],
            subject: subject,
            text: body,
            attachments: fs.existsSync(attachmentPath) ? [{
                filename: `${filename}.csv`,
                content: fs.readFileSync(attachmentPath),
                content_type: 'text/csv'
            }] : []
        });
        
        log('INFO', 'Email sent via AgentMail');
        return true;
    } catch (e) {
        log('WARN', `AgentMail failed: ${e.message}`);
    }
    
    // Fallback to system mail
    try {
        log('INFO', 'Trying system mail command...');
        await sendEmailWithSystemMail(CONFIG.emailTo, subject, body, attachmentPath);
        log('INFO', 'Email sent via system mail');
        return true;
    } catch (e) {
        log('ERROR', `System mail also failed: ${e.message}`);
    }
    
    return false;
}

// Main execution
async function main() {
    const startTime = Date.now();
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    
    log('INFO', '========================================');
    log('INFO', `Daily Kuaishou Report - ${dateStr}`);
    log('INFO', '========================================');
    
    let browser, context, page;
    const results = [];
    
    try {
        // 1. Init browser
        ({ browser, context, page } = await initBrowser());
        
        // 2. Navigate and check login
        log('INFO', 'Navigating to Kuaishou...');
        await page.goto('https://daren.kuaishou.com/distribution-plan-list', { timeout: 30000 });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        if (page.url().includes('login')) {
            log('WARN', 'Session expired, login required');
            if (CONFIG.headless) {
                log('ERROR', 'Cannot login in headless mode. Please run manually first:');
                log('ERROR', '  HEADLESS=false node scripts/daily_kuaishou_report.js');
                throw new Error('Login required');
            }
            log('INFO', 'Waiting for manual login...');
            await page.waitForURL(u => !u.toString().includes('login'), { timeout: 120000 });
            await context.storageState({ path: CONFIG.authFile });
            log('INFO', 'Login saved');
        }
        
        // 3. Get all tasks
        const tasks = await getAllTasks(page);
        
        // 4. Get statistics for each task
        log('INFO', 'Getting statistics...');
        for (let i = 0; i < tasks.length; i++) {
            const task = tasks[i];
            log('INFO', `[${i + 1}/${tasks.length}] ${task.name}`);
            
            let retries = 0;
            let stats;
            
            while (retries < CONFIG.maxRetries) {
                stats = await getTaskStats(page, task);
                if (!stats.error) break;
                retries++;
                log('WARN', `  Retry ${retries}/${CONFIG.maxRetries}: ${stats.error}`);
                await new Promise(r => setTimeout(r, 1000));
            }
            
            results.push({ ...task, stats });
            await new Promise(r => setTimeout(r, CONFIG.delayBetweenTasks));
        }
        
        // 5. Generate report
        log('INFO', 'Generating report...');
        const report = generateReport(results);
        
        log('INFO', 'Summary:');
        log('INFO', `  Total Tasks: ${report.summary.totalTasks}`);
        log('INFO', `  Total Exposure: ${report.summary.totalExposure.toLocaleString()}`);
        log('INFO', `  Total Clicks: ${report.summary.totalClicks.toLocaleString()}`);
        log('INFO', `  Click Rate: ${report.summary.clickRate}`);
        
        // 6. Save results
        const filename = await saveResults(report, dateStr);
        
        // 7. Send email
        await sendEmail(report, dateStr, filename);
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        log('INFO', `Completed in ${duration}s`);
        
    } catch (error) {
        log('ERROR', `Fatal error: ${error.message}`);
        process.exit(1);
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

// Run
main();
