/**
 * Complete Kuaishou Workflow Example
 * 完整的快手数据抓取工作流程示例
 * 
 * 展示如何组合使用多个 skills 完成复杂任务
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ===== 基础 Skills 函数 =====

// 1. Web Scraper: 初始化浏览器
async function initBrowser(authFile = 'kuaishou_auth.json') {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        storageState: fs.existsSync(authFile) 
            ? JSON.parse(fs.readFileSync(authFile, 'utf-8')) 
            : undefined,
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    return { browser, context, page };
}

// 2. Anti-Blocking: 关闭遮罩层
async function closeOverlay(page) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
    
    const selectors = ['.ks-drawer__close', '.ks-icon-close', 'button:has-text("取消")'];
    for (const sel of selectors) {
        try {
            const btn = page.locator(sel).first();
            if (await btn.isVisible({ timeout: 500 })) {
                await btn.click({ timeout: 2000 });
                await page.waitForTimeout(300);
            }
        } catch (e) {}
    }
}

// 3. Anti-Blocking: 强制点击
async function forceClick(page, rowIndex, btnIndex = 1) {
    return await page.evaluate((r, b) => {
        const rows = document.querySelectorAll('table tbody tr');
        if (r >= rows.length) return { success: false };
        const btns = rows[r]?.querySelector('td:last-child')?.querySelectorAll('button');
        if (!btns || btns.length <= b) return { success: false };
        btns[b].click();
        return { success: true };
    }, rowIndex, btnIndex);
}

// 4. Pagination: 获取所有分页任务
async function getAllPaginatedTasks(page) {
    const allTasks = [];
    
    const pageInfo = await page.evaluate(() => {
        const text = document.querySelector('.distribution-list__table__pagination-total')?.textContent || '';
        const match = text.match(/(\d+)/);
        const btns = document.querySelectorAll('.ks-pager li.number');
        return {
            total: match ? parseInt(match[1]) : 0,
            maxPage: Math.max(...Array.from(btns).map(b => parseInt(b.textContent) || 1), 1)
        };
    });
    
    console.log(`Total: ${pageInfo.total} tasks, ${pageInfo.maxPage} pages`);
    
    for (let p = 1; p <= pageInfo.maxPage; p++) {
        console.log(`\nPage ${p}/${pageInfo.maxPage}`);
        
        if (p > 1) {
            const btn = page.locator('.ks-pager li.number').filter({ hasText: String(p) }).first();
            if (await btn.count() > 0) {
                await btn.click();
                await page.waitForTimeout(2000);
            }
        }
        
        // Extract with deduplication within page
        const tasks = await page.evaluate((pageNum) => {
            const seen = new Set();
            return Array.from(document.querySelectorAll('table tbody tr'))
                .map((row, idx) => {
                    const cells = row.querySelectorAll('td');
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
        
        console.log(`  Found ${tasks.length} unique tasks`);
        allTasks.push(...tasks);
    }
    
    return allTasks;
}

// 5. Data Extraction: 获取任务统计
async function getTaskStats(page, task) {
    try {
        await closeOverlay(page);
        
        const result = await forceClick(page, task.rowIndex, 1);
        if (!result.success) return { error: 'Click failed' };
        
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
                已履单达人数量: extract('已履单达人数量'),
                已发布作品数: extract('已发布作品数')
            };
        });
        
        await closeOverlay(page);
        return stats;
    } catch (e) {
        await closeOverlay(page);
        return { error: e.message };
    }
}

// 6. Report: 生成报告
function generateReport(tasks) {
    const withData = tasks.filter(t => t.stats && !t.stats.error);
    const totalExposure = withData.reduce((s, t) => s + (parseInt(t.stats.组件曝光数?.replace(/,/g, '')) || 0), 0);
    const totalClicks = withData.reduce((s, t) => s + (parseInt(t.stats.组件点击数) || 0), 0);
    
    return {
        summary: {
            totalTasks: tasks.length,
            withData: withData.length,
            totalExposure,
            totalClicks,
            clickRate: totalExposure > 0 ? ((totalClicks / totalExposure) * 100).toFixed(2) + '%' : 'N/A'
        },
        topByExposure: withData
            .filter(t => t.stats.组件曝光数)
            .sort((a, b) => parseInt(b.stats.组件曝光数?.replace(/,/g, '')) - parseInt(a.stats.组件曝光数?.replace(/,/g, '')))
            .slice(0, 10)
    };
}

// ===== 主流程 =====
async function main() {
    console.log('🚀 Complete Kuaishou Workflow\n');
    
    const { browser, context, page } = await initBrowser();
    const results = [];
    
    try {
        // Step 1: 登录
        console.log('Step 1: Navigate');
        await page.goto('https://daren.kuaishou.com/distribution-plan-list');
        
        if (page.url().includes('login')) {
            console.log('Please login manually...');
            await page.waitForURL(u => !u.toString().includes('login'), { timeout: 120000 });
            await context.storageState({ path: 'kuaishou_auth.json' });
        }
        
        // Step 2: 获取所有任务
        console.log('\nStep 2: Get all tasks');
        const tasks = await getAllPaginatedTasks(page);
        
        // Step 3: 获取统计数据
        console.log('\nStep 3: Get statistics');
        for (let i = 0; i < tasks.length; i++) {
            console.log(`[${i + 1}/${tasks.length}] ${tasks[i].name}`);
            const stats = await getTaskStats(page, tasks[i]);
            results.push({ ...tasks[i], stats });
            await new Promise(r => setTimeout(r, 1000));
        }
        
        // Step 4: 生成报告
        console.log('\nStep 4: Generate report');
        const report = generateReport(results);
        console.log('\n📊 Summary:', JSON.stringify(report.summary, null, 2));
        
        // Step 5: 保存
        const outputDir = 'metrics/kuaishou';
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        
        fs.writeFileSync(
            path.join(outputDir, 'workflow_results.json'),
            JSON.stringify({ report, tasks: results }, null, 2)
        );
        console.log(`\n✅ Saved to ${outputDir}/workflow_results.json`);
        
    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await browser.close();
    }
}

// 运行
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    main();
}

export { initBrowser, closeOverlay, forceClick, getAllPaginatedTasks, getTaskStats, generateReport };
