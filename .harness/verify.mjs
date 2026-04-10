#!/usr/bin/env node
/**
 * Quick verification script for Harness setup
 */
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..');

console.log('🔧 LetMeTryAI Harness Verification\n');

// Check directory structure
const dirs = [
  'src/agents',
  'src/workflows', 
  'src/tools',
  'src/constraints',
  'src/config',
  'src/types',
  'tests',
  'scripts',
];

console.log('📁 Directory Structure:');
let allExist = true;
for (const dir of dirs) {
  const path = join(__dirname, dir);
  const exists = existsSync(path);
  console.log(`  ${exists ? '✓' : '✗'} ${dir}`);
  if (!exists) allExist = false;
}

// Check files
console.log('\n📄 Core Files:');
const files = [
  'package.json',
  'tsconfig.json',
  'biome.json',
  'src/types/index.ts',
  'src/config/index.ts',
  'src/tools/registry.ts',
  'src/constraints/engine.ts',
  'src/workflows/react-loop.ts',
  'src/agents/daily-app-agent.ts',
  'src/scheduler.ts',
  'src/index.ts',
  'README.md',
];

for (const file of files) {
  const path = join(__dirname, file);
  const exists = existsSync(path);
  console.log(`  ${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allExist = false;
}

// Check runtime directories
console.log('\n💾 Runtime Directories:');
const runtimeDirs = [
  '.automation/.local/harness/state',
  '.automation/.local/harness/logs',
  '.automation/.local/harness/tasks',
];

for (const dir of runtimeDirs) {
  const path = join(PROJECT_ROOT, dir);
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
    console.log(`  ✓ Created ${dir}`);
  } else {
    console.log(`  ✓ ${dir}`);
  }
}

// Summary
console.log('\n' + '='.repeat(40));
if (allExist) {
  console.log('✅ Harness structure verified!');
  console.log('\nNext steps:');
  console.log('  1. Install dependencies: npm install');
  console.log('  2. Run shadow test: HARNESS_MODE=shadow node verify.mjs --run nanrenbao');
  console.log('  3. Start scheduler: HARNESS_MODE=shadow node src/scheduler.js start');
} else {
  console.log('❌ Some files are missing');
  process.exit(1);
}
