import { loadProfileConfig } from './src/config/index.js';
import { generateTopicsWithAI } from './src/services/topic-selector.js';
import { fetchTrendingTopics } from './src/services/trending.js';

const profile = loadProfileConfig('nanrenbao');
const trending = await fetchTrendingTopics();

console.log('Trending context length:', trending?.length || 0);
console.log('\nGenerating topics...\n');

try {
  const result = await generateTopicsWithAI(profile, '2026-04-07');
  console.log('Result:', JSON.stringify(result, null, 2).slice(0, 2000));
} catch (e) {
  console.log('Error:', e.message);
}
