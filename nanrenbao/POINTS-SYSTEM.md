# 积分系统说明

## 功能概述

男人宝积分系统为用户提供激励机制，通过积分奖励鼓励用户参与和贡献。

## 积分规则

### 初始积分
- **新用户注册**：20 积分
- 系统自动为每个新用户分配唯一的 UUID

### 积分获取方式

1. **每日签到**：每天首次访问任何页面获得 10 积分
2. **上传图片**：每成功上传一张图片获得 10 积分

## 技术实现

### 存储方式
- 使用浏览器 localStorage 本地存储
- 数据保存在用户设备上，清除浏览器数据会重置积分

### localStorage 键值
```javascript
nanrenbao_user_uuid   // 用户唯一标识
nanrenbao_points      // 用户积分
nanrenbao_last_visit  // 上次访问日期
```

## 积分系统 API

### 核心方法

#### `PointsSystem.initialize()`
初始化积分系统，检查新用户和每日签到
```javascript
const pointsInfo = PointsSystem.initialize();
// 返回: {
//   uuid: string,
//   isNewUser: boolean,
//   dailyVisit: { awarded: boolean, points: number, newTotal: number },
//   currentPoints: number
// }
```

#### `PointsSystem.getPoints()`
获取当前积分
```javascript
const points = PointsSystem.getPoints();
```

#### `PointsSystem.addPoints(points)`
添加积分
```javascript
const newTotal = PointsSystem.addPoints(10);
```

#### `PointsSystem.awardUploadPoints()`
奖励上传积分
```javascript
const newTotal = PointsSystem.awardUploadPoints();
```

#### `PointsSystem.getUserInfo()`
获取用户信息
```javascript
const userInfo = PointsSystem.getUserInfo();
// 返回: { uuid: string, points: number, lastVisit: string }
```

#### `PointsSystem.resetUser()`
重置用户数据（用于测试）
```javascript
PointsSystem.resetUser();
```

## UI 组件

### 积分显示
```html
<div class="points-display">
    <span class="points-icon">💎</span>
    <span id="pointsValue">0</span> 分
</div>
```

### 积分通知
```html
<div id="pointsNotification" class="points-notification"></div>
```

## 集成示例

### 在页面中集成积分系统

```html
<!-- 引入积分系统 -->
<script src="points-system.js"></script>

<script>
    // 初始化积分系统
    const pointsInfo = PointsSystem.initialize();
    
    // 更新显示
    document.getElementById('pointsValue').textContent = PointsSystem.getPoints();
    
    // 显示欢迎消息
    if (pointsInfo.isNewUser) {
        alert('欢迎新用户！获得 20 积分');
    }
    
    // 显示每日签到奖励
    if (pointsInfo.dailyVisit.awarded) {
        alert('每日签到奖励！+10 积分');
    }
</script>
```

### 奖励上传积分

```javascript
// 上传成功后
if (uploadSuccess) {
    const newTotal = PointsSystem.awardUploadPoints();
    updatePointsDisplay();
    showNotification(`获得 ${PointsSystem.POINTS_CONFIG.UPLOAD_IMAGE} 积分`);
}
```

## 页面集成状态

### ✅ 已集成页面

1. **appreciate.html（欣赏页面）**
   - 显示积分
   - 新用户欢迎
   - 每日签到奖励

2. **upload.html（上传页面）**
   - 显示积分
   - 上传奖励
   - 实时更新积分

### 📋 待集成页面

- index.html（主页）- 可添加积分显示
- 其他功能页面

## 响应式设计

积分显示在不同设备上自动适配：

- **桌面端**：显示在页面右上角
- **移动端**：显示在标题下方居中

## 测试

运行测试验证积分系统：

```bash
cd /workspaces/LetMeTryAI
node run-tests.js nanrenbao/points-system.test.js
```

## 常见问题

### Q: 如何重置积分进行测试？
A: 在浏览器控制台执行：
```javascript
PointsSystem.resetUser();
location.reload();
```

### Q: 积分数据会丢失吗？
A: 积分保存在 localStorage 中，除非清除浏览器数据，否则会一直保留。

### Q: 如何修改积分配置？
A: 修改 `points-system.js` 中的 `POINTS_CONFIG` 对象。

### Q: 多设备积分同步吗？
A: 不同步。每个设备独立存储积分。如需同步，需要后端支持。

## 未来扩展

可考虑的功能扩展：

1. **积分商城**：使用积分兑换特权
2. **积分排行榜**：显示积分排名（需后端支持）
3. **积分历史**：记录积分变动历史
4. **更多奖励方式**：评论、分享等
5. **后端同步**：将积分存储到数据库，实现跨设备同步

## 相关文件

- `nanrenbao/points-system.js` - 积分系统核心代码
- `nanrenbao/points-system.test.js` - 测试文件
- `nanrenbao/appreciate.html` - 欣赏页面（已集成）
- `nanrenbao/upload.html` - 上传页面（已集成）
