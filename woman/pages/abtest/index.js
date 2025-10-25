import { navigateToPage, version } from '../../utils/app.js';
import { queryDatabase } from '../../../util/mysql-util.js';

function $(sel) { return document.querySelector(sel); }

const TABLES = {
  experiments: 'ks_woman_ab_experiments'
};

function setMsg(text, isError = false) {
  const el = $('#msg');
  if (!el) return;
  el.textContent = text || '';
  el.style.color = isError ? '#c00' : '#666';
}

function setVersion() {
  const el = $('#version');
  if (el) el.textContent = `Version: ${version}`;
}

function renderRows(items) {
  const tbody = $('#tbody');
  if (!tbody) return;
  if (!items || !items.length) {
    tbody.innerHTML = '<tr><td colspan="4">暂无实验</td></tr>';
    return;
  }
  tbody.innerHTML = items
    .map(
      (e) => `
      <tr>
        <td>${e.id}</td>
        <td>${e.name}</td>
        <td>${e.status}</td>
        <td class="actions">
          <button data-id="${e.id}" data-action="active" class="btn small">激活</button>
          <button data-id="${e.id}" data-action="inactive" class="btn small">停用</button>
          <button data-id="${e.id}" data-action="completed" class="btn small">完成</button>
        </td>
      </tr>`
    )
    .join('');
}

function loadExperiments() {
  const sql = `SELECT id, name, status FROM ${TABLES.experiments} ORDER BY created_at DESC`;
  setMsg('加载实验中...');
  queryDatabase(sql, [], (err, list) => {
    if (err) {
      setMsg('加载失败', true);
      renderRows([]);
      return;
    }
    setMsg('');
    renderRows(Array.isArray(list) ? list : []);
  });
}

function updateStatus(id, status) {
  if (!id || !status) return;
  const sql = `UPDATE ${TABLES.experiments} SET status = ? ${status === 'completed' ? ', end_date = NOW()' : ', end_date = NULL'} WHERE id = ?`;
  setMsg('更新中...');
  queryDatabase(sql, [status, id], (err) => {
    if (err) {
      setMsg('更新失败', true);
      return;
    }
    setMsg('已更新');
    loadExperiments();
  });
}

function bindUI() {
  $('#back')?.addEventListener('click', () => navigateToPage('/pages/index/index'));
  $('#tbody')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const action = btn.dataset.action;
    updateStatus(id, action);
  });
}

function init() {
  setVersion();
  bindUI();
  loadExperiments();
}

init();
