// nanrenbao/harem.js
// 我的后宫功能脚本

// KV store constants
const HAREM_COUNTER_KEY = 'nanrenbao.harem.activations';
const HAREM_COUNTED_KEY = 'haremCountedForUser'; // Track if user was already counted

// 获取激活状态
function isHaremActivated() {
  return localStorage.getItem('haremActivated') === '1';
}

// Helper: Parse counter data from KV store (handles both number and object formats)
function parseCounterData(data) {
  if (data && typeof data === 'number') {
    return data;
  } else if (data && typeof data === 'object' && data.count !== undefined) {
    return data.count;
  }
  return 0;
}

// 激活后宫功能
function activateHarem() {
  const wasActivated = isHaremActivated();
  localStorage.setItem('haremActivated', '1');
  
  // Only increment counter if this is the first activation (not already counted)
  if (!wasActivated && !localStorage.getItem(HAREM_COUNTED_KEY)) {
    localStorage.setItem(HAREM_COUNTED_KEY, '1');
    incrementHaremCounter();
  }
}

// 从KV store获取激活用户计数
function getHaremActivationCount(callback) {
  if (typeof getConfig !== 'function') {
    console.error('getConfig function not available');
    if (callback) callback(0);
    return;
  }
  
  getConfig(HAREM_COUNTER_KEY, function(data) {
    const count = parseCounterData(data);
    if (callback) callback(count);
  });
}

// 增加KV store中的激活用户计数
function incrementHaremCounter() {
  if (typeof getConfig !== 'function' || typeof updateConfig !== 'function') {
    console.error('getConfig or updateConfig function not available');
    return;
  }
  
  getConfig(HAREM_COUNTER_KEY, function(data) {
    const currentCount = parseCounterData(data);
    const newCount = currentCount + 1;
    
    updateConfig(HAREM_COUNTER_KEY, newCount);
    console.log('Harem activation counter incremented to:', newCount);
    
    // Update display if function exists
    if (typeof updateHaremCountDisplay === 'function') {
      updateHaremCountDisplay(newCount);
    }
  });
}

// 获取后宫图片列表
function getHaremImages() {
  const imgs = localStorage.getItem('haremImages');
  return imgs ? JSON.parse(imgs) : [];
}

// 添加图片到后宫
function addHaremImage(url) {
  let imgs = getHaremImages();
  const cap = getHaremCapacity();
  if (imgs.includes(url)) return true;
  if (imgs.length >= cap) {
    // Capacity full: do not add automatically
    console.log('Harem full, not adding:', url);
    return false;
  }
  // add newest items to front so newcomers appear first
  imgs.unshift(url);
  localStorage.setItem('haremImages', JSON.stringify(imgs));
  return true;
}

// Capacity helpers
function getHaremCapacity() {
  const v = localStorage.getItem('haremCapacity');
  return v ? parseInt(v, 10) : 0;
}

function setHaremCapacity(n) {
  localStorage.setItem('haremCapacity', String(n));
}

function increaseHaremCapacity(by) {
  const inc = by || 1;
  const current = getHaremCapacity();
  setHaremCapacity(current + inc);
}

// 渲染图片列表
function renderHaremImages() {
  const list = document.getElementById('harem-images');
  const empty = document.getElementById('harem-empty');
  const imgs = getHaremImages();
  const capEl = document.getElementById('harem-capacity');
  const expandBtn = document.getElementById('harem-expand');
  const cap = getHaremCapacity();
  list.innerHTML = '';
  if (imgs.length === 0) {
    empty.style.display = '';
    if (capEl) capEl.textContent = `0 / ${cap}`;
    return;
  }
  empty.style.display = 'none';
  imgs.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    img.className = 'harem-thumb';
    img.onclick = function() { if (window.showFullImage) window.showFullImage(url); };
    list.appendChild(img);
  });
  if (capEl) capEl.textContent = `${imgs.length} / ${cap}`;
  if (expandBtn) {
    expandBtn.onclick = function() {
      if (typeof PointsSystem === 'undefined') { alert('积分系统未加载'); return; }
      const pts = PointsSystem.getPoints();
      if (pts < 1) { if (typeof showPointsNotification === 'function') showPointsNotification('积分不足，扩容需要 1 分'); else alert('积分不足，扩容需要 1 分'); return; }
      // immediate apply (no confirmation)
      PointsSystem.addPoints(-1);
      increaseHaremCapacity(1);
      renderHaremImages();
      if (window.updatePointsDisplay) window.updatePointsDisplay();
      if (typeof showPointsNotification === 'function') showPointsNotification('扩容成功！'); else alert('扩容成功！');
    };
  }
}

// 激活按钮逻辑
function setupActivateBtn() {
  const btn = document.getElementById('activate-harem');
  if (isHaremActivated()) {
    // hide activation UI when already activated
    if (btn) btn.style.display = 'none';
    const desc = document.getElementById('harem-desc');
    if (desc) desc.style.display = 'none';
  } else {
    btn.disabled = false;
    btn.onclick = function() {
      if (typeof PointsSystem === 'undefined') {
        alert('积分系统未加载，无法激活');
        return;
      }
      var points = PointsSystem.getPoints();
      if (points < 50) {
        alert('积分不足，激活“我的后宫”需要50积分。当前积分：' + points);
        return;
      }
      if (confirm('确定花50积分激活“我的后宫”功能？')) {
        PointsSystem.addPoints(-50);
        activateHarem();
        // set default capacity immediately
        const cap = getHaremCapacity();
        if (!cap || cap <= 0) setHaremCapacity(10);
        // hide activation UI
        if (btn) btn.style.display = 'none';
        const desc = document.getElementById('harem-desc');
        if (desc) desc.style.display = 'none';
        renderHaremImages();
        if (typeof showPointsNotification === 'function') showPointsNotification('激活成功！已扣除50积分。'); else alert('激活成功！已扣除50积分。');
      }
    };
  }
}

// 更新激活计数显示
function updateHaremCountDisplay(count) {
  const countEl = document.getElementById('harem-activation-count');
  if (countEl) {
    countEl.textContent = count;
  }
}

// 加载并显示激活计数
function loadHaremActivationCount() {
  getHaremActivationCount(function(count) {
    updateHaremCountDisplay(count);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  setupActivateBtn();
  // Ensure capacity default when activated
  if (isHaremActivated()) {
    const cap = getHaremCapacity();
    if (!cap || cap <= 0) setHaremCapacity(10);
  }
  renderHaremImages();
  // Load and display activation count
  loadHaremActivationCount();
});

// 导出方法供主站调用
window.isHaremActivated = isHaremActivated;
window.addHaremImage = addHaremImage;
