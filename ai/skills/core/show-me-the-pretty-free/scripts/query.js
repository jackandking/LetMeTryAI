#!/usr/bin/env node
'use strict';
// Helper for the show-me-the-pretty-free (FREE) skill.
// Usage:
//   node scripts/query.js
// Env:
//   PRETTY_FREE_API_BASE  base URL (default https://letmetry.cn)

const BASE = process.env.PRETTY_FREE_API_BASE || 'https://letmetry.cn';

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') { flags.base = argv[++i]; }
    else if (a.startsWith('--')) { flags[a.slice(2)] = true; }
  }
  return { flags };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const base = flags.base || BASE;
  const url = `${base}/skillhub/show-me-the-pretty-free`;
  const res = await fetch(url, { method: 'GET', cache: 'no-store' });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

  if (res.status === 200) {
    console.log(JSON.stringify(json, null, 2));
    process.exit(0);
  }
  if (res.status === 404) {
    console.log(JSON.stringify({ error: 'no_image', detail: json }, null, 2));
    process.exit(0);
  }
  console.error(`HTTP ${res.status}: ${text}`);
  process.exit(1);
}

main().catch((e) => { console.error('ERR', e.message); process.exit(1); });
