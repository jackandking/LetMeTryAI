/**
 * 孩子去过哪些地方 - 足迹地图生成器
 * 免费：选择省份、预览地图
 * 付费：生成高清 Canvas 图片
 */

const API_BASE = 'https://letmetry.cloud';
const PRODUCT_ID = 'child-travel-map';
const PRODUCT_NAME = '孩子足迹地图生成';
const AMOUNT = 100; // 1元 = 100分
const STORAGE_KEY = 'child_travel_map_v1';

let visited = new Set();
let openid = '';

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    openid = urlParams.get('openid') || 'unknown_' + Date.now();

    // 环境检测：深度探测 ks 对象的所有可用方法
    const hasKs = typeof ks !== 'undefined';
    let ksInfo = { hasKs };
    if (hasKs) {
        ksInfo.pay = typeof ks.pay;
        ksInfo.miniProgram = typeof ks.miniProgram;
        ksInfo.ready = typeof ks.ready;
        ksInfo.config = typeof ks.config;
        ksInfo.getUserInfo = typeof ks.getUserInfo;
        if (ks.miniProgram) {
            ksInfo.mp_navigateTo = typeof ks.miniProgram.navigateTo;
            ksInfo.mp_postMessage = typeof ks.miniProgram.postMessage;
            ksInfo.mp_requestPayment = typeof ks.miniProgram.requestPayment;
            ksInfo.mp_getEnv = typeof ks.miniProgram.getEnv;
        }
        // 探测 window 上的其他桥接对象
        ksInfo.KSJSBridge = typeof window.KSJSBridge;
        ksInfo.webkit = typeof window.webkit;
    }
    console.log('[init] ksInfo:', ksInfo);

    // debug bar
    const debug = document.getElementById('debug-info');
    if (debug) {
        debug.style.display = 'block';
        const infoStr = Object.entries(ksInfo).map(([k, v]) => k + '=' + v).join(' ');
        debug.textContent = infoStr + ' | tap to hide';
        debug.onclick = () => debug.style.display = 'none';
    }

    loadState();
    renderMap();
    renderRegionList();
    updateStats();
    bindEvents();

    // 如果 URL 带 paid=1，自动触发生成
    if (urlParams.get('paid') === '1') {
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

// ===== 支付流程（复用 parent-type-test 逻辑）=====
async function initiatePayment() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 正在创建订单...';

    // 页面级诊断日志（不依赖 vConsole）
    function diag(msg) {
        console.log(msg);
        const debug = document.getElementById('debug-info');
        if (debug) debug.textContent = (debug.textContent || '').slice(-200) + ' | ' + msg;
    }
    diag('[pay] start');

    try {
        // 用 XMLHttpRequest 代替 fetch（某些 webview 更稳定）
        const data = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.timeout = 10000;
            xhr.open('POST', API_BASE + '/api/pay/create-order', true);
            xhr.setRequestHeader('Content-Type', 'application/json');
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    diag('[pay] xhr status=' + xhr.status);
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try { resolve(JSON.parse(xhr.responseText)); }
                        catch (e) { reject(new Error('JSON parse: ' + e.message)); }
                    } else {
                        reject(new Error('HTTP ' + xhr.status));
                    }
                }
            };
            xhr.onerror = () => reject(new Error('XHR error'));
            xhr.ontimeout = () => reject(new Error('XHR timeout'));
            xhr.send(JSON.stringify({
                openid: openid,
                productId: PRODUCT_ID,
                productName: PRODUCT_NAME,
                amount: AMOUNT
            }));
        });

        diag('[pay] resp=' + (data.success ? 'OK' : 'FAIL'));
        if (!data.success) {
            throw new Error(data.error || '创建订单失败');
        }

        const order = data.data;
        diag('[pay] order=' + order.orderId);

        const hasKs = typeof ks !== 'undefined';
        const hasKsPay = hasKs && typeof ks.pay === 'function';
        const hasMiniProgram = hasKs && ks.miniProgram && typeof ks.miniProgram.requestPayment === 'function';
        const hasNavigateTo = hasKs && ks.miniProgram && typeof ks.miniProgram.navigateTo === 'function';
        const hasPostMessage = hasKs && ks.miniProgram && typeof ks.miniProgram.postMessage === 'function';

        diag('[pay] nav=' + (hasNavigateTo ? 'Y' : 'N') + ' msg=' + (hasPostMessage ? 'Y' : 'N'));

        const currentUrl = window.location.href.split('?')[0];
        const returnUrl = currentUrl + '?paid=1';

        if (hasNavigateTo) {
            diag('[pay] goto /pages/pay/pay');
            const payUrl = '/pages/pay/pay?orderId=' + encodeURIComponent(order.orderId) +
                '&appId=' + encodeURIComponent(order.appId) +
                '&prepayId=' + encodeURIComponent(order.prepayId) +
                '&nonceStr=' + encodeURIComponent(order.nonceStr) +
                '&timeStamp=' + encodeURIComponent(order.timeStamp) +
                '&sign=' + encodeURIComponent(order.sign) +
                '&returnUrl=' + encodeURIComponent(returnUrl);
            try {
                ks.miniProgram.navigateTo({ url: payUrl });
                diag('[pay] navigateTo ok');
            } catch (e) {
                diag('[pay] nav ERR=' + e.message);
                throw e;
            }
            btn.disabled = false;
            btn.innerHTML = '✨ 生成精美足迹图';
        } else if (hasPostMessage) {
            diag('[pay] postMessage');
            ks.miniProgram.postMessage({
                type: 'REQUEST_PAYMENT',
                data: {
                    orderId: order.orderId,
                    appId: order.appId,
                    prepayId: order.prepayId,
                    nonceStr: order.nonceStr,
                    timeStamp: order.timeStamp,
                    sign: order.sign,
                    returnUrl: returnUrl
                }
            });
            diag('[pay] postMessage ok');
            btn.disabled = false;
            btn.innerHTML = '✨ 生成精美足迹图';
        } else if (hasKsPay) {
            diag('[pay] ks.pay');
            ks.pay({
                orderInfo: {
                    appId: order.appId,
                    prepayId: order.prepayId,
                    nonceStr: order.nonceStr,
                    timeStamp: order.timeStamp,
                    sign: order.sign
                },
                success: () => {
                    diag('[pay] ks.pay success');
                    setTimeout(() => generateImage(), 300);
                },
                fail: (err) => {
                    diag('[pay] ks.pay fail=' + (err.errMsg || ''));
                    alert('支付未完成: ' + (err.errMsg || '请重试'));
                    btn.disabled = false;
                    btn.innerHTML = '✨ 生成精美足迹图';
                }
            });
        } else if (hasMiniProgram) {
            diag('[pay] requestPayment');
            ks.miniProgram.requestPayment({
                appId: order.appId,
                prepayId: order.prepayId,
                nonceStr: order.nonceStr,
                timeStamp: order.timeStamp,
                sign: order.sign,
                success: () => {
                    diag('[pay] requestPayment success');
                    setTimeout(() => generateImage(), 300);
                },
                fail: (err) => {
                    diag('[pay] requestPayment fail=' + (err.errMsg || ''));
                    alert('支付未完成: ' + (err.errMsg || '请重试'));
                    btn.disabled = false;
                    btn.innerHTML = '✨ 生成精美足迹图';
                }
            });
        } else {
            diag('[pay] browser mock');
            generateImage();
            btn.disabled = false;
            btn.innerHTML = '✨ 生成精美足迹图';
        }
    } catch (err) {
        diag('[pay] ERR=' + err.name + ':' + err.message);
        alert('支付初始化失败[' + err.name + ']: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '✨ 生成精美足迹图';
    }
}

// ===== Canvas 图片生成 =====
function generateImage() {
    const btn = document.getElementById('generate-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 正在生成...';

    try {
        const canvas = createMapCanvas();
        const dataUrl = canvas.toDataURL('image/png');

        const resultSection = document.getElementById('result-section');
        const resultImg = document.getElementById('result-image');
        resultImg.src = dataUrl;
        resultSection.classList.remove('hidden');
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });

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
