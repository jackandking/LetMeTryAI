#!/usr/bin/env node
/**
 * E2E Publish Test - End-to-end test with actual Kuaishou publishing
 * 
 * Flow: Topic Selection → Scaffold → Materialize → Publish to Kuaishou
 * 
 * Usage:
 *   npm run test:e2e              # Dry run (no actual publish)
 *   npm run test:e2e -- --publish # Actually publish to Kuaishou
 */
import { writeFileSync, mkdirSync, existsSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');

const args = process.argv.slice(2);
const SHOULD_PUBLISH = args.includes('--publish');
const HEADLESS = !args.includes('--headed');

console.log('🚀 Harness E2E Publish Test');
console.log('=' .repeat(70));
console.log(`Mode: ${SHOULD_PUBLISH ? 'LIVE PUBLISH' : 'DRY RUN (add --publish to actually publish)'}`);
console.log(`Browser: ${HEADLESS ? 'Headless' : 'Visible'}`);
console.log('');

// Test Configuration
const TEST_CONFIG = {
  profileId: 'nanrenbao',
  date: new Date().toISOString().split('T')[0],
  testAppId: `e2e-test-${Date.now()}`,
};

let testResults = {
  topicGenerated: false,
  scaffoldCreated: false,
  filesMaterialized: false,
  published: false,
  errors: [],
};

// Step 1: Generate Topic
async function step1_generateTopic() {
  console.log('\n📋 Step 1: Generate Topic');
  console.log('-'.repeat(50));

  try {
    const { loadProfileConfig } = await import('./src/config/index.js');
    const profile = loadProfileConfig(TEST_CONFIG.profileId);
    
    console.log(`   Profile: ${profile.name}`);
    console.log(`   Categories: ${profile.preferredCategories.join(', ')}`);

    // Use mock topic for E2E test (to avoid API costs)
    // Note: Avoid forbidden words: 最, 第一, 唯一, 极致, 绝对, 顶级, 史上, 全网
    const mockTopic = {
      appId: TEST_CONFIG.testAppId,
      appName: '运动装备偏好小调查',
      title: '运动装备偏好小调查',
      pageTitle: '运动装备偏好 - LetMeTryAI',
      summary: '了解大家喜欢的运动装备',
      description: '这是一个关于运动装备偏好的投票应用',
      question: '以下运动装备，你喜欢哪个？',
      category: '运动',
      keywords: ['运动', '装备', '健身'],
      options: [
        { 
          value: 'basketball-shoes', 
          label: '篮球鞋', 
          caption: '专业缓震，实战首选', 
          image: 'basketball-shoes.svg', 
          alt: '篮球鞋' 
        },
        { 
          value: 'running-shoes', 
          label: '跑鞋', 
          caption: '轻便透气，长跑必备', 
          image: 'running-shoes.svg', 
          alt: '跑鞋' 
        },
        { 
          value: 'gym-gloves', 
          label: '健身手套', 
          caption: '防滑耐磨，力量训练', 
          image: 'gym-gloves.svg', 
          alt: '健身手套' 
        },
      ]
    };

    console.log('   ✅ Mock topic generated');
    console.log(`      Title: ${mockTopic.title}`);
    console.log(`      Category: ${mockTopic.category}`);
    console.log(`      Options: ${mockTopic.options.length}`);

    testResults.topicGenerated = true;
    return mockTopic;
  } catch (error) {
    testResults.errors.push({ step: 'topic', error: error.message });
    console.error('   ❌ Topic generation failed:', error.message);
    throw error;
  }
}

// Step 2: Validate Constraints
async function step2_validateConstraints(topic) {
  console.log('\n🔒 Step 2: Validate Constraints');
  console.log('-'.repeat(50));

  try {
    const { loadProfileConfig } = await import('./src/config/index.js');
    const { ConstraintsEngine } = await import('./src/constraints/engine.js');
    
    const profile = loadProfileConfig(TEST_CONFIG.profileId);
    const constraints = new ConstraintsEngine(TEST_CONFIG.profileId, profile);

    await constraints.validateTopicAllowed(topic);
    
    console.log('   ✅ All constraints passed');
    console.log('      - No forbidden keywords');
    console.log('      - Category allowed');
    return true;
  } catch (error) {
    testResults.errors.push({ step: 'constraints', error: error.message });
    console.error('   ❌ Constraint validation failed:', error.message);
    throw error;
  }
}

// Step 3: Generate Scaffold
async function step3_generateScaffold(topic) {
  console.log('\n🏗️  Step 3: Generate Scaffold');
  console.log('-'.repeat(50));

  try {
    const { loadProfileConfig } = await import('./src/config/index.js');
    const { generateScaffold } = await import('./src/services/scaffold.js');
    
    const profile = loadProfileConfig(TEST_CONFIG.profileId);

    // Load or create styles template
    const stylesPath = join(PROJECT_ROOT, 'fighter-jets/styles.css');
    let stylesTemplate = '';
    
    if (existsSync(stylesPath)) {
      stylesTemplate = readFileSync(stylesPath, 'utf-8');
      console.log('   ✓ Loaded styles from fighter-jets');
    } else {
      // Default styles
      stylesTemplate = `/* Default E2E Test Styles */
.app-header { text-align: center; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
.options-grid { display: grid; gap: 16px; padding: 20px; max-width: 800px; margin: 0 auto; }
.option-card { border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; cursor: pointer; transition: all 0.3s ease; }
.option-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.1); }
.option-card.selected { border-color: #667eea; background: #f8f9ff; }
.submit-btn { display: block; width: calc(100% - 40px); max-width: 400px; margin: 20px auto; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; font-size: 18px; cursor: pointer; }
.submit-btn:disabled { background: #ccc; cursor: not-allowed; }`;
      console.log('   ✓ Using default styles');
    }

    const scaffold = generateScaffold(topic, profile, stylesTemplate);
    
    console.log('   ✅ Scaffold generated');
    console.log(`      Files: ${Object.keys(scaffold.files).join(', ')}`);
    console.log(`      Images needed: ${scaffold.images.length}`);

    testResults.scaffoldCreated = true;
    return scaffold;
  } catch (error) {
    testResults.errors.push({ step: 'scaffold', error: error.message });
    console.error('   ❌ Scaffold generation failed:', error.message);
    throw error;
  }
}

// Step 4: Materialize Files
async function step4_materializeFiles(scaffold, topic) {
  console.log('\n💾 Step 4: Materialize Files');
  console.log('-'.repeat(50));

  try {
    const appDir = join(PROJECT_ROOT, scaffold.outputDir);
    
    // Clean up if exists
    if (existsSync(appDir)) {
      rmSync(appDir, { recursive: true });
    }

    // Create directories
    mkdirSync(appDir, { recursive: true });
    mkdirSync(join(appDir, 'images'), { recursive: true });

    // Write files
    for (const [filename, content] of Object.entries(scaffold.files)) {
      writeFileSync(join(appDir, filename), content);
    }

    // Create placeholder images (SVG)
    for (const option of topic.options) {
      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <rect fill="#f0f0f0" width="200" height="200"/>
  <text x="100" y="100" text-anchor="middle" font-family="Arial" font-size="16" fill="#666">
    ${option.label}
  </text>
</svg>`;
      writeFileSync(join(appDir, 'images', option.image), svgContent);
    }

    console.log('   ✅ Files materialized');
    console.log(`      Location: ${scaffold.outputDir}/`);
    
    // List files
    const files = Object.keys(scaffold.files);
    for (const file of files) {
      const filePath = join(appDir, file);
      const size = existsSync(filePath) ? readFileSync(filePath).length : 0;
      console.log(`      - ${file} (${size} bytes)`);
    }

    testResults.filesMaterialized = true;
    return appDir;
  } catch (error) {
    testResults.errors.push({ step: 'materialize', error: error.message });
    console.error('   ❌ File materialization failed:', error.message);
    throw error;
  }
}

// Step 5: Publish to Kuaishou
async function step5_publishToKuaishou(topic, appDir) {
  console.log('\n📤 Step 5: Publish to Kuaishou');
  console.log('-'.repeat(50));

  if (!SHOULD_PUBLISH) {
    console.log('   ⏭️  SKIPPED (dry run mode)');
    console.log('   To actually publish, run with --publish flag');
    return { skipped: true };
  }

  return new Promise((resolve, reject) => {
    // Use API publisher (same as old scheme daily-orchestrator.js)
    // This is publish-kuaishou-api.js NOT publish-kuaishou-task.js
    const publishScript = join(PROJECT_ROOT, '.automation/scripts/publish-kuaishou-api.js');
    
    console.log('   Starting Kuaishou API publisher...');
    console.log(`   App ID: ${topic.appId}`);
    console.log(`   App Name: ${topic.appName}`);
    console.log(`   Using API mode (no browser)`);
    
    const child = spawn('node', [
      publishScript,
      topic.appId,
      topic.appName,
      topic.description,
    ], {
      cwd: PROJECT_ROOT,
      stdio: 'pipe',
      env: {
        ...process.env,
        PROFILE_ID: TEST_CONFIG.profileId,
        SOURCE_TASK_ID: '165805',
      },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('   ✅ Published successfully');
        testResults.published = true;
        resolve({ success: true, stdout, stderr });
      } else {
        const error = new Error(`Publish failed with code ${code}: ${stderr || stdout}`);
        testResults.errors.push({ step: 'publish', error: error.message });
        console.error('   ❌ Publish failed:', error.message);
        reject(error);
      }
    });

    child.on('error', (error) => {
      testResults.errors.push({ step: 'publish', error: error.message });
      console.error('   ❌ Publish error:', error.message);
      reject(error);
    });
  });
}

// Step 6: Cleanup (on failure)
async function cleanup(topic) {
  console.log('\n🧹 Cleanup');
  console.log('-'.repeat(50));

  try {
    const appDir = join(PROJECT_ROOT, topic.appId);
    if (existsSync(appDir)) {
      rmSync(appDir, { recursive: true });
      console.log('   ✅ Removed test app directory');
    }
  } catch (error) {
    console.error('   ⚠️ Cleanup error:', error.message);
  }
}

// Main test flow
async function runE2ETest() {
  const startTime = Date.now();
  let topic = null;

  try {
    // Step 1: Generate Topic
    topic = await step1_generateTopic();

    // Step 2: Validate Constraints
    await step2_validateConstraints(topic);

    // Step 3: Generate Scaffold
    const scaffold = await step3_generateScaffold(topic);

    // Step 4: Materialize Files
    const appDir = await step4_materializeFiles(scaffold, topic);

    // Step 5: Publish to Kuaishou (optional)
    await step5_publishToKuaishou(topic, appDir);

    // Success
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ E2E Test Completed Successfully!');
    console.log('');
    console.log('Results:');
    console.log(`  Duration: ${duration}s`);
    console.log(`  App ID: ${topic.appId}`);
    console.log(`  Location: ${topic.appId}/`);
    console.log(`  Publish: ${SHOULD_PUBLISH ? 'COMPLETED' : 'SKIPPED (dry run)'}`);
    console.log('');
    console.log('Next steps:');
    if (!SHOULD_PUBLISH) {
      console.log('  1. Run with --publish to actually publish to Kuaishou');
    }
    console.log(`  2. Preview: file://${join(PROJECT_ROOT, topic.appId, 'index.html')}`);
    console.log(`  3. Deploy: npx surge ${topic.appId} ${topic.appId}.letmetryai.cn`);
    
    return 0;

  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(70));
    console.log('❌ E2E Test Failed');
    console.log('');
    console.log('Error Summary:');
    testResults.errors.forEach((err, idx) => {
      console.log(`  ${idx + 1}. [${err.step}] ${err.error}`);
    });
    console.log('');
    console.log(`Duration: ${duration}s`);

    // Cleanup on failure
    if (topic) {
      await cleanup(topic);
    }

    return 1;
  }
}

// Run tests
runE2ETest().then(code => process.exit(code));
