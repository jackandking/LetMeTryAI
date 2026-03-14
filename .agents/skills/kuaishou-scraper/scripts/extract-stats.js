/**
 * Extract statistics from Kuaishou task detail drawer
 * This script is designed to be run via MCP Playwright browser_evaluate
 */

function extractKuaishouStats() {
    const stats = {
        timestamp: new Date().toISOString(),
        raw: {},
        parsed: {}
    };
    
    // Helper to find value by label
    function findValueByLabel(labels) {
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            const text = el.textContent.trim();
            if (labels.some(label => text.includes(label))) {
                // Look for sibling or parent's value
                const parent = el.parentElement;
                const valueEl = parent.querySelector('.value, .number, [class*="value"], [class*="num"], strong, .ks-text--primary');
                if (valueEl) return valueEl.textContent.trim();
                
                // Check next sibling
                const nextEl = el.nextElementSibling;
                if (nextEl) return nextEl.textContent.trim();
            }
        }
        return null;
    }
    
    // Helper to extract from data cards
    function extractFromCards() {
        const data = {};
        const cardSelectors = [
            '.ks-card',
            '.data-card', 
            '.stat-card',
            '.metric-card',
            '.stat-item',
            '[class*="stat"]',
            '[class*="metric"]',
            '[class*="data"]'
        ];
        
        cardSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(card => {
                const label = card.querySelector('.label, .title, [class*="label"], [class*="title"], h1, h2, h3, h4');
                const value = card.querySelector('.value, .number, [class*="value"], [class*="num"], .ks-text--primary');
                
                if (label && value) {
                    const key = label.textContent.trim();
                    const val = value.textContent.trim();
                    data[key] = val;
                }
            });
        });
        
        return data;
    }
    
    // Helper to extract from table
    function extractFromTable() {
        const data = {};
        const tables = document.querySelectorAll('table');
        
        tables.forEach(table => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td, th');
                if (cells.length >= 2) {
                    const key = cells[0].textContent.trim();
                    const value = cells[1].textContent.trim();
                    data[key] = value;
                }
            });
        });
        
        return data;
    }
    
    // Helper to extract from description lists
    function extractFromDescriptionList() {
        const data = {};
        const items = document.querySelectorAll('.ks-description-item, .info-item, [class*="info-row"]');
        
        items.forEach(item => {
            const label = item.querySelector('.ks-description-label, .label, [class*="label"], dt');
            const value = item.querySelector('.ks-description-content, .content, [class*="content"], [class*="value"], dd');
            
            if (label && value) {
                data[label.textContent.trim()] = value.textContent.trim();
            }
        });
        
        return data;
    }
    
    // Extract all data sources
    stats.raw.cards = extractFromCards();
    stats.raw.table = extractFromTable();
    stats.raw.descriptionList = extractFromDescriptionList();
    
    // Map common fields
    const fieldMappings = {
        exposure: ['曝光', '展现', '曝光量', '展现量', '曝光次数'],
        clicks: ['点击', '点击量', '点击次数', '访问', '访问量'],
        gmv: ['GMV', 'gmv', '交易额', '成交金额', '交易金额'],
        revenue: ['收益', '收入', '预估收益', '预计收益', 'earning', 'revenue'],
        playCount: ['播放', '播放量', '播放次数', '观看', '观看量'],
        publishCount: ['发布', '投稿', '发布量', '投稿量', '发布次数'],
        conversionRate: ['转化率', '转化', 'conversion'],
        cpc: ['CPC', '点击成本', '平均点击成本'],
        cpm: ['CPM', '千次曝光成本'],
        ctr: ['CTR', '点击率', '点击通过率']
    };
    
    // Try to find values for each field
    Object.entries(fieldMappings).forEach(([field, labels]) => {
        // Check in cards first
        for (const [key, value] of Object.entries(stats.raw.cards)) {
            if (labels.some(label => key.includes(label))) {
                stats.parsed[field] = value;
                return;
            }
        }
        
        // Then try findValueByLabel
        const value = findValueByLabel(labels);
        if (value) {
            stats.parsed[field] = value;
        }
    });
    
    // Get task name if available
    const titleEl = document.querySelector('.ks-drawer__title, .ks-dialog__title, .title, h1, h2');
    if (titleEl) {
        stats.taskName = titleEl.textContent.trim();
    }
    
    // Get plan ID from URL if in drawer
    const planIdMatch = window.location.href.match(/planId=(\d+)/) || 
                       window.location.href.match(/check\/(\d+)/);
    if (planIdMatch) {
        stats.planId = planIdMatch[1];
    }
    
    return stats;
}

// Execute and return
extractKuaishouStats();
