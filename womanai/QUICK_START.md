# 女人爱 (WomanAI) - 快速开始指南

## 📋 项目概览

女人爱是为"女人爱"小程序打造的帅哥图片分享和欣赏平台，参考nanrenbao实现。

## 🚀 快速部署

### 1. 数据库设置

运行数据库schema创建表：

\`\`\`sql
-- 运行 database-schema.sql 中的SQL
CREATE TABLE handsome_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(2048) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_image_url (image_url(255))
);
\`\`\`

### 2. 文件部署

将womanai目录上传到服务器：

\`\`\`bash
# 确保以下文件已上传
womanai/
├── index.html              # 主页
├── appreciate.html         # 欣赏页面
├── upload.html            # 上传页面
├── admin.html             # 管理后台
├── styles.css             # 样式文件
├── admin.js               # 管理脚本
└── url-validator.js       # URL验证
\`\`\`

### 3. 访问应用

- 主页: https://letmetry.cloud/womanai/
- 欣赏: https://letmetry.cloud/womanai/appreciate.html
- 上传: https://letmetry.cloud/womanai/upload.html
- 管理: https://letmetry.cloud/womanai/admin.html

## 🎨 设计特点

### 配色方案
- 主色: `#f5576c` (玫瑰红)
- 渐变: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
- 女性化粉色主题

### 页面功能

#### 主页 (index.html)
- 功能入口导航
- 欣赏帅哥/上传帅哥

#### 欣赏页面 (appreciate.html)
- 瀑布流图片展示
- 分页加载
- 图片预览

#### 上传页面 (upload.html)
- URL上传表单
- 实时图片预览
- 域名白名单验证

#### 管理后台 (admin.html)
- 批量上传URL
- 上传进度追踪
- 日志查看

## 🔒 允许的图片域名

系统仅允许以下域名的图片：

- 小红书: `*.xiaohongshu.com`
- 知乎: `*.zhihu.com`
- Instagram: `*.cdninstagram.com`
- 微博: `*.sinaimg.cn`
- Unsplash: `*.unsplash.com`
- Pexels: `*.pexels.com`

## 🔧 开发和调试

### 启用调试模式

在任何页面URL后添加 `?debug=true`:

\`\`\`
https://letmetry.cloud/womanai/appreciate.html?debug=true
\`\`\`

这将加载VConsole移动调试工具。

### 运行测试

\`\`\`bash
# 运行所有测试
node run-tests.js

# 或使用npm
npm test
\`\`\`

测试文件：
- `womanai.test.js` - 主要功能测试
- `admin.test.js` - 管理后台测试
- `url-validator.test.js` - URL验证测试
- `womanai-vconsole.test.js` - VConsole集成测试

## 📊 API使用

### API 文档

所有 API 操作请参考官方文档：https://letmetry.cloud/api-docs

**重要**: API 使用 `sql` 参数，不是 `query`！

### 查询图片

```javascript
// 使用 sql 参数
const sql = `SELECT * FROM handsome_images 
            ORDER BY created_at DESC 
            LIMIT 20 OFFSET 0`;

const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
});
```

### 上传图片

**注意**: 所有数据库操作（包括 INSERT）都使用 `MYSQL_QUERY` 端点，并使用参数化查询：

```javascript
// 使用参数化查询防止 SQL 注入
const sql = 'INSERT INTO handsome_images (image_url, created_at) VALUES (?, NOW())';
const params = [url];

const response = await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
});
```

### 更新和删除

```javascript
// UPDATE with parameters
const sql = 'UPDATE handsome_images SET image_url = ? WHERE id = ?';
const params = ['new_url', 123];

await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
});

// DELETE with parameters
const sql = 'DELETE FROM handsome_images WHERE id = ?';
const params = [123];

await fetch(API_ENDPOINTS.MYSQL_QUERY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params })
});
```

## 🆚 与nanrenbao的差异

| 特性 | nanrenbao | womanai |
|------|-----------|---------|
| 目标用户 | 男性 | 女性 |
| 内容 | 美女图片 | 帅哥图片 |
| 数据表 | beauty_images | handsome_images |
| 主题色 | 紫色 (#667eea) | 粉色 (#f5576c) |
| 渐变 | 紫色渐变 | 粉色渐变 |

## 📝 注意事项

1. **URL验证**: 所有上传的URL都会经过域名白名单验证
2. **去重**: 系统会自动去除重复的图片URL
3. **错误处理**: 上传失败会显示详细错误信息
4. **性能**: 使用lazy loading优化图片加载
5. **安全**: 仅接受HTTP/HTTPS协议的URL

## 🐛 常见问题

### Q: 图片上传失败？
A: 检查URL是否来自允许的域名列表

### Q: 图片加载慢？
A: 使用CDN加速的图片源，或启用lazy loading

### Q: 无法访问管理后台？
A: 确保admin.js正确加载，检查浏览器控制台

### Q: 调试模式不工作？
A: 确认URL参数为 `?debug=true` (区分大小写)

## 📞 支持

详细文档请查看 [README.md](README.md)

## 📄 许可证

© 2025 女人爱. 保留所有权利.
