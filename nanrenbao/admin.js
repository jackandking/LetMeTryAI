// admin.js - Moderation and content management for the nanrenbao admin panel
import { API_ENDPOINTS } from '../util/config.js';
import { validateImageUrl } from './url-validator.esm.js';

// Management state
const manageState = {
    page: 1,
    perPage: 20,
    totalPages: 1,
    filter: 'pending',
    query: ''
};

// Keep database records unchanged while serving legacy image paths from the
// current backend host in thumbnails and preview links.
function normalizeStoredImageUrl(imageUrl) {
    if (typeof imageUrl !== 'string') return imageUrl;
    try {
        const url = new URL(imageUrl, window.location.origin);
        if (url.hostname === 'letmetry.cn' || url.hostname === 'museumcheck.cn') {
            url.protocol = 'https:';
            url.hostname = 'letmetry.cn';
            return url.toString();
        }
    } catch (error) {
        // Keep malformed or relative values unchanged.
    }
    return imageUrl;
}

function buildReviewWhere(filter) {
    let where = 'WHERE 1=1';
    if (filter === 'visible') where += " AND deleted = 0 AND review_status = 'approved'";
    if (filter === 'deleted') where += ' AND deleted = 1';
    if (filter === 'pending') where += " AND review_status = 'pending'";
    if (filter === 'approved') where += " AND review_status = 'approved'";
    if (filter === 'rejected') where += " AND review_status = 'rejected'";
    return where;
}

function formatReviewStatus(row) {
    const reviewStatus = row.review_status || 'pending';
    const reviewLabelMap = {
        pending: '<span style="color:#ff9800; font-weight:bold;">待审核</span>',
        approved: '<span style="color:#4caf50; font-weight:bold;">已通过</span>',
        rejected: '<span style="color:#f44336; font-weight:bold;">已驳回</span>'
    };
    const visibilityLabel = row.deleted
        ? '<span style="color:#9e9e9e;">已隐藏</span>'
        : reviewStatus === 'approved'
            ? '<span style="color:#2196f3;">可展示</span>'
            : '<span style="color:#9e9e9e;">不展示</span>';
    return `${reviewLabelMap[reviewStatus] || reviewLabelMap.pending}<br>${visibilityLabel}`;
}

function formatSubmissionMeta(row) {
    const source = row.source_type === 'local_file' ? '本地上传' : '存量内容';
    const submittedAt = row.submitted_at || row.created_at || '-';
    return `${source}<br><span style="font-size:0.85em; color:#666;">${submittedAt}</span>`;
}

function resetManageSelections() {
    const selectAllCheckbox = document.getElementById('selectAllCheckbox');
    if (selectAllCheckbox) {
        selectAllCheckbox.checked = false;
    }
}

// --- Admin write helpers: dedicated admin endpoints under /api/nanrenbao/admin/.
// /mysql/update、/mysql/delete 自 2026-09-06 P0 起仅 KV_ADMIN_KEY 可写，
// 审批后台裸调被 403 静默挡掉（2026-10-16 生产实测复现：审批通过/驳回/
// 标记删除/取消删除/永久删除/批量操作全部失效）。密钥不落仓库：运营者
// 首次操作时经模态框输入，sessionStorage 本会话生效；勾选「记住此设备」
// 再写 localStorage（30 天 TTL）——手机上不必反复输 64 位密钥。
// 401 时清除全部存储并重新输入；隐私模式存储不可用时降级为每次输入。---
const ADMIN_KEY_STORAGE = 'nrb_admin_key';                 // sessionStorage：本会话
const ADMIN_KEY_REMEMBER_KEY = 'nrb_admin_key_remembered'; // localStorage：记住的密钥
const ADMIN_KEY_REMEMBER_UNTIL = 'nrb_admin_key_until';    // localStorage：过期时间(ms)
const ADMIN_KEY_REMEMBER_DAYS = 30;

function safeStorageGet(store, key) {
    try { return store.getItem(key); } catch (e) { return null; }
}

function safeStorageSet(store, key, value) {
    try { store.setItem(key, value); return true; } catch (e) { return false; }
}

function safeStorageRemove(store, key) {
    try { store.removeItem(key); } catch (e) { /* 隐私模式：忽略 */ }
}

// 读已存密钥：session 优先 → 未过期的本机记忆（回填 session）→ null
function readStoredAdminKey() {
    const sessionKey = safeStorageGet(sessionStorage, ADMIN_KEY_STORAGE);
    if (sessionKey) return sessionKey;
    const remembered = safeStorageGet(localStorage, ADMIN_KEY_REMEMBER_KEY);
    const until = Number(safeStorageGet(localStorage, ADMIN_KEY_REMEMBER_UNTIL) || 0);
    if (remembered && until > Date.now()) {
        safeStorageSet(sessionStorage, ADMIN_KEY_STORAGE, remembered);
        return remembered;
    }
    if (remembered) { // 过期即清，避免密钥无限期残留
        safeStorageRemove(localStorage, ADMIN_KEY_REMEMBER_KEY);
        safeStorageRemove(localStorage, ADMIN_KEY_REMEMBER_UNTIL);
    }
    return null;
}

