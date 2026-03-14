/**
 * Kuaishou Task Statistics Fetcher
 * 抓取每个任务的详细统计数据
 * 
 * Usage:
 *   node scripts/fetch-task-stats.js [startIndex] [count]
 *   
 * Examples:
 *   node scripts/fetch-task-stats.js        # 获取前 10 个
 *   node scripts/fetch-task-stats.js 0 10   # 获取第 1-10 个
 *   node scripts/fetch-task-stats.js 10 10  # 获取第 11-20 个
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const START_INDEX = parseInt(args[0]) || 0;  // 默认从第 1 个开始
const MAX_TASKS = parseInt(args[1]) || 10;   // 默认获取 10 个

const AUTH_FILE = 'kuaishou_auth.json';
const LIST_URL = 'https://daren.kuaishou.com/distribution-plan-list';
const OUTPUT_DIR = 'metrics/kuaishou';

// 确保输出目录存在
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

async function closeOverlay(page) {
    console.log('   🔧 尝试关闭 overlay...');
    
    // 方法1: ESC 键
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    
    // 方法2: 点击关闭按钮
    const closeSelectors = [
        '.ks-drawer__close',
        '.ks-icon-close',
        '.ks-dialog__close',
        'button:has-text("取消")',
        'button:has-text("关闭")',
        'button:has-text("知道了")'
    ];
    
    for (const selector of closeSelectors) {
        try {
            const btn = page.locator(selector).first();
            if (await btn.isVisible({ timeout: 500 })) {
                await btn.click({ timeout: 2000 });
                await page.waitForTimeout(500);
                console.log('   ✅ 通过', selector, '关闭');
                return true;
            }
        } catch (e) {
            // 继续尝试下一个
        }
    }
    
    // 方法3: 点击页面空白处（左侧）
    await page.mouse.click(100, 400);
    await page.waitForTimeout(500);
    
    return false;
}

async function fetchTaskStats() {
    console.log('🚀 启动任务统计数据获取...\n');
    
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
            await context.storageState({ path: AUTH_FILE });
            console.log('✅ 登录成功，session 已保存\n');
        } else {
            console.log('✅ 已登录\n');
        }
        
        // 3. 等待表格加载
        console.log('📊 步骤 3: 等待表格加载');
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        await page.waitForTimeout(1000);
        
        // 4. 获取任务列表（只取前 N 个测试，避免太多）
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
                    timeRange: cells[3]?.textContent?.trim() || '',
                    hasActionButtons: cells[5]?.querySelectorAll('button').length > 0
                };
            }).filter(item => item !== null);
        });
        
        console.log(`✅ 找到 ${tasks.length} 个任务\n`);
        
        // 5. 遍历每个任务获取统计数据
        const startIdx = Math.min(START_INDEX, tasks.length);
        const endIdx = Math.min(startIdx + MAX_TASKS, tasks.length);
        const tasksToFetch = tasks.slice(startIdx, endIdx);
        console.log(`🎯 步骤 5: 抓取第 ${startIdx + 1}-${endIdx} 个任务的统计数据（共 ${tasksToFetch.length} 个）\n`);
        
        for (let i = 0; i < tasksToFetch.length; i++) {
            const task = tasksToFetch[i];
            const globalIndex = startIdx + i + 1;
            console.log(`\n--- 任务 ${globalIndex}/${tasks.length}: ${task.name} ---`);
            
            try {
                // 5.1 确保回到列表页
                if (!page.url().includes('distribution-plan-list')) {
                    console.log('   导航回列表页...');
                    await page.goto(LIST_URL);
                    await page.waitForSelector('table tbody tr', { timeout: 10000 });
                    await page.waitForTimeout(1000);
                }
                
                // 5.2 关闭可能残留的 overlay
                await closeOverlay(page);
                
                // 5.3 重新获取行（使用全局索引）
                const rows = page.locator('table tbody tr');
                const rowCount = await rows.count();
                
                if (task.index >= rowCount) {
                    console.log('   ⚠️  行索引超出范围，跳过');
                    continue;
                }
                
                // 注意：这里使用 task.index 是原始索引，不是循环的 i
                const row = rows.nth(task.index);
                
                // 5.4 先 hover 到行上，让按钮显示
                console.log('   鼠标悬停到行上...');
                await row.hover();
                await page.waitForTimeout(500);
                
                // 找到"数据"按钮（通常是第 2 个按钮）
                const actionCell = row.locator('td').last();
                const dataBtn = actionCell.locator('button').nth(1);
                
                // 检查按钮是否存在
                if (await dataBtn.count() === 0) {
                    console.log('   ⚠️  数据按钮不存在');
                    continue;
                }
                
                // 等待按钮可见（hover 后可能需要一点时间）
                try {
                    await dataBtn.waitFor({ state: 'visible', timeout: 3000 });
                } catch (e) {
                    console.log('   ⚠️  按钮仍未可见，尝试强制点击...');
                }
                
                const btnText = await dataBtn.innerText().catch(() => '数据');
                console.log(`   点击"${btnText}"按钮...`);
                
                // 5.5 点击数据按钮（使用 force 选项，即使不可见也尝试点击）
                await dataBtn.click({ timeout: 5000, force: true });
                
                // 5.6 等待抽屉/弹窗打开
                console.log('   等待数据面板打开...');
                await page.waitForTimeout(2000);
                
                // 等待可能的 drawer 或 dialog
                try {
                    await page.waitForSelector('.ks-drawer, .distribution-plan-detail-dialog, [role="dialog"]', { 
                        timeout: 5000,
                        state: 'visible'
                    });
                } catch (e) {
                    console.log('   ⚠️  未检测到标准 drawer，继续尝试提取数据');
                }
                
                // 5.7 截图保存
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const screenshotName = `task_${globalIndex}_${task.name.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 20)}_${timestamp}.png`;
                await page.screenshot({ 
                    path: path.join(OUTPUT_DIR, screenshotName),
                    fullPage: false 
                });
                console.log(`   📸 截图已保存: ${screenshotName}`);
                
                // 5.8 提取统计数据
                console.log('   提取统计数据...');
                const stats = await page.evaluate(() => {
                    const result = {
                        planId: '',
                        source: '',
                        updateTime: '',
                        metrics: {},
                        details: []
                    };
                    
                    // 获取 drawer 中的内容（排除背景页面）
                    const drawer = document.querySelector('.ks-drawer__body, .distribution-plan-detail-dialog, [role="dialog"] .content, .ks-drawer');
                    if (!drawer) {
                        // 如果没有找到 drawer，尝试在整个文档中找最近添加的 overlay
                        const overlays = document.querySelectorAll('.ks-overlay, .ks-drawer, .ks-dialog');
                        var targetEl = overlays[overlays.length - 1] || document.body;
                    } else {
                        targetEl = drawer;
                    }
                    
                    // 1. 获取计划ID和来源
                    const planIdEl = targetEl.querySelector('[class*="plan-id"], .title, h1, h2, h3');
                    if (planIdEl) {
                        const text = planIdEl.textContent;
                        const match = text.match(/(\d+)/);
                        if (match) result.planId = match[1];
                    }
                    
                    // 2. 获取基础数据（通过 label + value 的结构）
                    // 快手的结构是：label 在上，value 在下
                    const baseDataSection = targetEl.textContent.includes('基础数据') ? targetEl : document.body;
                    
                    // 查找所有包含数字的 metrics
                    const allText = targetEl.innerText;
                    
                    // 匹配常见的数据字段
                    const patterns = [
                        { key: '组件曝光数', regex: /组件曝光数\s*(\d+|--)/ },
                        { key: '组件点击数', regex: /组件点击数\s*(\d+|--)/ },
                        { key: '任务下发人数', regex: /任务下发人数\s*(\d+|--)/ },
                        { key: '已履单达人数量', regex: /已履单达人数量\s*(\d+|--)/ },
                        { key: '已发布作品数', regex: /已发布作品数\s*(\d+|--)/ },
                        { key: '已结算金额', regex: /已结算金额\(([^(]+)\)\s*([\d.]+|--)/ },
                    ];
                    
                    patterns.forEach(({ key, regex }) => {
                        const match = allText.match(regex);
                        if (match) {
                            result.metrics[key] = match[1] === '--' ? null : (match[2] || match[1]);
                        }
                    });
                    
                    // 3. 获取数据明细表格
                    const tables = targetEl.querySelectorAll('table');
                    tables.forEach(table => {
                        // 获取表头
                        const headerRow = table.querySelector('thead tr, tr:first-child');
                        if (!headerRow) return;
                        
                        const headers = Array.from(headerRow.querySelectorAll('th, td'))
                            .map(th => th.textContent.trim())
                            .filter(h => h && h !== '--');
                        
                        if (headers.length === 0) return;
                        
                        // 获取数据行（跳过表头）
                        const dataRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
                        dataRows.forEach(row => {
                            const cells = row.querySelectorAll('td');
                            if (cells.length >= headers.length) {
                                const rowData = {};
                                headers.forEach((header, idx) => {
                                    rowData[header] = cells[idx]?.textContent?.trim() || '--';
                                });
                                if (Object.keys(rowData).length > 0) {
                                    result.details.push(rowData);
                                }
                            }
                        });
                    });
                    
                    return result;
                });
                
                console.log('   📊 计划ID:', stats.planId);
                console.log('   📊 基础数据:', JSON.stringify(stats.metrics, null, 2));
                if (stats.details.length > 0) {
                    console.log('   📊 数据明细:', JSON.stringify(stats.details, null, 2).substring(0, 300));
                }
                
                results.push({
                    taskName: task.name,
                    status: task.status,
                    timeRange: task.timeRange,
                    stats: stats.metrics,
                    screenshot: screenshotName,
                    fetchTime: new Date().toISOString()
                });
                
                // 5.9 关闭 drawer
                console.log('   关闭数据面板...');
                await closeOverlay(page);
                await page.waitForTimeout(1000);
                
            } catch (error) {
                console.error(`   ❌ 处理任务时出错:`, error.message);
                // 尝试恢复
                try {
                    await closeOverlay(page);
                } catch (e) {}
            }
        }
        
        // 6. 保存所有结果
        console.log('\n💾 步骤 6: 保存结果');
        
        const batchSuffix = startIdx === 0 ? '_batch1' : '_batch2';
        
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
        console.log(`✅ 已保存 ${results.length} 个任务的统计数据到 metrics/kuaishou/task_stats${batchSuffix}.json`);
        
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
            console.log(`✅ 已保存 CSV 格式到 metrics/kuaishou/task_stats${batchSuffix}.csv`);
        }
        
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        await page.screenshot({ path: path.join(OUTPUT_DIR, 'error-screenshot.png'), fullPage: true });
        console.log('📸 错误截图已保存');
    } finally {
        console.log('\n👋 关闭浏览器...');
        await browser.close();
    }
    
    return results;
}

// 运行
fetchTaskStats().then(results => {
    console.log('\n🎉 完成！成功获取', results.length, '个任务的统计数据');
}).catch(err => {
    console.error('运行失败:', err);
    process.exit(1);
});
