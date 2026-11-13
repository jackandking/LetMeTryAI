#!/usr/bin/env node
// Downlist (停止接单 / planOffline) Kuaishou distribution tasks by planId.
// DRY-RUN by default. Pass --execute to actually issue the update.
import fs from 'fs';

const AUTH = '/Users/jak/LetMeTryAI/.automation/.local/auth/kuaishou_auth.json';
const BASE = 'https://daren.kuaishou.com';

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
// plan ids can come from --ids 1,2,3 or a JSON file --file path
let planIds = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--ids' && args[i + 1]) { planIds = args[i + 1].split(',').map(s => s.trim()).filter(Boolean); i++; }
  else if (args[i] === '--file' && args[i + 1]) {
    const arr = JSON.parse(fs.readFileSync(args[i + 1], 'utf8'));
    const raw = Array.isArray(arr) ? arr : [arr];
    planIds = raw
      .map(x => (x && typeof x === 'object' ? (x.id ?? x.distributionPlanId ?? x.planId) : x))
      .map(String).filter(Boolean);
    i++;
  }
}

const d = JSON.parse(fs.readFileSync(AUTH, 'utf8'));
const cookies = d.cookies || [];
const seen = new Map();
for (const c of cookies) { const v = c.value || ''; if (v) seen.set(c.name, `${c.name}=${v}`); }
const H = {
  'Content-Type': 'application/json',
  'Cookie': [...seen.values()].join('; '),
  'Referer': BASE + '/content/promotion/distribution',
  'Origin': BASE,
  'X-Requested-With': 'XMLHttpRequest'
};

async function detail(id) {
  let lastErr = '';
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(BASE + '/rest/pc/creator/marketing/distribution/detail', {
      method: 'POST', headers: H, body: JSON.stringify({ distributionPlanId: id, detailType: 'Online' })
    });
    const j = await r.json();
    if (j.result === 1 && j.data) return j.data;
    const msg = (j && j.message) ? JSON.stringify(j.message) : ('result=' + (j && j.result));
    lastErr = msg;
    if (/系统繁忙|频繁|限流|busy|too many/i.test(msg)) { await new Promise(r => setTimeout(r, 2000)); continue; }
    throw new Error(`detail ${id} failed: ${msg}`);
  }
  throw new Error(`detail ${id} failed after retries: ${lastErr}`);
}
async function update(id, version) {
  const r = await fetch(BASE + '/rest/pc/creator/marketing/distribution/update', {
    method: 'POST', headers: H,
    body: JSON.stringify({ distributionPlanId: id, version, updateFields: { planOffline: '1' } })
  });
  return await r.json();
}

(async () => {
  if (!planIds.length) { console.log('No planIds. Use --ids 1,2,3 or --file list.json'); process.exit(1); }
  console.log(`Mode: ${EXECUTE ? 'EXECUTE (real downlist)' : 'DRY-RUN (no changes)'} | tasks: ${planIds.length}\n`);
  const results = [];
  for (const id of planIds) {
    try {
      const det = await detail(id);
      const version = det.version;
      const title = det.distributionPlanTitle || det.title || '';
      if (!EXECUTE) {
        console.log(`  [DRY] ${id} "${title}" version=${version} — would call planOffline`);
        results.push({ id, title, ok: 'dry' });
      } else {
        if (version === undefined || version === null) {
          console.log(`  [SKIP] ${id} "${title}" -> no version from detail, skip to avoid bad update`);
          results.push({ id, title, ok: false, err: 'no version' });
        } else {
          const j = await update(id, version);
          const ok = j.result === 1;
          console.log(`  [${ok ? 'OK ' : 'ERR'}] ${id} "${title}" -> result=${j.result} ${JSON.stringify(j.message || '')}`);
          results.push({ id, title, ok });
        }
      }
    } catch (e) {
      if (EXECUTE && /无权限|10002/.test(e.message)) {
        // detail denied (old tasks sometimes block detail but allow update with version=1)
        try {
          const j = await update(id, 1);
          const ok = j.result === 1;
          console.log(`  [${ok ? 'OK ' : 'ERR'}] ${id} (version=1 fallback) -> result=${j.result} ${JSON.stringify(j.message || '')}`);
          results.push({ id, ok, fallback: true });
        } catch (e2) {
          console.log(`  [ERR] ${id} (version=1 fallback) -> ${e2.message}`);
          results.push({ id, ok: false, err: e2.message });
        }
      } else {
        console.log(`  [ERR] ${id} -> ${e.message}`);
        results.push({ id, ok: false, err: e.message });
      }
    }
    await new Promise(r => setTimeout(r, 800));
  }
  const okCount = results.filter(r => r.ok === true || r.ok === 'dry').length;
  console.log(`\nDone. ${okCount}/${planIds.length} processed.`);
  if (EXECUTE) {
    const failed = results.filter(r => r.ok !== true);
    if (failed.length) console.log('FAILED(' + failed.length + '):', failed.map(f => f.id).join(','));
    const outPath = '/tmp/ks_downlist_results.json';
    fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
    console.log('results written to', outPath);
  }
})();
