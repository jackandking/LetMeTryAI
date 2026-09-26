<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{APP_NAME}} - 管理后台</title>
    <script src="config.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="site-header">
        <a class="back-link" href="index.html">← 主页</a>
        <h1>管理后台</h1>
    </header>

    <div class="upload-box">
        <h3>批量上传（每行一个 URL）</h3>
        <textarea id="bulkUrls" rows="6" placeholder="https://example.com/1.jpg&#10;https://example.com/2.jpg"></textarea>
        <button onclick="bulkUpload()">批量上传</button>
    </div>

    <div class="upload-box">
        <h3>统计信息</h3>
        <button onclick="loadStats()">刷新统计</button>
        <div id="statsArea"></div>
    </div>

    <div class="upload-box">
        <h3>数据管理</h3>
        <button onclick="listRecent()">查看最近 20 条</button>
        <div id="listArea"></div>
    </div>

    <script>
        function runQuery(sql, params) {
            return fetch(APP_CONFIG.mysqlQueryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sql: sql, params: params || [] })
            }).then(function (r) { return r.json(); });
        }

        function parseLines() {
            return document.getElementById('bulkUrls').value
                .split('\n').map(function (s) { return s.trim(); })
                .filter(function (s) { return /^https:\/\//.test(s); });
        }

        async function bulkUpload() {
            const urls = parseLines();
            let ok = 0, fail = 0;
            for (const url of urls) {
                try {
                    const r = await runQuery('INSERT INTO ' + APP_CONFIG.contentTable + ' (image_url) VALUES (?)', [url]);
                    if (r && (r.success || r.affectedRows || r.rowCount)) ok++; else fail++;
                } catch (e) { fail++; }
            }
            alert('完成：成功 ' + ok + '，失败 ' + fail + '（共 ' + urls.length + '）');
        }

        async function loadStats() {
            const r = await runQuery('SELECT COUNT(*) AS total, COALESCE(SUM(view_count),0) AS views FROM ' + APP_CONFIG.contentTable);
            const row = (r && r.data && r.data[0]) || r || {};
            document.getElementById('statsArea').textContent = '总内容 ' + (row.total || 0) + ' 条，总浏览 ' + (row.views || 0) + ' 次';
        }

        async function listRecent() {
            const r = await runQuery('SELECT id, image_url, view_count, created_at FROM ' + APP_CONFIG.contentTable + ' ORDER BY id DESC LIMIT 20');
            const items = (r && r.data) || r || [];
            document.getElementById('listArea').innerHTML =
                items.length ? items.map(function (it) {
                    return '<div class="list-item">#' + it.id + ' <a href="' + it.image_url + '" target="_blank">' + it.image_url + '</a> <span>热度:' + (it.view_count || 0) + '</span></div>';
                }).join('') : '<p>暂无数据</p>';
        }
    </script>
</body>
</html>