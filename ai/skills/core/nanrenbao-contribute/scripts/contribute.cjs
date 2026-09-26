#!/usr/bin/env node
/*
 * contribute.js — 男人宝图片投稿脚本（飞轮第②段）
 * 把生成的图片插入 beauty_images / back_view_images (review_status=pending)，
 * 返回预先准备好的预览链接 review-preview.html?id=...&table=...
 *
 * 用法见 SKILL.md。需要 Node 18+（全局 fetch / FormData）。
 */
const fs = require('fs');
const path = require('path');

// 后端 API（letmetry.cn）与 前端站点（letmetryai.cn）分离。
// /mysql/insert 与 /image/upload 是后端服务端点；预览页在 GitHub Pages 静态前端。
const API_BASE = 'https://letmetry.cn';
const SITE_BASE = 'https://letmetryai.cn';
const INSERT_EP = `${API_BASE}/mysql/insert`;
const UPLOAD_EP = `${API_BASE}/image/upload`;

function parseArgs(argv) {
  const a = { table: 'beauty', sourceId: '', dna: '{}' };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--image') a.image = argv[++i];
    else if (k === '--back') a.back = argv[++i];
    else if (k === '--front') a.front = argv[++i];
    else if (k === '--table') a.table = argv[++i];
    else if (k === '--source-id') a.sourceId = argv[++i];
    else if (k === '--dna') a.dna = argv[++i];
    else if (k === '--dna-file') a.dna = fs.readFileSync(argv[++i], 'utf8');
  }
  return a;
}

async function uploadLocalFile(filePath) {
  const buf = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  const form = new FormData();
  form.append('file', new Blob([buf], { type: mime }), path.basename(filePath));
  const r = await fetch(UPLOAD_EP, { method: 'POST', body: form });
  const j = await r.json();
  if (!j.success) throw new Error('image/upload failed: ' + JSON.stringify(j));
  return `${SITE_BASE}/${j.path}`; // relPath 已去掉 nginx 根前缀
}

async function insertRow(table, data) {
  const r = await fetch(INSERT_EP, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, data }),
  });
  const j = await r.json();
  if (r.status !== 200 || j.insertId == null) throw new Error('insert failed: ' + JSON.stringify(j));
  return j.insertId;
}

(async () => {
  const a = parseArgs(process.argv);
  try {
    let imageUrl = a.image;
    if (imageUrl && fs.existsSync(imageUrl)) imageUrl = await uploadLocalFile(imageUrl);
    if (imageUrl && !/^https:\/\//i.test(imageUrl)) throw new Error('图片地址必须是 https URL（本地文件会自动上传）');

    let dna = a.dna;
    try { JSON.parse(dna); } catch { throw new Error('--dna 必须是合法 JSON'); }

    let data, table, id;
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    if (a.table === 'backview') {
      if (!a.back || !a.front) throw new Error('backview 需要 --back 和 --front 两张 URL');
      if (!/^https:\/\//i.test(a.back) || !/^https:\/\//i.test(a.front)) throw new Error('back/front 必须是 https URL');
      table = 'back_view_images';
      data = { back_image_url: a.back, front_image_url: a.front, review_status: 'pending', source_type: 'skill', submitted_at: now, prompt_dna: dna };
    } else {
      if (!imageUrl) throw new Error('beauty 需要 --image (URL 或本地文件)');
      table = 'beauty_images';
      data = { image_url: imageUrl, review_status: 'pending', source_type: 'skill', submitted_at: now, prompt_dna: dna };
    }

    id = await insertRow(table, data);
    const preview = `${SITE_BASE}/nanrenbao/review-preview.html?id=${id}&table=${a.table === 'backview' ? 'back_view' : 'beauty'}`;
    console.log('[OK] 已提交审核 (review_status=pending)');
    console.log(`   表: ${table}  |  新行 id=${id}`);
    console.log(`   预览链接: ${preview}`);
    console.log('\n审核通过前此链接显示占位；通过后展示真实照片并深链到站内对应位置。');
    console.log('提示: 运行 ../recorder.py 把 (source_id, 源提示词, 改良提示词, db_id=' + id + ') 记入 prompt-log.jsonl。');
  } catch (e) {
    console.error('[ERROR]', e.message);
    process.exit(1);
  }
})();
