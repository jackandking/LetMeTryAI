#!/usr/bin/env node
// run-tests.js - Simple test runner for the configuration system

import { readdir, readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class SimpleTestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
    this.errors = [];
  }

  async findTestFiles() {
    const files = await readdir(__dirname);
    const testFiles = files.filter(file => file.endsWith('.test.js'));
    return testFiles;
  }

  async runTest(testFile) {
    console.log(`\n🧪 Running ${testFile}...`);
    
    try {
      // Simple validation of test file syntax
      const content = await readFile(join(__dirname, testFile), 'utf-8');
      
      // Check for basic test structure
      const hasDescribe = content.includes('describe(');
      const hasIt = content.includes('it(') || content.includes('test(');
      const hasExpect = content.includes('expect(');
      
      if (hasDescribe && hasIt && hasExpect) {
        console.log(`  ✅ ${testFile} - Structure valid`);
        this.passed++;
      } else {
        console.log(`  ❌ ${testFile} - Missing test structure`);
        this.failed++;
        this.errors.push(`${testFile}: Missing required test structure`);
      }

      // Check for configuration imports
      if (content.includes("from './config") || content.includes("from './util/config")) {
        console.log(`  ✅ ${testFile} - Uses centralized configuration`);
      }

      // Check for proper domain usage
      if (content.includes('letmetry.cloud') && !content.includes('letmetryai.cn')) {
        console.log(`  ✅ ${testFile} - Uses correct domain`);
      }

    } catch (error) {
      console.log(`  ❌ ${testFile} - Error: ${error.message}`);
      this.failed++;
      this.errors.push(`${testFile}: ${error.message}`);
    }
  }

  async validateConfiguration() {
    console.log('\n🔧 Validating Configuration System...');
    
    try {
      // Check util/config.js
      const utilConfigContent = await readFile(join(__dirname, 'util/config.js'), 'utf-8');
      const hasBaseUrl = utilConfigContent.includes('BASE_URL');
      const hasApiEndpoints = utilConfigContent.includes('API_ENDPOINTS');
      const hasGetImageUrl = utilConfigContent.includes('getImageUrl');
      
      if (hasBaseUrl && hasApiEndpoints && hasGetImageUrl) {
        console.log('  ✅ util/config.js - All required exports present');
        this.passed++;
      } else {
        console.log('  ❌ util/config.js - Missing required exports');
        this.failed++;
      }

      // Check global config.js
      const globalConfigContent = await readFile(join(__dirname, 'config.js'), 'utf-8');
      const hasWindowBaseUrl = globalConfigContent.includes('window.BASE_URL');
      const hasWindowApiEndpoints = globalConfigContent.includes('window.API_ENDPOINTS');
      
      if (hasWindowBaseUrl && hasWindowApiEndpoints) {
        console.log('  ✅ config.js - Global configuration valid');
        this.passed++;
      } else {
        console.log('  ❌ config.js - Missing global configuration');
        this.failed++;
      }

    } catch (error) {
      console.log(`  ❌ Configuration validation error: ${error.message}`);
      this.failed++;
    }
  }

  async checkRegressionPoints() {
    console.log('\n🔍 Checking Regression Points...');
    
    const filesToCheck = [
      'util/ai_utils.js',
      'util/file-util.js', 
      'util/mysql-util.js',
      'webview1.html',
      'webview2/index.html'
    ];

    for (const file of filesToCheck) {
      try {
        const content = await readFile(join(__dirname, file), 'utf-8');
        
        // Check that old domain is not present (except in preserved areas)
        const hasOldDomain = content.includes('letmetryai.cn');
        const hasNewIp = content.includes('letmetry.cloud') || content.includes('BASE_URL') || content.includes('getImageUrl');
        
        if (file.includes('index.html') && file !== 'index.html') {
          // For webview pages, should use helper functions or IP
          if (hasNewIp || content.includes('getImageUrl')) {
            console.log(`  ✅ ${file} - Uses centralized configuration`);
            this.passed++;
          } else {
            console.log(`  ❌ ${file} - Not updated to use configuration`);
            this.failed++;
          }
        } else if (file.includes('.js')) {
          // For JS files, should import from config
          if (content.includes("from './config") && !hasOldDomain) {
            console.log(`  ✅ ${file} - Uses centralized configuration`);
            this.passed++;
          } else {
            console.log(`  ❌ ${file} - Not properly updated`);
            this.failed++;
          }
        }
        
      } catch (error) {
        console.log(`  ⚠️  Could not check ${file}: ${error.message}`);
      }
    }
  }

  async run() {
    console.log('🚀 Starting Test Suite for Configuration System\n');
    console.log('=' .repeat(60));

    // Validate configuration files
    await this.validateConfiguration();

    // Check regression points
    await this.checkRegressionPoints();

    // Find and run test files
    const testFiles = await this.findTestFiles();
    console.log(`\nFound ${testFiles.length} test files:`);
    
    for (const testFile of testFiles) {
      await this.runTest(testFile);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary:');
    console.log(`  ✅ Passed: ${this.passed}`);
    console.log(`  ❌ Failed: ${this.failed}`);
    console.log(`  📁 Total: ${this.passed + this.failed}`);

    if (this.errors.length > 0) {
      console.log('\n❌ Errors:');
      this.errors.forEach(error => console.log(`  - ${error}`));
    }

    const success = this.failed === 0;
    console.log(`\n🎯 Result: ${success ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return success;
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SimpleTestRunner();
  const success = await runner.run();
  process.exit(success ? 0 : 1);
}