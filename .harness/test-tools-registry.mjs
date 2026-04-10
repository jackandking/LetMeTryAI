/**
 * Test Tool Registry - Verify video tools are registered
 */

import { createToolRegistry } from './src/tools/index.js';

async function testToolRegistry() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔧 Testing Tool Registry');
  console.log('═══════════════════════════════════════════════════════════════\n');

  const registry = createToolRegistry();
  const toolNames = registry.listTools();
  
  console.log('Registered tools:');
  toolNames.forEach(name => {
    console.log(`  ✓ ${name}`);
  });
  
  console.log(`\nTotal: ${toolNames.length} tools registered\n`);

  // Check video tools
  const videoTools = [
    'video.generate',
    'video.publish', 
    'video.workflow'
  ];
  
  console.log('Video tools status:');
  let allPresent = true;
  for (const toolName of videoTools) {
    const hasTool = toolNames.includes(toolName);
    const status = hasTool ? '✅' : '❌';
    console.log(`  ${status} ${toolName}`);
    if (!hasTool) allPresent = false;
  }
  
  console.log('');
  
  // Check AI tools
  const aiTools = [
    'ai.generate',
    'copilot.generate',
    'kimi.generate'
  ];
  
  console.log('AI tools status:');
  for (const toolName of aiTools) {
    const hasTool = toolNames.includes(toolName);
    const status = hasTool ? '✅' : '❌';
    console.log(`  ${status} ${toolName}`);
    if (!hasTool) allPresent = false;
  }
  
  return allPresent;
}

async function main() {
  console.log('\n🚀 Tool Registry Test\n');
  
  try {
    const success = await testToolRegistry();
    
    if (success) {
      console.log('\n✅ All tools registered correctly!\n');
      process.exit(0);
    } else {
      console.log('\n❌ Some tools missing!\n');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
