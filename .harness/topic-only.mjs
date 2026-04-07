#!/usr/bin/env node
/**
 * 只运行 Topic Selection - 调用真实 Copilot
 */
import { spawn } from 'child_process';
import { loadProfileConfig } from './src/config/index.js';
import { buildTopicSelectionPrompt, parseTopicSelectionResponse, chooseBestTopic } from './src/services/topic-selector.js';

const profileId = process.argv[2] || 'nanrenbao';
const profile = loadProfileConfig(profileId);

console.log('═══════════════════════════════════════════════════════════════');
console.log(`🚀 Real Topic Selection - Profile: ${profileId}`);
console.log('═══════════════════════════════════════════════════════════════\n');

console.log('📊 Profile:');
console.log(`  Name: ${profile.name}`);
console.log(`  Categories: ${profile.preferredCategories.join(', ')}`);
console.log('');

// 构建 prompt
const prompt = buildTopicSelectionPrompt(profile);

console.log('⏳ Calling Copilot (gpt-5-mini)...');
console.log('   This may take 10-30 seconds...\n');

const copilotBin = process.env.COPILOT_BIN || 'copilot';
const args = [
  '--model', 'gpt-5-mini',
  '--allow-all-tools',
  '--output-format', 'json',
  '--yolo',
  '-p', prompt,
];

const child = spawn(copilotBin, args, {
  stdio: ['ignore', 'pipe', 'pipe'],
  env: process.env,
  timeout: 300000,
});

let stdout = '';
let stderr = '';

child.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
child.stderr?.on('data', (chunk) => { stderr += chunk.toString(); });

child.on('close', async (code) => {
  if (code !== 0) {
    console.error('❌ Copilot failed:', stderr || 'Unknown error');
    process.exit(1);
  }

  // Parse JSON event stream
  const lines = stdout.split('\n').filter(Boolean);
  const events = lines.map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean);

  const assistantMsg = [...events].reverse()
    .find(e => e.type === 'assistant.message' && e.data?.content);

  if (!assistantMsg?.data?.content) {
    console.error('❌ No response from Copilot');
    process.exit(1);
  }

  const content = assistantMsg.data.content;
  
  // 提取 JSON 部分
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('❌ No JSON found in response');
    console.log('Raw response:', content.substring(0, 500));
    process.exit(1);
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    
    console.log('\n📥 Copilot Response:');
    console.log(`  Generated ${parsed.topicCandidates?.length || 0} candidates`);
    
    if (parsed.topicCandidates?.length > 0) {
      console.log('\n📝 Candidates:');
      parsed.topicCandidates.forEach((c, i) => {
        console.log(`  ${i + 1}. [${c.category}] ${c.title}`);
      });
      
      // 选择最佳话题
      const best = await chooseBestTopic(parsed.topicCandidates, profile);
      
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
  } catch (e) {
    console.error('❌ Failed to parse response:', e.message);
    console.log('Raw content:', content.substring(0, 1000));
  }
});
