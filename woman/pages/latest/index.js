import { navigateToPage, version } from '../../utils/app.js';
import { getStorage, setStorage } from '../../utils/storage.js';
import { queryDatabase } from '../../../util/mysql-util.js';

let state = {
  photos: [],
  currentIndex: 0,
  isLoading: false,
  photoTimerStart: null,
  currentPhotoId: null
};

function $(sel) { return document.querySelector(sel); }

function setPhoto(src, id) {
  const img = $('#photo');
  if (img) img.src = src || '';
  state.currentPhotoId = id || null;
}

function startPhotoTimer() {
  if (!state.photos[state.currentIndex]) return;
  state.photoTimerStart = Date.now();
  state.currentPhotoId = state.photos[state.currentIndex]?.id || null;
}

function stopPhotoTimerAndRecord() {
  if (!state.photoTimerStart || !state.currentPhotoId) return;
  const duration = Date.now() - state.photoTimerStart;
  updateTopViewed(duration);
  state.photoTimerStart = null;
  state.currentPhotoId = null;
}

function updateTopViewed(duration) {
  const current = state.photos[state.currentIndex];
  if (!current) return;
  let top = getStorage('topViewedPhotos') || [];
  const idx = top.findIndex(p => p.url === current.url);
  if (idx !== -1) top[idx].duration += duration; else top.push({ url: current.url, duration });
  top.sort((a, b) => b.duration - a.duration);
  if (top.length > 10) top = top.slice(0, 10);
  setStorage('topViewedPhotos', top);
}

function nextPhoto() {
  if (!state.photos.length) return;
  stopPhotoTimerAndRecord();
  state.currentIndex = (state.currentIndex + 1) % state.photos.length;
  const p = state.photos[state.currentIndex];
  setPhoto(p?.url, p?.id);
  startPhotoTimer();
}

function showFirstTimeTip() {
  const key = 'hasShownLatestTip';
  const hasShown = getStorage(key);
  const tipEl = $('#tip');
  if (!hasShown && tipEl) {
    tipEl.hidden = false;
    setStorage(key, true);
    setTimeout(() => { tipEl.hidden = true; }, 3000);
  }
}

function setVersion() {
  const el = $('#version');
  if (el) el.textContent = `Version: ${version}`;
}

function bindUI() {
  const back = $('#back');
  if (back) back.addEventListener('click', () => navigateToPage('/pages/index/index'));
  const next = $('#next');
  if (next) next.addEventListener('click', nextPhoto);
}

function loadPhotos() {
  if (state.isLoading) return;
  state.isLoading = true;
  const sql = 'SELECT * FROM ks_woman_photos ORDER BY created_at DESC LIMIT 100';
  queryDatabase(sql, [], (err, photos) => {
    state.isLoading = false;
    if (err) {
      console.warn('Failed to load photos', err);
      state.photos = [];
      setPhoto('', null);
      return;
    }
    state.photos = Array.isArray(photos) ? photos : [];
    state.currentIndex = 0;
    const p = state.photos[0];
    setPhoto(p?.url, p?.id);
    startPhotoTimer();
  });
}

function init() {
  setVersion();
  bindUI();
  loadPhotos();
  showFirstTimeTip();
}

init();
