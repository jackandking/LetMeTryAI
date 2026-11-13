#!/usr/bin/env node
// 标题单变量实验 setup：复制 635 白晶富行为 4 个独立 id（同图同 DNA），审批后供发布
// 目的：同图 + 4 个标题变体 + 同日发布 → 挂载按 id 分离计量，纯净测标题捕获率
'use strict';
const fs = require('fs');
const path = require('path');

const MYSQL_QUERY = 'https://letmetry.cn/mysql/query';
const MYSQL_INSERT = 'https://letmetry.cn/mysql/insert';

async function main() {
  // 1. 读 635 源行
  const q = await fetch(MYSQL_QUERY, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT id, image_url, prompt_dna, coverage_pct FROM beauty_images WHERE id=635', params: [] }),
  });
  const rows = await q.json();
  if (!Array.isArray(rows) || !rows[0]) throw new Error('635 not found: ' + JSON.stringify(rows));
  const src = rows[0];
  console.log('源行 635:', src.image_url);

  // 2. 复制 4 行（同图同 DNA，独立 id；insert 无需密钥，审批交由 flywheel.cjs --approve-only 走 Vault）
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
  const newIds = [];
  for (let i = 0; i < 4; i++) {
    const data = {
      image_url: src.image_url,
      review_status: 'pending',
      source_type: 'skill',
      submitted_at: now,
      prompt_dna: src.prompt_dna,
    };
    if (src.coverage_pct != null) data.coverage_pct = src.coverage_pct;
    const r = await fetch(MYSQL_INSERT, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'beauty_images', data }),
    });
    const j = await r.json();
    if (j.insertId == null) throw new Error('insert failed: ' + JSON.stringify(j));
    newIds.push(j.insertId);
    console.log(`  插入 copy#${i + 1} → id=${j.insertId} (pending，待审批)`);
  }
  console.log('NEW_IDS=' + newIds.join(','));
  fs.writeFileSync(path.join(__dirname, 'title-exp-cells.json'), JSON.stringify({ source: 635, newIds, createdAt: now }, null, 2));
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
