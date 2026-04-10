import { loadProfileConfig } from './src/config/index.js';
import { buildTopicSelectionPrompt } from './src/services/topic-selector.js';
import { fetchTrendingTopics } from './src/services/trending.js';
import { defaultRegistry } from './src/tools/index.js';

const profile = loadProfileConfig('nanrenbao');
const trending = await fetchTrendingTopics();
const prompt = buildTopicSelectionPrompt(profile, '2026-04-07', trending);

console.log('Prompt length:', prompt.length);
console.log('\nGenerating...\n');

const result = await defaultRegistry.execute('ai.generate', {
  prompt,
  outputFormat: 'json',
  fallbackOnTimeout: true,
});

console.log('Result success:', result.success);
console.log('Result data type:', typeof result.data);

if (result.success) {
  const data = result.data;
  console.log('\nData keys:', Object.keys(data));
  console.log('Has topicCandidates:', 'topicCandidates' in data);
  console.log('topicCandidates type:', typeof data.topicCandidates);
  console.log('topicCandidates is array:', Array.isArray(data.topicCandidates));
  
  if (Array.isArray(data.topicCandidates)) {
    console.log('\n✅ SUCCESS! Candidates:', data.topicCandidates.length);
    data.topicCandidates.forEach((c, i) => {
      console.log(`  ${i+1}. [${c.category}] ${c.title}`);
    });
  } else {
    console.log('\n❌ topicCandidates is not an array');
    console.log('Raw data:', JSON.stringify(data, null, 2).slice(0, 1500));
  }
}
