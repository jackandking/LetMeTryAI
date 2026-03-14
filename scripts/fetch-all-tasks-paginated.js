/**
 * Fetch ALL Kuaishou tasks across all pages
 * 翻页获取所有任务（共36个，4页）
 */

import { chromium } from 'playwright';
import fs from 'fs';

const AUTH_FILE = 'kuaishou_auth.json';
const LIST_URL = 'https://daren.kuaishou.com/distribution-plan-list';

async function fetchAllTasks() {
    console.log('🚀 开始获取所有分页任务...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
        viewport: { width: 1280, height: 800 }}
    );
    const page = await context.newPage();
    
    const allTasks = [];
    
    try {
        // 1. 导航到列表页
        console.log('📍 访问任务列表页');
        await page.goto(LIST_URL, { timeout: 30000 });
        
        // 2. 检查登录
        if (page.url().includes('login')) {
            console.log('⚠️  请扫码登录...');
            await page.waitForURL((u) => !u.toString().includes('login'), { timeout: 120000 });
            await context.storageState({ path: AUTH_FILE });
        }
        
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        console.log('✅ 页面加载完成\n');
        
        // 3. 获取总页数
        const pageInfo = await page.evaluate(() => {
            const totalText = document.querySelector('.distribution-list__table__pagination-total, .ks-pagination__total');
            const pageButtons = document.querySelectorAll('.ks-pager li.number, .ks-pagination .number');
            
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
        
        console.log(`📊 总任务数: ${pageInfo.totalCount}, 总页数: ${pageInfo.maxPage}\n`);
        
        // 4. 遍历所有页
        for (let currentPage = 1; currentPage <= pageInfo.maxPage; currentPage++) {
            console.log(`\n📄 正在处理第 ${currentPage}/${pageInfo.maxPage} 页...`);
            
            // 如果是第1页，已经在上面加载了
            if (currentPage > 1) {
                // 点击页码
                const pageBtn = page.locator('.ks-pager li.number, .ks-pagination .number').filter({ hasText: String(currentPage) }).first();
                
                if (await pageBtn.count() > 0) {
                    await pageBtn.click();
                    await page.waitForTimeout(2000); // 等待数据加载
                } else {
                    console.log('⚠️  未找到页码按钮，尝试使用下一页按钮');
                    const nextBtn = page.locator('.ks-pagination__btn-next').first();
                    if (await nextBtn.count() > 0 && await nextBtn.isEnabled()) {
                        await nextBtn.click();
                        await page.waitForTimeout(2000);
                    }
                }
            }
            
            // 等待表格更新
            await page.waitForSelector('table tbody tr', { timeout: 10000 });
            await page.waitForTimeout(1000);
            
            // 5. 提取当前页任务
            const tasks = await page.evaluate((pageNum) => {
                const rows = document.querySelectorAll('table tbody tr');
                return Array.from(rows).map((row, index) => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 6) return null;
                    
                    // 根据截图，列应该是：
                    // 0: ID, 1: 标题, 2: 来源, 3: 状态, 4: 时间, 5: 操作
                    const id = cells[0]?.textContent?.trim() || '';
                    const name = cells[1]?.textContent?.trim() || '';
                    const source = cells[2]?.textContent?.trim() || '';
                    const status = cells[3]?.textContent?.trim() || '';
                    const timeInfo = cells[4]?.textContent?.trim() || '';
                    
                    // 过滤无效行
                    if (!name || !id || /^\d+$/.test(name)) return null;
                    
                    return {
                        page: pageNum,
                        index: index,
                        planId: id,
                        name: name,
                        source: source,
                        status: status,
                        timeInfo: timeInfo
                    };
                }).filter(item => item !== null);
            }, currentPage);
            
            console.log(`   找到 ${tasks.length} 个任务`);
            tasks.forEach((t, i) => {
                console.log(`   ${i + 1}. [ID:${t.planId}] ${t.name}`);
            });
            
            allTasks.push(...tasks);
        }
        
        // 6. 保存结果
        console.log('\n💾 保存结果...');
        
        const result = {
            fetchTime: new Date().toISOString(),
            totalPages: pageInfo.maxPage,
            totalTasks: allTasks.length,
            expectedTasks: pageInfo.totalCount,
            tasks: allTasks
        };
        
        fs.writeFileSync('kuaishou_all_tasks.json', JSON.stringify(result, null, 2));
        
        // 生成 CSV
        const csvHeader = '页码,计划ID,任务名称,来源,状态,时间信息\n';
        const csvRows = allTasks.map(t => 
            `${t.page},"${t.planId}","${t.name}","${t.source}","${t.status}","${t.timeInfo}"`
        ).join('\n');
        fs.writeFileSync('kuaishou_all_tasks.csv', csvHeader + csvRows);
        
        console.log(`✅ 已保存 ${allTasks.length} 个任务（预期 ${pageInfo.totalCount} 个）`);
        console.log('📁 文件: kuaishou_all_tasks.json / kuaishou_all_tasks.csv');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await browser.close();
    }
    
    return allTasks;
}

fetchAllTasks().then(tasks => {
    console.log(`\n🎉 完成！共获取 ${tasks.length} 个任务`);
}).catch(err => {
    console.error('运行失败:', err);
    process.exit(1);
});
