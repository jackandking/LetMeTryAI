// review.js — 女人宝审核工作台（快手上线要求：用户投稿先审后展示）
// 独立于批量上传模块；只通过 /api/womanai/admin/* 专用端点写库。
import { API_ENDPOINTS } from '../util/config.js';

const REVIEW_KEY_STORAGE = 'wnb_admin_key';        // sessionStorage：本会话
const REVIEW_KEY_REMEMBER = 'wnb_admin_key_remembered';
const REVIEW_KEY_UNTIL = 'wnb_admin_key_until';
const REMEMBER_DAYS = 30;

const reviewState = {
    filter: 'pending',
    page: 1,
    perPage: 20,
    totalPages: 1,
    selected: new Set()
};

function safeGet(store, key) { try { return store.getItem(key); } catch (e) { return null; } }
function safeSet(store, key, value) { try { store.setItem(key, value); } catch (e) { /* 隐私模式忽略 */ } }
function safeRemove(store, key) { try { store.removeItem(key); } catch (e) { /* ignore */ } }

function readStoredKey() {
    const session = safeGet(sessionStorage, REVIEW_KEY_STORAGE);
    if (session) return session;
    const remembered = safeGet(localStorage, REVIEW_KEY_REMEMBER);
    const until = Number(safeGet(localStorage, REVIEW_KEY_UNTIL) || 0);
    if (remembered && until > Date.now()) {
        safeSet(sessionStorage, REVIEW_KEY_STORAGE, remembered);
        return remembered;
    }
    if (remembered) {
        safeRemove(localStorage, REVIEW_KEY_REMEMBER);
        safeRemove(localStorage, REVIEW_KEY_UNTIL);
    }
    return null;
}

function storeKey(key, remember) {
    safeSet(sessionStorage, REVIEW_KEY_STORAGE, key);
    if (remember) {
        safeSet(localStorage, REVIEW_KEY_REMEMBER, key);
        safeSet(localStorage, REVIEW_KEY_UNTIL, String(Date.now() + REMEMBER_DAYS * 86400000));
    }
}

function clearKey() {
    safeRemove(sessionStorage, REVIEW_KEY_STORAGE);
    safeRemove(localStorage, REVIEW_KEY_REMEMBER);
    safeRemove(localStorage, REVIEW_KEY_UNTIL);
}

let keyModalResolver = null;
function showKeyModal(message) {
    const modal = document.getElementById('reviewKeyModal');
    const input = document.getElementById('rvkInput');
    if (!modal || !input) return Promise.resolve(null);
    const msg = document.getElementById('rvkMsg');
    if (msg) {
        msg.textContent = message || '输入女人宝管理密钥以执行审核操作';
        msg.classList.toggle('rvk-error', !!message);
    }
    input.value = '';
    modal.hidden = false;
    modal.style.display = 'flex';
    setTimeout(() => input.focus(), 50);
    return new Promise((resolve) => { keyModalResolver = resolve; });
}

function closeKeyModal(key) {
    const modal = document.getElementById('reviewKeyModal');
    if (modal) { modal.hidden = true; modal.style.display = 'none'; }
    const resolve = keyModalResolver;
    keyModalResolver = null;
    if (resolve) resolve(key);
}

function initKeyModal() {
    const modal = document.getElementById('reviewKeyModal');
    if (!modal) return;
    const input = document.getElementById('rvkInput');
    const confirm = document.getElementById('rvkConfirm');
    const cancel = document.getElementById('rvkCancel');
    const remember = document.getElementById('rvkRemember');
    const submit = () => {
        const key = (input.value || '').trim();
        if (!key) { input.focus(); return; }
        storeKey(key, !!(remember && remember.checked));
        closeKeyModal(key);
    };
    confirm.addEventListener('click', submit);
    cancel.addEventListener('click', () => closeKeyModal(null));
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
    input.addEventListener('input', () => {
        if (/^[0-9a-fA-F]{64}$/.test((input.value || '').trim())) submit();
    });
    const logout = document.getElementById('reviewKeyLogout');
    if (logout) {
        const sync = () => { logout.style.display = safeGet(localStorage, REVIEW_KEY_REMEMBER) ? '' : 'none'; };
        logout.addEventListener('click', () => {
            clearKey();
            sync();
            showKeyModal('已清除本机保存的密钥，请重新输入');
        });
        window.addEventListener('wnb:adminkey:changed', sync);
        sync();
    }
}

