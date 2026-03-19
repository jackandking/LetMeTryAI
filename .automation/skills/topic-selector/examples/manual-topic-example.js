/**
 * 人工选题优先机制示例
 * 
 * 演示如何使用 selectNextTopic 函数优先获取人工提交的选题
 */

import { 
  selectNextTopic, 
  peekManualTopics, 
  hasManualTopics,
  popManualTopic 
} from '../scripts/topic-selector.js';

console.log('=== 人工选题优先机制示例 ===\n');

// 品牌列表
const brands = ['man', 'woman', 'parent', 'elder'];

// 1. 查看各品牌当前队列状态
console.log('【1】查看各品牌队列状态:');
for (const brand of brands) {
  const topics = peekManualTopics(brand);
  if (topics.length > 0) {
    console.log(`  [${brand}] ${topics.length} 个选题待处理:`);
    topics.forEach((t, i) => console.log(`    ${i + 1}. ${t}`));
  } else {
    console.log(`  [${brand}] 队列为空，将使用 AI 选题`);
  }
}

console.log('\n【2】获取下一个选题 (selectNextTopic):');
for (const brand of brands) {
  const topic = selectNextTopic(brand);
  if (topic) {
    console.log(`  [${brand}] ✅ 人工选题: "${topic.title}"`);
  } else {
    console.log(`  [${brand}] ℹ️ 无人工选题，需要 AI 生成`);
  }
}

console.log('\n【3】使用场景示例:');
console.log(`
// 在发布流程中集成
async function publishNextApp(brandId) {
  // 1. 优先获取人工选题
  const manualTopic = selectNextTopic(brandId);
  
  if (manualTopic) {
    console.log('使用人工选题:', manualTopic.title);
    await createAndPublishApp(brandId, manualTopic.title);
  } else {
    // 2. 无人工选题，AI 生成
    console.log('无人工选题，调用 AI 生成...');
    const aiTopic = await generateAITopic(brandId);
    await createAndPublishApp(brandId, aiTopic.title);
  }
}
`);

console.log('【4】添加人工选题命令示例:');
console.log(`
# 添加单个选题
echo "坦克之王评选" >> topics/man-manual-topics.txt

# 批量添加
cat >> topics/man-manual-topics.txt << EOF
战斗机速度对比
最强战舰投票
EOF

# 使用 CLI 工具
node topics/scripts/topic-queue.js list man
node topics/scripts/topic-queue.js add man "新的选题"
`);
