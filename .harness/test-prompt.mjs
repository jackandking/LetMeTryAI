// 直接测试 Kimi CLI 返回的格式
import { spawn } from 'child_process';

const prompt = `今天是 2026-04-07。

为 LetMeTryAI 的"男人宝"品牌挑选适合做投票页的热点话题。

品牌定位：男人宝
优先类别：军事、科技、汽车、体育、历史、游戏
优先方向：军事装备与历史、科技数码、汽车文化、体育赛事
避免方向：情感故事、过度娱乐八卦、纯女性消费

今日热搜参考（仅供灵感，不必照搬，需结合品牌定位筛选）：
【百度热搜】1. 以崭新政治面貌迎接建军一百周年 2. 三预警齐发！多地有10级雷暴大风 3. 《哪吒2》票房升至全球第4 4. "春日经济"有多火 5. 35岁程序员辞职卖肉蛋堡月入5万 6. 中方回应促使伊朗同意停火 7. 美伊停火后 首批船只通过霍尔木兹 8. 樊振东自愿放弃伦敦世乒赛资格
【头条热榜】1. 外交部回应朝鲜发射弹道导弹 2. 如何看待A股再现放量大涨 3. 聚焦服务业 这场大会释放有力信号 4. 王树国与张迈曾在西安交大再重逢 5. 反超美国 全球更认可中国领导力 6. 以色列国防军宣布暂停打击伊朗 7. 12岁男孩一招"修好"妈妈坏屏手机 8. 人民币上有个哭出来的笑脸

重要：优先从今日热搜中选择与品牌定位相关的话题，或将热点元素融入选题。避免选择过于冷门或与当前时事完全无关的话题。

请返回 JSON 格式：
{
  "profileId": "nanrenbao",
  "reportSummary": "一句话中文总结",
  "topicCandidates": [
    {
      "appId": "kebab-case-id",
      "title": "主题标题（不含极限词）",
      "pageTitle": "页面标题",
      "appName": "应用名称",
      "summary": "为何适合做投票",
      "description": "metadata描述",
      "question": "投票问题句子",
      "category": "分类",
      "keywords": ["关键词"],
      "options": [
        {
          "label": "选项名",
          "value": "kebab-id",
          "caption": "展示文案",
          "alt": "图片alt",
          "image": "kebab-id.svg"
        }
      ]
    }
  ]
}

要求：
- 提供 3 个 topicCandidates
- 每个候选必须有 2-4 个 options
- appId、options.value、options.image 必须是 ASCII kebab-case
- 标题和appName中禁止使用极限词：最、第一、唯一、极致、绝对、顶级、史上、全网
- 适合手机阅读的图文投票页
- 避免低俗、侵权、血腥、政治敏感、医疗误导

重要：只返回纯 JSON 格式，不要 markdown 代码块，不要其他文字。`;

console.log('Calling Kimi CLI...\n');

const child = spawn('kimi', [
  '-p', prompt,
  '--print',
  '--final-message-only',
  '--yolo',
], { stdio: ['ignore', 'pipe', 'pipe'] });

let stdout = '';
let stderr = '';

child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });

child.on('close', (code) => {
  console.log('Exit code:', code);
  console.log('\n=== Raw output ===');
  console.log(stdout.slice(0, 2000));
  
  try {
    const parsed = JSON.parse(stdout);
    console.log('\n✅ Valid JSON!');
    console.log('topicCandidates:', parsed.topicCandidates?.length || 0);
  } catch (e) {
    console.log('\n❌ Not valid JSON:', e.message);
  }
});