async function ensureKey(message) {
    const stored = readStoredKey();
    return stored || showKeyModal(message);
}

async function adminWrite(endpoint, body) {
    let key = await ensureKey();
    if (!key) throw new Error('未提供管理密钥，操作已取消');
    let resp = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
        body: JSON.stringify(body)
    });
    if (resp.status === 401) {
        clearKey();
        key = await ensureKey('管理密钥无效或已更换，请重新输入');
        if (!key) throw new Error('管理密钥无效，操作已取消');
        resp = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
            body: JSON.stringify(body)
        });
    }
    if (!resp.ok) throw new Error(`操作失败: ${resp.status} ${resp.statusText}`);
    return resp.json();
}

function reviewWrite(id, action, reason) {
    return adminWrite(API_ENDPOINTS.WOMANAI_ADMIN_REVIEW || 'https://letmetry.cn/api/womanai/admin/review', {
        id, action, reason
    });
}

function visibilityWrite(id, deleted) {
    return adminWrite(API_ENDPOINTS.WOMANAI_ADMIN_VISIBILITY || 'https://letmetry.cn/api/womanai/admin/visibility', {
        id, deleted
    });
}

function statusLabel(row) {
    const status = (row.review_status || 'pending');
    const map = {
        pending: '<span style="color:#e69100;font-weight:bold;">待审核</span>',
        approved: '<span style="color:#2e7d32;font-weight:bold;">已通过</span>',
        rejected: '<span style="color:#c62828;font-weight:bold;">已驳回</span>'
    };
    const visible = row.deleted
        ? '<span style="color:#999;">已隐藏</span>'
        : status === 'approved' ? '<span style="color:#1565c0;">可展示</span>' : '<span style="color:#999;">不展示</span>';
    return `${map[status] || map.pending}<br>${visible}`;
}

function metaLabel(row) {
    const source = ({ legacy: '存量', url: 'URL投稿', local_file: '本地上传', automation: '自动生成' })[row.source_type] || row.source_type || '-';
    return `${source}<br><span style="font-size:0.85em;color:#777;">${row.submitted_at || row.created_at || '-'}</span>`;
}

function buildWhere(filter) {
    if (filter === 'pending') return "WHERE review_status = 'pending'";
    if (filter === 'approved') return "WHERE review_status = 'approved'";
    if (filter === 'rejected') return "WHERE review_status = 'rejected'";
    if (filter === 'hidden') return 'WHERE deleted = 1';
    return '';
}

async function loadReviewList() {
    const tbody = document.getElementById('reviewTableBody');
    const info = document.getElementById('reviewPageInfo');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">加载中…</td></tr>';
    try {
        const where = buildWhere(reviewState.filter);
        const offset = (reviewState.page - 1) * reviewState.perPage;
        const sql = `SELECT SQL_CALC_FOUND_ROWS id, image_url, review_status, review_reason, reviewed_at, source_type, submitted_at, created_at, deleted FROM handsome_images ${where} ORDER BY submitted_at DESC, created_at DESC LIMIT ${reviewState.perPage} OFFSET ${offset}`;
        const resp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql, params: [] })
        });
        const rows = await resp.json();
        if (!Array.isArray(rows)) throw new Error('列表加载失败');
        reviewState.selected.clear();
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">没有符合条件的图片</td></tr>';
        } else {
            tbody.innerHTML = rows.map(row => `
                <tr>
                    <td><input type="checkbox" class="rv-select" data-id="${row.id}"></td>
                    <td><a href="${row.image_url}" target="_blank" rel="noopener" title="点击查看原图">#${row.id} 预览</a></td>
                    <td><img src="${row.image_url}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:6px;" loading="lazy"></td>
                    <td>${statusLabel(row)}</td>
                    <td>${metaLabel(row)}</td>
                    <td style="max-width:180px;word-break:break-all;font-size:0.85em;">${row.review_reason || '-'}</td>
                    <td style="white-space:nowrap;">
                        ${row.review_status !== 'approved' ? `<button class="rv-btn rv-approve" data-id="${row.id}">通过</button>` : ''}
                        ${row.review_status !== 'rejected' ? `<button class="rv-btn rv-reject" data-id="${row.id}">驳回</button>` : ''}
                        <button class="rv-btn rv-hide" data-id="${row.id}" data-deleted="${row.deleted ? 0 : 1}">${row.deleted ? '恢复' : '隐藏'}</button>
                    </td>
                </tr>`).join('');
        }
        // 分页
        try {
            const countResp = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: 'SELECT FOUND_ROWS() AS total', params: [] })
            });
            const countRows = await countResp.json();
            const total = Number(countRows && countRows[0] && countRows[0].total || 0);
            reviewState.totalPages = Math.max(1, Math.ceil(total / reviewState.perPage));
            if (info) info.textContent = `第 ${reviewState.page} / ${reviewState.totalPages} 页 · 共 ${total} 条`;
        } catch (e) {
            if (info) info.textContent = `第 ${reviewState.page} 页`;
        }
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#c62828;padding:20px;">加载失败：${error.message}</td></tr>`;
    }
}

