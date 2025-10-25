# woman

从 LetMeTryWomanKS 迁移至可复用的网页目录。

- pages/: 页面迁移目标（对齐小程序 pages 子目录）
- utils/: 工具方法（去除小程序特有 API，抽象为通用 Web 实现）
- assets/: 静态资源

后续：
1) 逐页梳理依赖，替换存储、网络、路由为 Web。
2) 在 LetMeTryAI 中建立公共样式与入口路由。
3) 从 pages/index 开始迁移与验证。
