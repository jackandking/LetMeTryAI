#!/usr/bin/env node
/**
 * nanrenbao/exp-naming.test.cjs
 * 卡片人物名称 A/B 实验模块（exp-naming.js）测试：解析/分桶/埋点/角标/接入点。
 *
 * 覆盖：
 *   A. parseSubject：有名/无名边界（对齐线上 prompt_dna.subject 真实分布）
 *   B. shortSource：出处截断
 *   C. 分桶：粘性 / 首次随机并持久化 / QA 强制不落盘 / localStorage 不可用降级 A
 *   D. 实验 ID：默认 / ?expid= 覆盖 / 畸形拒绝
 *   E. 埋点：page_view 自动上报 / sendBeacon 载荷 / 批量上限自动 flush
 *   F. 角标：variant B 有名加角标 / 无名跳过 / 不重复添加
 *   G. 曝光：IntersectionObserver ≥50% 去重
 *   H. appreciate.html 接入点静态断言
 *
 * 运行：node nanrenbao/exp-naming.test.cjs
 */
const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(path.join(__dirname, 'exp-naming.js'), 'utf8');
const HTML = fs.readFileSync(path.join(__dirname, 'appreciate.html'), 'utf8');

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

/** DOM 元素桩（querySelector 按 className 路由子节点） */
function makeEl(tag) {
  const el = {
    tagName: String(tag).toUpperCase(),
    style: {},
    children: [],
    _cls: new Set(),
    classList: { add: (c) => el._cls.add(c), remove: (c) => el._cls.delete(c), contains: (c) => el._cls.has(c) },
    appendChild(c) { el.children.push(c); return c; },
    set textContent(v) { el._text = String(v); }, get textContent() { return el._text || ''; },
    set className(v) { el._cls = new Set(String(v).split(/\s+/).filter(Boolean)); },
    get className() { return Array.from(el._cls).join(' '); },
    set id(v) { el._id = v; }, get id() { return el._id || ''; },
    setAttribute(k, v) { el['_attr_' + k] = String(v); },
    getAttribute(k) { return Object.prototype.hasOwnProperty.call(el, '_attr_' + k) ? el['_attr_' + k] : null; },
    querySelector(sel) {
      const want = sel.replace(/^\./, '');
      return el.children.find((c) => c._cls && c._cls.has(want)) || null;
    }
  };
  return el;
}

/**
 * 隔离作用域加载 exp-naming.js。
 * @param opts.storage  localStorage 桩（缺省=空）
 * @param opts.search   location.search（QA 强制参数）
 * @param opts.random   Math.random 替身（分桶可控）
 * @param opts.noStorage true=window 无 localStorage（隐私模式降级）
 * @param opts.dom      true=提供 document/setInterval 等浏览器全局（触发自动初始化）
 * @param opts.io       IntersectionObserver 替身
 * @param opts.cards    getElementById 路由表：{ 'img-676': cardStub }
 * @param opts.beacons  sendBeacon 捕获数组
 * @param opts.flushFn  setInterval 回调捕获（手动触发 flush）
 */
function loadExp(opts) {
  const o = opts || {};
  const storage = o.storage || makeStorage();
  const beacons = o.beacons || [];
  const win = {
    location: { search: o.search || '' },
    navigator: { sendBeacon: (url, blob) => { beacons.push({ url, blob }); return true; } },
    addEventListener: () => {},
    fetch: () => Promise.reject(new Error('no network in tests'))
  };
  if (!o.noStorage) win.localStorage = storage;

  let doc;
  let intervalFn = null;
  let setIntervalFn = () => 1;
  if (o.dom) {
    doc = {
      addEventListener: () => {},
      getElementById: (id) => (o.cards && Object.prototype.hasOwnProperty.call(o.cards, id) ? o.cards[id] : null),
      createElement: (tag) => makeEl(tag),
      querySelectorAll: () => o.ioCards || []
    };
    setIntervalFn = (fn) => { intervalFn = fn; return 1; };
  }

  const factory = new Function(
    'window', 'document', 'setInterval', 'IntersectionObserver', 'Blob', 'Math',
    SRC + '\nreturn window.NbbExp;'
  );
  const api = factory(
    win,
    o.dom ? doc : undefined,
    setIntervalFn,
    o.io || undefined,
    class BlobStub { constructor(parts, opts2) { this.parts = parts; this.type = opts2 && opts2.type; } },
    o.random ? { random: o.random } : Math
  );
  api._win = win;
  api._storage = storage;
  api._beacons = beacons;
  api._flushFn = intervalFn;
  return api;
}

const readBeacon = (b) => JSON.parse(b.blob.parts[0]);

