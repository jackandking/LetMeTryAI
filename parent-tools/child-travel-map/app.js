/**
 * 孩子去过哪些地方 - 足迹地图生成器
 * 免费：选择省份、预览地图
 * 付费：生成高清 Canvas 图片
 */

const API_BASE = 'https://letmetry.cloud';
const PRODUCT_ID = 'child-travel-map';
const PRODUCT_NAME = '孩子足迹地图生成';
const AMOUNT = 1; // 1分，方便测试
const STORAGE_KEY = 'child_travel_map_v1';
const paymentBridge = window.ChildTravelMapPaymentBridge || {};
const imageUploadHelper = window.ChildTravelMapImageUpload || {};

let visited = new Set();
let openid = '';
let uploadedImageUrl = '';

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    openid = urlParams.get('openid') || 'unknown_' + Date.now();

    // debug bar
    const debug = document.getElementById('debug-info');
    if (debug) {
        debug.style.display = 'block';
        debug.textContent = '点击生成后，请使用小程序底部按钮完成支付 | tap to hide';
        debug.onclick = () => debug.style.display = 'none';
    }

    loadState();
    renderMap();
    renderRegionList();
    updateStats();
    bindEvents();

    // 如果 URL 带 paid=1，自动触发生成
    if (paymentBridge.shouldAutoGenerate && paymentBridge.shouldAutoGenerate(window.location.search)) {
        setTimeout(() => generateImage(), 500);
    }
});

// ===== 地图渲染 =====
function renderMap() {
    const svg = document.getElementById('china-map');
    if (!svg) return;
    // 清空（避免热更新重复）
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    CHINA_PROVINCES.forEach(province => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', province.path);
        path.setAttribute('data-id', province.id);
        path.setAttribute('data-name', province.name);
        path.classList.add('province');
        if (province.id === 'nanhai') {
            path.classList.add('nanhai');
        } else if (visited.has(province.id)) {
            path.classList.add('visited');
        }
        svg.appendChild(path);
    });
}

function renderRegionList() {
    const container = document.getElementById('region-groups');
    if (!container) return;
    container.innerHTML = '';

    Object.entries(REGIONS).forEach(([regionName, provinceIds]) => {
        const group = document.createElement('div');
        group.className = 'region-group';

        const nameEl = document.createElement('div');
        nameEl.className = 'region-name';
        nameEl.textContent = regionName;
        group.appendChild(nameEl);

        const list = document.createElement('div');
        list.className = 'region-provinces';

        provinceIds.forEach(id => {
            const prov = CHINA_PROVINCES.find(p => p.id === id);
            if (!prov) return;
            const tag = document.createElement('span');
            tag.className = 'province-tag' + (visited.has(id) ? ' visited' : '');
            tag.textContent = prov.name;
            tag.setAttribute('data-id', id);
            tag.addEventListener('click', () => toggleProvince(id));
            list.appendChild(tag);
        });

        group.appendChild(list);
        container.appendChild(group);
    });
}

// ===== 事件绑定 =====
function bindEvents() {
    const svg = document.getElementById('china-map');
    const tooltip = document.getElementById('tooltip');
    if (!svg) return;

    svg.addEventListener('click', (e) => {
        const path = e.target.closest('.province:not(.nanhai)');
        if (!path) return;
        toggleProvince(path.getAttribute('data-id'));
    });

    svg.addEventListener('touchstart', (e) => {
        const path = e.target.closest('.province:not(.nanhai)');
        if (!path) return;
        const name = path.getAttribute('data-name');
        const rect = svg.getBoundingClientRect();
        const touch = e.touches[0];
        tooltip.textContent = name;
        tooltip.style.left = (touch.clientX - rect.left) + 'px';
        tooltip.style.top = (touch.clientY - rect.top - 36) + 'px';
        tooltip.classList.add('visible');
    }, { passive: true });

    svg.addEventListener('touchend', () => {
        tooltip.classList.remove('visible');
    });
}

// ===== 省份操作 =====
function toggleProvince(id) {
    if (visited.has(id)) {
        visited.delete(id);
    } else {
        visited.add(id);
    }
    updateUI(id);
    updateStats();
    saveState();
}

function updateUI(id) {
    const isVisited = visited.has(id);
    const mapPath = document.querySelector(`#china-map .province[data-id="${id}"]`);
    if (mapPath) mapPath.classList.toggle('visited', isVisited);
    const tag = document.querySelector(`.province-tag[data-id="${id}"]`);
    if (tag) tag.classList.toggle('visited', isVisited);
}

