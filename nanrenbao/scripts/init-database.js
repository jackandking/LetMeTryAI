const fs = require('fs');
const path = require('path');

async function initDatabase() {
  try {
    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, '../database-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

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

    if (result.success) {
      console.log('✅ Database initialized successfully!');
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.error('❌ Failed to initialize database:', result.error);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initDatabase();
