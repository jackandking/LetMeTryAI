#!/usr/bin/env node
'use strict';
// Helper for the show-me-the-pretty paid skill.
// Usage:
//   node scripts/query.js
//   node scripts/query.js --out-trade-no WX402_xxx   (retry after payment)
// Env:
//   PRETTY_API_BASE  base URL (default https://letmetry.cn)

const BASE = process.env.PRETTY_API_BASE || 'https://letmetry.cn';

function parseArgs(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out-trade-no') { flags.outTradeNo = argv[++i]; }
    else if (a === '--base') { flags.base = argv[++i]; }
    else if (a.startsWith('--')) { flags[a.slice(2)] = true; }
  }
  return { flags };
}

async function main() {
  const { flags } = parseArgs(process.argv.slice(2));
  const base = flags.base || BASE;
  const url = `${base}/skillhub/show-me-the-pretty`;
  const headers = { 'Content-Type': 'application/json' };
  if (flags.outTradeNo) headers['X-Out-Trade-No'] = flags.outTradeNo;
  const body = JSON.stringify({});

  const res = await fetch(url, { method: 'POST', headers, body, cache: 'no-store' });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* non-JSON */ }

  if (res.status === 402) {
    console.log(JSON.stringify({
      needsPayment: true,
      paymentCode: res.headers.get('WeixinPay-Required'),
      outTradeNo: res.headers.get('X-Out-Trade-No'),
      amountFen: json?.amount_fen,
      currency: json?.currency,
      prompt: '请通过平台微信支付(weixinpay_pay)以 paymentCode 完成授权，然后带 --out-trade-no 重新调用'
    }, null, 2));
    process.exit(0);
  }
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
