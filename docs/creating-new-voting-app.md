# 如何快速上线新的投票应用 (Fast Track Guide)

本指南基于 `fighter-jets` 项目经验总结，帮助你快速创建一个类似 "XX之王" 的图片投票页面。

## 第0步：选题发现 (Phase 0: Topic Discovery)
在开始开发前，通过以下三步锁定流量话题：

1.  **寻找热点 (Trend Spotting)**
    *   **指令示例**：*“搜索今天的新闻热点”* 或 *“最近社交媒体上什么话题最火？”*
    *   关注微博热搜、抖音热门、科技/军事新闻版块。

2.  **受众过滤 (Audience Filter)**
    *   **指令示例**：*“从这些热点里，提炼一个[男性/女性/学生]感兴趣的话题。”*
    *   *男性典型话题*：军事（战机/航母）、硬核科技（显卡/AI）、汽车（超跑/越野）、体育（球星/赛事）。
    *   *女性典型话题*：时尚、美妆、情感、明星八卦。

3.  **形态匹配 (Format Match)**
    *   确保话题适合**“PK/投票”**的形式（有明确的竞争关系或强弱对比）。
    *   ✅ *好例子*：五代机最强是谁？（F-22 vs J-20）、梅西 vs C罗。
    *   ❌ *坏例子*：如何做红烧肉（教程类，无对抗性）。

## 核心流程 (The 3-Step Formula)

### 第一步：复制模版 (Clone & Rename)
直接复用 `fighter-jets` 文件夹作为模版，它已经包含了成熟的投票逻辑、移动端适配和统计图表。

**操作指令：**
> "把 fighter-jets 文件夹复制一份，重命名为 [新应用ID]（例如 supercars）。"

### 第二步：替换素材 (Assets & Config)
这是核心差异点。**吸取教训：图片必须本地化**。

1.  **准备图片**：找 5-10 张高清图，下载到新文件夹的 `images/` 目录。
    *   **关键动作**：*“帮我把这些图片压缩到 200KB 以内，并在 index.html 里引用它们。”*
    *   **格式建议**：使用 `.jpg` 或 `.png`，避免 SVG（不适合展示真实细节）或外链（不稳定）。

2.  **修改文案**：修改 `app.js` 中的配置对象 `questionConfig`。
    *   **指令示例**：
        > "修改 [新应用ID]/app.js，把题目改成'[你的问题]'，选项改成：[选项1, 选项2, ...]"

    *代码示例 (app.js):*
    ```javascript
    const questionConfig = {
        title: "全球超跑：谁是地表最强？",
        question: "在现代超跑中，你认为哪款是当之无愧的速度之王？",
        options: [
            { value: "ferrari", label: "法拉利 LaFerrari" },
            { value: "bugatti", label: "布加迪 Chiron" }
            // ...
        ],
        storageKey: "[新应用ID]_v1.data" // 确保key唯一
    };
    ```

### 第三步：注册与发布 (Register & Deploy)
让系统知道新页面的存在，并推送到线上。

1.  **注册应用**：在 `apps-metadata.json` 中添加新条目。
    ```json
    {
      "id": "[新应用ID]",
      "name": "[应用中文名]",
      "description": "[简短描述]",
      "category": "娱乐", // 或 军事/科技/生活
      "directory": "[新应用ID]",
      "url": "[新应用ID]",
      "image": "images/[封面图].jpg",
      "tags": ["投票", "排名", "热点"],
      "status": "active"
    }
    ```

2.  **推送上线**：
    *   **指令示例**：
        > "注册这个新应用，然后 git push 上线。"

### 第五步：发布到快手 (Step 5: Publishing to Kuaishou - Automated)
可以使用自动化脚本将应用发布为快手任务，这一步通常在应用部署上线后进行。

*   **脚本位置**: `scripts/publish-kuaishou-task.js`
*   **详细指南**: 请参阅 `docs/MCP-KUAISHOU-PUBLISH.md` 获取完整参数说明和操作流程。

**操作指令：**
> "帮我运行 scripts/publish-kuaishou-task.js 发布 [应用ID] 到快手。"

## 预期耗时
从有想法到上线，熟练后仅需 **5-10 分钟**。

## 经验总结 (Lessons Learned)
*   **找准切口**：选择具象化且自带流量的话题（如战机、超跑、猫咪品种）。
*   **资源本地化**：**不要使用外链图片**，避免 403 Forbidden 或加载失败。
*   **上线即验证**：部署后立即在真实手机环境访问 URL (`https://letmetryai.cn/[新应用ID]/`) 检查图片显示。

### ⚠️ 快手星火计划/小程序兼容性特别注意
在快手等小程序环境中，页面可能会被冻结或处于后台，导致 **JavaScript 定时器 (`setTimeout`) 失效或延迟执行**。
*   **禁止使用 setTimeout 做关键动画**：
    *   ❌ 错误：`setTimeout(() => { bar.style.height = ... }, 100)`
    *   ✅ 正确：使用 `requestAnimationFrame` 或直接设置 CSS 样式。
    *   *原因*：用户看完广告回到页面时，`setTimeout` 可能已经错过了执行时机，导致结果图表高度为 0（不可见）。
*   **广告回调兼容性**：
    *   URL 参数 `finishedAd` 可能是字符串 `'true'`、布尔值 `true` 或数字 `'1'`。务必使用宽松的检查条件：
    *   `if (val === 'true' || val === true || val === '1')`
*   **立即反馈**：检测到广告完成回调时，**立即**隐藏问卷并显示结果容器，不要等待数据加载或动画开始，避免用户看到白屏或无反应。
