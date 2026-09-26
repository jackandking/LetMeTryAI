<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{APP_NAME}} - 主页</title>
    <script src="config.js"></script>
    <script src="points-system.js"></script>
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <header class="site-header">
        <h1>{{APP_NAME}}</h1>
        <div class="points-display"><span id="pointsValue">0</span> 分</div>
    </header>

    <div class="entry-grid">
        <a class="entry-card" href="appreciate.html">
            
            <span class="entry-title">欣赏内容</span>
            <span class="entry-desc">瀑布流浏览，积分解锁</span>
        </a>
        <a class="entry-card" href="upload.html">
            
            <span class="entry-title">上传内容</span>
            <span class="entry-desc">上传赚积分</span>
        </a>
        <a class="entry-card" href="admin.html">
            
            <span class="entry-title">管理后台</span>
            <span class="entry-desc">批量上传与统计</span>
        </a>
    </div>

    <div id="pointsNotification" class="points-notification"></div>

    <script>
        (function () {
            const info = PointsSystem.initialize();
            document.getElementById('pointsValue').textContent = info.currentPoints;
            if (info.isNewUser) showNotification('欢迎新用户！获得 ' + PointsSystem.POINTS_CONFIG.NEW_USER + ' 积分');
            if (info.dailyVisit.awarded) showNotification('每日签到奖励 +' + info.dailyVisit.points + ' 积分');

            function showNotification(text) {
                const el = document.getElementById('pointsNotification');
                el.textContent = text;
                el.style.display = 'block';
                setTimeout(function () { el.style.display = 'none'; }, 4000);
            }
        })();
    </script>
</body>
</html>