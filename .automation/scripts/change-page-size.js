/**
 * Change Kuaishou page size to show more tasks per page
 * 修改分页设置，一页显示更多任务
 */

import { chromium } from 'playwright';
import fs from 'fs';
import { ensureParentDirectory, resolveKuaishouAuthFile } from './runtime-paths.js';

const AUTH_FILE = resolveKuaishouAuthFile(import.meta.url);
const LIST_URL = 'https://daren.kuaishou.com/distribution-plan-list';

async function changePageSize() {
    console.log('🚀 尝试修改分页设置...\n');
    
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        storageState: fs.existsSync(AUTH_FILE) ? JSON.parse(fs.readFileSync(AUTH_FILE, 'utf-8')) : undefined,
        viewport: { width: 1280, height: 800 }
    });
    const page = await context.newPage();
    
    try {
        // 1. 导航到列表页
        console.log('📍 访问任务列表页');
        await page.goto(LIST_URL, { timeout: 30000 });
        
        // 2. 检查登录
        if (page.url().includes('login')) {
            console.log('⚠️  请扫码登录...');
            await page.waitForURL((u) => !u.toString().includes('login'), { timeout: 120000 });
            ensureParentDirectory(AUTH_FILE);
            await context.storageState({ path: AUTH_FILE });
        }
        
        await page.waitForSelector('table tbody tr', { timeout: 15000 });
        console.log('✅ 页面加载完成\n');
        
        // 3. 查找分页控件
        console.log('🔍 查找分页控件...');
        
        // 常见的分页选择器
        const paginationSelectors = [
            '.ks-pagination__sizes',  // 每页显示数量
            '.ks-pagination .ks-select',  // 下拉选择
            '.pagination-size',  // 分页大小
            '[class*="page-size"]',  // 包含 page-size 的类
            '.ks-pagination__sizes .ks-input__inner',  // 输入框
        ];
        
        // 截图查看页面右下角
        await page.screenshot({ path: 'pagination-check.png', fullPage: true });
        console.log('📸 已保存页面截图: pagination-check.png');
        
        // 查找分页区域
        const paginationInfo = await page.evaluate(() => {
            const result = {
                paginationElements: [],
                pageSizeOptions: [],
                currentInfo: ''
            };
            
            // 查找所有分页相关元素
            document.querySelectorAll('.ks-pagination, .pagination, [class*="pagination"]').forEach(el => {
                result.paginationElements.push({
                    className: el.className,
                    text: el.textContent.substring(0, 200)
                });
            });
            
            // 查找下拉选择器（可能是每页显示数量）
            document.querySelectorAll('.ks-select, .ks-input, [class*="size"]').forEach(el => {
                const text = el.textContent.trim();
                if (text.includes('10') || text.includes('20') || text.includes('50') || text.includes('条')) {
                    result.pageSizeOptions.push({
                        tag: el.tagName,
                        className: el.className,
                        text: text.substring(0, 100)
                    });
                }
            });
            
            // 获取分页信息文本
            const infoEl = document.querySelector('.ks-pagination__total, .pagination-info');
            if (infoEl) {
                result.currentInfo = infoEl.textContent;
            }
            
            return result;
        });
        
        console.log('\n📋 分页控件信息:');
        console.log('分页元素:', paginationInfo.paginationElements);
        console.log('每页数量选项:', paginationInfo.pageSizeOptions);
        console.log('当前信息:', paginationInfo.currentInfo);
        
        // 4. 尝试点击分页大小选择器
        console.log('\n🖱️  尝试点击分页大小选择器...');
        
        // 方法1: 直接查找包含数字的下拉框
        try {
            const sizeSelector = await page.locator('.ks-pagination__sizes .ks-input, .ks-pagination .ks-select').first();
            if (await sizeSelector.isVisible({ timeout: 5000 })) {
                console.log('找到分页大小选择器，点击...');
                await sizeSelector.click();
                await page.waitForTimeout(1000);
                
                // 查找 50 或 100 的选项
                const option50 = page.locator('.ks-select-dropdown__item:has-text("50"), .ks-dropdown-menu__item:has-text("50")').first();
                const option100 = page.locator('.ks-select-dropdown__item:has-text("100"), .ks-dropdown-menu__item:has-text("100")').first();
                
                if (await option100.isVisible({ timeout: 3000 })) {
                    console.log('选择 100 条/页');
                    await option100.click();
                } else if (await option50.isVisible({ timeout: 3000 })) {
                    console.log('选择 50 条/页');
                    await option50.click();
                } else {
                    console.log('未找到 50 或 100 选项');
                }
                
                await page.waitForTimeout(2000);
            }
        } catch (e) {
            console.log('方法1失败:', e.message);
        }
        
        // 5. 使用 JavaScript 直接修改
        console.log('\n⚡ 尝试使用 JavaScript 修改分页...');
        const modifyResult = await page.evaluate(() => {
            // 方法A: 修改 Vue/React 组件的内部状态
            const tables = document.querySelectorAll('table');
            let modified = false;
            
            tables.forEach(table => {
                // 尝试找到组件实例
                const key = Object.keys(table).find(k => k.startsWith('__vue') || k.startsWith('__react'));
                if (key) {
                    const comp = table[key];
                    if (comp && comp.$emit) {
                        // Vue 组件
                        console.log('Found Vue component');
                    }
                }
            });
            
            // 方法B: 查找并点击分页按钮
            const pagination = document.querySelector('.ks-pagination');
            if (pagination) {
                // 查找 "下一页" 按钮，检查是否禁用
                const nextBtn = pagination.querySelector('.ks-pagination__btn-next');
                if (nextBtn) {
                    const isDisabled = nextBtn.disabled || nextBtn.classList.contains('is-disabled');
                    return { hasNextPage: !isDisabled, message: 'Found next button' };
                }
                
                // 查找页码按钮
                const pageButtons = pagination.querySelectorAll('.ks-pager li');
                return { pageCount: pageButtons.length, message: 'Found page buttons' };
            }
            
            return { message: 'No pagination found' };
        });
        
        console.log('JavaScript 修改结果:', modifyResult);
        
        // 6. 获取当前任务数量
        console.log('\n📊 获取当前任务数量...');
        await page.waitForTimeout(2000);
        
        const taskCount = await page.evaluate(() => {
            return document.querySelectorAll('table tbody tr').length;
        });
        
        console.log(`当前页面显示 ${taskCount} 个任务`);
        
        // 7. 如果只有10个但可能有更多，尝试点击下一页
        if (taskCount === 10 && modifyResult.hasNextPage) {
            console.log('\n➡️  检测到可能有更多任务，尝试点击下一页...');
            await page.click('.ks-pagination__btn-next');
            await page.waitForTimeout(3000);
            
            const newTaskCount = await page.evaluate(() => {
                return document.querySelectorAll('table tbody tr').length;
            });
            console.log(`翻页后显示 ${newTaskCount} 个任务`);
        }
        
        console.log('\n✅ 完成！请查看截图 pagination-check.png');
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
    } finally {
        await browser.close();
    }
}

changePageSize().then(() => {
    console.log('\n👋 结束');
}).catch(err => {
    console.error('运行失败:', err);
});
