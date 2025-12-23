# 女人爱 (WomanAI)

女人爱是一个为女性用户打造的小程序功能模块，提供帅哥图片的分享和欣赏功能。

## 功能特点

- 📸 **欣赏帅哥**: 浏览用户上传的精选帅哥图片
- 📤 **上传帅哥**: 分享你发现的帅哥图片链接
- 🎨 **精美界面**: 粉色渐变主题，符合女性用户审美
- 📱 **移动优先**: 完美适配小程序和移动设备
- 🐛 **调试支持**: URL添加`?debug=true`启用VConsole调试

## 文件结构

```
womanai/
├── index.html              # 主页：功能入口
├── appreciate.html         # 欣赏页面：浏览帅哥图片
├── upload.html            # 上传页面：上传图片链接
├── admin.html             # 管理后台：批量管理
├── styles.css             # 全局样式
├── admin.js               # 管理后台脚本
├── url-validator.js       # URL验证工具
├── database-schema.sql    # 数据库表结构
├── README.md             # 本文档
└── *.test.js             # 单元测试文件
```

## 数据库表

### handsome_images

存储帅哥图片URL的主表：

```sql
CREATE TABLE handsome_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(2048) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE INDEX idx_image_url (image_url(255))
);
```

## 允许的图片来源

为保证图片质量和稳定性，系统仅允许以下域名的图片：

- 小红书: `*.xiaohongshu.com`
- 知乎: `*.zhihu.com`
- Instagram: `*.cdninstagram.com`
- 微博: `*.sinaimg.cn`
- Unsplash: `*.unsplash.com`
- Pexels: `*.pexels.com`

## API端点

应用使用集中配置的API端点（来自 `../config.js`）：

- `API_ENDPOINTS.MYSQL_QUERY`: 数据库查询（用于 SELECT, INSERT, UPDATE, DELETE）

**重要**: 所有数据库操作都使用 `/mysql/query` 端点。详见 API 文档：https://letmetry.cloud/api-docs

## 使用指南

### 用户端

1. **欣赏帅哥**
   - 点击"欣赏帅哥"卡片进入浏览页面
   - 图片瀑布流展示
   - 点击"加载更多"查看更多图片

2. **上传帅哥**
   - 点击"上传帅哥"卡片
   - 粘贴图片URL（必须来自允许的域名）
   - 预览图片
   - 点击上传

### 管理员

访问 `admin.html` 进行批量管理：
- 批量导入图片URL
- 查看和删除已有图片
- 监控上传统计

## 配置说明

### API配置

项目使用全局配置文件 `config.js`：

```javascript
const BASE_URL = 'https://letmetry.cloud';
const API_ENDPOINTS = {
    MYSQL_QUERY: BASE_URL + '/mysql/query',
    MYSQL_INSERT: BASE_URL + '/mysql/insert',
    // ...
};
```

### 百度统计

所有页面已集成百度统计代码，追踪ID: `4ec6d2ddfd5746ce248a74a75c1d4fba`

## 开发和测试

### 运行测试

```bash
# 运行所有测试
node run-tests.js

# 或使用npm
npm test

# 运行特定测试
npm test womanai
```

### 本地开发

```bash
# 启动本地服务器
python3 -m http.server 8000

# 访问应用
open http://localhost:8000/womanai/
```

### 调试模式

在任何页面URL后添加 `?debug=true` 启用VConsole移动调试工具：

```
https://letmetry.cloud/womanai/appreciate.html?debug=true
```

## 设计主题

女人爱使用粉红渐变主题：

- 主色调: `linear-gradient(135deg, #f093fb 0%, #f5576c 100%)`
- 强调色: `#f5576c`
- 背景色: 白色 + 粉色渐变

## 部署

1. 确保数据库表已创建（运行 `database-schema.sql`）
2. 将所有文件上传到服务器 `womanai/` 目录
3. 确保 `config.js` 在父目录可访问
4. 配置CDN或直接访问

## 与nanrenbao的对比

| 特性 | nanrenbao | womanai |
|------|-----------|---------|
| 目标用户 | 男性 | 女性 |
| 内容类型 | 美女图片 | 帅哥图片 |
| 数据库表 | beauty_images | handsome_images |
| 主题色 | 紫色渐变 | 粉色渐变 |
| 表情符号 | 🌸 | 💪 |

## 许可证

© 2025 女人爱. 保留所有权利.
