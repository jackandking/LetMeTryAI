#!/usr/bin/env node
/**
 * 只运行 Topic Selection - 使用 ai.generate (支持 Copilot → Kimi fallback)
 */
import { loadProfileConfig } from './src/config/index.js';
import { generateTopicsWithAI, chooseBestTopic } from './src/services/topic-selector.js';
import { fetchTrendingTopics } from './src/services/trending.js';
import { checkAIProviders } from './src/tools/ai-generate.js';

const profileId = process.argv[2] || 'nanrenbao';
const profile = loadProfileConfig(profileId);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`🚀 Topic Selection - Profile: ${profileId}`);
console.log('═══════════════════════════════════════════════════════════════\n');

// 检查 AI Provider 可用性
console.log('📡 Checking AI providers...');
const providers = await checkAIProviders();
console.log(`   Copilot: ${providers.copilot ? '✅' : '❌'}`);
console.log(`   Kimi: ${providers.kimi ? '✅' : '❌'}`);
console.log(`   Fallback: ${providers.any ? '✅ Available' : '❌ None'}\n`);

if (!providers.any) {
  console.error('❌ No AI provider available. Please set KIMI_API_KEY or ensure Copilot is working.');
  process.exit(1);
}

console.log('📊 Profile:');
console.log(`  Name: ${profile.name}`);
console.log(`  Categories: ${profile.preferredCategories.join(', ')}`);
console.log('');

// 获取热点数据
console.log('⏳ Fetching trending topics...');
const trendingContext = await fetchTrendingTopics();
if (trendingContext) {
  console.log('✅ Trending data fetched\n');
} else {
  console.log('⚠️  No trending data (using default)\n');
}

// 使用 ai.generate (自动 fallback)
console.log('⏳ Generating topics with AI...');
console.log('   (Copilot → Kimi fallback enabled)\n');

try {
  const result = await generateTopicsWithAI(profile, new Date().toISOString().split('T')[0], trendingContext);
  
  console.log('\n📥 AI Response:');
  console.log(`  Provider: ${result.reportSummary || 'unknown'}`);
  console.log(`  Generated ${result.topicCandidates?.length || 0} candidates`);
  
  if (result.topicCandidates?.length > 0) {
    console.log('\n📝 Candidates:');
    result.topicCandidates.forEach((c, i) => {
      console.log(`  ${i + 1}. [${c.category}] ${c.title}`);
    });
    
    // 选择最佳话题
    const best = await chooseBestTopic(result.topicCandidates, profile);
    
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
  }
} catch (error) {
  console.error('\n❌ Topic generation failed:', error.message);
  console.log('\n💡 Troubleshooting:');
  console.log('   1. Check Copilot: copilot --version');
  console.log('   2. Set Kimi API Key: export KIMI_API_KEY=xxx');
  console.log('   3. Run test: npm run test:ai');
  process.exit(1);
}