async function performReview(id, action) {
    let reason = null;
    if (action === 'reject') {
        reason = window.prompt('请输入驳回原因（将记录在审核备注中）', '内容不符合展示要求');
        if (reason === null) return;
        reason = reason.trim() || '内容不符合展示要求';
    }
    try {
        const res = await reviewWrite(id, action, reason);
        if (!res || !res.affectedRows) { alert('操作未生效，请刷新后重试'); return; }
        await loadReviewList();
    } catch (error) {
        alert(error.message);
    }
}

async function performVisibility(id, deleted) {
    try {
        const res = await visibilityWrite(id, deleted);
        if (!res || !res.affectedRows) { alert('操作未生效，请刷新后重试'); return; }
        await loadReviewList();
    } catch (error) {
        alert(error.message);
    }
}

function selectedIds() {
    return Array.from(document.querySelectorAll('.rv-select:checked')).map(el => Number(el.dataset.id));
}

async function batchReview(action) {
    const ids = selectedIds();
    if (!ids.length) { alert('请先勾选图片'); return; }
    if (!confirm(`确认将 ${ids.length} 张图片${action === 'approve' ? '审核通过' : '驳回'}吗？`)) return;
    let reason = null;
    if (action === 'reject') {
        reason = window.prompt('请输入批量驳回原因', '内容不符合展示要求');
        if (reason === null) return;
        reason = reason.trim() || '内容不符合展示要求';
    }
    let failed = 0;
    for (const id of ids) {
        try {
            const res = await reviewWrite(id, action, reason);
            if (!res || !res.affectedRows) failed++;
        } catch (e) { failed++; }
    }
    alert(failed ? `完成，${failed} 条失败` : `完成，${ids.length} 条已处理`);
    await loadReviewList();
}

function initReview() {
    initKeyModal();
    if (!document.getElementById('reviewTableBody')) return;
    document.getElementById('filterSelect').addEventListener('change', (e) => {
        reviewState.filter = e.target.value;
        reviewState.page = 1;
        loadReviewList();
    });
    document.getElementById('reviewPrev').addEventListener('click', () => {
        if (reviewState.page > 1) { reviewState.page--; loadReviewList(); }
    });
    document.getElementById('reviewNext').addEventListener('click', () => {
        if (reviewState.page < reviewState.totalPages) { reviewState.page++; loadReviewList(); }
    });
    document.getElementById('reviewRefresh').addEventListener('click', loadReviewList);
    document.getElementById('reviewBatchApprove').addEventListener('click', () => batchReview('approve'));
    document.getElementById('reviewBatchReject').addEventListener('click', () => batchReview('reject'));
    document.getElementById('reviewTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('button.rv-btn');
        if (!btn) return;
        if (btn.classList.contains('rv-approve')) performReview(Number(btn.dataset.id), 'approve');
        else if (btn.classList.contains('rv-reject')) performReview(Number(btn.dataset.id), 'reject');
        else if (btn.classList.contains('rv-hide')) performVisibility(Number(btn.dataset.id), Number(btn.dataset.deleted));
    });
    loadReviewList();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initReview);
} else {
    initReview();
}

export { initReview, loadReviewList, buildWhere, reviewWrite, visibilityWrite };