// ============ A. parseSubject ============
{
  const { parseSubject } = loadExp({});
  check('A1: 标准人物 subject 解析出名字+出处',
    JSON.stringify(parseSubject('周芷若（倚天屠龙记）reinterpret，非真人仿冒')) ===
    JSON.stringify({ name: '周芷若', source: '倚天屠龙记' }));
  check('A2: 出处含 · 的主题完整保留',
    parseSubject('凝光（原神·群玉袖天权）reinterpret，非真人仿冒').source === '原神·群玉袖天权' ||
    parseSubject('凝光（原神·群玉阁天权）reinterpret，非真人仿冒').source === '原神·群玉阁天权');
  check('A3: 描述性 subject 返回 null（实事求是）',
    parseSubject('亚洲青年女性，棕色长发半扎配脸部碎发，含羞浅笑直视镜头，双手轻捏上衣领口') === null &&
    parseSubject('3D卡通渲染风格的年轻中国女性角色，黑色发髻配金簪与红花，额头红色花钿，棕色大眼，妩媚微笑') === null);
  check('A4: 女性/盘丝洞蜘蛛精等泛描述返回 null',
    parseSubject('女性') === null && parseSubject('西游记盘丝洞蜘蛛精·绯红衣') === null);
  check('A5: 空值/非字符串返回 null',
    parseSubject('') === null && parseSubject(null) === null && parseSubject(undefined) === null);
  check('A6: 半角括号拒绝（线上均为全角）', parseSubject('猫女(Catwoman·DC漫画)reinterpret') === null);
}

// ============ B. shortSource ============
{
  const { shortSource } = loadExp({});
  check('B1: · 前段 + 8 字截断',
    shortSource('三国·江东佳人') === '三国' &&
    shortSource('Catwoman·DC漫画') === 'Catwoman' &&
    shortSource('一二三四五六七八九') === '一二三四五六七八…');
  check('B2: 短出处原样 / 空串安全', shortSource('唐女道士诗人') === '唐女道士诗人' && shortSource('') === '');
}

// ============ C. 分桶 ============
check('C1: 已存 variant 粘性保留', (() => {
  const a = loadExp({ storage: makeStorage({ 'nbb_exp_variant_appreciate-name-v1': 'A' }) });
  const b = loadExp({ storage: makeStorage({ 'nbb_exp_variant_appreciate-name-v1': 'B' }) });
  return a.getVariant() === 'A' && b.getVariant() === 'B';
})());
check('C2: 首次访问随机分桶并持久化', (() => {
  const hi = loadExp({ random: () => 0.9 });
  const vHi = hi.getVariant();
  const persistedHi = hi._storage.getItem('nbb_exp_variant_appreciate-name-v1');
  const lo = loadExp({ random: () => 0.1 });
  const vLo = lo.getVariant();
  const persistedLo = lo._storage.getItem('nbb_exp_variant_appreciate-name-v1');
  return vHi === 'B' && persistedHi === 'B' && vLo === 'A' && persistedLo === 'A';
})());
check('C3: ?exp= 强制分组不落盘（QA）', (() => {
  const m = loadExp({ search: '?exp=B' });
  return m.getVariant() === 'B' && m._storage.getItem('nbb_exp_variant_appreciate-name-v1') === null;
})());
check('C4: localStorage 不可用降级对照组 A', loadExp({ noStorage: true }).getVariant() === 'A');

// ============ D. 实验 ID ============
check('D1: 默认 appreciate-name-v1', loadExp({}).getExpId() === 'appreciate-name-v1');
check('D2: ?expid= 合法覆盖', loadExp({ search: '?expid=appreciate-name-qa' }).getExpId() === 'appreciate-name-qa');
check('D3: ?expid= 畸形拒绝回落默认',
  loadExp({ search: '?expid=../etc/passwd' }).getExpId() === 'appreciate-name-v1' &&
  loadExp({ search: '?expid=x' }).getExpId() === 'appreciate-name-v1');

// ============ E. 埋点上报 ============
check('E1: 加载即上报 page_view', (() => {
  const beacons = [];
  const m = loadExp({ dom: true, beacons });
  m._flushFn(); // 手动触发定时 flush
  if (beacons.length !== 1) return false;
  const p = readBeacon(beacons[0]);
  return p.exp_id === 'appreciate-name-v1' && p.variant.length === 1 &&
    p.visitor_id.length >= 8 && p.events.length === 1 && p.events[0].event === 'page_view' &&
    beacons[0].url === 'https://letmetry.cn/api/nanrenbao/exp/track';
})());
check('E2: 点击/查看事件进载荷', (() => {
  const beacons = [];
  const m = loadExp({ dom: true, beacons });
  m._flushFn(); // 先冲掉 page_view
  m.logClick(676);
  m.logView(676);
  m._flushFn();
  const p = readBeacon(beacons[1]);
  return p.events.length === 2 && p.events[0].event === 'click' && p.events[0].image_id === 676 &&
    p.events[1].event === 'view' && p.events[1].image_id === 676;
})());
check('E3: 满 50 条自动 flush', (() => {
  const beacons = [];
  const m = loadExp({ dom: true, beacons });
  m._flushFn(); // 先冲掉 page_view → beacon 1
  for (let i = 0; i < 50; i++) m.logClick(600 + i); // 第 50 条触发自动 flush → beacon 2
  const autoOk = beacons.length === 2 && readBeacon(beacons[1]).events.length === 50;
  m.logClick(999);
  m._flushFn(); // beacon 3：剩余 1 条
  return autoOk && beacons.length === 3 && readBeacon(beacons[2]).events.length === 1;
})());

