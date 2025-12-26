import fetch from 'node-fetch';

const API = 'https://letmetry.cloud/mysql/query';

async function run() {
  const sql = `ALTER TABLE back_view_images ADD COLUMN deleted TINYINT(1) DEFAULT 0 NOT NULL COMMENT 'Logical delete flag: 0=visible,1=deleted'`;
  console.log('Running ALTER for back_view_images:', sql);
  const res = await fetch(API, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ sql, params: [] }) });
  const json = await res.json();
  console.log('HTTP OK:', res.ok);
  console.log(JSON.stringify(json, null, 2));
}

run().catch(err => { console.error(err); process.exit(1); });
