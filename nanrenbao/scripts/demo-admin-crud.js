import fetch from 'node-fetch';

const API = 'https://letmetry.cloud/mysql/query';

async function run() {
  console.log('Looking for a visible image (deleted=0)...');
  const selectRes = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT id, image_url, deleted FROM beauty_images WHERE deleted = 0 LIMIT 1', params: [] })
  });
  const rows = await selectRes.json();
  if (!Array.isArray(rows) || rows.length === 0) {
    console.log('No visible images found to test.');
    return;
  }

  const row = rows[0];
  console.log('Selected row:', row);

  console.log(`Marking id=${row.id} as deleted (deleted=1)`);
  const upd1 = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'UPDATE beauty_images SET deleted = 1 WHERE id = ?', params: [row.id] })
  });
  const upd1json = await upd1.json();
  console.log('UPDATE result:', upd1json);

  console.log('Verifying...');
  const verify1 = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT id, image_url, deleted FROM beauty_images WHERE id = ?', params: [row.id] })
  });
  const verify1json = await verify1.json();
  console.log('Post-update record:', verify1json);

  console.log(`Restoring id=${row.id} to deleted=0`);
  const upd2 = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'UPDATE beauty_images SET deleted = 0 WHERE id = ?', params: [row.id] })
  });
  const upd2json = await upd2.json();
  console.log('Restore result:', upd2json);

  console.log('Verifying restore...');
  const verify2 = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT id, image_url, deleted FROM beauty_images WHERE id = ?', params: [row.id] })
  });
  const verify2json = await verify2.json();
  console.log('Post-restore record:', verify2json);
}

run().catch(err => { console.error('Demo error:', err); process.exit(1); });
