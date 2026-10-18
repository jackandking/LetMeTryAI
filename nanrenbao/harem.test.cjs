/**
 * nanrenbao/harem.test.cjs
 * 我的后宫（harem.js / harem.html）测试：删除照片 + 收录回归
 *
 * 覆盖：
 *   A. 静态断言（removeHaremImage 存在/confirm 守卫/防冒泡/导出/CSS/画廊页守卫）
 *   B. removeHaremImage 行为（删除/不存在安全/顺序保持/空数组/add 互逆）
 *   C. renderHaremImages 删除按钮（渲染结构/确认取消/确认删除/重渲染/空态/无 DOM 守卫）
 *   D. addHaremImage 回归（去重/容量/unshift 防破坏）
 *
 * harem.js 是共享脚本：画廊页（appreciate/back-view-killer/scratch-lottery）也加载它
 * 做自动收录，那些页面没有 harem-images 元素——renderHaremImages 必须安全跳过。
 *
 * `node 本文件` 可直接执行。
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'harem.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, 'harem.html'), 'utf8');

const results = [];
const check = (name, pass) => results.push([name, !!pass]);

/** localStorage 桩 */
function makeStorage(seed) {
  const store = Object.assign({}, seed || {});
  return {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    _store: store
  };
}

/** DOM 元素桩（只实现 harem.js 用到的表面；className/innerHTML 按真实浏览器语义联动） */
function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    style: {},
    children: [],
    _cls: new Set(),
    classList: { add: (c) => el._cls.add(c), remove: (c) => el._cls.delete(c), contains: (c) => el._cls.has(c) },
    appendChild(c) { el.children.push(c); return c; },
    set textContent(v) { el._text = String(v); }, get textContent() { return el._text || ''; },
    set src(v) { el._src = v; }, get src() { return el._src || ''; },
    set onclick(fn) { el._onclick = fn; }, get onclick() { return el._onclick; },
    set title(v) { el._title = v; }, get title() { return el._title; },
    // className 赋值 = 替换 class 列表（浏览器语义）
    set className(v) { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get className() { return Array.from(el._cls).join(' '); },
    // innerHTML = '' 清空子节点（renderHaremImages 重渲染依赖）
    set innerHTML(v) { if (v === '') el.children.length = 0; },
    get innerHTML() { return ''; },
    _onclick: null, _text: '', _src: '', _title: ''
  };
  return el;
}

/**
 * 在隔离作用域加载 harem.js，返回内部函数表。
 * @param opts.storage localStorage 桩
 * @param opts.els    getElementById 映射（缺省返回 null）
 * @param opts.confirm confirm 返回值
 * @param opts.window window 桩（接收导出与 showPointsNotification）
 */
function loadHarem(opts) {
  const o = opts || {};
  const storage = o.storage || makeStorage();
  const els = o.els || {};
  const win = o.window || {};
  const confirmAnswer = o.confirm !== undefined ? o.confirm : true;
  const domReady = [];
  const doc = {
    addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') domReady.push(fn); },
    getElementById: (id) => (Object.prototype.hasOwnProperty.call(els, id) ? els[id] : null),
    createElement: (tag) => makeEl(tag)
  };
  const factory = new Function(
    'localStorage', 'document', 'window', 'confirm', 'alert', 'console',
    SRC + `
    return { addHaremImage, removeHaremImage, getHaremImages, renderHaremImages,
             isHaremActivated, getHaremCapacity, setHaremCapacity, activateHarem };
  `);
  const api = factory(storage, doc, win, () => confirmAnswer, () => {}, { log: () => {}, error: () => {} });
  api._storage = storage;
  api._win = win;
  api._domReady = domReady;
  api._doc = doc;
  return api;
}

