#!/usr/bin/env node
/**
 * MVP Test Script - Verify Harness works end-to-end
 */
import { DailyAppAgent } from './src/agents/daily-app-agent.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.env.PROJECT_DIR || process.cwd();

console.log('🧪 Harness MVP Test\n');

async function test() {
  const profileId = process.argv[2] || 'nanrenbao';
  
  console.log(`Testing profile: ${profileId}`);
  console.log('=' .repeat(50));
  
  try {
    // Create agent
    const agent = new DailyAppAgent(profileId);
    
    // Run the pipeline
    const state = await agent.run();
    
    // Verify results
    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed!');
    console.log('\nResults:');
    console.log(`  Iterations: ${state.iteration}`);
    console.log(`  Final step: ${state.currentStep}`);
    console.log(`  Topic: ${state.data?.topic?.title || 'N/A'}`);
    console.log(`  App ID: ${state.data?.topic?.appId || 'N/A'}`);
    
    if (state.data?.appDir) {
      const appDir = state.data.appDir;
      console.log(`\n  Files created:`);
      const files = ['index.html', 'app.js', 'styles.css', 'metadata.json'];
      for (const file of files) {
        const exists = existsSync(join(appDir, file));
        console.log(`    ${exists ? '✓' : '✗'} ${file}`);
      }
    }
    
    return 0;
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error.message);
    console.error('\nStack:', error.stack);
    return 1;
  }
}

test().then(code => process.exit(code));
