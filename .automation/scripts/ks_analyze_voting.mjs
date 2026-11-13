#!/usr/bin/env node
// Filter voting-type tasks from the 599 fetched, fetch cumulative volume for each,
// and split into (voting + zero-volume) downlist candidates vs (voting + has-volume).
import fs from 'fs';

const AUTH = '/Users/jak/LetMeTryAI/.automation/.local/auth/kuaishou_auth.json';
const TASKS = '/Users/jak/WorkBuddy/2026-09-28-06-19-53/ks_tasks_all.json';
const OUT = '/Users/jak/WorkBuddy/2026-09-28-06-19-53/ks_voting_analysis.json';

const d = JSON.parse(fs.readFileSync(AUTH, 'utf8'));
const cookies = d.cookies || [];
const seen = new Map();
for (const c of cookies) { const v = c.value || ''; if (v) seen.set(c.name, `${c.name}=${v}`); }
const H = {
  'Content-Type': 'application/json',
  'Cookie': [...seen.values()].join('; '),
  'Referer': 'https://daren.kuaishou.com/content/promotion/distribution',
  'Origin': 'https://daren.kuaishou.com',
  'X-Requested-With': 'XMLHttpRequest'
};

const tasks = JSON.parse(fs.readFileSync(TASKS, 'utf8'));

// voting-type classifier
const VOTE_CORE = ['投票', '公投', '评选', '选出'];
const VOTE_SOFT = ['榜', 'pick', 'PK', '哪个', '最牛', '最美', '最爱', '排行'];
function classify(title) {
  const t = title || '';
  if (VOTE_CORE.some(k => t.includes(k))) return 'voting-core';
  // "投" alone (excluding 投稿)
  if (t.includes('投') && !t.includes('投稿')) return 'voting-core';
  if (VOTE_SOFT.some(k => t.toLowerCase().includes(k.toLowerCase()))) return 'voting-soft';
  return 'other';
}

const voting = tasks.filter(t => {
  const c = classify(t.distributionPlanTitle);
  return c === 'voting-core' || c === 'voting-soft';
});
const core = voting.filter(t => classify(t.distributionPlanTitle) === 'voting-core');
const soft = voting.filter(t => classify(t.distributionPlanTitle) === 'voting-soft');

console.log(`voting-core: ${core.length}, voting-soft(borderline): ${soft.length}, total voting-ish: ${voting.length}`);

async function vol(id) {
  const r = await fetch('https://daren.kuaishou.com/rest/pc/creator/marketing/distribution/data', {
    method: 'POST', headers: H, body: JSON.stringify({ distributionPlanId: id })
  });
  const j = await r.json();
  const x = j.data || {};
  return {
    play: x.playCount || 0, click: x.clickCount || 0,
    attend: x.attendUsers || 0, photo: x.photoCount || 0,
    fresh: x.baseDataFreshTime || ''
  };
}

const enriched = [];
for (const t of voting) {
  const v = await vol(t.distributionPlanId);
  const total = v.play + v.click + v.attend + v.photo;
  enriched.push({
    id: t.distributionPlanId,
    title: t.distributionPlanTitle,
    app: t.miniAppName,
    kind: classify(t.distributionPlanTitle),
    status: t.distributionStatus?.desc || '',
    audit: t.auditStatus || '',
    ...v,
    totalVolume: total,
    zero: total === 0
  });
  process.stdout.write('.');
}
console.log('');

const zero = enriched.filter(e => e.zero);
const hasVol = enriched.filter(e => !e.zero);

fs.writeFileSync(OUT, JSON.stringify(enriched, null, 2));

console.log(`\n=== 投票类候选分析 ===`);
console.log(`投票类合计: ${enriched.length}`);
console.log(`  · 累计零量(可下架候选): ${zero.length}`);
console.log(`  · 累计有量(不可盲下): ${hasVol.length}`);
console.log(`\n--- 累计零量清单 (voting + zero cumulative) ---`);
zero.forEach(e => console.log(`  [${e.id}] (${e.kind}) ${e.title} | app=${e.app} | status=${e.status}`));
if (hasVol.length) {
  console.log(`\n--- 累计有量(暂不处理, 需您确认) ---`);
  hasVol.slice(0, 30).forEach(e => console.log(`  [${e.id}] ${e.title} | play=${e.play} attend=${e.attend} photo=${e.photo} | fresh=${e.fresh}`));
  if (hasVol.length > 30) console.log(`  ... 共 ${hasVol.length} 条, 详见 ${OUT}`);
}
