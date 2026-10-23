/**
 * exp-naming.js — 男人宝「欣赏美女」页卡片人物名称 A/B 实验模块。
 *
 * 实验设计（appreciate-name-v1）：
 *   对照组 A：卡片维持现状（无名称）
 *   实验组 B：卡片左上角显示人物名称角标
 * 名称来源：图片 prompt_dna.subject，格式「名字（出处）reinterpret，非真人仿冒」。
 * 实事求是：解析不出规范人物名的图（描述性 subject / 无 DNA）不显示角标。
 *
 * 埋点事件（POST /api/nanrenbao/exp/track，批量 flush）：
 *   page_view  页面级（每次加载一条）
 *   impression 卡片曝光（IntersectionObserver ≥50% 可见，每卡每遍一次）
 *   click      卡片点击（含积分不足未成功查看的点击，衡量点击意图）
 *   view       成功查看大图（积分扣费成功或后宫免费通道）
 *
 * 分桶：localStorage 粘性 50/50。
 * QA 覆盖：URL ?exp=A|B 强制分组（不落盘），?expid=<id> 覆盖实验 ID（默认 appreciate-name-v1）。
 *
 * 容错：本模块任何失败都不影响画廊正常使用（所有接入点均有 window.NbbExp 守卫）；
 *       localStorage 不可用（隐私模式等）时落对照组 A，绝不破坏体验。
 */
(function (root) {
  'use strict';

  var EXP_ID_DEFAULT = 'appreciate-name-v1';
  var STORAGE_KEY_VARIANT = 'nbb_exp_variant_' + EXP_ID_DEFAULT;
  var ENDPOINT = 'https://letmetry.cn/api/nanrenbao/exp/track';
  var FLUSH_INTERVAL_MS = 4000;
  var MAX_BATCH = 50;

  // 「周芷若（倚天屠龙记）reinterpret，非真人仿冒」→ { name:'周芷若', source:'倚天屠龙记' }
  // 名称段不允许含空白/逗号/括号，防止把描述性 subject（如「亚洲青年女性，棕色长发…」）误判为名称。
  var SUBJECT_RE = /^([^\s（(,，]+)（([^）)]+)）/;

  function parseSubject(subject) {
    if (typeof subject !== 'string') return null;
    var m = subject.match(SUBJECT_RE);
    if (!m) return null;
    var name = m[1].trim();
    var source = (m[2] || '').trim();
    if (!name) return null;
    return { name: name, source: source };
  }

  // 角标出处截断：「三国·江东佳人」→「三国」；「唐女道士诗人」→ 原样；最长 8 字（含 Catwoman 等拉丁名）。
  function shortSource(source) {
    if (!source) return '';
    var head = String(source).split(/[·（(]/)[0].trim();
    return head.length > 8 ? head.slice(0, 8) + '…' : head;
  }

  function readParam(key) {
    try {
      return new URLSearchParams(root.location.search).get(key);
    } catch (e) { return null; }
  }

  function getOrCreateVisitorId() {
    // 复用积分体系的设备 UUID（同 key），没有则自建（PointsSystem 后续会复用）。
    try {
      var id = root.localStorage.getItem('nanrenbao_user_uuid');
      if (!id) {
        id = 'v-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
        root.localStorage.setItem('nanrenbao_user_uuid', id);
      }
      return id;
    } catch (e) {
      return 'anon-' + Math.random().toString(36).slice(2, 12);
    }
  }

  function getVariant() {
    try {
      var forced = (readParam('exp') || '').toUpperCase();
      if (forced === 'A' || forced === 'B') return forced; // QA 强制，不落盘
      var v = root.localStorage.getItem(STORAGE_KEY_VARIANT);
      if (v !== 'A' && v !== 'B') {
        v = Math.random() < 0.5 ? 'A' : 'B';
        root.localStorage.setItem(STORAGE_KEY_VARIANT, v);
      }
      return v;
    } catch (e) {
      return 'A';
    }
  }

  var expId = EXP_ID_DEFAULT;
  var forcedExpId = readParam('expid');
  if (forcedExpId && /^[a-z0-9-]{4,64}$/.test(forcedExpId)) expId = forcedExpId;
  var variant = getVariant();
  var visitorId = getOrCreateVisitorId();

  // ---- 事件缓冲与批量上报 ----
  var buffer = [];

  function logEvent(event, imageId) {
    buffer.push({ event: event, image_id: imageId == null ? null : imageId });
    if (buffer.length >= MAX_BATCH) flush();
  }

  function flush() {
    if (!buffer.length) return;
    var payload = JSON.stringify({
      exp_id: expId,
      visitor_id: visitorId,
      variant: variant,
      events: buffer.splice(0, MAX_BATCH)
    });
    try {
      if (root.navigator && typeof root.navigator.sendBeacon === 'function') {
        root.navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: 'application/json' }));
      } else {
        root.fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true
        }).catch(function () { /* 埋点失败静默，不影响体验 */ });
      }
    } catch (e) { /* 埋点失败静默 */ }
  }

  // ---- 角标渲染 ----
  function decorateCards(items) {
    if (variant !== 'B' || !items || !items.length) return;
    items.forEach(function (item) {
      var parsed = parseSubject(item.subject);
      if (!parsed) return; // 无规范人物名 → 不显示（实事求是）
      var card = document.getElementById('img-' + item.id);
      if (!card) return;
      var wrapper = card.querySelector('.image-wrapper');
      if (!wrapper || wrapper.querySelector('.exp-name-badge')) return;
      var badge = document.createElement('div');
      badge.className = 'exp-name-badge';
      var nameEl = document.createElement('span');
      nameEl.className = 'exp-name-badge-name';
      nameEl.textContent = parsed.name;
      badge.appendChild(nameEl);
      if (parsed.source) {
        var srcEl = document.createElement('span');
        srcEl.className = 'exp-name-badge-src';
        srcEl.textContent = shortSource(parsed.source);
        badge.appendChild(srcEl);
      }
      wrapper.appendChild(badge);
    });
  }

  // ---- 曝光追踪（每卡每遍一次）----
  var seenImpressions = {};
  function trackImpressions() {
    if (typeof IntersectionObserver === 'undefined') return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var card = en.target;
        io.unobserve(card);
        var id = card.getAttribute('data-img-id');
        if (!id || seenImpressions[id]) return;
        seenImpressions[id] = 1;
        logEvent('impression', parseInt(id, 10));
      });
    }, { threshold: 0.5 });
    var cards = document.querySelectorAll('.gallery-item[data-img-id]');
    for (var i = 0; i < cards.length; i++) io.observe(cards[i]);
  }

  // 画廊渲染完成后由 appreciate.html 调用
  function onGalleryRendered(items) {
    decorateCards(items);
    trackImpressions();
  }

  var api = {
    EXP_ID_DEFAULT: EXP_ID_DEFAULT,
    parseSubject: parseSubject,
    shortSource: shortSource,
    onGalleryRendered: onGalleryRendered,
    logClick: function (imageId) { logEvent('click', imageId); },
    logView: function (imageId) { logEvent('view', imageId); },
    getVariant: function () { return variant; },
    getExpId: function () { return expId; }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api; // Node/Jest 单测用
  }
  root.NbbExp = api;

  // ---- 浏览器环境自动初始化 ----
  if (typeof document !== 'undefined') {
    logEvent('page_view', null);
    setInterval(flush, FLUSH_INTERVAL_MS);
    // 页面隐藏/卸载时把剩余事件刷出去（sendBeacon 语义）
    root.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush();
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
