# Web Scraping Skills Collection

可复用的 Web 爬虫技能集合，专为 AI Agents 设计。

## 技能概览

| Skill | 描述 | 适用场景 |
|-------|------|----------|
| `web-scraper-playwright` | 浏览器自动化基础 | 任何需要登录状态的爬虫 |
| `pagination-handler` | 分页数据处理 | 多页数据抓取 |
| `data-deduplication` | 数据去重清洗 | 数据合并、重复处理 |
| `anti-blocking` | 防卡死/反屏蔽 | 复杂 UI、弹窗遮挡 |
| `kuaishou-crawler` | 快手专用爬虫 | 快手创作者平台数据 |
| `topic-selector` | 选题排序 | 按品牌人群筛选热点话题 |
| `brand-profiles` | 品牌策略配置 | 男人宝/女人爱/爱老人/家长爱等差异化策略 |
| `voting-app-scaffold` | 投票页脚手架 | 按 fighter-jets 模式生成 app 配置、HTML 选项和 metadata |
| `kuaishou-publisher` | 快手发布编排 | 复用现有发布脚本完成星火计划任务发布 |
| `idea-to-launch` | 端到端编排 | 从选题到上线、发布、发报告的总控流程 |
| `report-sender` | 报告发送 | 自动化邮件报告 |

## 快速开始

### 场景 1：简单分页抓取

```javascript
// 只需要 pagination-handler
import { handleNumberedPagination } from './pagination-handler/scripts/pagination.js';

const data = await handleNumberedPagination(page, {
    getTotalPages: async (p) => 5,
    extractPageData: async (p) => {
        return await p.evaluate(() => {
            return Array.from(document.querySelectorAll('.item'))
                .map(el => ({ title: el.textContent }));
        });
    },
    onPageChange: async (p, num) => {
        await p.click(`a[page="${num}"]`);
        await p.waitForTimeout(2000);
    }
});
```

### 场景 2：需要登录 + 分页

```javascript
// 组合 web-scraper-playwright + pagination-handler
import { scrapeWithSession } from './web-scraper-playwright/scripts/scraper.js';
import { handleNumberedPagination } from './pagination-handler/scripts/pagination.js';

const allData = await scrapeWithSession('https://example.com/list', async (page) => {
    return await handleNumberedPagination(page, paginationConfig);
});
```

### 场景 3：复杂网站（登录 + 分页 + 去重 + 防卡死）

```javascript
// 完整组合
import { scrapeWithSession } from './web-scraper-playwright/scripts/scraper.js';
import { handleNumberedPagination } from './pagination-handler/scripts/pagination.js';
import { deduplicateById } from './data-deduplication/scripts/dedup.js';
import { withRecovery, closeOverlay } from './anti-blocking/scripts/anti-blocking.js';

async function robustScraper() {
    const rawData = await scrapeWithSession(url, async (page) => {
        return await handleNumberedPagination(page, {
            extractPageData: async (p) => {
                return await withRecovery(p, async () => {
                    await closeOverlay(p);
                    return await extractWithForceClick(p);
                });
            }
        });
    });
    
    return deduplicateById(rawData, 'id');
}
```

### 场景 4：快手完整流程

```javascript
// 使用专门的 kuaishou-crawler（已集成所有基础技能）
import { KuaishouCrawler } from './kuaishou-crawler/scripts/crawler.js';
import { ReportSender } from './report-sender/scripts/sender.js';

const crawler = new KuaishouCrawler();
await crawler.init();

const data = await crawler.scrapeAllTasks({ includeStats: true });
await crawler.saveResults(data);
await crawler.close();

// 发送报告
const sender = new ReportSender();
await sender.send({
    to: 'user@example.com',
    subject: 'Kuaishou Report',
    template: 'kuaishou',
    data,
    attachments: ['metrics/kuaishou/latest.csv']
});
```

### 场景 5：同一技术流程，不同品牌选题

```javascript
import { getBrandProfile } from './brand-profiles/scripts/profile-loader.js';
import { rankTopicCandidates } from './topic-selector/scripts/topic-selector.js';

const profile = getBrandProfile('womanai');
const ranked = rankTopicCandidates(topicCandidates, profile, { limit: 3 });

console.log(ranked[0]);
```

### 场景 6：从选题结果生成投票页脚手架

```javascript
import { getBrandProfile } from './brand-profiles/scripts/profile-loader.js';
import { buildTopicBrief } from './topic-selector/scripts/topic-selector.js';
import { buildScaffoldPlan } from './voting-app-scaffold/scripts/scaffold.js';

const profile = getBrandProfile('nanrenbao');
const topicBrief = buildTopicBrief(bestTopic.candidate, profile);

const scaffold = buildScaffoldPlan({
    appId: 'top-supercars',
    appName: '超跑擂台',
    category: '娱乐',
    topicBrief,
    brandProfile: profile,
    options
});

console.log(scaffold.files.appJsQuestionConfig);
console.log(scaffold.metadataEntry);
```

