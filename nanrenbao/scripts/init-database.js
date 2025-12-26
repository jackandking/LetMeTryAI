import fs from 'fs/promises';
import path from 'path';

async function initDatabase() {
  try {
    // 读取 SQL 文件
    const sqlPath = path.join(process.cwd(), 'nanrenbao', 'database-schema.sql');
    const sql = await fs.readFile(sqlPath, 'utf-8');

    console.log('📝 Executing database-schema.sql...');
    console.log('SQL Content:');
    console.log(sql);
    console.log('\n---\n');

    // 调用 letmetry.cloud API
    const response = await fetch('https://letmetry.cloud/mysql/query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Database initialized (HTTP OK). Response:');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Failed to initialize database (HTTP error):', result && result.error ? result.error : result);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error && error.message ? error.message : error);
    process.exit(1);
  }
}

initDatabase();
