#!/usr/bin/env node
// Fetch ALL Kuaishou distribution tasks (paged) using the saved passToken session.
import fs from 'fs';
import path from 'path';

const AUTH = '/Users/jak/LetMeTryAI/.automation/.local/auth/kuaishou_auth.json';
const OUT = process.argv[2] || '/Users/jak/WorkBuddy/2026-09-28-06-19-53/ks_tasks_all.json';

const d = JSON.parse(fs.readFileSync(AUTH, 'utf8'));
const cookies = d.cookies || [];
// dedupe by name (keep one with a value), build Cookie header
const seen = new Map();
for (const c of cookies) {
  const v = c.value || '';
  if (v) seen.set(c.name, `${c.name}=${v}`);
}
const cookieHeader = [...seen.values()].join('; ');

const BASE = 'https://daren.kuaishou.com';
const HEADERS = {
  'Content-Type': 'application/json',
  'Cookie': cookieHeader,
  'Referer': BASE + '/content/promotion/distribution',
  'Origin': BASE,
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
};

async function post(url, body) {
  const r = await fetch(url, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) });
  const txt = await r.text();
  try { return JSON.parse(txt); } catch { return { _raw: txt, _status: r.status }; }
}

(async () => {
  const all = [];
  let pageNum = 1;
  const pageSize = 50;
  while (true) {
    const j = await post(BASE + '/rest/pc/creator/marketing/distribution/list', {
      pageNum, pageSize, status: 'all', keyword: ''
    });
    if (j.result !== 1) {
      console.log('LIST ERROR at page', pageNum, JSON.stringify(j).slice(0, 400));
      break;
    }
    const arr = j.data?.dataList || j.data?.list || j.data?.records || j.data?.distributionPlanList || [];
    if (!arr.length) { console.log('no more pages at', pageNum); break; }
    all.push(...arr);
    const total = j.data?.total;
    console.log(`page ${pageNum}: +${arr.length} (fetched ${all.length}${total ? ' / ' + total : ''})`);
    if (total && all.length >= total) break;
    if (arr.length < pageSize) break;
    pageNum++;
    await new Promise(r => setTimeout(r, 600));
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
  console.log(`\nSAVED ${all.length} tasks -> ${OUT}`);
  // quick summary
  const byStatus = {};
  for (const t of all) {
    const s = t.distributionStatus ?? t.auditStatus ?? t.status ?? 'unknown';
    byStatus[s] = (byStatus[s] || 0) + 1;
  }
  console.log('status breakdown:', JSON.stringify(byStatus));
})();
