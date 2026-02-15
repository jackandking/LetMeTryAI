# 主页创意提交工作流程说明

## 📝 概述

当用户在主页提交创意后，系统会经历以下流程：

## 🔄 当前工作流程（v1.0）

### 1. 用户提交创意
用户可以通过两种方式提交创意：

#### 方式一：快速输入框
- 位置：主页顶部 Hero 区域
- 组件：`<input id="quick-idea-input">`
- 功能：
  - 用户输入简短创意标题（最多100字符）
  - 点击"开始创建"按钮
  - 自动滚动到详细表单并预填充标题
  - 焦点自动跳转到描述输入框

#### 方式二：完整表单
- 位置：页面底部 `<section id="submit-form">`
- 必填字段：
  - **创意标题**：3-100字符
  - **创意描述**：10-2000字符
- 可选字段：
  - **分类**：教育、娱乐、工具、生活、游戏、其他

### 2. 前端验证
文件：`main.js` → `validateIdeaLocal()` 函数（464-487行）

验证规则：
- ✅ 标题：必填，3-100字符
- ✅ 描述：必填，10-2000字符
- ✅ 分类：可选
- ❌ 验证失败：显示错误信息，不提交

### 3. 提交处理
文件：`main.js` → `handleFormSubmit()` 函数（391-459行）

**当前实现（模拟模式）**：
```javascript
// 第419-429行：模拟API调用
// 实际上并未发送到后端
await new Promise(resolve => setTimeout(resolve, 1000));

const result = {
    success: true,
    message: '创意提交成功！我们已经记录了您的想法。'
};
```

### 4. 用户反馈
- ✅ **成功提示**：
  - 显示绿色成功消息
  - 自动重置表单
  - 10秒后消息自动消失
  
- ❌ **失败提示**：
  - 显示红色错误消息
  - 保留表单内容
  - 用户可重新提交

## 🎯 设计的目标工作流程（待实现）

### 理想流程
文件：`util/github-util.js` → `createIssueFromIdea()` 函数

1. **前端提交** → 发送到 `/github/create-issue` 端点
2. **后端处理** → 创建GitHub Issue
3. **Issue格式**：
   - 标题：`[用户创意] {用户输入的标题}`
   - 内容：格式化的Markdown（见 `formatIssueBody()` 函数）
   - 标签：`['user-idea', 'enhancement']`
   - 指派：`@copilot`
4. **AI处理** → Copilot评估可行性并创建应用目录
5. **返回结果** → Issue URL和编号

### 缺失组件

#### ⚠️ 后端端点未实现
- **端点**：`https://letmetry.cloud/github/create-issue`
- **状态**：不存在（参考API文档：https://letmetry.cloud/api-docs）
- **影响**：前端使用模拟成功响应

#### 需要的后端功能
```javascript
POST /github/create-issue
Content-Type: application/json

Request Body:
{
  "title": "[用户创意] 智能诗词生成器",
  "body": "# 用户创意提交\n\n## 创意名称\n智能诗词生成器\n\n...",
  "labels": ["user-idea", "enhancement"],
  "assignees": ["copilot"]
}

Response:
{
  "success": true,
  "issueUrl": "https://github.com/jackandking/LetMeTryAI/issues/123",
  "issueNumber": 123,
  "message": "创意已提交成功！"
}
```

## 📊 当前状态总结

| 组件 | 状态 | 说明 |
|------|------|------|
| 前端表单 | ✅ 完成 | 完整的UI和验证 |
| 快速输入 | ✅ 完成 | Hero区域快速输入框 |
| 本地验证 | ✅ 完成 | 客户端字段验证 |
| GitHub工具 | ✅ 完成 | `util/github-util.js` 模块 |
| 后端端点 | ❌ 未实现 | `/github/create-issue` 不存在 |
| Issue创建 | ❌ 未集成 | 当前使用模拟响应 |

## 🔧 对用户的说明

**当前行为**：
- ✅ 您的创意**会被验证**
- ✅ 您会看到**成功提示**
- ✅ 表单会**自动重置**
- ⚠️ 创意**暂时不会**自动创建GitHub Issue
- ⚠️ 创意**暂时不会**触发AI处理

**为什么这样设计**：
- 前端功能已完整实现
- 等待后端Issue创建端点开发
- 使用模拟响应确保良好的用户体验

## 🚀 未来增强计划

### Phase 1: Backend Integration（待实现）
- [ ] 实现 `/github/create-issue` API端点
- [ ] 集成GitHub API token管理
- [ ] 实现Issue创建逻辑

### Phase 2: AI Processing（待实现）
- [ ] Copilot自动评估创意可行性
- [ ] 自动创建应用目录
- [ ] 生成初始代码框架

### Phase 3: User Tracking（待实现）
- [ ] 用户可以跟踪提交的创意
- [ ] 查看创意处理状态
- [ ] 接收处理结果通知

## 📚 相关文件

- **前端表单**：`index.html` (80-137行)
- **表单处理**：`main.js` (391-459行)
- **快速输入**：`main.js` (549-588行)
- **GitHub工具**：`util/github-util.js`
- **表单测试**：`homepage.test.js` (185-268行)
- **API配置**：`config.js` 和 `util/config.js`

## 🔗 参考资源

- API文档：https://letmetry.cloud/api-docs
- GitHub仓库：https://github.com/jackandking/LetMeTryAI
- Issue模板：`.github/ISSUE_TEMPLATE/feature-request.md`

## 💡 技术细节

### Issue格式化
```javascript
// util/github-util.js → formatIssueBody()
# 用户创意提交

## 创意名称
{title}

## 创意描述
{description}

## 分类
{category}

## 元数据
- 提交时间: {ISO timestamp}
- 来源: 主页创意提交表单

---

**注意**: 此issue由用户通过主页创意提交表单自动创建。
请 @copilot 评估此创意的可行性，并在项目根目录创建相应的应用目录。
```

### 安全考虑
- GitHub token应存储在后端
- 前端不应直接访问GitHub API
- 所有请求应通过后端代理
- 实现速率限制防止滥用

---

**更新日期**：2026-02-15  
**版本**：1.0  
**状态**：当前使用模拟响应，等待后端集成