// 存密钥：remember=true 时按 30 天 TTL 写 localStorage（手机端免重复输入）
function storeAdminKey(key, remember) {
    safeStorageSet(sessionStorage, ADMIN_KEY_STORAGE, key);
    if (remember) {
        safeStorageSet(localStorage, ADMIN_KEY_REMEMBER_KEY, key);
        safeStorageSet(localStorage, ADMIN_KEY_REMEMBER_UNTIL,
            String(Date.now() + ADMIN_KEY_REMEMBER_DAYS * 24 * 60 * 60 * 1000));
    }
}

function clearAdminKey() {
    safeStorageRemove(sessionStorage, ADMIN_KEY_STORAGE);
    safeStorageRemove(localStorage, ADMIN_KEY_REMEMBER_KEY);
    safeStorageRemove(localStorage, ADMIN_KEY_REMEMBER_UNTIL);
}

function hasRememberedAdminKey() {
    const remembered = safeStorageGet(localStorage, ADMIN_KEY_REMEMBER_KEY);
    const until = Number(safeStorageGet(localStorage, ADMIN_KEY_REMEMBER_UNTIL) || 0);
    return !!(remembered && until > Date.now());
}

// ---- 密钥输入模态框（admin.html #adminKeyModal，移动端为底部 Sheet）----
let adminKeyModalResolver = null;

function showAdminKeyModal(message) {
    const modal = document.getElementById('adminKeyModal');
    const input = document.getElementById('akInput');
    if (!modal || !input) return Promise.resolve(null);
    const msg = document.getElementById('akMsg');
    if (msg) {
        msg.textContent = message || '输入男人宝管理密钥以执行审核操作';
        msg.classList.toggle('ak-error', !!message);
    }
    const remember = document.getElementById('akRemember');
    if (remember) remember.checked = true;
    input.value = '';
    input.type = 'password';
    modal.hidden = false;
    setTimeout(() => input.focus(), 50);
    return new Promise((resolve) => { adminKeyModalResolver = resolve; });
}

function closeAdminKeyModal(key) {
    const modal = document.getElementById('adminKeyModal');
    if (modal) modal.hidden = true;
    const resolve = adminKeyModalResolver;
    adminKeyModalResolver = null;
    if (resolve) resolve(key);
}

function initAdminKeyModal() {
    const modal = document.getElementById('adminKeyModal');
    if (!modal) return;
    const input = document.getElementById('akInput');
    const confirmBtn = document.getElementById('akConfirm');
    const cancelBtn = document.getElementById('akCancel');
    const toggleBtn = document.getElementById('akToggle');
    const remember = document.getElementById('akRemember');

    const submit = () => {
        const key = (input.value || '').trim();
        if (!key) { input.focus(); return; }
        storeAdminKey(key, !!(remember && remember.checked));
        window.dispatchEvent(new Event('nrb:adminkey:changed'));
        closeAdminKeyModal(key);
    };
    confirmBtn.addEventListener('click', submit);
    cancelBtn.addEventListener('click', () => closeAdminKeyModal(null));
    const mask = modal.querySelector('.ak-mask');
    if (mask) mask.addEventListener('click', () => closeAdminKeyModal(null));
    if (toggleBtn) toggleBtn.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    // 粘贴/自动填充满 64 位 hex 即自动提交——从邮件复制密钥最省事
    input.addEventListener('input', () => {
        if (/^[0-9a-fA-F]{64}$/.test((input.value || '').trim())) submit();
    });
}

// 「退出」按钮：仅在 remembered 密钥存在时可见，一键清除本机保存
function bindAdminKeyLogout() {
    const btn = document.getElementById('adminKeyLogout');
    if (!btn) return;
    const syncVisibility = () => {
        btn.style.display = hasRememberedAdminKey() ? '' : 'none';
    };
    btn.addEventListener('click', () => {
        clearAdminKey();
        showAlert('已清除本机保存的管理密钥', 'success');
        syncVisibility();
        showAdminKeyModal('请重新输入管理密钥');
    });
    window.addEventListener('nrb:adminkey:changed', syncVisibility);
    syncVisibility();
}

// 无已存密钥才弹框；有则直接复用（session / 本机记忆）
function ensureAdminKey(message) {
    const stored = readStoredAdminKey();
    if (stored) return Promise.resolve(stored);
    return showAdminKeyModal(message);
}

async function adminWrite(endpoint, body) {
    let key = await ensureAdminKey();
    if (!key) throw new Error('未提供管理密钥，操作已取消');
    let resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify(body)
    });
    // 401：密钥失效/被更换 → 清除存储，弹框重输并自动重试一次
    // （手机上不用退回再点一次审批按钮）
    if (resp.status === 401) {
        clearAdminKey();
        key = await ensureAdminKey('管理密钥无效或已更换，请重新输入');
        if (!key) throw new Error('管理密钥无效，操作已取消');
        resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
            body: JSON.stringify(body)
        });
        if (resp.status === 401) {
            clearAdminKey();
            throw new Error('管理密钥无效，请重新输入');
        }
    }
    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`操作失败: ${resp.status} ${resp.statusText} ${txt}`);
    }
    return resp.json();
}

