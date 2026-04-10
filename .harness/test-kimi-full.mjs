import { kimiTool } from './src/tools/kimi.js';

const prompt = `今天是 2026-04-07。为"男人宝"品牌挑选适合做投票页的热点话题。
品牌定位：男人宝
优先类别：军事、科技、汽车、体育、历史、游戏

请返回 JSON 格式：
{
  "profileId": "nanrenbao",
  "reportSummary": "一句话中文总结",
  "topicCandidates": [
    {
      "appId": "kebab-case-id",
      "title": "主题标题",
      "category": "军事",
      "options": [{"label":"选项","value":"opt","caption":"说明"}]
    }
  ]
}

要求：
- 提供 3 个 topicCandidates
- 每个候选必须有 2-4 个 options
重要：只返回纯 JSON 格式，不要 markdown 代码块，不要其他文字。`;

console.log('Testing Kimi tool with JSON output...\n');

const result = await kimiTool.execute({
  prompt,
  outputFormat: 'json',
});

console.log('Success:', result.success);
if (result.success) {
  console.log('\nData type:', typeof result.data);
  console.log('Has topicCandidates:', result.data && typeof result.data === 'object' && 'topicCandidates' in result.data);
  console.log('\nData preview:', JSON.stringify(result.data, null, 2).slice(0, 1000));
} else {
  console.log('Error:', result.error?.message);
}
