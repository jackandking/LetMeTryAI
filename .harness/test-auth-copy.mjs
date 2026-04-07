import { ensureDirectories, PATHS } from './src/config/index.js';
import { existsSync, readdirSync } from 'fs';

console.log('Testing auth copy...');
console.log('Prod auth dir:', PATHS.prodAuthDir);
console.log('Dev auth dir:', PATHS.devAuthDir);
console.log('Harness auth dir:', PATHS.auth);

// 检查源目录
console.log('\nSource directories:');
if (existsSync(PATHS.prodAuthDir)) {
  console.log('✅ Prod auth dir exists:', PATHS.prodAuthDir);
  console.log('   Files:', readdirSync(PATHS.prodAuthDir));
} else {
  console.log('❌ Prod auth dir not found:', PATHS.prodAuthDir);
}

if (existsSync(PATHS.devAuthDir)) {
  console.log('✅ Dev auth dir exists:', PATHS.devAuthDir);
  console.log('   Files:', readdirSync(PATHS.devAuthDir));
} else {
  console.log('❌ Dev auth dir not found:', PATHS.devAuthDir);
}

// 运行目录初始化
console.log('\nRunning ensureDirectories...');
ensureDirectories();

// 检查目标目录
console.log('\nTarget directory:');
if (existsSync(PATHS.auth)) {
  console.log('✅ Harness auth dir exists:', PATHS.auth);
  console.log('   Files:', readdirSync(PATHS.auth));
} else {
  console.log('❌ Harness auth dir not created:', PATHS.auth);
}
