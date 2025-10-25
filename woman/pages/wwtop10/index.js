import { navigateToPage, version } from '../../utils/app.js';
import { queryDatabase } from '../../../util/mysql-util.js';

function $(sel) { return document.querySelector(sel); }

function renderGrid(items) {
  const grid = $('#grid');
  const tip = $('#tip');
  if (!grid) return;
  if (!items || !items.length) {
    tip && (tip.hidden = false);
    grid.innerHTML = '';
    return;
  }
  tip && (tip.hidden = true);
  grid.innerHTML = items
    .map(
      (p) => `
      <div class="card">
        <img src="${p.url}" alt="photo" />
        <div class="meta">
          <span>票数: ${p.vote_count ?? 0}</span>
          <a href="${p.url}" target="_blank" rel="noopener">原图</a>
        </div>
      </div>`
    )
    .join('');
}

function loadTop10() {
  const sql = 'SELECT * FROM ks_woman_photos ORDER BY vote_count DESC LIMIT 10';
  queryDatabase(sql, [], (err, photos) => {
    if (err) {
      console.warn('Failed to load top 10', err);
      renderGrid([]);
      return;
    }
    renderGrid(Array.isArray(photos) ? photos : []);
  });
}

function init() {
  const back = $('#back');
  if (back) back.addEventListener('click', () => navigateToPage('/pages/index/index'));
  const ver = $('#version');
  if (ver) ver.textContent = `Version: ${version}`;
  loadTop10();
}

init();
