# VConsole Debug 功能使用说明

## 概述

所有页面现已集成 VConsole 移动端调试功能。VConsole 是一个轻量级、可扩展的移动端调试工具，可以在移动设备上查看 console 日志、网络请求、元素信息等。

## 如何启用

在任何页面的 URL 后添加 `?debug=true` 参数即可启用 VConsole 调试面板。

### 示例

- `https://letmetry.cloud/nanrenbao/index.html?debug=true`
- `https://letmetry.cloud/eraser/index.html?debug=true`
- `https://letmetry.cloud/index.html?debug=true`

## 功能特性

1. **条件加载**：仅在 URL 包含 `?debug=true` 时加载 VConsole 脚本
2. **零性能影响**：未启用调试模式时不会加载任何额外脚本
3. **统一版本**：所有页面使用相同版本 (3.15.1) 确保一致性
4. **错误处理**：包含完善的错误处理和日志记录

## VConsole 面板功能

启用后，页面右下角会出现一个绿色的 vConsole 按钮，点击可展开调试面板：

- **Log**：查看 console.log、console.warn、console.error 等日志
- **System**：查看系统信息、User Agent、屏幕信息等
- **Network**：查看网络请求、响应数据、请求头等
- **Element**：查看和修改 DOM 元素
- **Storage**：查看 localStorage、sessionStorage、Cookies 等

## 技术实现

### 代码结构

```javascript
<!-- VConsole for mobile debugging - loads only when ?debug=true is in URL -->
<script>
    // Load and initialize VConsole only if debug parameter is present
    (function() {
        const urlParams = new URLSearchParams(window.location.search);
        const debugMode = urlParams.get('debug') === 'true';
        
        if (debugMode) {
            // Dynamically load VConsole script only when needed
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/vconsole@3.15.1/dist/vconsole.min.js';
            script.onload = function() {
                if (window.VConsole) {
                    const vConsole = new window.VConsole();
                    console.log('VConsole initialized for debugging');
                }
            };
            script.onerror = function() {
                console.warn('Failed to load VConsole. Debug mode unavailable.');
            };
            document.head.appendChild(script);
        }
    })();
</script>
```

### 覆盖范围

VConsole 已添加到以下页面类型：

- ✅ 主页和导航页面
- ✅ 男人宝 (nanrenbao) 所有页面
- ✅ 游戏页面 (typing-game, guesscupsize, whatfish 等)
- ✅ 管理页面 (admin)
- ✅ 投票页面 (beautyVote, votejinling12)
- ✅ Webview 页面 (webview0-16)
- ✅ 爱老人页面 (elder-love)
- ✅ 女性页面 (woman)
- ✅ 其他功能页面 (eraser, firework, parent-tools 等)

**总计**：66+ 个 HTML 页面

## 使用场景

### 移动端调试

在移动设备上访问页面时，添加 `?debug=true` 参数即可查看调试信息：

1. 使用微信、QQ 等应用内浏览器访问页面
2. 在 URL 末尾添加 `?debug=true`
3. 点击页面右下角的 vConsole 按钮
4. 查看日志、网络请求等调试信息

### 问题诊断

当页面出现问题时：

1. 启用 VConsole 调试模式
2. 查看 Console 面板中的错误信息
3. 检查 Network 面板中的网络请求
4. 查看 System 面板中的系统信息

### 开发测试

开发新功能时：

1. 在 URL 中添加 `?debug=true`
2. 使用 console.log() 输出调试信息
3. 在 VConsole 面板中实时查看
4. 测试完成后移除 `?debug=true` 参数

## 注意事项

1. **生产环境**：虽然 VConsole 只在 `?debug=true` 时加载，但建议在生产环境中谨慎使用
2. **性能影响**：启用调试模式可能会略微影响页面性能
3. **敏感信息**：注意不要在日志中输出敏感信息（密码、token 等）
4. **网络限制**：VConsole 从 unpkg CDN 加载，需要网络连接

## 版本信息

- **VConsole 版本**：3.15.1
- **CDN 源**：unpkg.com
- **实现日期**：2025-12

## 参考资源

- [VConsole 官方 GitHub](https://github.com/Tencent/vConsole)
- [VConsole 文档](https://github.com/Tencent/vConsole/blob/dev/README_CN.md)
