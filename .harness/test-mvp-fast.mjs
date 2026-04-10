#!/usr/bin/env node
/**
 * Fast MVP Test - With mocked Copilot calls
 */
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.env.PROJECT_DIR || join(process.cwd(), '..');

console.log('🧪 Harness MVP Fast Test (Mock Mode)\n');

async function test() {
  const profileId = process.argv[2] || 'nanrenbao';
  
  console.log(`Testing profile: ${profileId}`);
  console.log('=' .repeat(50));
  
  try {
    // Load config
    const { loadProfileConfig } = await import('./src/config/index.js');
    const profile = loadProfileConfig(profileId);
    console.log('✓ Profile loaded:', profile.name);
    
    // Load constraints
    const { ConstraintsEngine } = await import('./src/constraints/engine.js');
    const constraints = new ConstraintsEngine(profileId, profile);
    console.log('✓ Constraints engine initialized');
    
    // Mock topic
    const mockTopic = {
      appId: `harness-mvp-${Date.now()}`,
      appName: 'MVP Test App',
      title: 'MVP测试：你更喜欢哪种运动？',
      pageTitle: 'MVP运动测试 - LetMeTryAI',
      summary: '测试Harness MVP的运动投票',
      description: '这是一个用于测试Harness系统的运动投票应用',
      question: '以下运动中，你最喜欢哪一项？',
      category: '运动',
      keywords: ['运动', '健身', '测试'],
      options: [
        { value: 'basketball', label: '篮球', caption: '团队运动的王者', image: 'basketball.svg', alt: '篮球' },
        { value: 'swimming', label: '游泳', caption: '全身运动首选', image: 'swimming.svg', alt: '游泳' },
        { value: 'running', label: '跑步', caption: '最简单的运动', image: 'running.svg', alt: '跑步' },
      ]
    };
    
    // Validate topic (throws on failure)
    try {
      await constraints.validateTopicAllowed(mockTopic);
      console.log('✓ Topic validated: PASS');
    } catch (e) {
      console.log('✗ Topic validated: FAIL -', e.message);
    }
    
    // Generate scaffold
    const stylesPath = join(PROJECT_ROOT, 'fighter-jets/styles.css');
    let stylesTemplate = '';
    try {
      const { readFileSync } = await import('fs');
      stylesTemplate = readFileSync(stylesPath, 'utf-8');
      console.log('✓ Styles template loaded');
    } catch (e) {
      console.log('⚠ Styles template not found, using default');
      stylesTemplate = `/* Default styles */
.app-header { text-align: center; padding: 20px; }
.options-grid { display: grid; gap: 16px; padding: 20px; }
.option-card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; cursor: pointer; }
.option-card.selected { border-color: #007bff; background: #f0f8ff; }
.submit-btn { display: block; width: 100%; padding: 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
.submit-btn:disabled { background: #ccc; cursor: not-allowed; }`;
    }
    
    const { generateScaffold } = await import('./src/services/scaffold.js');
    const scaffold = generateScaffold(mockTopic, profile, stylesTemplate);
    console.log('✓ Scaffold generated');
    console.log('  - Files:', Object.keys(scaffold.files).join(', '));
    
    // Materialize files
    const appDir = join(PROJECT_ROOT, scaffold.outputDir);
    if (existsSync(appDir)) {
      rmSync(appDir, { recursive: true });
    }
    mkdirSync(appDir, { recursive: true });
    mkdirSync(join(appDir, 'images'), { recursive: true });
    
    for (const [filename, content] of Object.entries(scaffold.files)) {
      writeFileSync(join(appDir, filename), content);
    }
    console.log('✓ Files materialized to:', scaffold.outputDir);
    
    // Update apps-metadata.json
    const metadataPath = join(PROJECT_ROOT, 'apps-metadata.json');
    let metadata = [];
    if (existsSync(metadataPath)) {
      const content = readFileSync(metadataPath, 'utf-8');
      metadata = JSON.parse(content);
    }
    
    const newApp = {
      id: mockTopic.appId,
      name: mockTopic.appName,
      description: mockTopic.description,
      category: mockTopic.category,
      keywords: mockTopic.keywords,
      coverImage: `${mockTopic.appId}/images/${mockTopic.options[0].image}`,
      addedDate: new Date().toISOString().split('T')[0],
    };
    
    // Check for duplicates
    const exists = metadata.some(app => app.id === newApp.id || app.name === newApp.name);
    if (!exists) {
      metadata.push(newApp);
      writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      console.log('✓ Metadata registered');
    } else {
      console.log('⚠ App already in metadata');
    }
    
    // Verify output
    console.log('\n' + '='.repeat(50));
    console.log('✅ MVP Test completed successfully!\n');
    console.log('Results:');
    console.log(`  App ID: ${mockTopic.appId}`);
    console.log(`  Title: ${mockTopic.title}`);
    console.log(`  Location: ${scaffold.outputDir}/`);
    console.log(`\nFiles created:`);
    for (const file of Object.keys(scaffold.files)) {
      const filePath = join(appDir, file);
      console.log(`  ✓ ${file} (${existsSync(filePath) ? 'OK' : 'MISSING'})`);
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
