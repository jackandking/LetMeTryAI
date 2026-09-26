<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{APP_NAME}} - 上传</title>
    <script src="config.js"></script>
    <script src="points-system.js"></script>
    <script src="url-validator.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="site-header">
        <a class="back-link" href="index.html">← 主页</a>
        <h1>上传内容</h1>
        <div class="points-display"><span id="pointsValue">0</span> 分</div>
    </header>

    <div class="upload-box">
        <label for="imageUrlInput">图片 URL（HTTPS）</label>
        <input type="text" id="imageUrlInput" placeholder="https://example.com/image.jpg">
        <div id="previewWrap" style="display:none;margin:12px 0;">
            <img id="previewImg" alt="预览" style="max-width:200px;border-radius:8px;">
        </div>
        <button id="uploadBtn" onclick="doUpload()">上传（+{{PV_UPLOAD}}积分）</button>
        <p id="uploadMsg" class="upload-msg"></p>
    </div>

    <script>
        function updatePoints() { document.getElementById('pointsValue').textContent = PointsSystem.getPoints(); }

        document.getElementById('imageUrlInput').addEventListener('input', function (e) {
            const val = e.target.value;
            const pv = document.getElementById('previewWrap');
            if (/^https:\/\//.test(val)) {
                document.getElementById('previewImg').src = val;
                pv.style.display = 'block';
            } else {
                pv.style.display = 'none';
            }
        });

        async function doUpload() {
            const url = document.getElementById('imageUrlInput').value.trim();
            const msg = document.getElementById('uploadMsg');
            if (!url) { msg.textContent = '请输入图片URL'; return; }

            const check = isValidImageUrl(url);
            if (!check.valid) { msg.textContent = check.error; return; }

            try {
                const resp = await fetch(APP_CONFIG.mysqlQueryUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sql: 'INSERT INTO ' + APP_CONFIG.contentTable + ' (image_url) VALUES (?)',
                        params: [url]
                    })
                });
                const data = await resp.json();
                if (data && (data.success || data.affectedRows || data.rowCount)) {
                    const newTotal = PointsSystem.awardUploadPoints();
                    updatePoints();
                    msg.textContent = '上传成功，获得 ' + PointsSystem.POINTS_CONFIG.UPLOAD_IMAGE + ' 积分，当前 ' + newTotal + ' 分';
                    document.getElementById('imageUrlInput').value = '';
                    document.getElementById('previewWrap').style.display = 'none';
                } else {
                    msg.textContent = '上传失败：' + JSON.stringify(data);
                }
            } catch (err) {
                msg.textContent = '上传出错：' + err.message;
            }
        }

        (function () { PointsSystem.initialize(); updatePoints(); })();
    </script>
</body>
</html>