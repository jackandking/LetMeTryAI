#!/usr/bin/env node
/**
 * nanrenbao-scratch-arm-audit.mjs — 刮刮乐马赛克实验「臂倾斜」审计。
 *
 * 背景：beauty-scratch.html / scratch-lottery.html 的 5 臂实验
 *   （control 自由刮 + tile_4/9/16/25）按「图片 ID 哈希」分流：
 *     variantForId(id) = fnv1a32('nrbsalt_' + id) % 5
 *   流量按图走，若图片热度不均则臂间样本倾斜、臂与图片混淆。
 *   本脚本用两个只读数据源量倾斜：
 *     A. nginx 封面图(-c.jpg)请求数（页面加载代理，实验窗口 10-15 起）
 *     B. beauty_images.view_count（累计，混合口径：欣赏页深链浏览 + 刮刮乐解锁）
 *
 * 输入（TSV，可用 --images/--covers 覆盖）：
 *   images: id \t view_count \t image_url   （SELECT id,view_count,image_url FROM beauty_images WHERE deleted=0）
 *   covers: count \t cover_filename         （nginx 日志聚合 /images/*-c.jpg）
 *
 * 用法：
 *   node .automation/scripts/nanrenbao-scratch-arm-audit.mjs \
 *     [--images ~/LetMeTryAI/.automation/reports/nrb_images.tsv] \
 *     [--covers ~/LetMeTryAI/.automation/reports/nrb_cover_counts.tsv]
 *
 * 只读：纯本地文件处理，无网络请求、无写操作（除打印）。
 */
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const VARIANTS = ['control', 'tile_4', 'tile_9', 'tile_16', 'tile_25'];

// 与页面 EXP.VARIANTS 顺序一致（索引 = 哈希取模结果）
const args = process.argv.slice(2);
function argOf(flag) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
}
const imagesPath = argOf('--images') || join(homedir(), 'LetMeTryAI/.automation/reports/nrb_images.tsv');
const coversPath = argOf('--covers') || join(homedir(), 'LetMeTryAI/.automation/reports/nrb_cover_counts.tsv');

// ---- 复现页面哈希：FNV-1a 32bit + Math.imul（与 beauty-scratch.html 完全一致）----
function hashStr(s) {
  let h = 2166136261;
  s = String(s);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
const variantForId = (id) => VARIANTS[hashStr('nrbsalt_' + id) % VARIANTS.length];

// ---- 读入 ----
const images = new Map(); // id -> {viewCount, cover}
for (const line of readFileSync(imagesPath, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const [id, vc, url] = line.split('\t');
  if (!id || !url) continue;
  const cover = url.split('/').pop();
  images.set(Number(id), { viewCount: Number(vc) || 0, cover });
}
const covers = new Map(); // cover filename -> requests
for (const line of readFileSync(coversPath, 'utf8').split('\n')) {
  if (!line.trim()) continue;
  const m = line.trim().match(/^\s*(\d+)\s+(\S+)$/);
  if (m) covers.set(m[2], Number(m[1]));
}

// ---- 聚合 ----
const armLoads = Object.fromEntries(VARIANTS.map((v) => [v, 0]));
const armViews = Object.fromEntries(VARIANTS.map((v) => [v, 0]));
const armImages = Object.fromEntries(VARIANTS.map((v) => [v, 0]));
let matchedLoads = 0;
for (const [id, meta] of images) {
  const arm = variantForId(id);
  armImages[arm] += 1;
  armViews[arm] += meta.viewCount;
  const n = covers.get(meta.cover) || 0;
  armLoads[arm] += n;
  matchedLoads += n;
}
const totalLoads = [...covers.values()].reduce((a, b) => a + b, 0);
const totalViews = [...images.values()].reduce((a, x) => a + x.viewCount, 0);

// ---- 输出 ----
const pad = (s, n) => String(s).padEnd(n);
const padL = (s, n) => String(s).padStart(n);
console.log('== 刮刮乐实验臂倾斜审计（nginx 封面请求 = 页面加载代理；窗口 10-15 起）==\n');
console.log(pad('臂', 10) + padL('图片数', 8) + padL('页面加载', 12) + padL('占比', 9) + padL('view_count', 13) + padL('占比', 9));
for (const v of VARIANTS) {
  const loadShare = matchedLoads ? ((armLoads[v] / matchedLoads) * 100).toFixed(1) + '%' : '-';
  const viewShare = totalViews ? ((armViews[v] / totalViews) * 100).toFixed(1) + '%' : '-';
  console.log(
    pad(v, 10) + padL(armImages[v], 8) + padL(armLoads[v], 12) + padL(loadShare, 9) + padL(armViews[v], 13) + padL(viewShare, 9)
  );
}
console.log(pad('合计', 10) + padL(images.size, 8) + padL(matchedLoads, 12) + padL('100%', 9) + padL(totalViews, 13) + padL('100%', 9));

// 均匀性快查：每臂期望 20%；>±5pp 记倾斜
console.log('\n倾斜判读（期望各 20%）：');
for (const v of VARIANTS) {
  const share = matchedLoads ? (armLoads[v] / matchedLoads) * 100 : 0;
  const dev = share - 20;
  const flag = Math.abs(dev) >= 5 ? `⚠️ 倾斜 ${dev > 0 ? '+' : ''}${dev.toFixed(1)}pp` : '✓ 均衡';
  console.log(`  ${pad(v, 10)} ${share.toFixed(1)}%  ${flag}`);
}
if (matchedLoads < totalLoads) {
  console.log(`\n注：${totalLoads - matchedLoads} 次封面请求的文件不在当前图片表（已删除/改名），未入臂统计。`);
}
console.log('\n口径提醒：view_count 为累计混合口径（欣赏页深链浏览 + 刮刮乐解锁），仅作臂间相对比较。');
