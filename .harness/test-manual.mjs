#!/usr/bin/env node
/**
 * Manual Test - Test Harness without Copilot dependency
 * Uses mock data to verify the pipeline works
 */
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd().endsWith('.harness') 
  ? join(process.cwd(), '..') 
  : process.cwd();

console.log('🧪 Harness Manual Test (Mock Mode)\n');

// Mock topic data
const mockTopic = {
  appId: `harness-test-${Date.now()}`,
  title: 'Harness MVP Test Topic',
  pageTitle: 'Harness Test Page',
  appName: 'Harness Test App',
  summary: 'Testing the Harness system',
  description: 'A test voting app to verify Harness works',
  question: 'Which option do you prefer?',
  category: 'test',
  keywords: ['test', 'harness'],
  options: [
    { label: 'Option A', value: 'option-a', caption: 'First test option', alt: 'Option A', image: 'a.svg' },
    { label: 'Option B', value: 'option-b', caption: 'Second test option', alt: 'Option B', image: 'b.svg' },
  ],
};

// Mock profile
const mockProfile = {
  id: 'test',
  name: 'Test',
  preferredCategories: ['test'],
  topicGuidelines: { doMore: [], avoid: [] },
  constraints: {
    forbiddenKeywords: ['最', '第一'],
  },
};

// Test scaffold generation
async function testScaffold() {
  console.log('1. Testing scaffold generation...');
  
  // Read template
  const templatePath = join(PROJECT_ROOT, 'fighter-jets', 'styles.css');
  if (!existsSync(templatePath)) {
    console.error('❌ Template not found:', templatePath);
    return false;
  }
  
  const stylesTemplate = readFileSync(templatePath, 'utf-8');
  console.log('   ✓ Template loaded');
  
  // Generate scaffold
  const { generateScaffold } = await import('./src/services/scaffold.js');
  const scaffold = generateScaffold(mockTopic, mockProfile, stylesTemplate);
  
  console.log('   ✓ Scaffold generated');
  console.log(`     - Files: ${Object.keys(scaffold.files).join(', ')}`);
  console.log(`     - Images: ${scaffold.images.join(', ')}`);
  
  return { scaffold, stylesTemplate };
}

// Test file materialization
async function testMaterialize(scaffold) {
  console.log('\n2. Testing file materialization...');
  
  const appDir = join(PROJECT_ROOT, scaffold.outputDir);
  
  // Clean up if exists
  if (existsSync(appDir)) {
    rmSync(appDir, { recursive: true });
  }
  
  // Create directory and files
  mkdirSync(appDir, { recursive: true });
  mkdirSync(join(appDir, 'images'), { recursive: true });
  
  for (const [filename, content] of Object.entries(scaffold.files)) {
    writeFileSync(join(appDir, filename), content, 'utf-8');
    console.log(`   ✓ ${filename}`);
  }
  
  console.log(`   ✓ Directory: ${scaffold.outputDir}`);
  
  return appDir;
}

// Test constraints
async function testConstraints() {
  console.log('\n3. Testing constraints engine...');
  
  const { ConstraintsEngine } = await import('./src/constraints/engine.js');
  const constraints = new ConstraintsEngine('nanrenbao');
  
  // Test valid topic
  const validTopic = { ...mockTopic };
  try {
    await constraints.validateTopicAllowed(validTopic);
    console.log('   ✓ Valid topic passed');
  } catch (e) {
    console.log('   ✗ Valid topic failed:', e.message);
  }
  
  // Test topic with forbidden keyword
  const invalidTopic = { ...mockTopic, title: '这是最好的测试' };
  try {
    await constraints.validateTopicAllowed(invalidTopic);
    console.log('   ✗ Invalid topic should have failed');
  } catch (e) {
    console.log('   ✓ Invalid topic correctly blocked');
  }
}

// Test config
async function testConfig() {
  console.log('\n4. Testing configuration...');
  
  const { loadProfileConfig, PATHS } = await import('./src/config/index.js');
  
  const profile = loadProfileConfig('nanrenbao');
  console.log(`   ✓ Profile loaded: ${profile.name}`);
  console.log(`   ✓ Categories: ${profile.preferredCategories.slice(0, 3).join(', ')}...`);
  console.log(`   ✓ Project root: ${PATHS.projectRoot}`);
}

// Test ReAct loop
async function testReactLoop() {
  console.log('\n5. Testing ReAct loop...');
  
  const { ReActLoop } = await import('./src/workflows/react-loop.js');
  
  const loop = new ReActLoop({ maxIterations: 5 });
  
  // Register mock actions
  loop.registerAction('step1', async () => {
    console.log('   → Executing step1');
    return { next: 'step2', data: { step1: true } };
  });
  
  loop.registerAction('step2', async () => {
    console.log('   → Executing step2');
    return { next: 'done', data: { step2: true } };
  });
  
  const task = {
    id: 'test-task',
    type: 'daily_app_creation',
    profileId: 'test',
    status: 'idle',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {},
  };
  
  const state = await loop.run(task, {
    states: ['step1', 'step2', 'done'],
    initialState: 'step1',
    completionCheck: (s) => s.currentStep === 'done',
  });
  
  console.log(`   ✓ Loop completed in ${state.iteration} iterations`);
  console.log(`   ✓ History: ${state.history.length} steps`);
}

// Main test runner
async function runTests() {
  try {
    // Test config first
    await testConfig();
    
    // Test scaffold
    const { scaffold } = await testScaffold();
    
    // Test materialize
    const appDir = await testMaterialize(scaffold);
    
    // Test constraints
    await testConstraints();
    
    // Test ReAct loop
    await testReactLoop();
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ All manual tests passed!');
    console.log('\nGenerated app location:');
    console.log(`  ${appDir}`);
    
    return 0;
  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(error.message);
    console.error(error.stack);
    return 1;
  }
}

runTests().then(code => process.exit(code));