// ============ A. 静态断言 ============
check('A1: removeHaremImage 存在且用 indexOf+splice 移除', (() => {
  const m = SRC.match(/function removeHaremImage\(url\)\s*\{[\s\S]*?\n\}/);
  return !!m && /indexOf\(url\)/.test(m[0]) && /splice\(idx,\s*1\)/.test(m[0]) &&
    /localStorage\.setItem\('haremImages'/.test(m[0]);
})());
check('A2: renderHaremImages 渲染 harem-delete 删除按钮', /del\.className = 'harem-delete'/.test(SRC) && /del\.textContent = '✕'/.test(SRC));
check('A3: 删除前 confirm 确认守卫', /if \(!confirm\('确定把这张照片从后宫移除吗？'\)\) return;/.test(SRC));
check('A4: 删除按钮 stopPropagation 防冒泡（不触发全屏查看）', /if \(ev && ev\.stopPropagation\) ev\.stopPropagation\(\);/.test(SRC));
check('A5: window.removeHaremImage 导出供主站调用', /window\.removeHaremImage = removeHaremImage;/.test(SRC));
check('A6: harem.html 含 .harem-delete 样式（绝对定位右上角）', /\.harem-item\s*\{[^}]*position:\s*relative/.test(HTML) && /\.harem-delete\s*\{[^}]*position:\s*absolute/.test(HTML) && /\.harem-delete:hover[^}]*#e53935/.test(HTML));
check('A7: 画廊页守卫仍在（无 harem-images 元素时安全跳过）', /if \(!list \|\| !empty\) return;/.test(SRC));
check('A8: 缩略图包裹 .harem-item（删除按钮定位容器）', /item\.className = 'harem-item';/.test(SRC) && /item\.appendChild\(del\);/.test(SRC));

// ============ B. removeHaremImage 行为 ============
{
  const storage = makeStorage({ haremImages: JSON.stringify(['a.jpg', 'b.jpg', 'c.jpg']) });
  const h = loadHarem({ storage });
  check('B1: 删除存在的 URL 返回 true 且已移除', h.removeHaremImage('b.jpg') === true &&
    JSON.stringify(h.getHaremImages()) === JSON.stringify(['a.jpg', 'c.jpg']));
  check('B2: 删除不存在 URL 返回 false 且列表不变', h.removeHaremImage('zzz.jpg') === false &&
    JSON.stringify(h.getHaremImages()) === JSON.stringify(['a.jpg', 'c.jpg']));
  check('B3: 删除中间项后其余顺序保持', (() => {
    const s2 = makeStorage({ haremImages: JSON.stringify(['x1', 'x2', 'x3', 'x4']) });
    const h2 = loadHarem({ storage: s2 });
    h2.removeHaremImage('x2');
    return JSON.stringify(h2.getHaremImages()) === JSON.stringify(['x1', 'x3', 'x4']);
  })());
  check('B4: 删到空数组安全', (() => {
    const s3 = makeStorage({ haremImages: JSON.stringify(['only.jpg']) });
    const h3 = loadHarem({ storage: s3 });
    h3.removeHaremImage('only.jpg');
    return JSON.stringify(h3.getHaremImages()) === '[]';
  })());
  check('B5: 空后宫删除安全返回 false', loadHarem({ storage: makeStorage() }).removeHaremImage('a.jpg') === false);
  check('B6: add→remove 互逆（回到空）', (() => {
    const s4 = makeStorage();
    const h4 = loadHarem({ storage: s4 });
    h4.setHaremCapacity(10);
    h4.addHaremImage('n1.jpg');
    h4.addHaremImage('n2.jpg');
    h4.removeHaremImage('n1.jpg');
    h4.removeHaremImage('n2.jpg');
    return JSON.stringify(h4.getHaremImages()) === '[]';
  })());
  check('B7: 删除写回 localStorage（刷新不复活）', (() => {
    const s5 = makeStorage({ haremImages: JSON.stringify(['p.jpg']) });
    const h5 = loadHarem({ storage: s5 });
    h5.removeHaremImage('p.jpg');
    return s5.getItem('haremImages') === '[]';
  })());
}

// ============ C. renderHaremImages 删除按钮 ============
{
  const list = makeEl('div'), empty = makeEl('div'), capEl = makeEl('div');
  const els = { 'harem-images': list, 'harem-empty': empty, 'harem-capacity': capEl };
  const h = loadHarem({
    storage: makeStorage({ haremImages: JSON.stringify(['u1.jpg', 'u2.jpg', 'u3.jpg']) }),
    els, confirm: true
  });
  h.renderHaremImages();
  check('C1: 3 张图渲染 3 个 .harem-item', list.children.length === 3 &&
    list.children.every(c => c.classList.contains('harem-item')));
  check('C2: 每项含 img + 删除按钮两个子元素', list.children.every(c => c.children.length === 2 &&
    c.children[0].tagName === 'IMG' && c.children[1].tagName === 'BUTTON'));
  check('C3: 删除按钮样式与文案', list.children.every(c => {
    const d = c.children[1];
    return d.classList.contains('harem-delete') && d.textContent === '✕' && d.title === '删除这张照片';
  }));
  check('C4: 缩略图仍绑定全屏查看', typeof list.children[0].children[0].onclick === 'function');
  // 点第二张的删除按钮（confirm=true）→ 删除 u2 并重渲染
  let notified = null;
  const win2 = { showPointsNotification: (m) => { notified = m; } };
  const list2 = makeEl('div'), empty2 = makeEl('div');
  const h2 = loadHarem({
    storage: makeStorage({ haremImages: JSON.stringify(['u1.jpg', 'u2.jpg', 'u3.jpg']) }),
    els: { 'harem-images': list2, 'harem-empty': empty2 },
    confirm: true, window: win2
  });
  h2.renderHaremImages();
  let stopped = false;
  list2.children[1].children[1].onclick({ stopPropagation: () => { stopped = true; } });
  check('C5: 点删除先 stopPropagation（不触发全屏）', stopped === true);
  check('C6: 确认后删除该张并重渲染（3→2，u2 消失）', list2.children.length === 2 &&
    list2.children[0].children[0].src === 'u1.jpg' && list2.children[1].children[0].src === 'u3.jpg');
  check('C7: 删除后 localStorage 同步移除', JSON.stringify(h2.getHaremImages()) === JSON.stringify(['u1.jpg', 'u3.jpg']));
  check('C8: 删除成功有 toast 反馈', notified === '已删除 🗑️');
  // confirm=false → 不删
  const list3 = makeEl('div'), empty3 = makeEl('div');
  const h3 = loadHarem({
    storage: makeStorage({ haremImages: JSON.stringify(['v1.jpg', 'v2.jpg']) }),
    els: { 'harem-images': list3, 'harem-empty': empty3 },
    confirm: false
  });
  h3.renderHaremImages();
  list3.children[0].children[1].onclick({ stopPropagation: () => {} });
  check('C9: 取消确认不删除（2 张仍在）', list3.children.length === 2 &&
    JSON.stringify(h3.getHaremImages()) === JSON.stringify(['v1.jpg', 'v2.jpg']));
  // 空列表 → empty 显示
  const list4 = makeEl('div'), empty4 = makeEl('div'), capEl4 = makeEl('div');
  const h4 = loadHarem({ storage: makeStorage(), els: { 'harem-images': list4, 'harem-empty': empty4, 'harem-capacity': capEl4 } });
  h4.renderHaremImages();
  check('C10: 空列表显示 empty 占位且无删除按钮', list4.children.length === 0 && empty4.style.display === '');
  // 删完全部后回到 empty 态
  list2.children[0].children[1].onclick({ stopPropagation: () => {} });
  list2.children[0].children[1].onclick({ stopPropagation: () => {} });
  check('C11: 连续删除可清空并回到 empty 态', list2.children.length === 0 && empty2.style.display === '');
  // 画廊页场景：无 harem 元素 → 安全跳过
  const h5 = loadHarem({ storage: makeStorage({ haremImages: JSON.stringify(['g.jpg']) }) });
  let threw = null;
  try { h5.renderHaremImages(); } catch (e) { threw = e; }
  check('C12: 画廊页（无 DOM 元素）调用 renderHaremImages 不抛错', threw === null);
}

// ============ D. addHaremImage 回归（删除功能不许破坏收录） ============
{
  const s = makeStorage();
  const h = loadHarem({ storage: s });
  h.setHaremCapacity(2);
  check('D1: 新图 unshift 到最前（ newcomers first ）', (() => {
    h.addHaremImage('a.jpg'); h.addHaremImage('b.jpg');
    return JSON.stringify(h.getHaremImages()) === JSON.stringify(['b.jpg', 'a.jpg']);
  })());
  check('D2: 重复 URL 去重（返回 true 不重复入列）', h.addHaremImage('a.jpg') === true &&
    JSON.stringify(h.getHaremImages()) === JSON.stringify(['b.jpg', 'a.jpg']));
  check('D3: 容量满不加（返回 false）', h.addHaremImage('c.jpg') === false &&
    JSON.stringify(h.getHaremImages()) === JSON.stringify(['b.jpg', 'a.jpg']));
  check('D4: 删除后腾出容量可再收录', (() => {
    h.removeHaremImage('a.jpg');
    return h.addHaremImage('c.jpg') === true &&
      JSON.stringify(h.getHaremImages()) === JSON.stringify(['c.jpg', 'b.jpg']);
  })());
}

const failed = results.filter(([, pass]) => !pass);
for (const [name] of results) console.log((results.find(r => r[0] === name)[1] ? '✓ ' : '✗ ') + name);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
