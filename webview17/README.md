# 男人宝 (Man's Treasure) - Webview17

## 概述 (Overview)

男人宝是一个为男人提供情绪管理工具的webview小程序，主要功能是浏览和分享美女图片。

## 功能特性 (Features)

### 1. 主页 (Homepage)
- 两个卡片式入口：
  - 🌸 欣赏美女 (Appreciate Beauty)
  - 📤 上传美女 (Upload Beauty)

### 2. 欣赏美女 (Appreciate Beauty)
- 从MySQL数据库加载美女图片URL
- 网格式瀑布流展示
- 响应式设计，支持移动端
- 自动加载失败处理

### 3. 上传美女 (Upload Beauty)
- 允许用户上传图片URL
- 严格的域名白名单验证
- 实时图片预览
- HTTPS强制要求

## 安全特性 (Security)

### URL验证
- ✅ 仅支持HTTPS协议
- ✅ 域名白名单验证
- ✅ 防止XSS攻击
- ✅ 输入格式验证

### 允许的图片来源域名
- `eb118-file.cdn.bcebos.com`
- `*.myqcloud.com`
- `*.byteimg.com`
- `letmetry.cloud`
- `*.qpic.cn`

## 技术架构 (Architecture)

### 前端技术栈
- HTML5
- CSS3 (响应式设计)
- Vanilla JavaScript (ES6+)
- Centralized Configuration (config.js)

### 数据库
- MySQL
- 表名: `beauty_images`
- 字段: id, image_url, created_at, updated_at

### API集成
- MySQL Query API
- MySQL Insert API
- 使用统一配置 (window.API_ENDPOINTS)

## 文件结构 (File Structure)

```
webview17/
├── index.html              # 主页
├── appreciate.html         # 欣赏美女页面
├── upload.html             # 上传美女页面
├── styles.css              # 主页样式
├── url-validator.js        # URL验证工具模块
├── url-validator.test.js   # URL验证单元测试
├── webview17.test.js       # 集成测试
├── database-schema.sql     # 数据库表结构
└── README.md               # 本文档
```

## 访问方式 (Access)

直接访问: `https://letmetry.cloud/webview17/`

注意：本功能不在主页显示入口卡片，仅供直接访问。

## 数据库设置 (Database Setup)

运行 `database-schema.sql` 中的SQL创建必要的表结构：

```sql
CREATE TABLE IF NOT EXISTS beauty_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    image_url VARCHAR(2048) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

## 测试 (Testing)

### 运行单元测试
```bash
npm test -- webview17
```

### 测试覆盖
- URL验证逻辑
- 域名匹配模式
- 页面结构完整性
- 配置集成
- 安全特性

## 用户体验 (User Experience)

### 响应式设计
- 桌面端：多列网格布局
- 平板端：2列布局
- 移动端：单列布局

### 交互特性
- 图片悬停效果
- 加载状态提示
- 错误提示信息
- 成功提示反馈
- 图片预览功能

## 浏览器兼容性 (Browser Compatibility)

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ✅ 移动端浏览器

## 隐私和内容政策 (Privacy & Content Policy)

- 用户上传的内容需符合社区准则
- 仅接受来自可信来源的图片URL
- 不存储用户个人信息
- 遵守相关法律法规

## 维护和更新 (Maintenance)

### 定期任务
- 清理过期图片URL
- 监控数据库性能
- 审查上传内容
- 更新域名白名单

## 联系方式 (Contact)

如有问题或建议，请通过GitHub Issues提交。

## 版权声明 (Copyright)

&copy; 2025 男人宝. 保留所有权利.
