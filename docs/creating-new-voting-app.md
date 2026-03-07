# 如何快速上线新的投票应用 (Fast Track Guide)

本指南基于 `fighter-jets` 项目经验总结，帮助你快速创建一个类似 "XX之王" 的图片投票页面。

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

## 预期耗时
从有想法到上线，熟练后仅需 **5-10 分钟**。

## 经验总结 (Lessons Learned)
*   **找准切口**：选择具象化且自带流量的话题（如战机、超跑、猫咪品种）。
*   **资源本地化**：**不要使用外链图片**，避免 403 Forbidden 或加载失败。
*   **上线即验证**：部署后立即在真实手机环境访问 URL (`https://letmetryai.cn/[新应用ID]/`) 检查图片显示。