// 按 data 形状路由到对应端点，调用方（performAction 等）签名与用法不变
async function mysqlUpdate(table, id, data) {
    if (data && Object.prototype.hasOwnProperty.call(data, 'review_status')) {
        const status = data.review_status;
        if (status !== 'approved' && status !== 'rejected') {
            throw new Error(`不支持的审核状态: ${status}`);
        }
        return adminWrite(API_ENDPOINTS.NANRENBAO_ADMIN_REVIEW || 'https://letmetry.cn/api/nanrenbao/admin/review', {
            table,
            id,
            action: status === 'approved' ? 'approve' : 'reject',
            reason: data.review_reason || undefined
        });
    }
    if (data && Object.prototype.hasOwnProperty.call(data, 'deleted')) {
        return adminWrite(API_ENDPOINTS.NANRENBAO_ADMIN_VISIBILITY || 'https://letmetry.cn/api/nanrenbao/admin/visibility', {
            table,
            id,
            deleted: data.deleted ? 1 : 0
        });
    }
    throw new Error('不支持的更新字段（仅限 review_status / deleted）');
}

async function mysqlDelete(table, id) {
    return adminWrite(API_ENDPOINTS.NANRENBAO_ADMIN_PURGE || 'https://letmetry.cn/api/nanrenbao/admin/purge', { table, id });
}

async function mysqlUpdateMany(table, ids, data) {
    const results = [];
    for (const id of ids) results.push(await mysqlUpdate(table, id, data));
    return results;
}

async function mysqlDeleteMany(table, ids) {
    const results = [];
    for (const id of ids) results.push(await mysqlDelete(table, id));
    return results;
}

// Read-only helper to collect ids for "all deleted" bulk ops.
async function fetchIdsWhere(table, whereSql) {
    const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: `SELECT id FROM ${table} ${whereSql}`, params: [] })
    });
    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`查询失败: ${resp.status} ${resp.statusText} ${txt}`);
    }
    const rows = await resp.json();
    return Array.isArray(rows) ? rows.map(r => r.id) : [];
}

async function updateReviewStatus(ids, status, reason = null) {
    const data = {
        review_status: status,
        review_reason: reason,
        reviewed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        reviewed_by: 'admin-panel'
    };
    return mysqlUpdateMany('beauty_images', ids, data);
}

/**
 * Fetch images for management table
 */
async function fetchImagesForManage(page = 1, perPage = 20, filter = 'all', query = '') {
    // Build SQL with basic filtering and pagination
    let where = buildReviewWhere(filter);

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
    const sql = `SELECT SQL_CALC_FOUND_ROWS id, image_url, view_count, created_at, deleted, review_status, review_reason, reviewed_at, reviewed_by, source_type, submitted_at FROM beauty_images ${where} ORDER BY submitted_at DESC, created_at DESC LIMIT ${perPage} OFFSET ${offset}`;

    const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params: [] })
    });

    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`Failed to fetch images: ${resp.status} ${resp.statusText} ${txt}`);
    }
    const rows = await resp.json();

    // Get total count
    const countResp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT FOUND_ROWS() as total', params: [] })
    });
    if (!countResp.ok) {
        const txt = await countResp.text().catch(() => '');
        throw new Error(`Failed to fetch total count: ${countResp.status} ${countResp.statusText} ${txt}`);
    }
    const countJson = await countResp.json();
    const total = Array.isArray(countJson) && countJson[0] && countJson[0].total ? parseInt(countJson[0].total, 10) : 0;

    return { rows, total };
}

