(function() {
    const STORAGE_KEY = 'quguona_visited_v1';
    let visited = new Set();

    function init() {
        loadState();
        renderMap();
        renderRegionList();
        updateStats();
        bindEvents();
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
        document.getElementById('clear-btn').addEventListener('click', clearAll);
        document.getElementById('close-result').addEventListener('click', () => {
            document.getElementById('result-section').classList.add('hidden');
        });

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

    function saveState() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...visited]));
        if (typeof updateKeyValueStore === 'function') {
            const deviceId = getDeviceId();
            try {
                updateKeyValueStore('quguona_' + deviceId, JSON.stringify([...visited]));
            } catch (e) {}
        }
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
        const canvas = document.createElement('canvas');
        const scale = 2;
        canvas.width = 750;
        canvas.height = 1000;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#667eea';
        ctx.fillRect(0, 0, 750, 1000);
        const grad = ctx.createLinearGradient(0, 0, 750, 1000);
        grad.addColorStop(0, '#667eea');
        grad.addColorStop(1, '#764ba2');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 750, 1000);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 36px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('我的中国足迹', 375, 60);

        const mapOffsetX = 50;
        const mapOffsetY = 90;
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

        const dataUrl = canvas.toDataURL('image/png');
        const resultImg = document.getElementById('result-image');
        resultImg.src = dataUrl;
        document.getElementById('result-section').classList.remove('hidden');
        resultImg.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
