/**
 * 真实运行 Topic Selection - 调用 Copilot
 */
import { DailyAppAgent } from './src/agents/daily-app-agent.js';
import { loadProfileConfig } from './src/config/index.js';

const profileId = process.argv[2] || 'nanrenbao';

console.log('═══════════════════════════════════════════════════════════════');
console.log(`🚀 Real Topic Selection - Profile: ${profileId}`);
console.log('═══════════════════════════════════════════════════════════════\n');

const profile = loadProfileConfig(profileId);
console.log('📊 Profile Config:');
console.log(`  Name: ${profile.name}`);
console.log(`  Categories: ${profile.preferredCategories.join(', ')}`);
console.log(`  Do More: ${profile.topicGuidelines.doMore.join(', ')}`);
console.log('');

const agent = new DailyAppAgent(profileId);

// 拦截后续步骤，只运行第一步
const originalRegister = agent.loop.registerAction.bind(agent.loop);
let firstStepComplete = false;

agent.loop.registerAction = (step, handler) => {
  if (step === 'topic_selection') {
    // 包装第一步，输出结果后终止
    originalRegister(step, async (state) => {
      const result = await handler(state);
      
      if (result.data?.topic) {
        const topic = result.data.topic;
        console.log('\n🎯 COPILOT GENERATED TOPIC:');
        console.log('───────────────────────────────────────────────────────────────');
        console.log(`  Title:       ${topic.title}`);
        console.log(`  App Name:    ${topic.appName}`);
        console.log(`  App ID:      ${topic.appId}`);
        console.log(`  Category:    ${topic.category}`);
        console.log(`  Description: ${topic.description}`);
        console.log('\n  Options:');
        topic.options.forEach((opt, i) => {
          console.log(`    ${i + 1}. ${opt.label} (${opt.value})`);
          console.log(`       ${opt.caption}`);
        });
        console.log('───────────────────────────────────────────────────────────────');
      }
      
      firstStepComplete = true;
      // 强制跳到 done，跳过后续步骤
      return { next: 'done', data: result.data };
    });
  } else if (step === 'done') {
    originalRegister(step, async () => {
      console.log('\n✅ Topic selection complete!');
      process.exit(0);
    });
  }
  // 其他步骤不注册
};

console.log('⏳ Calling Copilot for topic generation...\n');
await agent.run();
