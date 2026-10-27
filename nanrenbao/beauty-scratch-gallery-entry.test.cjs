/**
 * 男人宝刮擦乐→画廊入口测试（beauty-scratch.html galleryBtn）。
 *
 * 背景：欣赏画廊页（appreciate.html）长期没有流量入口——近 7 日快手侧
 * 挂载 appreciate 仅 1 条视频（16 播放 0 进入），命名 A/B 实验缺访客。
 * 刮刮乐页是唯一有量的落地页（周约 238 人进小程序），本次在解锁面板
 * 加 ghost 次级按钮「浏览全部美女」跳画廊，并用 /api/track 落
 * gallery_entry 事件衡量入口转化。
 *
 * 设计约束（有意为之，测试锁定）：
 *   - 放在 nextBtn（激励视频广告，收入主路径）之后做次级按钮，不蚕食广告点击；
 *   - 埋点用 fetch keepalive（sendBeacon 在部分 WebView 丢 body，已弃用）；
 *   - 埋点失败必须静默，不能打断跳转。
 *
 * 本文件 .cjs 结尾自带断言，`node 本文件` 直接执行（仓库 package.json
 * 为 ES Module，jest require 会报 ESM 错，沿用 harem/exp-naming 约定）。
 */
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const HTML = fs.readFileSync(path.join(__dirname, 'beauty-scratch.html'), 'utf8');

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, '—', e.message);
    process.exitCode = 1;
  }
}

check('G1: 面板含画廊入口按钮（ghost 次级，位于 nextBtn 之后）', () => {
  assert.ok(/id="nextBtn"/.test(HTML), 'nextBtn 应存在');
  assert.ok(/id="galleryBtn"/.test(HTML), 'galleryBtn 应存在');
  assert.ok(/id="galleryBtn"[^>]*>🖼 浏览全部美女</.test(HTML), '按钮文案应为「🖼 浏览全部美女」');
  const btnClass = (HTML.match(/<button[^>]*id="galleryBtn"[^>]*>/) || [''])[0];
  assert.ok(btnClass.includes('ghost'), 'galleryBtn 应为 ghost 次级按钮（避免蚕食 nextBtn 广告点击）');
  assert.ok(HTML.indexOf('id="nextBtn"') < HTML.indexOf('id="galleryBtn"'), 'galleryBtn 应在 nextBtn 之后');
});

check('G2: 点击跳转欣赏画廊页', () => {
  assert.ok(
    /location\.href\s*=\s*'https:\/\/letmetryai\.cn\/nanrenbao\/appreciate\.html'/.test(HTML),
    '应跳转 https://letmetryai.cn/nanrenbao/appreciate.html'
  );
});

check('G3: 埋点 gallery_entry 走 /api/track + fetch keepalive', () => {
  assert.ok(/event:\s*'gallery_entry'/.test(HTML), '应发 gallery_entry 事件');
  assert.ok(/appId:\s*'nanrenbao-scratch'/.test(HTML), 'appId 应为 nanrenbao-scratch（与 home_redirect 一致）');
  assert.ok(/source:\s*'beauty_scratch'/.test(HTML), 'source 应为 beauty_scratch');
  assert.ok(/fetch\('https:\/\/letmetry\.cn\/api\/track'[\s\S]{0,400}?keepalive:\s*true/.test(HTML), '应用 fetch keepalive（sendBeacon 在 WebView 丢 body）');
});

check('G4: 埋点失败静默（catch 不打断跳转）', () => {
  // galleryBtn 的 handler 内 fetch 必须带 .catch，且整体在 try/catch 中
  const seg = HTML.slice(HTML.indexOf('id="galleryBtn"'));
  const handler = seg.slice(0, seg.indexOf('});', seg.indexOf('location.href')) + 400);
  assert.ok(/\.catch\(function\(\)\{\}\)/.test(handler), 'fetch 应有 .catch 静默');
  assert.ok(/try\s*\{[\s\S]*gallery_entry[\s\S]*\}\s*catch\(e\)\{\}/.test(handler), '埋点应在 try/catch 内');
});

check('G5: 不碰刮刮乐既有实验与计数通道', () => {
  assert.ok(!/gallery_entry[\s\S]{0,200}INSERT/.test(HTML), '不得直接 INSERT（统一走 /api/track）');
  assert.ok(!/galleryBtn[\s\S]{0,300}bumpViewCount/.test(HTML), '入口点击不得触发 view_count 计数');
});

console.log(`\n${passed}/5 passed`);
if (passed < 5) process.exit(1);
