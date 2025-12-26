import fetch from 'node-fetch';

const API = 'https://letmetry.cloud/mysql/query';

async function run() {
  console.log('Querying sample rows from beauty_images...');
  const selectRes = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql: 'SELECT id, image_url, deleted FROM beauty_images LIMIT 5', params: [] })
  });

  const selectJson = await selectRes.json();
  console.log('SELECT response OK:', selectRes.ok);
  console.log(JSON.stringify(selectJson, null, 2));

  if (Array.isArray(selectJson) && selectJson.length > 0) {
    const row = selectJson[0];
    console.log('Attempting to UPDATE deleted=1 for id=', row.id);
    const updateRes = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: 'UPDATE beauty_images SET deleted = 1 WHERE id = ?', params: [row.id] })
    });
    const updateJson = await updateRes.json();
    console.log('UPDATE response OK:', updateRes.ok);
    console.log(JSON.stringify(updateJson, null, 2));
  } else {
    console.log('No rows returned from SELECT; nothing to test');
  }
}

run().catch(err => { console.error('Error:', err); process.exit(1); });
