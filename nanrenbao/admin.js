// admin.js - Batch upload functionality for nanrenbao admin panel
import { API_ENDPOINTS } from '../util/config.js';
import { validateImageUrl } from './url-validator.js';

// Management state
const manageState = {
    page: 1,
    perPage: 20,
    totalPages: 1,
    filter: 'all',
    query: ''
};

/**
 * Fetch images for management table
 */
async function fetchImagesForManage(page = 1, perPage = 20, filter = 'all', query = '') {
    // Build SQL with basic filtering and pagination
    let where = 'WHERE 1=1';
    if (filter === 'visible') where = 'WHERE deleted = 0';
    if (filter === 'deleted') where = 'WHERE deleted = 1';

    if (query && query.trim()) {
        const q = query.trim();
        if (/^\d+$/.test(q)) {
            where += ` AND id = ${parseInt(q, 10)}`;
        } else {
            // escape single quotes
            const safe = q.replace(/'/g, "\\'");
            where += ` AND image_url LIKE '%${safe}%'`;
        }
    }

    const offset = (page - 1) * perPage;
    const sql = `SELECT SQL_CALC_FOUND_ROWS id, image_url, view_count, created_at, deleted FROM beauty_images ${where} ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`;

    const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params: [] })
    });

    if (!resp.ok) throw new Error('Failed to fetch images');
    const rows = await resp.json();

    // Get total count
    const countResp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT FOUND_ROWS() as total', params: [] })
    });
    const countJson = await countResp.json();
    const total = Array.isArray(countJson) && countJson[0] && countJson[0].total ? parseInt(countJson[0].total, 10) : 0;

    return { rows, total };
}

function renderManageTable(rows, page, perPage, total) {
    const tbody = document.getElementById('imagesTbody');
    tbody.innerHTML = '';

    rows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="padding:8px; vertical-align:middle;">${row.id}</td>
            <td style="padding:8px;"><div style="display:flex; gap:10px; align-items:center;"><img src="${row.image_url}" style="width:80px; height:60px; object-fit:cover; border-radius:6px;" /><div style="max-width:420px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${row.image_url}</div></div></td>
            <td style="padding:8px;">${row.view_count || 0}</td>
            <td style="padding:8px;">${row.deleted ? '<span style="color:#f44336; font-weight:bold;">已删除</span>' : '<span style="color:#4caf50;">可见</span>'}</td>
            <td style="padding:8px;">
                <button class="btn-primary" data-action="view" data-id="${row.id}" data-url="${row.image_url}">查看</button>
                <button class="btn-secondary" data-action="${row.deleted ? 'undelete' : 'delete'}" data-id="${row.id}" data-url="${row.image_url}">${row.deleted ? '取消删除' : '标记删除'}</button>
                <button class="btn-secondary" data-action="permadelete" data-id="${row.id}">永久删除</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // update stats
    document.getElementById('manageStats').textContent = `共 ${total} 条，当前第 ${page} 页`;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    manageState.totalPages = totalPages;
    document.getElementById('pageInfo').textContent = `${page} / ${totalPages}`;
}

async function loadManagePage() {
    try {
        const rowsResult = await fetchImagesForManage(manageState.page, manageState.perPage, manageState.filter, manageState.query);
        renderManageTable(rowsResult.rows, manageState.page, manageState.perPage, rowsResult.total);
    } catch (err) {
        console.error('加载图片列表失败:', err);
        addLog('加载图片列表失败: ' + (err.message || err), 'error');
    }
}

async function performAction(action, id, imageUrl) {
    try {
        if (action === 'view') {
            window.open(imageUrl, '_blank');
            return;
        }

        if (action === 'delete' || action === 'undelete') {
            const setVal = action === 'delete' ? 1 : 0;
            const sql = 'UPDATE beauty_images SET deleted = ? WHERE id = ?';
            const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql, params: [setVal, id] })
            });
            const json = await resp.json();
            addLog(`${action} id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadManagePage();
            return;
        }

        if (action === 'permadelete') {
            if (!confirm('确认永久删除？操作不可恢复')) return;
            const sql = 'DELETE FROM beauty_images WHERE id = ?';
            const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql, params: [id] })
            });
            const json = await resp.json();
            addLog(`permadelete id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadManagePage();
            return;
        }
    } catch (err) {
        console.error('Action failed:', err);
        addLog('操作失败: ' + (err.message || err), 'error');
    }
}

