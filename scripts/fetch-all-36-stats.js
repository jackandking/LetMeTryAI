/**
 * Fetch statistics for ALL 36 Kuaishou tasks
 * 获取全部36个任务的统计数据
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const AUTH_FILE = 'kuaishou_auth.json';
const LIST_URL = 'https://daren.kuaishou.com/distribution-plan-list';
const OUTPUT_DIR = 'metrics/kuaishou';

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchAllStats() {
    console.log('🚀 开始获取全部36个任务的统计数据...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
        viewport: { width: 1280, height: 800 }}
    );
    const page = await context.newPage();
    
    const allResults = [];
    const errors = [];
    
    try {
        // 1. 登录
        console.log('📍 访问任务列表页');
        await page.goto(LIST_URL, { timeout: 30000 });
        
        if (page.url().includes('login')) {
            console.log('⚠️  请扫码登录...');
            await page.waitForURL((u) => !u.toString().includes('login'), { timeout: 120000 });
            await context.storageState({ path: AUTH_FILE });
        }
        console.log('✅ 已登录\n');
        
        // 2. 获取总页数
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        await page.waitForTimeout(1000);
        
        const pageInfo = await page.evaluate(() => {
            const totalText = document.querySelector('.distribution-list__table__pagination-total');
            const pageButtons = document.querySelectorAll('.ks-pager li.number');
            
            let totalCount = 0;
            if (totalText) {
                const match = totalText.textContent.match(/(\d+)/);
                if (match) totalCount = parseInt(match[1]);
            }
            
            let maxPage = 1;
            pageButtons.forEach(btn => {
                const num = parseInt(btn.textContent);
                if (!isNaN(num) && num > maxPage) maxPage = num;
            });
            
            return { totalCount, maxPage };
        });
        
        console.log(`📊 总任务: ${pageInfo.totalCount} 个, 共 ${pageInfo.maxPage} 页\n`);
        
        // 3. 遍历所有页
        for (let currentPage = 1; currentPage <= pageInfo.maxPage; currentPage++) {
            console.log(`\n📄 ===== 第 ${currentPage}/${pageInfo.maxPage} 页 =====`);
            
            // 翻页
            if (currentPage > 1) {
                const pageBtn = page.locator('.ks-pager li.number').filter({ hasText: String(currentPage) }).first();
                if (await pageBtn.count() > 0) {
                    await pageBtn.click();
                    await page.waitForTimeout(2000);
                }
            }
            
            await page.waitForSelector('table tbody tr', { timeout: 10000 });
            await page.waitForTimeout(1000);
            
            // 获取当前页任务（去重）
            const pageTasks = await page.evaluate((pageNum) => {
                const seen = new Set();
                const rows = document.querySelectorAll('table tbody tr');
                const tasks = [];
                
                rows.forEach((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 6) return;
                    
                    const planId = cells[0]?.textContent?.trim();
                    const name = cells[1]?.textContent?.trim();
                    
                    if (!planId || !name || seen.has(planId)) return;
                    seen.add(planId);
                    
                    tasks.push({
                        page: pageNum,
                        rowIndex: index,
                        planId: planId,
                        name: name,
                        source: cells[2]?.textContent?.trim() || '',
                        status: cells[3]?.textContent?.trim() || ''
                    });
                });
                
                return tasks;
            }, currentPage);
            
            console.log(`本页 ${pageTasks.length} 个唯一任务\n`);
            
            // 4. 获取每个任务的统计数据
            for (let i = 0; i < pageTasks.length; i++) {
                const task = pageTasks[i];
                const globalIndex = allResults.length + 1;
                
                console.log(`\n--- 任务 ${globalIndex}/36: ${task.name} (ID:${task.planId}) ---`);
                
                try {
                    // 确保在正确页面
                    if (currentPage > 1) {
                        const currentPageNum = await page.evaluate(() => {
                            const active = document.querySelector('.ks-pager li.active');
                            return active ? parseInt(active.textContent) : 1;
                        });
                        if (currentPageNum !== currentPage) {
                            console.log('   页面不匹配，重新导航...');
                            continue;
                        }
                    }
                    
                    // 使用 JavaScript 点击数据按钮
                    const clickResult = await page.evaluate((rowIdx) => {
                        const rows = document.querySelectorAll('table tbody tr');
                        if (rowIdx >= rows.length) return { success: false, error: 'Row out of range' };
                        
                        const row = rows[rowIdx];
                        const actionCell = row.querySelector('td:last-child');
                        if (!actionCell) return { success: false, error: 'No action cell' };
                        
                        const buttons = actionCell.querySelectorAll('button');
                        if (buttons.length < 2) return { success: false, error: 'Not enough buttons' };
                        
                        buttons[1].click(); // 点击数据按钮
                        return { success: true };
                    }, task.rowIndex);
                    
                    if (!clickResult.success) {
                        console.log(`   ⚠️  点击失败: ${clickResult.error}`);
                        errors.push({ task: task.name, error: clickResult.error });
                        continue;
                    }
                    
                    // 等待 drawer 打开
                    await page.waitForTimeout(2000);
                    
                    // 截图
                    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const screenshotName = `task_${globalIndex}_${task.planId}_${task.name.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 15)}.png`;
                    await page.screenshot({ 
                        path: path.join(OUTPUT_DIR, screenshotName),
                        fullPage: false 
                    });
                    
                    // 提取数据
                    const stats = await page.evaluate(() => {
                        const result = { metrics: {} };
                        const allText = document.body.innerText;
                        
                        const patterns = [
                            { key: '组件曝光数', regex: /组件曝光数\s*([\d,]+|--)/ },
                            { key: '组件点击数', regex: /组件点击数\s*([\d,]+|--)/ },
                            { key: '任务下发人数', regex: /任务下发人数\s*([\d,]+|--)/ },
                            { key: '已履单达人数量', regex: /已履单达人数量\s*([\d,]+|--)/ },
                            { key: '已发布作品数', regex: /已发布作品数\s*([\d,]+|--)/ },
                            { key: '已结算金额', regex: /已结算金额\(([^(]+)\)\s*([\d,.]+|--)/ }
                        ];
                        
                        patterns.forEach(({ key, regex }) => {
                            const match = allText.match(regex);
                            if (match) {
                                result.metrics[key] = match[1] === '--' ? null : (match[2] || match[1]);
                            }
                        });
                        
                        return result;
                    });
                    
                    console.log(`   📊 数据:`, JSON.stringify(stats.metrics));
                    
                    allResults.push({
                        globalIndex,
                        planId: task.planId,
                        taskName: task.name,
                        source: task.source,
                        status: task.status,
                        page: task.page,
                        stats: stats.metrics,
                        screenshot: screenshotName,
                        fetchTime: new Date().toISOString()
                    });
                    
                    // 关闭 drawer
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(800);
                    
                } catch (error) {
                    console.error(`   ❌ 错误: ${error.message}`);
                    errors.push({ task: task.name, error: error.message });
                    await page.keyboard.press('Escape');
                    await page.waitForTimeout(500);
                }
            }
        }
        
        // 5. 保存结果
        console.log('\n\n💾 保存结果...');
        
        const outputData = {
            fetchTime: new Date().toISOString(),
            totalTasks: allResults.length,
            expectedTasks: 36,
            successRate: `${Math.round(allResults.length / 36 * 100)}%`,
            tasks: allResults,
            errors: errors
        };
        
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'all_36_stats.json'),
            JSON.stringify(outputData, null, 2)
        );
        
        // 生成 CSV
        if (allResults.length > 0) {
            const allMetricKeys = new Set();
            allResults.forEach(r => Object.keys(r.stats).forEach(k => allMetricKeys.add(k)));
            
            const headers = ['序号', '计划ID', '任务名称', '来源', '状态', ...Array.from(allMetricKeys)];
            const csvLines = [headers.join(',')];
            
            allResults.forEach(r => {
                const row = [
                    r.globalIndex,
                    r.planId,
                    `"${r.taskName}"`,
                    `"${r.source}"`,
                    `"${r.status}"`,
                    ...Array.from(allMetricKeys).map(key => `"${r.stats[key] || ''}"`)
                ];
                csvLines.push(row.join(','));
            });
            
            fs.writeFileSync(
                path.join(OUTPUT_DIR, 'all_36_stats.csv'),
                csvLines.join('\n')
            );
        }
        
        console.log(`✅ 已保存 ${allResults.length}/36 个任务的数据`);
        if (errors.length > 0) {
            console.log(`⚠️  ${errors.length} 个任务失败`);
        }
        
    } catch (error) {
        console.error('\n❌ 严重错误:', error.message);
    } finally {
        console.log('\n👋 关闭浏览器...');
        await browser.close();
    }
    
    return { results: allResults, errors };
}

fetchAllStats().then(({ results, errors }) => {
    console.log(`\n🎉 完成！成功: ${results.length}/36, 失败: ${errors.length}`);
    if (errors.length > 0) {
        console.log('\n失败的 tasks:');
        errors.forEach(e => console.log(`  - ${e.task}: ${e.error}`));
    }
}).catch(err => {
    console.error('运行失败:', err);
    process.exit(1);
});
