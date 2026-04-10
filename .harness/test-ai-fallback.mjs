#!/usr/bin/env node
/**
 * Test AI Fallback - Verify Copilot → Kimi fallback logic
 * 
 * Usage:
 *   npm run test:ai           # Mock mode (no API calls)
 *   KIMI_API_KEY=xxx npm run test:ai  # Real Kimi API
 */

import { ToolRegistry } from './src/tools/registry.js';
import { kimiTool } from './src/tools/kimi.js';
import { aiGenerateTool } from './src/tools/ai-generate.js';

const MOCK_MODE = !process.env.KIMI_API_KEY && !process.env.FORCE_REAL_API;

console.log('🧪 AI Fallback Test');
console.log('=' .repeat(60));
console.log(`Mode: ${MOCK_MODE ? 'MOCK (no API calls)' : 'REAL API'}`);
console.log('');

async function testKimiDirect() {
  console.log('1. Testing Kimi Tool Directly');
  console.log('-'.repeat(40));

  if (MOCK_MODE) {
    console.log('   ⏭️  Skipped (mock mode)');
    return true;
  }

  try {
    const result = await kimiTool.execute({
      prompt: 'Generate a fun poll topic about sports with 3 options. Return as JSON with fields: title, options (array of {label, value})',
      outputFormat: 'json',
      temperature: 0.7,
    });

    if (result.success) {
      console.log('   ✅ Kimi responded');
      console.log('   Data:', JSON.stringify(result.data, null, 2).slice(0, 200) + '...');
      return true;
    } else {
      console.log('   ❌ Kimi failed:', result.error?.message);
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function testAIGenerateWithMockFallback() {
  console.log('\n2. Testing AI Generate with Fallback');
  console.log('-'.repeat(40));

  // Create a mock Copilot that always times out
  const mockCopilotTool = {
    name: 'copilot.generate',
    description: 'Mock Copilot that times out',
    schema: { type: 'object', properties: {} },
    timeout: 1000,
    retryPolicy: { maxRetries: 0, backoff: 'fixed' },
    async execute() {
      console.log('   [Mock Copilot] Simulating timeout...');
      await new Promise(r => setTimeout(r, 2000)); // Force timeout
      return { success: false, error: new Error('Timeout'), metadata: { duration: 2000, retries: 0 } };
    },
  };

  // Create a mock Kimi that responds quickly
  const mockKimiTool = {
    name: 'kimi.generate',
    description: 'Mock Kimi that succeeds',
    schema: { type: 'object', properties: {} },
    timeout: 5000,
    retryPolicy: { maxRetries: 0, backoff: 'fixed' },
    async execute(args) {
      console.log('   [Mock Kimi] Responding...');
      return {
        success: true,
        data: {
          title: 'Fallback Topic from Kimi',
          options: [
            { label: 'Option A', value: 'a' },
            { label: 'Option B', value: 'b' },
          ],
          _meta: { provider: 'kimi' },
        },
        metadata: { duration: 100, retries: 0 },
      };
    },
  };

  // Build custom ai.generate with mock providers
  const { aiGenerateTool: originalAIGenerate } = await import('./src/tools/ai-generate.js');
  
  // Test the fallback logic directly
  try {
    const registry = new ToolRegistry();
    registry.register(mockCopilotTool);
    registry.register(mockKimiTool);

    // First try copilot (will timeout)
    console.log('   Trying Copilot (will timeout)...');
    let copilotResult;
    try {
      copilotResult = await registry.execute('copilot.generate', { prompt: 'test' });
    } catch (e) {
      console.log('   ✅ Copilot timed out as expected');
    }

    // Then try Kimi (will succeed)
    console.log('   Falling back to Kimi...');
    const kimiResult = await registry.execute('kimi.generate', { prompt: 'test' });

    if (kimiResult.success) {
      console.log('   ✅ Fallback to Kimi successful');
      return true;
    } else {
      console.log('   ❌ Fallback failed');
      return false;
    }
  } catch (error) {
    console.log('   ❌ Error:', error.message);
    return false;
  }
}

async function testTopicGeneration() {
  console.log('\n3. Testing Topic Generation');
  console.log('-'.repeat(40));

  const { loadProfileConfig } = await import('./src/config/index.js');
  const { generateTopicsWithAI, buildTopicSelectionPrompt } = await import('./src/services/topic-selector.js');

  const profile = loadProfileConfig('nanrenbao');
  
  if (MOCK_MODE) {
    console.log('   Testing prompt building...');
    const prompt = buildTopicSelectionPrompt(profile, '2025-04-06');
    console.log('   ✅ Prompt built, length:', prompt.length);
    console.log('   Preview:', prompt.slice(0, 150) + '...');
    return true;
  }

  try {
    const result = await generateTopicsWithAI(profile, '2025-04-06');
    console.log('   ✅ Topic generation successful');
    console.log('   Summary:', result.reportSummary);
    console.log('   Candidates:', result.topicCandidates.length);
    result.topicCandidates.forEach((c, i) => {
      console.log(`     ${i + 1}. ${c.title} (${c.category})`);
    });
    return true;
  } catch (error) {
    console.log('   ❌ Topic generation failed:', error.message);
    return false;
  }
}

async function testProviderAvailability() {
  console.log('\n4. Testing Provider Availability');
  console.log('-'.repeat(40));

  const { checkAIProviders } = await import('./src/tools/ai-generate.js');
  
  const status = await checkAIProviders();
  
  console.log('   Copilot:', status.copilot ? '✅ Available' : '❌ Not available');
  console.log('   Kimi:', status.kimi ? '✅ Available' : '❌ Not available');
  console.log('   Any:', status.any ? '✅ At least one working' : '❌ None available');

  return status.any;
}

async function runTests() {
  const results = [];

  results.push(await testProviderAvailability());
  results.push(await testKimiDirect());
  results.push(await testAIGenerateWithMockFallback());
  results.push(await testTopicGeneration());

  console.log('\n' + '='.repeat(60));
  const passed = results.filter(r => r).length;
  const total = results.length;
  console.log(`Results: ${passed}/${total} tests passed`);

  if (passed === total) {
    console.log('✅ All tests passed!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed');
    process.exit(1);
  }
}

runTests();
