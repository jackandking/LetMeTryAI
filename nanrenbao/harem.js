// nanrenbao/harem.js
// 我的后宫功能脚本

// 获取激活状态
function isHaremActivated() {
  return localStorage.getItem('haremActivated') === '1';
}

// 激活后宫功能
function activateHarem() {
  localStorage.setItem('haremActivated', '1');
}

// 获取后宫图片列表
function getHaremImages() {
  const imgs = localStorage.getItem('haremImages');
  return imgs ? JSON.parse(imgs) : [];
}

// 添加图片到后宫
function addHaremImage(url) {
  let imgs = getHaremImages();
  if (!imgs.includes(url)) {
    imgs.push(url);
    localStorage.setItem('haremImages', JSON.stringify(imgs));
  }
}

// 渲染图片列表
function renderHaremImages() {
  const list = document.getElementById('harem-images');
  const empty = document.getElementById('harem-empty');
  const imgs = getHaremImages();
  list.innerHTML = '';
  if (imgs.length === 0) {
    empty.style.display = '';
    return;
  }
  empty.style.display = 'none';
  imgs.forEach(url => {
    const img = document.createElement('img');
    img.src = url;
    list.appendChild(img);
  });
}

// 激活按钮逻辑
function setupActivateBtn() {
  const btn = document.getElementById('activate-harem');
  if (isHaremActivated()) {
    btn.textContent = '已激活';
    btn.disabled = true;
    document.getElementById('harem-desc').textContent = '已激活：您在本站看到的美女图片都会自动收录在这里。';
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
        btn.textContent = '已激活';
        btn.disabled = true;
        document.getElementById('harem-desc').textContent = '已激活：您在本站看到的美女图片都会自动收录在这里。';
        renderHaremImages();
        alert('激活成功！已扣除50积分。');
      }
    };
  }
}

document.addEventListener('DOMContentLoaded', function() {
  setupActivateBtn();
  renderHaremImages();
});

// 导出方法供主站调用
window.isHaremActivated = isHaremActivated;
window.addHaremImage = addHaremImage;