function attachManageHandlers() {
    document.getElementById('refreshBtn').onclick = () => { manageState.page = 1; manageState.query = document.getElementById('searchInput').value; manageState.filter = document.getElementById('filterSelect').value; loadManagePage(); };
    document.getElementById('prevPageBtn').onclick = () => { if (manageState.page > 1) { manageState.page--; loadManagePage(); } };
    document.getElementById('nextPageBtn').onclick = () => { if (manageState.page < manageState.totalPages) { manageState.page++; loadManagePage(); } };
    document.getElementById('imagesTable').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const url = btn.getAttribute('data-url');
        performAction(action, id, url);
    });
    document.getElementById('bulkUndeleteBtn').onclick = async () => {
        if (!confirm('确认批量取消删除（将 deleted=0）吗？')) return;
        const sql = 'UPDATE beauty_images SET deleted = 0 WHERE deleted = 1';
        const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sql, params: [] }) });
        const json = await resp.json();
        addLog('批量取消删除: ' + JSON.stringify(json), 'info');
        loadManagePage();
    };
    document.getElementById('bulkDeleteBtn').onclick = async () => {
        if (!confirm('确认批量永久删除页面上所有已选/已标记的数据？')) return;
        const sql = 'DELETE FROM beauty_images WHERE deleted = 1';
        const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ sql, params: [] }) });
        const json = await resp.json();
        addLog('批量永久删除: ' + JSON.stringify(json), 'info');
        loadManagePage();
    };
}

// Initialize management UI handlers on load
window.addEventListener('DOMContentLoaded', () => {
    attachManageHandlers();
    // initial load
    loadManagePage();
});

// State management
const state = {
    isUploading: false,
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    skipCount: 0,
    logs: []
};

/**
 * Show alert message
 * @param {string} message - Message to display
 * @param {string} type - Alert type: 'success', 'error', 'warning'
 */
function showAlert(message, type = 'success') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} show`;
    alertDiv.textContent = message;
    
    alertContainer.appendChild(alertDiv);
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertDiv.classList.remove('show');
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

/**
 * Add log entry to the log container
 * @param {string} message - Log message
 * @param {string} type - Log type: 'success', 'error', 'info'
 */
function addLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const logEntry = {
        timestamp,
        message,
        type
    };
    
    state.logs.push(logEntry);
    
    const logContainer = document.getElementById('logContainer');
    const logDiv = document.createElement('div');
    logDiv.className = `log-entry ${type}`;
    logDiv.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logDiv);
    logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * Update statistics display
 */
function updateStats() {
    document.getElementById('totalCount').textContent = state.totalCount;
    document.getElementById('successCount').textContent = state.successCount;
    document.getElementById('errorCount').textContent = state.errorCount;
    document.getElementById('skipCount').textContent = state.skipCount;
    
    // Update progress bar
    const progress = state.totalCount > 0 
        ? Math.round(((state.successCount + state.errorCount + state.skipCount) / state.totalCount) * 100)
        : 0;
    
    const progressBar = document.getElementById('progressBar');
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${progress}%`;
}

/**
 * Parse and validate URLs from textarea input
 * @param {string} input - Raw textarea input
 * @returns {Object} - Object containing valid URLs and statistics
 */
function parseUrls(input) {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const urls = new Set(); // Use Set to automatically deduplicate
    const invalid = [];
    
    lines.forEach((line, index) => {
        const validation = validateImageUrl(line);
        
        if (validation.valid) {
            urls.add(line);
        } else {
            invalid.push({
                line: index + 1,
                url: line,
                reason: validation.error
            });
        }
    });
    
    return {
        valid: Array.from(urls),
        invalid,
        duplicatesRemoved: lines.length - invalid.length - urls.size
    };
}

/**
 * Insert a single URL into the database
 * @param {string} url - Image URL to insert
 * @returns {Promise<Object>} - Insert result
 */