function renderManageTable(rows, page, perPage, total) {
    const tbody = document.getElementById('imagesTbody');
    tbody.innerHTML = '';

    rows.forEach(row => {
        const tr = document.createElement('tr');
        const displayUrl = normalizeStoredImageUrl(row.image_url);
        tr.innerHTML = `
            <td style="padding:8px; vertical-align:middle;"><input type="checkbox" class="row-checkbox" data-id="${row.id}" /></td>
            <td style="padding:8px; vertical-align:middle;">${row.id}</td>
            <td style="padding:8px;"><div style="display:flex; gap:10px; align-items:center;"><img src="${displayUrl}" onclick="openLightbox('${displayUrl}')" style="width:80px; height:60px; object-fit:cover; border-radius:6px; cursor:zoom-in; border:1px solid rgba(0,0,0,.08);" /><div style="max-width:420px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${row.image_url}</div></div></td>
            <td style="padding:8px;">${row.view_count || 0}</td>
            <td style="padding:8px;">${formatReviewStatus(row)}</td>
            <td style="padding:8px;">${formatSubmissionMeta(row)}</td>
            <td style="padding:8px;">${row.review_reason || '-'}</td>
            <td style="padding:8px;">
                <button class="btn-primary" data-action="view" data-id="${row.id}" data-url="${displayUrl}">查看</button>
                ${row.review_status === 'approved' ? '' : `<button class="btn-secondary" data-action="approve" data-id="${row.id}" data-url="${displayUrl}">审核通过</button>`}
                ${row.review_status === 'rejected' ? '' : `<button class="btn-secondary" data-action="reject" data-id="${row.id}" data-url="${displayUrl}">驳回</button>`}
                <button class="btn-secondary" data-action="${row.deleted ? 'undelete' : 'delete'}" data-id="${row.id}" data-url="${displayUrl}">${row.deleted ? '取消删除' : '标记删除'}</button>
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
    // show loading state
    try {
        document.getElementById('manageStats').textContent = '加载中...';
        const tbody = document.getElementById('imagesTbody');
        if (tbody) tbody.innerHTML = '';

        const rowsResult = await fetchImagesForManage(manageState.page, manageState.perPage, manageState.filter, manageState.query);
        renderManageTable(rowsResult.rows, manageState.page, manageState.perPage, rowsResult.total);
    } catch (err) {
        console.error('加载图片列表失败:', err);
        addLog('加载图片列表失败: ' + (err.message || err), 'error');
        try { document.getElementById('manageStats').textContent = '加载失败'; } catch (e) {}
        showAlert('加载图片列表失败: ' + (err.message || err), 'error');
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
            const json = await mysqlUpdate('beauty_images', id, { deleted: setVal });
            addLog(`${action} id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadManagePage();
            return;
        }

        if (action === 'approve') {
            const json = await updateReviewStatus([id], 'approved', null);
            addLog(`approve id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadManagePage();
            return;
        }

        if (action === 'reject') {
            const reason = prompt('请输入驳回原因（将记录到审核备注）', '待补充人工审核说明');
            if (reason === null) return;
            const json = await updateReviewStatus([id], 'rejected', reason.trim() || '待补充人工审核说明');
            addLog(`reject id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadManagePage();
            return;
        }

        if (action === 'permadelete') {
            if (!confirm('确认永久删除？操作不可恢复')) return;
            const json = await mysqlDelete('beauty_images', id);
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
    // select all checkbox
    const selectAll = document.getElementById('selectAllCheckbox');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('#imagesTbody .row-checkbox').forEach(cb => cb.checked = checked);
        });
    }

    // helper to collect selected ids
    function getSelectedIds() {
        const ids = [];
        document.querySelectorAll('#imagesTbody .row-checkbox:checked').forEach(cb => {
            const id = parseInt(cb.getAttribute('data-id'), 10);
            if (!Number.isNaN(id)) ids.push(id);
        });
        return ids;
    }

    document.getElementById('bulkHideBtn').onclick = async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        if (!confirm(`确认将 ${ids.length} 项标记为隐藏（deleted=1）？`)) return;
        await mysqlUpdateMany('beauty_images', ids, { deleted: 1 });
        addLog('批量隐藏: 完成', 'info');
        resetManageSelections();
        loadManagePage();
    };

    document.getElementById('bulkShowBtn').onclick = async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        if (!confirm(`确认将 ${ids.length} 项标记为展示（deleted=0）？`)) return;
        await mysqlUpdateMany('beauty_images', ids, { deleted: 0 });
        addLog('批量展示: 完成', 'info');
        resetManageSelections();
        loadManagePage();
    };
    document.getElementById('bulkApproveBtn').onclick = async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        if (!confirm(`确认将 ${ids.length} 项审核通过吗？`)) return;
        const json = await updateReviewStatus(ids, 'approved', null);
        addLog('批量通过: ' + JSON.stringify(json), 'info');
        resetManageSelections();
        loadManagePage();
    };
    document.getElementById('bulkRejectBtn').onclick = async () => {
        const ids = getSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        const reason = prompt('请输入批量驳回原因', '待补充人工审核说明');
        if (reason === null) return;
        const json = await updateReviewStatus(ids, 'rejected', reason.trim() || '待补充人工审核说明');
        addLog('批量驳回: ' + JSON.stringify(json), 'info');
        resetManageSelections();
        loadManagePage();
    };
    document.getElementById('bulkUndeleteBtn').onclick = async () => {
        if (!confirm('确认批量取消删除（将 deleted=0）吗？')) return;
        const ids = await fetchIdsWhere('beauty_images', 'WHERE deleted = 1');
        if (ids.length === 0) { showAlert('没有已删除的记录', 'warning'); return; }
        await mysqlUpdateMany('beauty_images', ids, { deleted: 0 });
        addLog('批量取消删除: 完成', 'info');
        loadManagePage();
    };
    document.getElementById('bulkDeleteBtn').onclick = async () => {
        if (!confirm('确认批量永久删除页面上所有已选/已标记的数据？')) return;
        const ids = await fetchIdsWhere('beauty_images', 'WHERE deleted = 1');
        if (ids.length === 0) { showAlert('没有已删除的记录', 'warning'); return; }
        await mysqlDeleteMany('beauty_images', ids);
        addLog('批量永久删除: 完成', 'info');
        loadManagePage();
    };
}

