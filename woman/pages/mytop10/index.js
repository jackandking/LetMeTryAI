import { navigateToPage, version } from '../../utils/app.js';
import { getStorage } from '../../utils/storage.js';

function $(sel) { return document.querySelector(sel); }

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return minutes > 0 ? `${minutes}分${remaining}秒` : `${remaining}秒`;
}

function renderList() {
  const list = $('#list');
  const tip = $('#tip');
  const items = getStorage('topViewedPhotos') || [];
  if (!items.length) {
    tip.hidden = false;
    if (list) list.innerHTML = '';
    return;
  }
  tip.hidden = true;
  if (!list) return;
  list.innerHTML = items
    .map(
      (p, idx) => `
      <li>
        <span>${idx + 1}.</span>
        <img src="${p.url}" alt="photo" />
        <a href="${p.url}" target="_blank" rel="noopener">查看原图</a>
        <span class="duration">${formatDuration(p.duration)}</span>
      </li>`
    )
    .join('');
}

function init() {
  const back = $('#back');
  if (back) back.addEventListener('click', () => navigateToPage('/pages/index/index'));
  const ver = $('#version');
  if (ver) ver.textContent = `Version: ${version}`;
  renderList();
}

init();
