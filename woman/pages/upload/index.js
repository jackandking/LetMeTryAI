import { navigateToPage, version } from '../../utils/app.js';
import { queryDatabase, insertRecord } from '../../../util/mysql-util.js';
import { generateInnovativePrompt } from '../../../util/ai_utils.js';

function $(sel) { return document.querySelector(sel); }

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

function loadBasePrompt() {
  setMsg('加载中...');
  const sql = 'SELECT prompt FROM ks_woman_photos ORDER BY vote_count DESC LIMIT 1';
  queryDatabase(sql, [], (err, results) => {
    if (err) {
      setMsg('加载失败', true);
      return;
    }
    const base = Array.isArray(results) && results[0]?.prompt ? String(results[0].prompt).replace(/"/g, '') : '';
    const promptEl = $('#prompt');
    if (promptEl) promptEl.value = base;
    if (base) {
      regenerate(base);
    } else {
      setMsg('暂无建议，可直接填写 URL 提交');
    }
  });
}

function regenerate(basePrompt) {
  const promptEl = $('#prompt');
  const source = basePrompt ?? (promptEl?.value || '');
  if (!source) return;
  setMsg('AI 生成中...');
  generateInnovativePrompt(source, 0.1, (err, newPrompt) => {
    if (err) {
      setMsg('AI 生成失败，使用原始 Prompt', true);
      if (promptEl) promptEl.value = source;
      return;
    }
    if (promptEl) promptEl.value = String(newPrompt).replace(/"/g, '');
    setMsg('');
  });
}

function copyPrompt() {
  const text = $('#prompt')?.value || '';
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => setMsg('已复制到剪贴板'), () => setMsg('复制失败', true));
}

function submit() {
  const url = $('#url')?.value?.trim();
  const prompt = $('#prompt')?.value?.trim();
  if (!prompt || !url) {
    setMsg('请等待 Prompt 生成并填写 URL', true);
    return;
  }
  const data = { prompt, url, vote_count: 0, devote_count: 0 };
  insertRecord('ks_woman_photos', data, (err, insertId) => {
    if (err) {
      setMsg('保存失败', true);
      return;
    }
    setMsg(`保存成功 #${insertId || ''}`);
    const input = $('#url');
    if (input) input.value = '';
  });
}

function bindUI() {
  $('#back')?.addEventListener('click', () => navigateToPage('/pages/index/index'));
  $('#copy')?.addEventListener('click', copyPrompt);
  $('#regen')?.addEventListener('click', () => regenerate());
  $('#submit')?.addEventListener('click', submit);
}

function init() {
  setVersion();
  bindUI();
  loadBasePrompt();
}

init();