// Initialize management UI handlers on load
window.addEventListener('DOMContentLoaded', () => {
    attachManageHandlers();
    initAdminKeyModal();
    bindAdminKeyLogout();
    // initial load
    loadManagePage();
    // 无已存密钥时预弹输入框：进页面先过一次，之后本会话/本机不再问
    if (!readStoredAdminKey()) showAdminKeyModal();
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

// ============================================================================
// BACK VIEW KILLER MANAGEMENT
// ============================================================================

// Back view images management state
const backviewManageState = {
    page: 1,
    perPage: 20,
    totalPages: 1,
    filter: 'pending',
    query: ''
};

// Back view images upload state
const backviewState = {
    isUploading: false,
    totalCount: 0,
    successCount: 0,
    errorCount: 0,
    skipCount: 0,
    logs: []
};

/**
 * Fetch back view images for management table
 */
async function fetchBackviewImagesForManage(page = 1, perPage = 20, filter = 'all', query = '') {
    let where = 'WHERE 1=1';
    if (filter === 'visible') where = "WHERE deleted = 0 AND review_status = 'approved'";
    if (filter === 'deleted') where = 'WHERE deleted = 1';
    if (filter === 'pending') where = "WHERE review_status = 'pending'";
    if (filter === 'approved') where = "WHERE review_status = 'approved'";
    if (filter === 'rejected') where = "WHERE review_status = 'rejected'";

    if (query && query.trim()) {
        const q = query.trim();
        if (/^\d+$/.test(q)) {
            where += ` AND id = ${parseInt(q, 10)}`;
        } else {
            const safe = q.replace(/'/g, "\\'");
            where += ` AND (back_image_url LIKE '%${safe}%' OR front_image_url LIKE '%${safe}%')`;
        }
    }

    const offset = (page - 1) * perPage;
    const sql = `SELECT SQL_CALC_FOUND_ROWS id, back_image_url, front_image_url, click_count, created_at, deleted, review_status, review_reason, reviewed_at, reviewed_by, source_type, submitted_at FROM back_view_images ${where} ORDER BY submitted_at DESC, created_at DESC LIMIT ${perPage} OFFSET ${offset}`;

    const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, params: [] })
    });

    if (!resp.ok) {
        const txt = await resp.text().catch(() => '');
        throw new Error(`Failed to fetch back view images: ${resp.status} ${resp.statusText} ${txt}`);
    }
    const rows = await resp.json();

    // Get total count
    const countResp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: 'SELECT FOUND_ROWS() as total', params: [] })
    });
    if (!countResp.ok) {
        const txt = await countResp.text().catch(() => '');
        throw new Error(`Failed to fetch total count: ${countResp.status} ${countResp.statusText} ${txt}`);
    }
    const countJson = await countResp.json();
    const total = Array.isArray(countJson) && countJson[0] && countJson[0].total ? parseInt(countJson[0].total, 10) : 0;

    return { rows, total };
}

function renderBackviewManageTable(rows, page, perPage, total) {
    const tbody = document.getElementById('backviewImagesTbody');
    tbody.innerHTML = '';

    rows.forEach(row => {
        const tr = document.createElement('tr');
        const backDisplayUrl = normalizeStoredImageUrl(row.back_image_url);
        const frontDisplayUrl = normalizeStoredImageUrl(row.front_image_url);
        tr.innerHTML = `
            <td style="padding:8px; vertical-align:middle;"><input type="checkbox" class="backview-row-checkbox" data-id="${row.id}" /></td>
            <td style="padding:8px; vertical-align:middle;">${row.id}</td>
            <td style="padding:8px;"><div style="display:flex; gap:10px; align-items:center;"><img src="${backDisplayUrl}" onclick="openLightbox('${backDisplayUrl}')" style="width:80px; height:60px; object-fit:cover; border-radius:6px; cursor:zoom-in; border:1px solid rgba(0,0,0,.08);" /><div style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${row.back_image_url}</div></div></td>
            <td style="padding:8px;"><div style="display:flex; gap:10px; align-items:center;"><img src="${frontDisplayUrl}" onclick="openLightbox('${frontDisplayUrl}')" style="width:80px; height:60px; object-fit:cover; border-radius:6px; cursor:zoom-in; border:1px solid rgba(0,0,0,.08);" /><div style="max-width:320px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${row.front_image_url}</div></div></td>
            <td style="padding:8px;">${row.click_count || 0}</td>
            <td style="padding:8px;">${formatReviewStatus(row)}</td>
            <td style="padding:8px;">${formatSubmissionMeta(row)}</td>
            <td style="padding:8px;">
                <button class="btn-primary" data-action="view" data-back-url="${backDisplayUrl}" data-front-url="${frontDisplayUrl}">查看</button>
                ${row.review_status === 'approved' ? '' : '<button class="btn-secondary" data-action="approve" data-id="' + row.id + '">审核通过</button>'}
                ${row.review_status === 'rejected' ? '' : '<button class="btn-secondary" data-action="reject" data-id="' + row.id + '">驳回</button>'}
                <button class="btn-secondary" data-action="${row.deleted ? 'undelete' : 'delete'}" data-id="${row.id}">${row.deleted ? '取消删除' : '标记删除'}</button>
                <button class="btn-secondary" data-action="permadelete" data-id="${row.id}">永久删除</button>
            </td>
        `;

        tbody.appendChild(tr);
    });

    document.getElementById('backviewManageStats').textContent = `共 ${total} 条，当前第 ${page} 页`;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    backviewManageState.totalPages = totalPages;
    document.getElementById('backviewPageInfo').textContent = `${page} / ${totalPages}`;
}