function updateStats() {
    const el = document.getElementById('visited-count');
    if (el) el.textContent = visited.size;
}

function clearAll() {
    if (visited.size === 0) return;
    if (!confirm('确定清空所有已选省份吗？')) return;
    const ids = [...visited];
    visited.clear();
    ids.forEach(id => updateUI(id));
    updateStats();
    saveState();
}

// ===== 生成按钮点击 =====
function onGenerateClick() {
    if (visited.size === 0) {
        alert('请先选择孩子去过的省份');
        return;
    }

    // 检查是否已付费：URL 参数 paid=1 表示支付已回调
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('paid') === '1') {
        generateImage();
        return;
    }

    initiatePayment();
}

// ===== 支付流程：H5 跳转原生支付页，支付后回跳当前 H5 =====
async function initiatePayment() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 正在打开支付页...';

    try {
        const hasKs = typeof ks !== 'undefined';
        const hasNavigateTo = hasKs && typeof ks.navigateTo === 'function';
        console.log('[pay] env:', { hasKs, hasNavigateTo });

        if (hasNavigateTo) {
            saveState();

            const returnUrl = paymentBridge.buildReturnUrl
                ? paymentBridge.buildReturnUrl(window.location.href, { paid: 1, payment: 'wechat' })
                : `${window.location.href.split('?')[0]}?paid=1&payment=wechat`;
            const payUrl = paymentBridge.buildNativePayUrl
                ? paymentBridge.buildNativePayUrl({
                    openid,
                    productId: PRODUCT_ID,
                    quantity: 1,
                    totalAmount: AMOUNT,
                    subject: PRODUCT_NAME,
                    body: '解锁高清足迹图',
                    returnUrl
                })
                : `${API_BASE}/pages/pay/pay`;

            console.log('[pay] Using ks.navigateTo → native pay page', { payUrl, returnUrl });
            ks.navigateTo({ url: payUrl });
            btn.disabled = false;
            btn.innerHTML = '✨ 生成精美足迹图';
        } else {
            // 浏览器：直接生成
            console.log('[pay] Browser mock');
            generateImage();
            btn.disabled = false;
            btn.innerHTML = '✨ 生成精美足迹图';
        }
    } catch (err) {
        console.error('[pay] Error:', err);
        alert('支付初始化失败: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '✨ 生成精美足迹图';
    }
}

// ===== Canvas 图片生成 =====
async function generateImage() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 正在生成...';

    try {
        const canvas = createMapCanvas();
        const dataUrl = canvas.toDataURL('image/png');

        const resultSection = document.getElementById('result-section');
        const resultImg = document.getElementById('result-image');
        const resultStatus = document.getElementById('result-status');
        const previewBtn = document.getElementById('preview-save-btn');
        resultImg.src = dataUrl;
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
        uploadedImageUrl = '';
        if (previewBtn) previewBtn.classList.add('hidden');
        if (resultStatus) resultStatus.textContent = '正在上传高清图片，上传完成后可在快手中预览保存';

        if (imageUploadHelper.uploadImageFile && imageUploadHelper.dataUrlToFile && imageUploadHelper.generateUuidFilename) {
            const filename = imageUploadHelper.generateUuidFilename('png');
            const file = await imageUploadHelper.dataUrlToFile(dataUrl, filename);
            const uploadResult = await imageUploadHelper.uploadImageFile(file, `${API_BASE}/image/upload`);
            uploadedImageUrl = uploadResult.imageUrl;

            if (resultStatus) {
                resultStatus.textContent = '图片已上传，点击下方按钮可在快手中预览并长按保存';
            }
            if (previewBtn) {
                previewBtn.classList.remove('hidden');
            }
        } else if (resultStatus) {
            resultStatus.textContent = '图片已生成。当前环境不支持自动上传，请长按图片尝试保存';
        }

        btn.disabled = false;
        btn.innerHTML = '✨ 重新生成';
    } catch (err) {
        console.error('[generate] Error:', err);
        alert('图片生成失败: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '✨ 生成精美足迹图';
    }
}

