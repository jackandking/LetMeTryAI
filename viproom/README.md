# VIP Room

VIP房间 - 一个展示美女图片和视频的互动页面

## 功能特点

- 从远程kvstore读取配置（key: `viproom.conf`）
- 展示美女图片画廊
- 用户点击图片时播放广告
- 广告播放完成后展示视频
- 追踪并记录每张图片的点击数
- 点击数高的图片自动排序在前

## 配置格式

配置存储在kvstore中，key为 `viproom.conf`，格式如下：

```json
[
  {
    "imgUrl": "https://example.com/image1.jpg",
    "videoUrl": "https://v.kuaishou.com/video1"
  },
  {
    "imgUrl": "https://example.com/image2.jpg",
    "videoUrl": "https://v.kuaishou.com/video2"
  }
]
```

### 配置字段说明

- `imgUrl`: 美女图片的URL地址
- `videoUrl`: 对应的视频URL地址

## 点击追踪

点击数据存储在kvstore中，key为 `viproom.clicks`，格式如下：

```json
{
  "0": 15,
  "1": 8,
  "2": 22
}
```

其中数字键表示图片在配置数组中的索引，值表示该图片的点击次数。

## 工作流程

1. 页面加载时从kvstore读取 `viproom.conf` 配置
2. 读取点击数据 `viproom.clicks`
3. 根据点击数排序图片（点击数高的排在前面）
4. 显示图片画廊
5. 用户点击图片时：
   - 增加该图片的点击计数
   - 保存更新后的点击数据到kvstore
   - 跳转到广告页面
6. 广告播放完成后（`finishedAd=true`）：
   - 播放对应的视频

## 文件结构

- `index.html` - 主页面，包含画廊布局和样式
- `app.js` - 应用逻辑，处理配置加载、点击追踪和导航
- `result.html` - 投票结果页面，显示投票排名和支持视频播放
- `styles.css` - 样式表
- `app.test.js` - 主页面单元测试
- `result.test.js` - 结果页面单元测试
- `upload-config.js` - 配置上传工具（需要在浏览器环境运行）

## 结果页面

结果页面 (`result.html`) 提供以下功能：

1. **显示投票结果**：按票数从高到低展示所有参选项
2. **突出显示冠军**：最受欢迎的项目会在顶部特别展示
3. **视频播放**：点击"观看视频"按钮播放最受欢迎项目的视频
4. **使用localStorage**：通过localStorage存储待播放的视频URL，支持广告后播放
5. **URL参数处理**：
   - `finishedAd=true`：广告完成后自动播放存储的视频
   - `finishedAd=false`：广告取消时清除待播放视频

### 访问结果页面

- 直接访问：`viproom/result.html`
- 从主页访问：点击"查看投票结果"链接


## 配置上传

要上传配置到kvstore，可以：

1. 使用浏览器控制台运行上传脚本
2. 使用管理后台界面（如果有）
3. 使用提供的 `upload-config.js` 脚本（需要在浏览器环境）

示例（浏览器控制台）：

```javascript
// 加载util.js中的updateConfig函数后
const config = [
  {
    "imgUrl": "https://p3-dreamina-sign.byteimg.com/tos-cn-i-tb4s082cfz/0b2ff364c29c41a9af3ad231b4dc82cc~tplv-tb4s082cfz-aigc_resize:2400:2400.webp?lk3s=4fa96020&x-expires=1767744000&x-signature=M8YrzjHRC4VEmkO965JBVbUPHrQ%3D",
    "videoUrl": "https://v.kuaishou.com/KL337Hat"
  }
];

updateConfig('viproom.conf', config);
```

## 测试

运行测试：

```bash
npm test -- viproom/app.test.js
```

或使用简单测试运行器：

```bash
node run-tests.js
```

## 技术栈

- 纯JavaScript (ES6+)
- HTML5
- CSS3 (Grid布局, Flexbox, 动画)
- kvstore远程存储
- 百度统计

## 参考

本页面参考 `caili` 页面的结构，但增加了：
- 图片画廊显示
- 点击追踪和排序功能
- 从远程配置读取内容
- 更丰富的视觉效果