// ============ F. 角标渲染 ============
check('F1: variant B 有名卡片加角标（名字+出处）', (() => {
  const card = makeEl('div');
  const wrapper = makeEl('div');
  wrapper.className = 'image-wrapper';
  card.appendChild(wrapper);
  const m = loadExp({
    storage: makeStorage({ 'nbb_exp_variant_appreciate-name-v1': 'B' }),
    dom: true,
    cards: { 'img-676': card }
  });
  m.onGalleryRendered([{ id: 676, subject: '大乔（三国·江东佳人）reinterpret，非真人仿冒' }]);
  const badge = wrapper.querySelector('.exp-name-badge');
  if (!badge) return false;
  const name = badge.querySelector('.exp-name-badge-name');
  const src = badge.querySelector('.exp-name-badge-src');
  return name && name.textContent === '大乔' && src && src.textContent === '三国';
})());
check('F2: variant B 无名卡片不加角标', (() => {
  const card = makeEl('div');
  const wrapper = makeEl('div');
  wrapper.className = 'image-wrapper';
  card.appendChild(wrapper);
  const m = loadExp({
    storage: makeStorage({ 'nbb_exp_variant_appreciate-name-v1': 'B' }),
    dom: true,
    cards: { 'img-500': card }
  });
  m.onGalleryRendered([{ id: 500, subject: '亚洲青年女性，棕色长发半扎配脸部碎发，含羞浅笑直视镜头' }]);
  return wrapper.querySelector('.exp-name-badge') === null;
})());
check('F3: variant A 完全不加角标', (() => {
  const card = makeEl('div');
  const wrapper = makeEl('div');
  wrapper.className = 'image-wrapper';
  card.appendChild(wrapper);
  const m = loadExp({
    storage: makeStorage({ 'nbb_exp_variant_appreciate-name-v1': 'A' }),
    dom: true,
    cards: { 'img-676': card }
  });
  m.onGalleryRendered([{ id: 676, subject: '大乔（三国·江东佳人）reinterpret，非真人仿冒' }]);
  return wrapper.querySelector('.exp-name-badge') === null;
})());
check('F4: 不重复添加角标', (() => {
  const card = makeEl('div');
  const wrapper = makeEl('div');
  wrapper.className = 'image-wrapper';
  card.appendChild(wrapper);
  const m = loadExp({
    storage: makeStorage({ 'nbb_exp_variant_appreciate-name-v1': 'B' }),
    dom: true,
    cards: { 'img-676': card }
  });
  const item = { id: 676, subject: '大乔（三国·江东佳人）reinterpret，非真人仿冒' };
  m.onGalleryRendered([item]);
  m.onGalleryRendered([item]);
  return wrapper.children.filter((c) => c._cls.has('exp-name-badge')).length === 1;
})());

// ============ G. 曝光追踪 ============
check('G1: IntersectionObserver 曝光每卡每遍一次', (() => {
  const beacons = [];
  const instances = [];
  class IOStub {
    constructor(cb) { this.cb = cb; instances.push(this); }
    observe(el) { this.cb([{ isIntersecting: true, target: el }], this); }
    unobserve() {}
  }
  const card1 = makeEl('div'); card1.setAttribute('data-img-id', '676');
  const card2 = makeEl('div'); card2.setAttribute('data-img-id', '653');
  const m = loadExp({
    storage: makeStorage({ 'nbb_exp_variant_appreciate-name-v1': 'A' }),
    dom: true,
    beacons,
    io: IOStub,
    ioCards: [card1, card2]
  });
  m._flushFn(); // page_view
  m.onGalleryRendered([{ id: 676, subject: 'x' }, { id: 653, subject: 'y' }]);
  m._flushFn();
  const p = readBeacon(beacons[1]);
  const imps = p.events.filter((e) => e.event === 'impression');
  return instances.length === 1 && imps.length === 2 &&
    imps[0].image_id === 676 && imps[1].image_id === 653;
})());

// ============ H. appreciate.html 接入点 ============
check('H1: 页面引用 exp-naming.js', HTML.includes('<script src="exp-naming.js"></script>'));
check('H2: 画廊查询带 subject 字段', HTML.includes("JSON_UNQUOTE(JSON_EXTRACT(prompt_dna, '$.subject')) AS subject"));
check('H3: 点击/查看/渲染完成埋点调用',
  HTML.includes('window.NbbExp.logClick(item.id)') &&
  HTML.includes('window.NbbExp.logView(') &&
  HTML.includes('window.NbbExp.onGalleryRendered(data)'));
check('H4: 角标样式与 data-img-id 钩子', HTML.includes('.exp-name-badge') && HTML.includes('div.dataset.imgId = item.id'));

// ============ 汇总 ============
const failed = results.filter(([, pass]) => !pass);
for (const [name, pass] of results) console.log((pass ? '✓ ' : '✗ ') + name);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
