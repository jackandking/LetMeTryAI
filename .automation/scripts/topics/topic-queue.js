/**
 * 人工选题队列管理工具
 * 支持 FIFO 队列的读取、添加、删除操作
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const PROJECT_ROOT = process.cwd();
const TOPICS_DIR = path.join(PROJECT_ROOT, '.automation', '.local', 'state', 'topics');

/**
 * 品牌ID映射
 */
const BRAND_MAP = {
  'man': '男人宝',
  'woman': '女人爱',
  'parent': '家长爱',
  'elder': '爱老人',
  // 兼容旧ID
  'nanrenbao': '男人宝',
  'womanai': '女人爱'
};

/**
 * 获取队列文件路径
 * @param {string} brandId - 品牌ID
 * @returns {string} 文件路径
 */
function getQueueFile(brandId) {
  // 标准化品牌ID
  const normalizedId = brandId.toLowerCase().replace(/[^a-z]/g, '');
  
  // 映射到标准ID
  const standardId = Object.keys(BRAND_MAP).find(k => 
    normalizedId.includes(k) || k.includes(normalizedId)
  ) || brandId;
  
  return path.join(TOPICS_DIR, `${standardId}-manual-topics.txt`);
}

/**
 * 读取队列中的选题（不删除）
 * @param {string} brandId - 品牌ID
 * @returns {string[]} 选题列表
 */
export function peekTopics(brandId) {
  const file = getQueueFile(brandId);
  
  if (!fs.existsSync(file)) {
    return [];
  }
  
  const content = fs.readFileSync(file, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

/**
 * 取出下一个选题（FIFO，删除已取走的）
 * @param {string} brandId - 品牌ID
 * @returns {string|null} 选题标题，无内容返回null
 */
export function popTopic(brandId) {
  const file = getQueueFile(brandId);
  
  if (!fs.existsSync(file)) {
    return null;
  }
  
  const topics = peekTopics(brandId);
  
  if (topics.length === 0) {
    return null;
  }
  
  const nextTopic = topics[0];
  const remaining = topics.slice(1);
  
  // 写回剩余内容
  if (remaining.length > 0) {
    fs.writeFileSync(file, remaining.join('\n') + '\n');
  } else {
    // 队列为空，保留空文件或删除
    fs.writeFileSync(file, '');
  }
  
  return nextTopic;
}

/**
 * 添加选题到队列尾部
 * @param {string} brandId - 品牌ID
 * @param {string} topic - 选题标题
 */
export function pushTopic(brandId, topic) {
  const file = getQueueFile(brandId);
  const line = topic.trim();
  
  if (!line) {
    throw new Error('Topic cannot be empty');
  }
  
  // 确保目录存在
  if (!fs.existsSync(TOPICS_DIR)) {
    fs.mkdirSync(TOPICS_DIR, { recursive: true });
  }
  
  // 追加到文件
  fs.appendFileSync(file, line + '\n');
}

/**
 * 检查是否存在人工选题
 * @param {string} brandId - 品牌ID
 * @returns {boolean}
 */
export function hasManualTopics(brandId) {
  return peekTopics(brandId).length > 0;
}

/**
 * 获取下一个选题（优先人工，否则返回null）
 * @param {string} brandId - 品牌ID
 * @returns {{title: string, source: 'manual'}|null}
 */
export function getNextTopic(brandId) {
  const manualTopic = popTopic(brandId);
  
  if (manualTopic) {
    return {
      title: manualTopic,
      source: 'manual'
    };
  }
  
  return null;
}

/**
 * CLI 工具
 */
function printUsage() {
  console.log(`
人工选题队列管理工具

用法:
  node topic-queue.js <command> [options]

命令:
  list <brand>           查看指定品牌的队列
  add <brand> <topic>    添加选题到队列
  next <brand>           取出下一个选题（FIFO）
  clear <brand>          清空队列

品牌:
  man, woman, parent, elder
  (或: nanrenbao, womanai)

示例:
  node topic-queue.js list man
  node topic-queue.js add man "坦克之王评选"
  node topic-queue.js next man
`);
}

// CLI 入口
if (import.meta.url === `file://${process.argv[1]}`) {
  const [,, command, brand, ...args] = process.argv;
  
  if (!command || !brand) {
    printUsage();
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'list':
        const topics = peekTopics(brand);
        if (topics.length === 0) {
          console.log(`队列 [${brand}] 为空`);
        } else {
          console.log(`队列 [${brand}] (${topics.length} 个):`);
          topics.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));
        }
        break;
        
      case 'add':
        const topic = args.join(' ');
        if (!topic) {
          console.error('错误: 请提供选题内容');
          process.exit(1);
        }
        pushTopic(brand, topic);
        console.log(`已添加: "${topic}" → [${brand}]`);
        break;
        
      case 'next':
        const next = popTopic(brand);
        if (next) {
          console.log(`取出: "${next}"`);
        } else {
          console.log(`队列 [${brand}] 为空`);
        }
        break;
        
      case 'clear':
        const file = getQueueFile(brand);
        if (fs.existsSync(file)) {
          fs.writeFileSync(file, '');
          console.log(`已清空队列 [${brand}]`);
        } else {
          console.log(`队列 [${brand}] 不存在`);
        }
        break;
        
      default:
        console.error(`未知命令: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (err) {
    console.error('错误:', err.message);
    process.exit(1);
  }
}
