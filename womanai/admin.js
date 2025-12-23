// admin.js - Batch upload functionality for womanai admin panel
import { API_ENDPOINTS } from '../util/config.js';
import { validateImageUrl } from './url-validator.js';

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
        duplicatesRemoved: lines.length - urls.size - invalid.length
    };
}

/**
 * Upload a single image URL to the database
 * @param {string} url - Image URL to upload
 * @returns {Promise<Object>} - Result object
 */
async function uploadSingleImage(url) {
    try {
        const sql = 'INSERT INTO handsome_images (image_url, created_at) VALUES (?, NOW())';
        const params = [url];
        
        const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ sql, params })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success || result.data) {
            return { success: true };
        } else {
            throw new Error(result.error || '上传失败');
        }
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Batch upload images with delay between requests
 * @param {string[]} urls - Array of image URLs
 * @param {number} delayMs - Delay between uploads in milliseconds
 */
async function batchUpload(urls, delayMs = 300) {
    state.isUploading = true;
    state.totalCount = urls.length;
    state.successCount = 0;
    state.errorCount = 0;
    state.skipCount = 0;
    state.logs = [];
    
    updateStats();
    addLog(`开始批量上传 ${urls.length} 张图片`, 'info');
    
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    uploadBtn.disabled = true;
    cancelBtn.disabled = false;
    
    for (let i = 0; i < urls.length && state.isUploading; i++) {
        const url = urls[i];
        addLog(`正在上传 ${i + 1}/${urls.length}: ${url}`, 'info');
        
        const result = await uploadSingleImage(url);
        
        if (result.success) {
            state.successCount++;
            addLog(`✓ 上传成功: ${url}`, 'success');
        } else {
            if (result.error.includes('Duplicate')) {
                state.skipCount++;
                addLog(`⊘ 跳过重复: ${url}`, 'info');
            } else {
                state.errorCount++;
                addLog(`✗ 上传失败: ${url} (${result.error})`, 'error');
            }
        }
        
        updateStats();
        
        // Add delay between requests to avoid overwhelming the server
        if (i < urls.length - 1 && state.isUploading) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    
    // Upload completed or cancelled
    state.isUploading = false;
    uploadBtn.disabled = false;
    cancelBtn.disabled = true;
    
    if (state.errorCount === 0) {
        addLog(`✓ 批量上传完成！成功: ${state.successCount}, 跳过: ${state.skipCount}`, 'success');
        showAlert('批量上传完成！', 'success');
    } else {
        addLog(`批量上传结束。成功: ${state.successCount}, 失败: ${state.errorCount}, 跳过: ${state.skipCount}`, 'error');
        showAlert(`上传完成，有 ${state.errorCount} 个失败`, 'warning');
    }
}

/**
 * Cancel ongoing batch upload
 */
function cancelUpload() {
    if (state.isUploading) {
        state.isUploading = false;
        addLog('用户取消批量上传', 'info');
        showAlert('已取消上传', 'warning');
    }
}

/**
 * Clear all logs and reset statistics
 */
function clearLogs() {
    state.logs = [];
    document.getElementById('logContainer').innerHTML = '';
    state.totalCount = 0;
    state.successCount = 0;
    state.errorCount = 0;
    state.skipCount = 0;
    updateStats();
    addLog('日志已清空', 'info');
}

/**
 * Initialize admin panel
 */
function initAdmin() {
    const uploadBtn = document.getElementById('uploadBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const clearLogsBtn = document.getElementById('clearLogsBtn');
    const urlInput = document.getElementById('urlInput');
    const validateBtn = document.getElementById('validateBtn');
    const validationResult = document.getElementById('validationResult');
    
    // Upload button handler
    uploadBtn.addEventListener('click', () => {
        const input = urlInput.value.trim();
        
        if (!input) {
            showAlert('请输入图片URL', 'warning');
            return;
        }
        
        const parsed = parseUrls(input);
        
        if (parsed.valid.length === 0) {
            showAlert('没有有效的图片URL', 'error');
            return;
        }
        
        if (parsed.invalid.length > 0) {
            const confirmMsg = `发现 ${parsed.invalid.length} 个无效URL，是否继续上传 ${parsed.valid.length} 个有效URL？`;
            if (!confirm(confirmMsg)) {
                return;
            }
        }
        
        batchUpload(parsed.valid);
    });
    
    // Cancel button handler
    cancelBtn.addEventListener('click', cancelUpload);
    
    // Clear logs button handler
    clearLogsBtn.addEventListener('click', clearLogs);
    
    // Validate button handler
    validateBtn.addEventListener('click', () => {
        const input = urlInput.value.trim();
        
        if (!input) {
            validationResult.innerHTML = '<p class="error">请输入URL</p>';
            return;
        }
        
        const parsed = parseUrls(input);
        
        let html = `
            <div class="validation-summary">
                <p class="success">✓ 有效URL: ${parsed.valid.length}</p>
                <p class="error">✗ 无效URL: ${parsed.invalid.length}</p>
                <p class="info">⊘ 去重: ${parsed.duplicatesRemoved}</p>
            </div>
        `;
        
        if (parsed.invalid.length > 0) {
            html += '<div class="invalid-urls"><h4>无效URL列表:</h4><ul>';
            parsed.invalid.forEach(item => {
                html += `<li>行 ${item.line}: ${item.reason}<br><small>${item.url}</small></li>`;
            });
            html += '</ul></div>';
        }
        
        validationResult.innerHTML = html;
    });
    
    // Initialize stats
    updateStats();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

export { initAdmin, batchUpload, cancelUpload, clearLogs };