### 场景 7：部署后发布到快手

```javascript
import { buildPublishPlan } from './kuaishou-publisher/scripts/publisher.js';

const publishPlan = buildPublishPlan({
    appId: 'top-supercars',
    appName: '超跑擂台',
    description: '投票选出最让人心动的超跑',
    deployedUrl: 'https://letmetryai.cn/top-supercars/'
});

console.log(publishPlan.command);
console.log(publishPlan.checklist);
```

### 场景 8：从选题一路编排到上线和发报告

```javascript
import { buildLaunchWorkflow } from './idea-to-launch/workflows/launch.js';

const workflow = buildLaunchWorkflow({
    profileId: 'nanrenbao',
    topicCandidates,
    appId: 'top-supercars',
    appName: '超跑擂台',
    category: '娱乐',
    options
});

console.log(workflow.summary);
console.log(workflow.steps);
```

## 技能依赖关系

```
kuaishou-crawler (组合)
    ├── web-scraper-playwright (基础)
    ├── pagination-handler (分页)
    ├── data-deduplication (去重)
    └── anti-blocking (防卡死)

report-sender (独立)
    └── 可连接任何数据源

topic-selector (内容策略)
    └── 依赖 brand-profiles 提供品牌/人群规则

brand-profiles (配置)
    └── 为男人宝、女人爱、爱老人、家长爱等提供独立画像

voting-app-scaffold (应用生成)
    ├── 消费 topic-selector 的输出
    ├── 生成 app.js questionConfig
    ├── 生成 index.html 选项片段
    └── 生成 apps-metadata.json 条目

kuaishou-publisher (发布编排)
    ├── 复用 scripts/publish-kuaishou-task.js
    ├── 连接 kuaishou-scraper / anti-blocking / web-scraper-playwright
    └── 输出命令、检查清单与发布计划

idea-to-launch (总控编排)
    ├── 组合 brand-profiles / topic-selector
    ├── 组合 voting-app-scaffold
    ├── 组合 kuaishou-publisher
    └── 组合 report-sender
```

## 目录结构

```
.agents/skills/
├── README.md (本文件)
├── web-scraper-playwright/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── scraper.js
│   └── examples/
├── pagination-handler/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── pagination.js
│   └── examples/
├── data-deduplication/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── dedup.js
│   └── examples/
├── anti-blocking/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── anti-blocking.js
│   └── examples/
├── kuaishou-crawler/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── crawler.js
│   └── examples/
├── topic-selector/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── topic-selector.js
│   └── examples/
├── brand-profiles/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── profile-loader.js
│   ├── profiles/
│   └── examples/
├── voting-app-scaffold/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── scaffold.js
│   └── examples/
├── kuaishou-publisher/
│   ├── SKILL.md
│   ├── scripts/
│   │   └── publisher.js
│   └── examples/
├── idea-to-launch/
│   ├── SKILL.md
│   ├── workflows/
│   │   └── launch.js
│   └── examples/
└── report-sender/
    ├── SKILL.md
    ├── scripts/
    │   └── sender.js
    └── examples/
```

## 添加新技能

1. 创建目录：`mkdir new-skill`
2. 编写 `SKILL.md`（必须）
3. 添加 `scripts/` 核心代码
4. 添加 `examples/` 示例
5. 更新本 README

## 在 Kimi CLI 中使用

这些 skills 放在 `.agents/skills/` 目录下，Kimi CLI 会自动加载。

使用时只需要说：

> "帮我用 kuaishou-crawler 抓取快手数据并发送邮件报告"

Kimi 会自动引用相关 skill 的知识。

## 在其他 AI Agent 中使用

这些 skills 是标准 Markdown + JS，可以被任何 AI 系统使用：

1. **Claude Desktop**: 复制 skills 目录到 `~/.claude/skills/`
2. **Cursor**: 复制到项目 `.cursor/skills/`
3. **VS Code Copilot**: 已在项目 `.agents/skills/` 中
4. **自定义 Agent**: 读取 SKILL.md 获取指导

## 最佳实践

1. **从简单开始**: 先用 `web-scraper-playwright` 测试基本流程
2. **按需组合**: 遇到分页加 `pagination-handler`，遇到去重加 `data-deduplication`
3. **复用专用技能**: 爬快手直接用 `kuaishou-crawler`，不用从零组合
4. **品牌差异走配置**: 男人宝、女人爱、爱老人、家长爱的差异优先放到 `brand-profiles`
5. **应用生成走模板**: 新投票页优先走 `voting-app-scaffold`，保持 fighter-jets 结构一致
6. **发布复用事实脚本**: 快手发布优先走 `kuaishou-publisher`，不要平行复制 Playwright 流程
7. **总控负责编排**: 端到端流程优先放进 `idea-to-launch`，底层 skill 继续保持单一职责
8. **保持独立**: 每个 skill 都能独立工作，不强制依赖其他 skill