async function insertImageUrl(url) {
    try {
        const response = await fetch(API_ENDPOINTS.MYSQL_INSERT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'beauty_images',
                data: {
                    image_url: url,
                    created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('Insert error:', error);
        
        // Check if error is due to duplicate key (UNIQUE constraint violation)
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
            return { success: false, error: error.message, isDuplicate: true };
        }
        
        return { success: false, error: error.message, isDuplicate: false };
    }
}

/**
 * Process batch upload with delay between requests
 * @param {Array<string>} urls - Array of valid URLs to upload
 */
async function processBatchUpload(urls) {
    state.totalCount = urls.length;
    state.successCount = 0;
    state.errorCount = 0;
    state.skipCount = 0;
    
    addLog(`开始批量上传 ${urls.length} 个URL...`, 'info');
    
    for (let i = 0; i < urls.length; i++) {
        const url = urls[i];
        addLog(`正在上传 (${i + 1}/${urls.length}): ${url.substring(0, 50)}...`, 'info');
        
        const result = await insertImageUrl(url);
        
        if (result.success) {
            state.successCount++;
            addLog(`✓ 成功: ${url.substring(0, 50)}...`, 'success');
        } else if (result.isDuplicate) {
            state.skipCount++;
            addLog(`⊘ 跳过 (已存在): ${url.substring(0, 50)}...`, 'info');
        } else {
            state.errorCount++;
            addLog(`✗ 失败: ${url.substring(0, 50)}... (${result.error})`, 'error');
        }
        
        updateStats();
        
        // Add small delay to avoid overwhelming the server
        if (i < urls.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    addLog('批量上传完成！', 'info');
    showAlert(
        `上传完成！成功: ${state.successCount}, 失败: ${state.errorCount}`,
        state.errorCount === 0 ? 'success' : 'warning'
    );
}

/**
 * Start batch upload process
 */
window.startBatchUpload = async function() {
    if (state.isUploading) {
        showAlert('上传正在进行中，请等待完成', 'warning');
        return;
    }
    
    const urlInput = document.getElementById('urlInput');
    const input = urlInput.value.trim();
    
    if (!input) {
        showAlert('请输入至少一个URL', 'error');
        return;
    }
    
    // Parse and validate URLs
    const parsed = parseUrls(input);
    
    if (parsed.valid.length === 0) {
        showAlert('没有找到有效的URL', 'error');
        if (parsed.invalid.length > 0) {
            addLog(`发现 ${parsed.invalid.length} 个无效URL`, 'error');
            parsed.invalid.slice(0, 5).forEach(item => {
                addLog(`第 ${item.line} 行: ${item.reason}`, 'error');
            });
        }
        return;
    }
    
    // Show statistics
    const statusPanel = document.getElementById('statusPanel');
    statusPanel.style.display = 'block';
    
    // Clear previous logs
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';
    state.logs = [];
    
    // Log parsing results
    addLog(`解析完成: 找到 ${parsed.valid.length} 个有效URL`, 'info');
    
    if (parsed.duplicatesRemoved > 0) {
        addLog(`去重: 移除 ${parsed.duplicatesRemoved} 个重复URL`, 'info');
    }
    
    if (parsed.invalid.length > 0) {
        addLog(`跳过: ${parsed.invalid.length} 个无效URL`, 'info');
        state.skipCount = parsed.invalid.length;
        updateStats();
    }
    
    // Confirm before uploading
    const confirmMsg = `准备上传 ${parsed.valid.length} 个URL，是否继续？`;
    if (!confirm(confirmMsg)) {
        addLog('用户取消上传', 'info');
        return;
    }
    
    // Start upload
    state.isUploading = true;
    const uploadBtn = document.getElementById('uploadBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ 上传中...';
    
    try {
        await processBatchUpload(parsed.valid);
    } catch (error) {
        console.error('Batch upload error:', error);
        showAlert(`批量上传出错: ${error.message}`, 'error');
        addLog(`错误: ${error.message}`, 'error');
    } finally {
        state.isUploading = false;
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📤 开始批量上传';
    }
};

/**
 * Clear input and reset state
 */
window.clearInput = function() {
    if (state.isUploading) {
        showAlert('上传正在进行中，无法清空', 'warning');
        return;
    }
    
    const urlInput = document.getElementById('urlInput');
    urlInput.value = '';
    
    // Reset status panel
    const statusPanel = document.getElementById('statusPanel');
    statusPanel.style.display = 'none';
    
    // Reset state
    state.totalCount = 0;
    state.successCount = 0;
    state.errorCount = 0;
    state.skipCount = 0;
    state.logs = [];
    
    updateStats();
    
    const logContainer = document.getElementById('logContainer');
    logContainer.innerHTML = '';
};

// Initialize
console.log('Nanrenbao Admin initialized');
console.log('Using MySQL endpoint:', API_ENDPOINTS.MYSQL_INSERT);