async function loadBackviewManagePage() {
    try {
        document.getElementById('backviewManageStats').textContent = '加载中...';
        const tbody = document.getElementById('backviewImagesTbody');
        if (tbody) tbody.innerHTML = '';

        const rowsResult = await fetchBackviewImagesForManage(backviewManageState.page, backviewManageState.perPage, backviewManageState.filter, backviewManageState.query);
        renderBackviewManageTable(rowsResult.rows, backviewManageState.page, backviewManageState.perPage, rowsResult.total);
    } catch (err) {
        console.error('加载背影杀图片列表失败:', err);
        addBackviewLog('加载背影杀图片列表失败: ' + (err.message || err), 'error');
        try { document.getElementById('backviewManageStats').textContent = '加载失败'; } catch (e) {}
        showAlert('加载背影杀图片列表失败: ' + (err.message || err), 'error');
    }
}

async function updateBackviewReviewStatus(ids, status, reason = null) {
    const data = {
        review_status: status,
        review_reason: reason,
        reviewed_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        reviewed_by: 'admin-panel'
    };
    return mysqlUpdateMany('back_view_images', ids, data);
}

async function performBackviewAction(action, id, backUrl, frontUrl) {
    try {
        if (action === 'view') {
            // Open both images in new tabs
            window.open(backUrl, '_blank');
            setTimeout(() => window.open(frontUrl, '_blank'), 100);
            return;
        }

        if (action === 'delete' || action === 'undelete') {
            const setVal = action === 'delete' ? 1 : 0;
            const json = await mysqlUpdate('back_view_images', id, { deleted: setVal });
            addBackviewLog(`${action} id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadBackviewManagePage();
            return;
        }

        if (action === 'approve' || action === 'reject') {
            let reason = null;
            if (action === 'reject') {
                reason = prompt('请输入驳回原因', '待补充人工审核说明');
                if (reason === null) return;
                reason = reason.trim() || '待补充人工审核说明';
            }
            const json = await updateBackviewReviewStatus([id], action === 'approve' ? 'approved' : 'rejected', reason);
            addBackviewLog(`${action} id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadBackviewManagePage();
            return;
        }

        if (action === 'permadelete') {
            if (!confirm('确认永久删除？操作不可恢复')) return;
            const json = await mysqlDelete('back_view_images', id);
            addBackviewLog(`permadelete id=${id} result: ${JSON.stringify(json)}`, 'info');
            await loadBackviewManagePage();
            return;
        }
    } catch (err) {
        console.error('Action failed:', err);
        addBackviewLog('操作失败: ' + (err.message || err), 'error');
    }
}

function attachBackviewManageHandlers() {
    document.getElementById('backviewRefreshBtn').onclick = () => { 
        backviewManageState.page = 1; 
        backviewManageState.query = document.getElementById('backviewSearchInput').value; 
        backviewManageState.filter = document.getElementById('backviewFilterSelect').value; 
        loadBackviewManagePage(); 
    };
    document.getElementById('backviewPrevPageBtn').onclick = () => { 
        if (backviewManageState.page > 1) { 
            backviewManageState.page--; 
            loadBackviewManagePage(); 
        } 
    };
    document.getElementById('backviewNextPageBtn').onclick = () => { 
        if (backviewManageState.page < backviewManageState.totalPages) { 
            backviewManageState.page++; 
            loadBackviewManagePage(); 
        } 
    };
    document.getElementById('backviewImagesTable').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const backUrl = btn.getAttribute('data-back-url');
        const frontUrl = btn.getAttribute('data-front-url');
        performBackviewAction(action, id, backUrl, frontUrl);
    });

    // Select all checkbox
    const selectAll = document.getElementById('backviewSelectAllCheckbox');
    if (selectAll) {
        selectAll.addEventListener('change', (e) => {
            const checked = e.target.checked;
            document.querySelectorAll('#backviewImagesTbody .backview-row-checkbox').forEach(cb => cb.checked = checked);
        });
    }

    // Helper to collect selected ids
    function getBackviewSelectedIds() {
        const ids = [];
        document.querySelectorAll('#backviewImagesTbody .backview-row-checkbox:checked').forEach(cb => {
            const id = parseInt(cb.getAttribute('data-id'), 10);
            if (!Number.isNaN(id)) ids.push(id);
        });
        return ids;
    }

    document.getElementById('backviewBulkApproveBtn').onclick = async () => {
        const ids = getBackviewSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        if (!confirm(`确认将 ${ids.length} 项审核通过吗？`)) return;
        const json = await updateBackviewReviewStatus(ids, 'approved', null);
        addBackviewLog('批量通过: ' + JSON.stringify(json), 'info');
        document.getElementById('backviewSelectAllCheckbox').checked = false;
        loadBackviewManagePage();
    };

    document.getElementById('backviewBulkRejectBtn').onclick = async () => {
        const ids = getBackviewSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        const reason = prompt('请输入批量驳回原因', '待补充人工审核说明');
        if (reason === null) return;
        const json = await updateBackviewReviewStatus(ids, 'rejected', reason.trim() || '待补充人工审核说明');
        addBackviewLog('批量驳回: ' + JSON.stringify(json), 'info');
        document.getElementById('backviewSelectAllCheckbox').checked = false;
        loadBackviewManagePage();
    };

    document.getElementById('backviewBulkHideBtn').onclick = async () => {
        const ids = getBackviewSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        if (!confirm(`确认将 ${ids.length} 项标记为隐藏（deleted=1）？`)) return;
        await mysqlUpdateMany('back_view_images', ids, { deleted: 1 });
        addBackviewLog('批量隐藏: 完成', 'info');
        document.getElementById('backviewSelectAllCheckbox').checked = false;
        loadBackviewManagePage();
    };

    document.getElementById('backviewBulkShowBtn').onclick = async () => {
        const ids = getBackviewSelectedIds();
        if (ids.length === 0) { showAlert('请先选择至少一项', 'warning'); return; }
        if (!confirm(`确认将 ${ids.length} 项标记为展示（deleted=0）？`)) return;
        await mysqlUpdateMany('back_view_images', ids, { deleted: 0 });
        addBackviewLog('批量展示: 完成', 'info');
        document.getElementById('backviewSelectAllCheckbox').checked = false;
        loadBackviewManagePage();
    };

    document.getElementById('backviewBulkUndeleteBtn').onclick = async () => {
        if (!confirm('确认批量取消删除（将 deleted=0）吗？')) return;
        const ids = await fetchIdsWhere('back_view_images', 'WHERE deleted = 1');
        if (ids.length === 0) { showAlert('没有已删除的记录', 'warning'); return; }
        await mysqlUpdateMany('back_view_images', ids, { deleted: 0 });
        addBackviewLog('批量取消删除: 完成', 'info');
        loadBackviewManagePage();
    };

    document.getElementById('backviewBulkDeleteBtn').onclick = async () => {
        if (!confirm('确认批量永久删除页面上所有已选/已标记的数据？')) return;
        const ids = await fetchIdsWhere('back_view_images', 'WHERE deleted = 1');
        if (ids.length === 0) { showAlert('没有已删除的记录', 'warning'); return; }
        await mysqlDeleteMany('back_view_images', ids);
        addBackviewLog('批量永久删除: 完成', 'info');
        loadBackviewManagePage();
    };
}

