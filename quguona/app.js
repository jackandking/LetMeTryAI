(function() {
    const STORAGE_KEY = 'quguona_visited_v1';
    let visited = new Set();

    const BASE = 'https://letmetry.cn';

    function init() {
        loadState();
        renderMap();
        renderRegionList();
        updateStats();
        bindEvents();
        sendTrack('page_load', { count: visited.size });
        cloudRestore();
    }

    // 埋点：text/plain 避免 CORS 预检；fire-and-forget，失败不影响主流程
    function sendTrack(event, extra) {
        try {
            fetch(BASE + '/api/track', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(Object.assign({ event: event, appId: 'quguona', timestamp: Date.now() }, extra || {}))
            }).catch(function() {});
        } catch (e) {}
    }

    // 足迹云备份：走 letmetry.cn 统一入口（同一 AWS kv 存储、同 key 格式，老数据兼容）
    function cloudSave() {
        try {
            fetch(BASE + '/api/quguona/state', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify({ deviceId: getDeviceId(), provinces: [...visited] })
            }).catch(function() {});
        } catch (e) {}
    }

    // 本机无数据时尝试跨设备恢复（localStorage 为主，云端只补空）
    async function cloudRestore() {
        if (visited.size > 0) return;
        try {
            const r = await fetch(BASE + '/api/quguona/state?deviceId=' + encodeURIComponent(getDeviceId()));
            const d = await r.json();
            if (d && d.success && d.found && Array.isArray(d.provinces) && d.provinces.length) {
                const valid = d.provinces.filter(function(id) { return CHINA_PROVINCES.some(function(p) { return p.id === id; }); });
                if (!valid.length) return;
                visited = new Set(valid);
                localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
                rerenderAll();
            }
        } catch (e) {}
    }

    function rerenderAll() {
        document.getElementById('china-map').innerHTML = '';
        renderMap();
        document.getElementById('region-groups').innerHTML = '';
        renderRegionList();
        updateStats();
    }

    function renderMap() {
        const svg = document.getElementById('china-map');
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

    function bindEvents() {
        const svg = document.getElementById('china-map');
        const tooltip = document.getElementById('tooltip');

        svg.addEventListener('click', (e) => {
            const path = e.target.closest('.province:not(.nanhai)');
            if (!path) return;
            toggleProvince(path.getAttribute('data-id'));
        });

        svg.addEventListener('touchstart', handleTouch, { passive: true });
        svg.addEventListener('touchend', () => {
            tooltip.classList.remove('visible');
        });

        document.getElementById('generate-btn').addEventListener('click', generateImage);
        document.getElementById('publish-btn').addEventListener('click', publishToKuaishou);
        document.getElementById('close-result').addEventListener('click', () => {
            document.getElementById('result-section').classList.add('hidden');
        });

        checkPublishResult();

        function handleTouch(e) {
            const path = e.target.closest('.province:not(.nanhai)');
            if (!path) return;
            const name = path.getAttribute('data-name');
            const rect = svg.getBoundingClientRect();
            const touch = e.touches[0];
            tooltip.textContent = name;
            tooltip.style.left = (touch.clientX - rect.left) + 'px';
            tooltip.style.top = (touch.clientY - rect.top - 36) + 'px';
            tooltip.classList.add('visible');
        }
    }

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
        if (mapPath) {
            mapPath.classList.toggle('visited', isVisited);
        }
        const tag = document.querySelector(`.province-tag[data-id="${id}"]`);
        if (tag) {
            tag.classList.toggle('visited', isVisited);
        }
    }

    function updateStats() {
        document.getElementById('visited-count').textContent = visited.size;
    }

    function clearAll() {
        const ids = [...visited];
        visited.clear();
        ids.forEach(id => updateUI(id));
        updateStats();
        saveState();
    }

    function getNickname() {
        return (document.getElementById('nickname-input').value || '').trim();
    }

    function showPublishStatus(msg, isSuccess) {
        const el = document.getElementById('publish-status');
        document.getElementById('publish-msg').textContent = msg;
        el.classList.remove('hidden', 'success');
        if (isSuccess) el.classList.add('success');
    }

    function checkPublishResult() {
        const params = new URLSearchParams(window.location.search);
        if (params.get('published') === 'success') {
            sendTrack('publish_success');
            showPublishStatus('发布成功！视频已发到你的快手账号', true);
            window.history.replaceState({}, '', window.location.pathname);
        } else if (params.get('published') === 'error') {
            showPublishStatus('发布失败：' + (params.get('msg') || '未知错误'), false);
            window.history.replaceState({}, '', window.location.pathname);
        }
    }

    async function publishToKuaishou() {
        if (visited.size === 0) {
            alert('请先标记你去过的省份');
            return;
        }

        const nickname = getNickname() || '旅行者';
        const state = JSON.stringify({
            nickname: nickname,
            provinces: [...visited],
            count: visited.size,
        });
        const publishUrl = 'https://letmetry.cn/oauth/kuaishou/user-authorize?' +
            'state=' + encodeURIComponent(state);

        // In Kuaishou webview, can't navigate to external domains
        if (typeof ks !== 'undefined') {
            // Show copy-link UI
            showCopyLinkDialog(publishUrl);
            return;
        }

        const btn = document.getElementById('publish-btn');
        sendTrack('publish_click', { count: visited.size });
        btn.disabled = true;
        btn.textContent = '跳转中...';
        window.location.href = publishUrl;
    }

    function showCopyLinkDialog(url) {
        var overlay = document.createElement('div');
        overlay.className = 'copy-dialog-overlay';
        overlay.innerHTML = '<div class="copy-dialog">' +
            '<h3>在浏览器中完成发布</h3>' +
            '<p>快手小程序内无法直接授权，请复制链接到手机浏览器中打开：</p>' +
            '<input type="text" id="copy-url-input" readonly value="' + url + '">' +
            '<button id="copy-url-btn" class="btn-primary">复制链接</button>' +
            '<button id="close-copy-dialog" class="btn-secondary">关闭</button>' +
            '</div>';
        document.body.appendChild(overlay);

        document.getElementById('copy-url-btn').addEventListener('click', function() {
            var input = document.getElementById('copy-url-input');
            input.select();
            document.execCommand('copy');
            this.textContent = '已复制！';
            setTimeout(function() { overlay.remove(); }, 1500);
        });
        document.getElementById('close-copy-dialog').addEventListener('click', function() {
            overlay.remove();
        });
    }

    function generateImageBlob(nickname) {
        return new Promise((resolve) => {
            const canvas = createMapCanvas(nickname);
            canvas.toBlob(resolve, 'image/png');
        });
    }

    function createMapCanvas(nickname) {
        const canvas = document.createElement('canvas');
        canvas.width = 750;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        const grad = ctx.createLinearGradient(0, 0, 750, 1000);
        grad.addColorStop(0, '#667eea');
        grad.addColorStop(1, '#764ba2');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 750, 1000);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((nickname || '我') + '的中国足迹', 375, 55);

        const mapOffsetX = 50;
        const mapOffsetY = 80;
        const mapScale = 750 / 600 * 0.85;

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
                ctx.fillStyle = visited.has(province.id) ? '#ff6b35' : 'rgba(255,255,255,0.25)';
                ctx.fill(path2d);
                ctx.strokeStyle = 'rgba(255,255,255,0.6)';
                ctx.lineWidth = 0.5;
                ctx.stroke(path2d);
            }
        });

        ctx.restore();

        const statsY = 680;
        ctx.fillStyle = '#ffd700';
        ctx.font = 'bold 72px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(visited.size + '', 375, statsY);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '24px -apple-system, sans-serif';
        ctx.fillText('/ 34 个省级行政区', 375, statsY + 40);

        const visitedNames = CHINA_PROVINCES
            .filter(p => visited.has(p.id) && p.id !== 'nanhai')
            .map(p => p.name);
        if (visitedNames.length > 0) {
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '18px -apple-system, sans-serif';
            const lines = [];
            let line = '';
            visitedNames.forEach(name => {
                if ((line + name).length > 20) {
                    lines.push(line.trim());
                    line = name + '  ';
                } else {
                    line += name + '  ';
                }
            });
            if (line.trim()) lines.push(line.trim());
            lines.slice(0, 4).forEach((l, i) => {
                ctx.fillText(l, 375, statsY + 80 + i * 28);
            });
        }

        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '16px -apple-system, sans-serif';
        ctx.fillText('letmetryai.cn/quguona', 375, 970);

        return canvas;
    }

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
        cloudSave();
    }

    function loadState() {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                visited = new Set(JSON.parse(stored));
            }
        } catch (e) {}
    }

    function getDeviceId() {
        let id = localStorage.getItem('quguona_device_id');
        if (!id) {
            id = 'qgn_' + Date.now() + '_' + Math.random().toString(36).slice(2);
            localStorage.setItem('quguona_device_id', id);
        }
        return id;
    }

    function generateImage() {
        const nickname = getNickname();
        sendTrack('map_generate', { count: visited.size });
        const canvas = createMapCanvas(nickname);
        const dataUrl = canvas.toDataURL('image/png');
        const resultImg = document.getElementById('result-image');
        resultImg.src = dataUrl;
        document.getElementById('result-section').classList.remove('hidden');
        resultImg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
