/**
 * Smart Kuaishou Task List Fetcher
 * 防卡死、自动重试、智能等待
 */

import { chromium } from 'playwright';
import fs from 'fs';
import { ensureParentDirectory, resolveKuaishouAuthFile } from './runtime-paths.js';

const AUTH_FILE = resolveKuaishouAuthFile(import.meta.url);
const LIST_URL = 'https://daren.kuaishou.com/distribution-plan-list';

async function fetchTaskList() {
    console.log('🚀 启动智能任务清单获取...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    // 收集所有任务
    const allTasks = [];
    
    try {
        // 1. 导航到列表页
        console.log('📍 步骤 1: 访问任务列表页');
        await page.goto(LIST_URL, { timeout: 30000 });
        
        // 2. 检查登录状态
        console.log('🔐 步骤 2: 检查登录状态');
        const url = page.url();
        if (url.includes('login') || url.includes('passport')) {
            console.log('⚠️  未登录，请扫码登录...');
            await page.waitForURL((u) => !u.toString().includes('login'), { timeout: 120000 });
            console.log('✅ 登录成功');
            // 保存新 session
            ensureParentDirectory(AUTH_FILE);
            await context.storageState({ path: AUTH_FILE });
            console.log('💾 Session 已保存\n');
        } else {
            console.log('✅ 已登录\n');
        }
        
        // 3. 等待表格加载（智能重试）
        console.log('📊 步骤 3: 等待表格加载');
        let tableLoaded = false;
        let attempts = 0;
        const maxAttempts = 5;
        
        while (!tableLoaded && attempts < maxAttempts) {
            attempts++;
            try {
                // 等待网络空闲
                await page.waitForLoadState('networkidle', { timeout: 10000 });
                // 等待表格行出现
                await page.waitForSelector('table tbody tr', { timeout: 10000 });
                tableLoaded = true;
                console.log(`✅ 表格加载成功 (尝试 ${attempts} 次)\n`);
            } catch (e) {
                console.log(`⚠️  表格未加载，第 ${attempts} 次重试...`);
                if (attempts >= maxAttempts) {
                    console.log('❌ 表格加载失败，保存截图诊断...');
                    await page.screenshot({ path: 'debug-no-table.png', fullPage: true });
                    throw new Error('表格加载失败');
                }
                await page.waitForTimeout(2000);
            }
        }
        
        // 4. 获取任务列表
        console.log('📋 步骤 4: 提取任务数据');
        
        let hasNextPage = true;
        let pageNum = 1;
        
        while (hasNextPage) {
            console.log(`\n📄 正在处理第 ${pageNum} 页...`);
            
            // 等待表格稳定
            await page.waitForTimeout(1000);
            
            // 提取当前页数据（过滤有效任务行）
            const tasks = await page.evaluate(() => {
                const rows = document.querySelectorAll('table tbody tr');
                return Array.from(rows).map((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 5) return null;
                    
                    const name = cells[1]?.textContent?.trim() || '';
                    const status = cells[2]?.textContent?.trim() || '';
                    const timeRange = cells[3]?.textContent?.trim() || '';
                    const createTime = cells[4]?.textContent?.trim() || '';
                    
                    // 过滤条件：任务名称不能为空且不能是纯数字
                    if (!name || /^\d+$/.test(name)) return null;
                    // 状态应该包含"小程序"或是"进行中"/"已暂停"等状态词
                    if (!status.includes('小程序') && !['进行中', '已暂停', '已结束', '待开始'].includes(status)) return null;
                    
                    return {
                        index: index + 1,
                        name,
                        status,
                        timeRange,
                        createTime,
                        // 获取操作按钮数量（用于后续点击）
                        actionButtonCount: cells[5]?.querySelectorAll('button').length || 0
                    };
                }).filter(item => item !== null);
            });
            
            console.log(`   找到 ${tasks.length} 个任务`);
            tasks.forEach((task, i) => {
                console.log(`   ${i + 1}. ${task.name} [${task.status}]`);
            });
            
            allTasks.push(...tasks);
            
            // 5. 检查是否有下一页
            console.log('➡️  步骤 5: 检查下一页');
            const hasNext = await page.evaluate(() => {
                const nextBtn = document.querySelector('.ks-pagination__btn-next');
                if (!nextBtn) return false;
                // 检查是否禁用
                return !nextBtn.disabled && !nextBtn.classList.contains('is-disabled');
            });
            
            if (hasNext && tasks.length > 0) {
                // 点击下一页
                console.log('   点击下一页...');
                
                // 记录当前第一个任务名，用于确认翻页成功
                const firstTaskName = tasks[0]?.name;
                
                await page.click('.ks-pagination__btn-next');
                
                // 等待页面变化（新数据加载）
                try {
                    await page.waitForFunction(
                        (oldName) => {
                            const firstRow = document.querySelector('table tbody tr');
                            if (!firstRow) return false;
                            const nameCell = firstRow.querySelector('td:nth-child(2)');
                            return nameCell && nameCell.textContent.trim() !== oldName;
                        },
                        firstTaskName,
                        { timeout: 10000 }
                    );
                    pageNum++;
                } catch (e) {
                    console.log('   ⚠️  翻页可能失败或已到最后一页');
                    hasNextPage = false;
                }
            } else {
                console.log('   已到最后一页');
                hasNextPage = false;
            }
        }
        
        // 6. 保存结果
        console.log('\n💾 步骤 6: 保存结果');
        const result = {
            fetchTime: new Date().toISOString(),
            totalCount: allTasks.length,
            tasks: allTasks
        };
        
        fs.writeFileSync('kuaishou_tasks.json', JSON.stringify(result, null, 2));
        console.log(`✅ 已保存 ${allTasks.length} 个任务到 kuaishou_tasks.json`);
        
        // 同时输出 CSV 格式
        const csvHeader = '序号,任务名称,状态,任务时间,创建时间\n';
        const csvRows = allTasks.map((t, i) => 
            `${i + 1},"${t.name}","${t.status}","${t.timeRange}","${t.createTime}"`
        ).join('\n');
        fs.writeFileSync('kuaishou_tasks.csv', csvHeader + csvRows);
        console.log('✅ 已保存 CSV 格式到 kuaishou_tasks.csv');
        
    } catch (error) {
        console.error('\n❌ 错误:', error.message);
        await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
        console.log('📸 错误截图已保存到 error-screenshot.png');
    } finally {
        console.log('\n👋 关闭浏览器...');
        await browser.close();
    }
    
    return allTasks;
}

// 运行
fetchTaskList().then(tasks => {
    console.log('\n🎉 完成！共获取', tasks.length, '个任务');
}).catch(err => {
    console.error('运行失败:', err);
    process.exit(1);
});