/**
 * Add log entry for backview upload
 */
function addBackviewLog(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('zh-CN');
    const logEntry = {
        timestamp,
        message,
        type
    };
    
    backviewState.logs.push(logEntry);
    
    const logContainer = document.getElementById('backviewLogContainer');
    const logDiv = document.createElement('div');
    logDiv.className = `log-entry ${type}`;
    logDiv.textContent = `[${timestamp}] ${message}`;
    
    logContainer.appendChild(logDiv);
    logContainer.scrollTop = logContainer.scrollHeight;
}

/**
 * Update backview statistics display
 */
function updateBackviewStats() {
    document.getElementById('backviewTotalCount').textContent = backviewState.totalCount;
    document.getElementById('backviewSuccessCount').textContent = backviewState.successCount;
    document.getElementById('backviewErrorCount').textContent = backviewState.errorCount;
    document.getElementById('backviewSkipCount').textContent = backviewState.skipCount;
    
    const progress = backviewState.totalCount > 0 
        ? Math.round(((backviewState.successCount + backviewState.errorCount + backviewState.skipCount) / backviewState.totalCount) * 100)
        : 0;
    
    const progressBar = document.getElementById('backviewProgressBar');
    progressBar.style.width = `${progress}%`;
    progressBar.textContent = `${progress}%`;
}

/**
 * Parse URL pairs from textarea input
 */