function createMapCanvas() {
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 1100;
    const ctx = canvas.getContext('2d');

    // 背景渐变
    const grad = ctx.createLinearGradient(0, 0, 750, 1100);
    grad.addColorStop(0, '#667eea');
    grad.addColorStop(1, '#764ba2');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 750, 1100);

    // 装饰圆点
    for (let i = 0; i < 30; i++) {
        ctx.beginPath();
        ctx.arc(
            Math.random() * 750,
            Math.random() * 1100,
            Math.random() * 3 + 1,
            0, Math.PI * 2
        );
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.3 + 0.1})`;
        ctx.fill();
    }

    // 标题
    const childName = (document.getElementById('child-name').value || '').trim();
    const childAge = document.getElementById('child-age').value;
    const titleText = childName ? `${childName}的中国足迹` : '我的中国足迹';

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 36px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(titleText, 375, 65);

    if (childAge) {
        ctx.font = '20px -apple-system, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.fillText(`${childAge}岁小旅行家的探索地图`, 375, 95);
    }

    // 地图
    const mapOffsetX = 55;
    const mapOffsetY = 120;
    const mapScale = 750 / 600 * 0.88;

    ctx.save();
    ctx.translate(mapOffsetX, mapOffsetY);
    ctx.scale(mapScale, mapScale);

    CHINA_PROVINCES.forEach(province => {
        const path2d = new Path2D(province.path);
        if (province.id === 'nanhai') {
            ctx.strokeStyle = 'rgba(255,255,255,0.3)';
            ctx.lineWidth = 0.3;
            ctx.stroke(path2d);
        } else {
            ctx.fillStyle = visited.has(province.id) ? '#ff6b35' : 'rgba(255,255,255,0.2)';
            ctx.fill(path2d);
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 0.5;
            ctx.stroke(path2d);
        }
    });

    ctx.restore();

    // 统计数据
    const statsY = 720;
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 80px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(visited.size + '', 375, statsY);

    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '24px -apple-system, sans-serif';
    ctx.fillText('/ 34 个省级行政区', 375, statsY + 40);

    // 进度条
    const progress = visited.size / 34;
    const barWidth = 400;
    const barX = (750 - barWidth) / 2;
    const barY = statsY + 60;
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(barX, barY, barWidth, 10);
    ctx.fillStyle = '#ff6b35';
    ctx.fillRect(barX, barY, barWidth * progress, 10);
    ctx.beginPath();
    ctx.arc(barX + barWidth * progress, barY + 5, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();

    // 已访问省份列表
    const visitedNames = CHINA_PROVINCES
        .filter(p => visited.has(p.id) && p.id !== 'nanhai')
        .map(p => p.name);

    if (visitedNames.length > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '18px -apple-system, sans-serif';
        const lines = [];
        let line = '';
        visitedNames.forEach(name => {
            if ((line + name).length > 22) {
                lines.push(line.trim());
                line = name + '  ';
            } else {
                line += name + '  ';
            }
        });
        if (line.trim()) lines.push(line.trim());
        lines.slice(0, 5).forEach((l, i) => {
            ctx.fillText(l, 375, statsY + 110 + i * 32);
        });
    }

    // 底部信息
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '16px -apple-system, sans-serif';
    ctx.fillText('letmetryai.cn 家长爱', 375, 1060);

    // 底部装饰线
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(200, 1030);
    ctx.lineTo(550, 1030);
    ctx.stroke();

    return canvas;
}

function closeResult() {
    document.getElementById('result-section').classList.add('hidden');
}

function previewGeneratedImage() {
    if (!uploadedImageUrl) {
        alert('图片还未上传完成，请稍后再试');
        return;
    }

    if (typeof ks !== 'undefined' && typeof ks.previewImage === 'function') {
        ks.previewImage({
            urls: [uploadedImageUrl],
            current: uploadedImageUrl
        });
        return;
    }

    window.open(uploadedImageUrl, '_blank');
}

// ===== 本地存储 =====
function saveState() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            visited: [...visited],
            childName: document.getElementById('child-name').value || '',
            childAge: document.getElementById('child-age').value || ''
        }));
    } catch (e) {}
}

function loadState() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const data = JSON.parse(stored);
            if (data.visited) visited = new Set(data.visited);
            if (data.childName) document.getElementById('child-name').value = data.childName;
            if (data.childAge) document.getElementById('child-age').value = data.childAge;
        }
    } catch (e) {}
}

// 输入变化时自动保存
document.addEventListener('input', (e) => {
    if (e.target.id === 'child-name' || e.target.id === 'child-age') {
        saveState();
    }
});
