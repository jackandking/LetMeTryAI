# MySQL API Mock Handler - Quick Reference

## 快速开始 (Quick Start)

### 启用Mock模式的3种方式

#### 1. 通过URL参数（推荐用于测试）
```
https://letmetry.cloud/womanai/appreciate.html?mock=true
```

#### 2. 在config.js中设置（全局启用）
```javascript
window.ENABLE_MYSQL_MOCK = true;
```

#### 3. 在特定页面中设置
```html
<script>
  window.ENABLE_MYSQL_MOCK = true;
</script>
<script src="../config.js"></script>
```

## 工作流程

当访问MySQL API时遇到 `ERR_CONNECTION_RESET` 或网络错误：

```
网络请求 → 连接失败 → 检查Mock启用状态 → Mock启用 → 返回模拟数据
                                    ↓
                          Mock未启用 → 抛出错误
```

## 支持的表

### handsome_images（男人表）
```javascript
{
  id: 1,
  image_url: "https://...",
  created_at: "2025-01-01T00:00:00.000Z",
  view_count: 0
}
```

### beauty_images（美容表）
```javascript
{
  id: 1,
  image_url: "https://...",
  created_at: "2025-01-01T00:00:00.000Z",
  view_count: 0
}
```

## 测试用例

运行测试：
```bash
npm test -- mysql-api-mock.test.js
```

或使用简单测试运行器：
```bash
node run-tests.js
```

## 常见场景

### 场景1：开发离线功能
```
1. 在浏览器URL添加 ?mock=true
2. 即使API不可用，页面也能正常显示模拟数据
3. 完整测试UI功能而无需数据库
```

### 场景2：CI/CD管道
```
1. 在测试环境启用 ENABLE_MYSQL_MOCK = true
2. 测试不依赖外部数据库
3. 提高测试稳定性和速度
```

### 场景3：演示和截图
```
1. 访问 ?mock=true URL
2. 快速获得稳定的模拟数据
3. 用于演示或创建文档
```

## 日志输出

启用Mock时，控制台会显示：
```
MySQL API connection error: ERR_CONNECTION_RESET. Using mock data for testing.
```

## 注意事项

⚠️ **仅用于测试/开发** - 不应在生产环境启用

✅ **自动降级** - Mock模式不启用时自动使用真实API

✅ **URL优先** - URL参数 `?mock=true` 优先于config.js设置

✅ **网络模拟** - Mock包含100ms延迟以模拟真实网络

## 修改的文件

| 文件 | 变更 |
|------|------|
| `util.js` | 添加 MySQLMock 模块和 fetchMySQLWithMock 包装函数 |
| `config.js` | 添加 ENABLE_MYSQL_MOCK 配置标志 |
| `mysql-api-mock.test.js` | 新增测试文件 |
| `MYSQL-MOCK-HANDLER.md` | 完整文档 |

## 进阶用法

### 添加自定义Mock数据
编辑 `util.js` 中的 `mockData` 对象：

```javascript
const mockData = {
    handsome_images: [
        { 
          id: 1, 
          image_url: 'https://custom-url.jpg', 
          created_at: new Date().toISOString(), 
          view_count: 0 
        }
    ],
    beauty_images: [
        // 添加更多数据...
    ]
};
```

### 自定义Mock行为
修改 `MySQLMock` 中的处理函数：

```javascript
function handleSelect(sql) {
    // 自定义SELECT处理逻辑
    return customData;
}
```

## 故障排除

### 问题：Mock不生效
✅ 检查URL是否有 `?mock=true`
✅ 检查 window.ENABLE_MYSQL_MOCK 是否为 true
✅ 检查浏览器控制台是否有错误信息

### 问题：数据不足
✅ Mock数据仅包含几条样本数据
✅ 用于UI测试足够
✅ 如需更多数据，使用真实数据库

## 相关文档
- [完整文档](./MYSQL-MOCK-HANDLER.md)
- [测试用例](./mysql-api-mock.test.js)
