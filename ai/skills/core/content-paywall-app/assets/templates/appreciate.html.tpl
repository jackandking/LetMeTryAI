<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{APP_NAME}} - 欣赏</title>
    <script src="config.js"></script>
    <script src="points-system.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="site-header">
        <a class="back-link" href="index.html">← 主页</a>
        <h1>欣赏内容</h1>
        <div class="points-display"><span id="pointsValue">0</span> 分</div>
    </header>

    {{AD_BAR}}

    <div id="imageGrid" class="image-grid">
        <p class="loading">正在加载内容...</p>
    </div>

    <div id="pointsNotification" class="points-notification"></div>

    <!-- 解锁弹窗 -->
    <div id="unlockModal" class="modal" style="display:none;">
        <div class="modal-box">
            <h3 id="unlockTitle">解锁内容</h3>
            <p id="unlockMsg"></p>
            <button onclick="confirmUnlock()">消耗积分查看</button>
            <button onclick="closeModal()">取消</button>
        </div>
    </div>

    <!-- 图片大图预览 -->
    <div id="imageModal" class="modal" style="display:none;" onclick="closeImageModal()">
        <img id="imageModalImg" src="" alt="" style="max-width:90vw;max-height:80vh;">
    </div>

    <script>
        let currentImageUrl = '';

        function showNotification(text) {
            const el = document.getElementById('pointsNotification');
            el.textContent = text;
            el.style.display = 'block';
            setTimeout(function () { el.style.display = 'none'; }, 4000);
        }

        function updatePoints() {
            document.getElementById('pointsValue').textContent = PointsSystem.getPoints();
        }

        function loadImages() {
            fetch(APP_CONFIG.mysqlQueryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sql: 'SELECT id, image_url, view_count FROM ' + APP_CONFIG.contentTable + ' ORDER BY view_count DESC, created_at DESC',
                    params: []
                })
            })
            .then(function (r) { return r.json(); })
            .then(function (data) {
                const grid = document.getElementById('imageGrid');
                grid.innerHTML = '';
                const items = (data && data.data) || data || [];
                if (!items.length) {
                    grid.innerHTML = '<p class="loading">暂无内容，快去上传吧</p>';
                    return;
                }
                items.forEach(function (item) {
                    const card = document.createElement('div');
                    card.className = 'image-card';
                    const vc = item.view_count || 0;
                    const badge = vc > 0 ? '<span class="view-count">'+ vc +'人已看</span>' : '';
                    card.innerHTML =
                        '<div class="thumb-wrap">' +
                        (APP_CONFIG.allowAd
                            ? '<img class="thumb blurred" src="' + item.image_url + '" loading="lazy" onclick="askUnlock(\'' + item.image_url.replace(/'/g, "\\'") + '\')">'
                            : '<img class="thumb" src="' + item.image_url + '" loading="lazy" onclick="openLarge(\'' + item.image_url.replace(/'/g, "\\'") + '\')">') +
                        '</div>' +
                        '<div class="card-meta">' + badge +
                        (APP_CONFIG.allowAd ? '<button class="unlock-btn" onclick="askUnlock(\'' + item.image_url.replace(/'/g, "\\'") + '\')">点击查看</button>' : '') +
                        '</div>';
                    grid.appendChild(card);
                });
            })
            .catch(function (err) { console.error('load error', err); });
        }

        {{AD_JS}}

        function askUnlock(url) {
            if (!APP_CONFIG.allowAd) { openLarge(url); return; }
            currentImageUrl = url;
            const perm = PointsSystem.canViewImage(url);
            if (perm.canView) {
                openLarge(url);
                return;
            }
            document.getElementById('unlockMsg').textContent =
                '消费 ' + PointsSystem.POINTS_CONFIG.VIEW_IMAGE + ' 积分查看' +
                (perm.hasEnoughPoints ? '' : '（积分不足，可看广告赚取）');
            document.getElementById('unlockModal').style.display = 'flex';
        }

        function confirmUnlock() {
            PointsSystem.viewImage(currentImageUrl).then(function (res) {
                if (res.success) {
                    updatePoints();
                    openLarge(currentImageUrl);
                } else {
                    showNotification(res.message);
                }
                closeModal();
            });
        }

        function closeModal() { document.getElementById('unlockModal').style.display = 'none'; }
        function openLarge(url) {
            document.getElementById('imageModalImg').src = url;
            document.getElementById('imageModal').style.display = 'flex';
        }
        function closeImageModal() { document.getElementById('imageModal').style.display = 'none'; }

        (function () {
            PointsSystem.initialize();
            updatePoints();
            loadImages();
        })();
    </script>
</body>
</html>