function parseBackviewUrlPairs(input) {
    const lines = input.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const pairs = [];
    const invalid = [];
    
    lines.forEach((line, index) => {
        // Split by comma or space
        const parts = line.split(/[,\s]+/).filter(p => p.length > 0);
        
        if (parts.length !== 2) {
            invalid.push({
                line: index + 1,
                text: line,
                reason: '每行必须包含两个URL（背影和正面）'
            });
            return;
        }
        
        const [backUrl, frontUrl] = parts;
        const backValidation = validateImageUrl(backUrl);
        const frontValidation = validateImageUrl(frontUrl);
        
        if (!backValidation.valid) {
            invalid.push({
                line: index + 1,
                url: backUrl,
                reason: `背影URL无效: ${backValidation.error}`
            });
            return;
        }
        
        if (!frontValidation.valid) {
            invalid.push({
                line: index + 1,
                url: frontUrl,
                reason: `正面URL无效: ${frontValidation.error}`
            });
            return;
        }
        
        pairs.push({ backUrl, frontUrl });
    });
    
    // Remove duplicates based on both URLs
    const uniquePairs = [];
    const seen = new Set();
    pairs.forEach(pair => {
        const key = `${pair.backUrl}|${pair.frontUrl}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniquePairs.push(pair);
        }
    });
    
    return {
        valid: uniquePairs,
        invalid,
        duplicatesRemoved: pairs.length - uniquePairs.length
    };
}

/**
 * Insert a back view image pair into the database
 */
async function insertBackviewImagePair(backUrl, frontUrl) {
    try {
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const response = await fetch(API_ENDPOINTS.MYSQL_INSERT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'back_view_images',
                data: { back_image_url: backUrl, front_image_url: frontUrl, created_at: createdAt }
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return { success: true, data: result };
    } catch (error) {
        console.error('Insert error:', error);
        
        const errorMsg = error.message.toLowerCase();
        if (errorMsg.includes('duplicate') || errorMsg.includes('unique')) {
            return { success: false, error: error.message, isDuplicate: true };
        }
        
        return { success: false, error: error.message, isDuplicate: false };
    }
}

/**
 * Process batch upload of backview image pairs
 */
async function processBackviewBatchUpload(pairs) {
    backviewState.totalCount = pairs.length;
    backviewState.successCount = 0;
    backviewState.errorCount = 0;
    backviewState.skipCount = 0;
    
    addBackviewLog(`开始批量上传 ${pairs.length} 对背影杀图片...`, 'info');
    
    for (let i = 0; i < pairs.length; i++) {
        const { backUrl, frontUrl } = pairs[i];
        addBackviewLog(`正在上传 (${i + 1}/${pairs.length}): 背影=${backUrl.substring(0, 30)}... 正面=${frontUrl.substring(0, 30)}...`, 'info');
        
        const result = await insertBackviewImagePair(backUrl, frontUrl);
        
        if (result.success) {
            backviewState.successCount++;
            addBackviewLog(`✓ 成功`, 'success');
        } else if (result.isDuplicate) {
            backviewState.skipCount++;
            addBackviewLog(`⊘ 跳过 (已存在)`, 'info');
        } else {
            backviewState.errorCount++;
            addBackviewLog(`✗ 失败: ${result.error}`, 'error');
        }
        
        updateBackviewStats();
        
        if (i < pairs.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
    
    addBackviewLog('批量上传完成！', 'info');
    showAlert(
        `上传完成！成功: ${backviewState.successCount}, 失败: ${backviewState.errorCount}, 跳过: ${backviewState.skipCount}`,
        backviewState.errorCount === 0 ? 'success' : 'warning'
    );
}

/**
 * Start backview batch upload process
 */
window.startBackviewBatchUpload = async function() {
    if (backviewState.isUploading) {
        showAlert('上传正在进行中，请等待完成', 'warning');
        return;
    }
    
    const urlInput = document.getElementById('backviewUrlInput');
    const input = urlInput.value.trim();
    
    if (!input) {
        showAlert('请输入至少一对URL', 'error');
        return;
    }
    
    const parsed = parseBackviewUrlPairs(input);
    
    if (parsed.valid.length === 0) {
        showAlert('没有找到有效的URL对', 'error');
        if (parsed.invalid.length > 0) {
            addBackviewLog(`发现 ${parsed.invalid.length} 个无效URL对`, 'error');
            parsed.invalid.slice(0, 5).forEach(item => {
                addBackviewLog(`第 ${item.line} 行: ${item.reason}`, 'error');
            });
        }
        return;
    }
    
    const statusPanel = document.getElementById('backviewStatusPanel');
    statusPanel.style.display = 'block';
    
    const logContainer = document.getElementById('backviewLogContainer');
    logContainer.innerHTML = '';
    backviewState.logs = [];
    
    addBackviewLog(`解析完成: 找到 ${parsed.valid.length} 对有效URL`, 'info');
    
    if (parsed.duplicatesRemoved > 0) {
        addBackviewLog(`去重: 移除 ${parsed.duplicatesRemoved} 对重复URL`, 'info');
    }
    
    if (parsed.invalid.length > 0) {
        addBackviewLog(`跳过: ${parsed.invalid.length} 对无效URL`, 'info');
        backviewState.skipCount = parsed.invalid.length;
        updateBackviewStats();
    }
    
    const confirmMsg = `准备上传 ${parsed.valid.length} 对背影杀图片，是否继续？`;
    if (!confirm(confirmMsg)) {
        addBackviewLog('用户取消上传', 'info');
        return;
    }
    
    backviewState.isUploading = true;
    const uploadBtn = document.getElementById('backviewUploadBtn');
    uploadBtn.disabled = true;
    uploadBtn.textContent = '⏳ 上传中...';
    
    try {
        await processBackviewBatchUpload(parsed.valid);
    } catch (error) {
        console.error('Batch upload error:', error);
        showAlert(`批量上传出错: ${error.message}`, 'error');
        addBackviewLog(`错误: ${error.message}`, 'error');
    } finally {
        backviewState.isUploading = false;
        uploadBtn.disabled = false;
        uploadBtn.textContent = '📤 开始批量上传';
    }
};

/**
 * Clear backview input and reset state
 */
window.clearBackviewInput = function() {
    if (backviewState.isUploading) {
        showAlert('上传正在进行中，无法清空', 'warning');
        return;
    }
    
    const urlInput = document.getElementById('backviewUrlInput');
    urlInput.value = '';
    
    const statusPanel = document.getElementById('backviewStatusPanel');
    statusPanel.style.display = 'none';
    
    backviewState.totalCount = 0;
    backviewState.successCount = 0;
    backviewState.errorCount = 0;
    backviewState.skipCount = 0;
    backviewState.logs = [];
    
    updateBackviewStats();
    
    const logContainer = document.getElementById('backviewLogContainer');
    logContainer.innerHTML = '';
};

// Initialize backview management UI handlers
window.addEventListener('DOMContentLoaded', () => {
    attachBackviewManageHandlers();
    // Don't load initially - wait for user to switch to the tab
});

// Expose loadBackviewManagePage globally for tab switching
window.loadBackviewManagePage = loadBackviewManagePage;
