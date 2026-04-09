# 快手视频链接格式

## 发布成功后的返回链接

当视频发布成功后，`VideoPublisher.publish()` 返回的结果包含：

```typescript
{
  success: true,
  videoId: "1234567890",           // 快手内部视频ID
  shareUrl: "https://v.kuaishou.com/xxxxx"  // 分享链接
}
```

## 快手视频链接格式

### 1. 短链接（分享用）
```
https://v.kuaishou.com/xxxxx
```
- 用于分享到微信、QQ等
- 重定向到实际视频页面

### 2. 标准视频页面
```
https://www.kuaishou.com/short-video/xxxxx
```
- 完整的视频播放页面
- 包含评论、点赞、分享功能

### 3. 创作者后台链接
```
https://daren.kuaishou.com/content/video/xxxxx
```
- 创作者平台管理页面
- 可查看数据统计、编辑信息

## 如何查看已发布视频

### 方法 1: 通过分享链接直接访问
```bash
# 发布成功后控制台会输出
📤 视频发布:
   状态: ✅ 成功
   视频ID: 1234567890
   分享链接: https://v.kuaishou.com/3x4a5b6c
```

### 方法 2: 快手 APP 查看
1. 打开快手 APP
2. 点击左上角 "☰" 菜单
3. 进入 "创作者中心"
4. 点击 "内容管理" → "视频"

### 方法 3: 网页版创作者平台
```
https://daren.kuaishou.com/content/video
```

## 链接有效期

- **分享链接**: 永久有效（除非视频被删除）
- **Cookie 认证**: 约 30 天需要重新登录

## 如何复制链接分享

```typescript
import { publishVideo } from './video-publisher.js';

const result = await publishVideo('./demo.mp4', '我的视频');

if (result.success) {
  console.log('视频链接:', result.shareUrl);
  // 输出: https://v.kuaishou.com/xxxxx
  
  // 可以复制到剪贴板
  // 或者发送到其他平台
}
```

## 示例输出

```
============================================================
📊 发布报告
============================================================
应用ID: tank-systems-compare
应用名: 坦克系统大PK
时间: 2024/1/15 15:30:45
耗时: 45.2s

🎬 视频生成:
   状态: ✅ 成功
   路径: .../tank-demo.mp4

📤 视频发布:
   状态: ✅ 成功
   视频ID: 5201314888
   分享链接: https://v.kuaishou.com/3x8m9n2p

📋 总结:
   ✅ 发布成功! 视频ID: 5201314888
============================================================
```

访问链接: https://v.kuaishou.com/3x8m9n2p
