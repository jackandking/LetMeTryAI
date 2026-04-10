/**
 * Test Topic Selection Step Only
 */
import { chooseBestTopic } from './src/services/topic-selector.js';
import { loadProfileConfig } from './src/config/index.js';

const profile = loadProfileConfig('nanrenbao');

// Mock 话题候选（模拟 Copilot 返回）
const candidates = [
  {
    title: '现代战机巅峰对决：歼-20 vs F-22 vs 苏-57',
    description: '三款顶级五代战机，谁才是空中霸主？',
    category: '军事',
    appId: 'fighter-showdown',
    appName: '战机之王',
    options: [
      { label: '歼-20 威龙', value: 'j20', caption: '中国五代隐身战机' },
      { label: 'F-22 猛禽', value: 'f22', caption: '美国空中优势战机' },
      { label: '苏-57 重刑犯', value: 'su57', caption: '俄罗斯五代战机' }
    ]
  },
  {
    title: '二战最强坦克投票：虎式 vs T-34 vs 谢尔曼',
    description: '评选历史上最具影响力的坦克',
    category: '军事',
    appId: 'ww2-tank-king',
    appName: '坦克之王',
    options: [
      { label: '虎式坦克', value: 'tiger', caption: '德国重型坦克' },
      { label: 'T-34', value: 't34', caption: '苏联中型坦克' },
      { label: '谢尔曼', value: 'sherman', caption: '美国中型坦克' }
    ]
  },
  {
    title: 'AI芯片王者争霸：华为昇腾 vs 英伟达 vs AMD',
    description: '谁是AI算力之王？',
    category: '科技',
    appId: 'ai-chip-king',
    appName: 'AI芯片之王',
    options: [
      { label: '华为昇腾', value: 'ascend', caption: '国产AI芯片' },
      { label: '英伟达H100', value: 'h100', caption: '行业标杆' },
      { label: 'AMD MI300', value: 'mi300', caption: '挑战者' }
    ]
  },
  {
    title: '经典街机游戏回忆：拳皇 vs 街霸 vs 铁拳',
    description: '哪款格斗游戏是你的童年回忆？',
    category: '游戏',
    appId: 'arcade-fighter',
    appName: '街机格斗之王',
    options: [
      { label: '拳皇97', value: 'kof', caption: 'SNK经典' },
      { label: '街头霸王', value: 'sf', caption: '卡普空招牌' },
      { label: '铁拳', value: 'tekken', caption: '3D格斗先驱' }
    ]
  }
];

console.log('═══════════════════════════════════════════════════════════════');
console.log('📋 Topic Selection Test - Profile: 男人宝 (nanrenbao)');
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📝 Candidate Topics:');
candidates.forEach((c, i) => {
  console.log(`  ${i + 1}. [${c.category}] ${c.title}`);
});

console.log('\n⚖️  Profile Preferences:');
console.log(`  Categories: ${profile.preferredCategories.join(', ')}`);
console.log(`  Do More: ${profile.topicGuidelines.doMore.join(', ')}`);
console.log(`  Avoid: ${profile.topicGuidelines.avoid.join(', ')}`);

const best = chooseBestTopic(candidates, profile);

console.log('\n🎯 SELECTED TOPIC:');
console.log('───────────────────────────────────────────────────────────────');
console.log(`  Title:       ${best.title}`);
console.log(`  App Name:    ${best.appName}`);
console.log(`  App ID:      ${best.appId}`);
console.log(`  Category:    ${best.category}`);
console.log(`  Description: ${best.description}`);
console.log('\n  Options:');
best.options.forEach((opt, i) => {
  console.log(`    ${i + 1}. ${opt.label} (${opt.value})`);
  console.log(`       ${opt.caption}`);
});
console.log('───────────────────────────────────────────────────────────────');
