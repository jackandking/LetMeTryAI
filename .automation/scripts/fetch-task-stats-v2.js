/**
 * Kuaishou Task Statistics Fetcher V2
 * 使用强制 JavaScript 点击，避免 hover 问题
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { ensureParentDirectory, resolveKuaishouAuthFile } from './runtime-paths.js';

const AUTH_FILE = resolveKuaishouAuthFile(import.meta.url);
const LIST_URL = 'https://daren.kuaishou.com/distribution-plan-list';
const OUTPUT_DIR = 'metrics/kuaishou';

// Parse command line arguments
const args = process.argv.slice(2);
const START_INDEX = parseInt(args[0]) || 0;
const MAX_TASKS = parseInt(args[1]) || 10;

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function fetchTaskStats() {
    console.log(`🚀 启动任务统计数据获取 (V2) - 第 ${START_INDEX + 1} 个开始，获取 ${MAX_TASKS} 个\n`);
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    const results = [];
    
    try {
        // 1. 导航到列表页
        console.log('📍 步骤 1: 访问任务列表页');
        await page.goto(LIST_URL, { timeout: 30000 });
        
        // 2. 检查登录
        console.log('🔐 步骤 2: 检查登录状态');
        if (page.url().includes('login')) {
            console.log('⚠️  请扫码登录...');
            await page.waitForURL((u) => !u.toString().includes('login'), { timeout: 120000 });
            ensureParentDirectory(AUTH_FILE);
            await context.storageState({ path: AUTH_FILE });
            console.log('✅ 登录成功\n');
        } else {
            console.log('✅ 已登录\n');
        }
        
        // 3. 等待表格加载
        console.log('📊 步骤 3: 等待表格加载');
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        await page.waitForTimeout(1000);
        
        // 4. 获取任务列表
        console.log('📋 步骤 4: 获取任务列表');
        const tasks = await page.evaluate(() => {
            const rows = document.querySelectorAll('table tbody tr');
            return Array.from(rows).map((row, index) => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 6) return null;
                
                const name = cells[1]?.textContent?.trim() || '';
                if (!name || /^\d+$/.test(name)) return null;
                
                return {
                    index: index,
                    name: name,
                    status: cells[2]?.textContent?.trim() || '',
                    timeRange: cells[3]?.textContent?.trim() || ''
                };
            }).filter(item => item !== null);
        });
        
        console.log(`✅ 找到 ${tasks.length} 个任务\n`);
        
        // 5. 遍历指定范围的任务
        const startIdx = Math.min(START_INDEX, tasks.length);
        const endIdx = Math.min(startIdx + MAX_TASKS, tasks.length);
        console.log(`🎯 步骤 5: 抓取第 ${startIdx + 1}-${endIdx} 个任务\n`);
        
        for (let i = startIdx; i < endIdx; i++) {
            const task = tasks[i];
            console.log(`\n--- 任务 ${i + 1}/${tasks.length}: ${task.name} ---`);
            
            try {
                // 方法：使用 JavaScript 强制点击，不依赖 Playwright 的 hover
                console.log('   使用 JavaScript 点击数据按钮...');
                
                const clickResult = await page.evaluate((rowIndex) => {
                    const rows = document.querySelectorAll('table tbody tr');
                    if (rowIndex >= rows.length) return { success: false, error: 'Row index out of range' };
                    
                    const row = rows[rowIndex];
                    const actionCell = row.querySelector('td:last-child');
                    if (!actionCell) return { success: false, error: 'No action cell' };
                    
                    const buttons = actionCell.querySelectorAll('button');
                    if (buttons.length < 2) return { success: false, error: 'Not enough buttons', buttonCount: buttons.length };
                    
                    // 点击第二个按钮（数据按钮）
                    const dataBtn = buttons[1];
                    dataBtn.click();
                    
                    return { success: true, buttonText: dataBtn.textContent?.trim() || 'unknown' };
                }, task.index);
                
                if (!clickResult.success) {
                    console.log('   ⚠️  点击失败:', clickResult.error);
                    continue;
                }
                
                console.log('   ✅ JavaScript 点击成功');
                
                // 等待 drawer 打开
                await page.waitForTimeout(2000);
                
                // 截图
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const screenshotName = `task_${i + 1}_${task.name.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 20)}_${timestamp}.png`;
                await page.screenshot({ 
                    path: path.join(OUTPUT_DIR, screenshotName),
                    fullPage: false 
                });
                console.log(`   📸 截图已保存`);
                
                // 提取数据
                const stats = await page.evaluate(() => {
                    const result = { metrics: {} };
                    const allText = document.body.innerText;
                    
                    // 匹配常见的数据字段
                    const patterns = [
                        { key: '组件曝光数', regex: /组件曝光数\s*([\d,]+|--)/ },
                        { key: '组件点击数', regex: /组件点击数\s*([\d,]+|--)/ },
                        { key: '任务下发人数', regex: /任务下发人数\s*([\d,]+|--)/ },
                        { key: '已履单达人数量', regex: /已履单达人数量\s*([\d,]+|--)/ },
                        { key: '已发布作品数', regex: /已发布作品数\s*([\d,]+|--)/ },
                        { key: '已结算金额', regex: /已结算金额\s*([\d,.]+|--)/ }
                    ];
                    
                    patterns.forEach(({ key, regex }) => {
                        const match = allText.match(regex);
                        if (match) {
                            result.metrics[key] = match[1] === '--' ? null : match[1];
                        }
                    });
                    
                    return result;
                });
                
                console.log('   📊 数据:', JSON.stringify(stats.metrics));
                
                results.push({
                    taskName: task.name,
                    status: task.status,
                    timeRange: task.timeRange,
                    stats: stats.metrics,
                    screenshot: screenshotName,
                    fetchTime: new Date().toISOString()
                });
                
                // 关闭 drawer - 按 ESC
                await page.keyboard.press('Escape');
                await page.waitForTimeout(1000);
                
            } catch (error) {
                console.error(`   ❌ 错误:`, error.message);
                // 尝试恢复
                await page.keyboard.press('Escape');
                await page.waitForTimeout(500);
            }
        }
        
        // 6. 保存结果
        console.log('\n💾 步骤 6: 保存结果');
        
        const batchSuffix = START_INDEX === 0 ? '_batch1' : '_batch2';
        
        const outputData = {
            fetchTime: new Date().toISOString(),
            batchInfo: `Tasks ${startIdx + 1}-${endIdx}`,
            totalTasks: results.length,
            tasks: results
        };
        
        fs.writeFileSync(
            path.join(OUTPUT_DIR, `task_stats${batchSuffix}.json`), 
            JSON.stringify(outputData, null, 2)
        );
        
        // 生成 CSV
        if (results.length > 0) {
            const allMetricKeys = new Set();
            results.forEach(r => Object.keys(r.stats).forEach(k => allMetricKeys.add(k)));
            
            const headers = ['任务名称', '状态', '任务时间', ...Array.from(allMetricKeys)];
            const csvLines = [headers.join(',')];
            
            results.forEach(r => {
                const row = [
                    `"${r.taskName}"`,
                    `"${r.status}"`,
                    `"${r.timeRange}"`,
                    ...Array.from(allMetricKeys).map(key => `"${r.stats[key] || ''}"`)
                ];
                csvLines.push(row.join(','));
            });
            
            fs.writeFileSync(
                path.join(OUTPUT_DIR, `task_stats${batchSuffix}.csv`),
                csvLines.join('\n')
            );
        }
        
        console.log(`✅ 已保存 ${results.length} 个任务到 task_stats${batchSuffix}.*`);
        
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
    } finally {
        console.log('\n👋 关闭浏览器...');
        await browser.close();
    }
    
    return results;
}

fetchTaskStats().then(results => {
    console.log('\n🎉 完成！成功获取', results.length, '个任务的统计数据');
}).catch(err => {
    console.error('运行失败:', err);
    process.exit(1);
});
