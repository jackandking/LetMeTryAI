/**
 * 男人宝三栏目（美图欣赏 / 背影杀 / 后宫）+ 审核后台「写操作面」回归测试。
 *
 * 背景：2026-09-06 /mysql/query 只读化（P0）后，前端一切裸 SQL 写都被 403
 * 静默挡掉；/mysql/update、/mysql/delete 也改为仅 KV_ADMIN_KEY 可写，
 * 导致 admin.js 的审批通过/驳回/标记删除/永久删除/批量操作全部失效
 * （2026-10-16 生产实测复现）。本测试是防再发的回归网：
 *
 * A. 静态扫描 nanrenbao/ 全部页面与脚本：
 *    1) 经 /mysql/query 发送的 SQL 写，必须精确命中后端计数器白名单
 *       （BRIDGED_COUNTER_SQLS：beauty view_count by image_url、
 *        back_view click_count by id）——差一个空格都会被 403；
 *    2) 任何文件不得再引用 /mysql/update、/mysql/delete（403 陷阱）；
 *    3) 引用的 /api/ 端点必须全部在已知良好清单内（新端点需显式评审后加入）；
 *    4) admin.js 必须走 /api/nanrenbao/admin/* 且带 x-admin-key 头。
 * B. 功能仿真（提取 admin.js 辅助函数注入桩依赖实跑）：
 *    审批/驳回/逻辑删除/永久删除的路由、请求头、401 清密钥后带错误
 *    文案重弹并自动重试、取消输入、服务端错误、不支持的字段、模态框
 *    缓存、记住本机（localStorage 30 天 TTL）、隐私模式降级。
 *
 * 本文件用 .cjs 结尾并自带断言：仓库 package.json 为 ES Module，
 * Jest（jsdom）在当前环境缺依赖跑不起来，`node 本文件` 可直接执行。
 */
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SCAN_EXCLUDE = /\.test\.|node_modules/;

// 与后端 BRIDGED_COUNTER_SQLS 保持一致（letmetry_web_service/app.js）
const BRIDGED_COUNTER_SQLS = [
  /^update\s+beauty_images\s+set\s+view_count\s*=\s*view_count\s*\+\s*1\s+where\s+image_url\s*=\s*\?$/i,
  /^update\s+back_view_images\s+set\s+click_count\s*=\s*click_count\s*\+\s*1\s+where\s+id\s*=\s*\?$/i
];

// 男人宝前端允许引用的 /api/ 端点（新增端点必须先过评审再加进来）
const ALLOWED_API_PATHS = new Set([
  '/api/beauty/delete',
  '/api/backview/delete',
  '/api/nanrenbao/admin/review',
  '/api/nanrenbao/admin/visibility',
  '/api/nanrenbao/admin/purge',
  '/api/track'
]);

function listFiles(dir) {
  return fs.readdirSync(dir)
    .filter((f) => !SCAN_EXCLUDE.test(f))
    .map((f) => path.join(dir, f))
    .filter((p) => fs.statSync(p).isFile() && /\.(html|js|esm\.js)$/.test(p));
}

function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** 按花括号配对从源码中提取具名函数（保留 async 前缀） */
function extractFunction(src, name) {
  const idx = src.indexOf('function ' + name + '(');
  if (idx < 0) return null;
  // 带上可能的 async 前缀，否则函数体会因 await 报语法错误
  const before = src.slice(0, idx);
  let start = idx;
  const prefixMatch = before.match(/async\s+$/);
  if (prefixMatch) {
    const head = before.slice(0, before.length - prefixMatch[0].length);
    if (/(?:^|[^A-Za-z0-9_$])$/.test(head)) start = before.length - prefixMatch[0].length;
  }
  let i = src.indexOf('{', start);
  let depth = 0;
  for (; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}') {
      depth--;
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  return null;
}

(async () => {
  const ok = [];
  const check = (name, pass) => ok.push([name, !!pass]);

  const files = listFiles(DIR);
  const sources = new Map();
  for (const f of files) sources.set(f, fs.readFileSync(f, 'utf8'));

  // ================= A. 静态扫描 =================

  // A1: 经 /mysql/query 的 SQL 写必须命中计数器白名单
  const SQL_STRING_RE = /sql\s*:\s*(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g;
  const writeViolations = [];
  const seenWrites = new Set();
  for (const [file, raw] of sources) {
    const code = stripComments(raw);
    let m;
    SQL_STRING_RE.lastIndex = 0;
    while ((m = SQL_STRING_RE.exec(code))) {
      const sql = m[2].replace(/\\'/g, "'").trim();
      if (!/^\s*(update|insert|delete)\b/i.test(sql)) continue; // 只关心写
      seenWrites.add(sql.replace(/\s+/g, ' '));
      const passes = BRIDGED_COUNTER_SQLS.some((re) => re.test(sql.replace(/;+\s*$/, '')));
      if (!passes) writeViolations.push(`${path.basename(file)}: ${sql.slice(0, 80)}`);
    }
  }
  check('A1: 无裸 SQL 写绕过计数器白名单（逐文件扫描）', writeViolations.length === 0);
  if (writeViolations.length) console.log('  违规:', writeViolations);
  check('A1: 两个计数器写形态都仍在白名单内并被使用',
    seenWrites.has('UPDATE beauty_images SET view_count = view_count + 1 WHERE image_url = ?') &&
    seenWrites.has('UPDATE back_view_images SET click_count = click_count + 1 WHERE id = ?'));

  // A2: 任何文件不得引用 /mysql/update、/mysql/delete（403 陷阱）
  const trapRefs = [];
  for (const [file, raw] of sources) {
    const code = stripComments(raw);
    if (/MYSQL_UPDATE|MYSQL_DELETE|mysql\/update|mysql\/delete/.test(code)) {
      trapRefs.push(path.basename(file));
    }
  }
  check('A2: nanrenbao/ 无任何文件引用 /mysql/update、/mysql/delete', trapRefs.length === 0);
  if (trapRefs.length) console.log('  引用者:', trapRefs);

  // A3: 引用的 /api/ 端点必须全部在已知良好清单内
  const unknownApis = new Set();
  for (const [file, raw] of sources) {
    const code = stripComments(raw);
    const re = /\/api\/[a-z0-9\-/]+/gi;
    let m;
    while ((m = re.exec(code))) {
      const p = m[0].replace(/\/+$/, '');
      if (!ALLOWED_API_PATHS.has(p)) unknownApis.add(`${path.basename(file)} -> ${p}`);
    }
  }
  check('A3: 所有 /api/ 引用均在已知良好清单内', unknownApis.size === 0);
  if (unknownApis.size) console.log('  未登记端点:', [...unknownApis]);

  // A4: admin.js 必须走新端点且带 x-admin-key
  const adminSrc = sources.get(path.join(DIR, 'admin.js')) || '';
  const adminCode = stripComments(adminSrc);
  check('A4: admin.js 引用三个 admin 端点',
    ['NANRENBAO_ADMIN_REVIEW', 'NANRENBAO_ADMIN_VISIBILITY', 'NANRENBAO_ADMIN_PURGE']
      .every((k) => adminCode.includes(k)));
  check('A4: admin.js 发送 x-admin-key 头', /x-admin-key/.test(adminCode));
  check('A4: admin.js 401 时清除密钥（clearAdminKey）', /function clearAdminKey/.test(adminCode));
  check('A4b: 不再用原生 prompt 索取管理密钥（回归锁；驳回原因 prompt 除外）',
    !/prompt\s*\([^)]*密钥/.test(adminCode) && !/function getAdminKey/.test(adminCode));
  check('A4c: 记住本机走 localStorage + 30 天 TTL 常量',
    ['ADMIN_KEY_REMEMBER_KEY', 'ADMIN_KEY_REMEMBER_UNTIL', 'ADMIN_KEY_REMEMBER_DAYS = 30'].every((s) => adminCode.includes(s)));
  check('A4d: 401 后带错误文案重弹模态框并自动重试',
    /管理密钥无效或已更换/.test(adminCode) && /ensureAdminKey\('管理密钥无效或已更换，请重新输入'\)/.test(adminCode));

  // A5: admin.html 必须提供密钥模态框与退出按钮（手机端体验基座）
  const adminHtml = stripComments(sources.get(path.join(DIR, 'admin.html')) || '');
  check('A5: admin.html 含 #adminKeyModal 模态框', /id="adminKeyModal"/.test(adminHtml));
  check('A5: 模态框含输入框/记住复选框/确认/取消/显隐按钮',
    ['id="akInput"', 'id="akRemember"', 'id="akConfirm"', 'id="akCancel"', 'id="akToggle"'].every((s) => adminHtml.includes(s)));
  check('A5: 「记住此设备」复选框默认勾选', /<input id="akRemember" type="checkbox" checked>/.test(adminHtml));
  check('A5: 含 #adminKeyLogout 退出按钮（仅 remembered 时显示）', /id="adminKeyLogout"/.test(adminHtml));
  check('A5: 输入框 font-size 16px（防 iOS 聚焦放大）', /\.ak-inputrow input\s*\{[^}]*font-size:\s*16px/.test(adminHtml));

  // ================= B. 功能仿真：admin.js 写辅助 =================
  const fnNames = ['safeStorageGet', 'safeStorageSet', 'safeStorageRemove', 'readStoredAdminKey', 'storeAdminKey', 'clearAdminKey', 'hasRememberedAdminKey', 'ensureAdminKey', 'adminWrite', 'mysqlUpdate', 'mysqlDelete'];
  const keyConsts = (adminSrc.match(/const ADMIN_KEY_(?:STORAGE|REMEMBER_KEY|REMEMBER_UNTIL|REMEMBER_DAYS) = [^;]+;/g) || []).join('\n');
  const fnSrc = keyConsts + '\n' + fnNames.map((n) => extractFunction(adminSrc, n)).filter(Boolean).join('\n');
  check('B: admin.js 十一个辅助函数可提取', fnNames.every((n) => extractFunction(adminSrc, n)));
  check('B: 四个密钥存储常量可提取（缺失会导致缓存/TTL 失效）', (keyConsts.match(/const /g) || []).length === 4);

  const ENDPOINTS = {
    NANRENBAO_ADMIN_REVIEW: 'https://letmetry.cn/api/nanrenbao/admin/review',
    NANRENBAO_ADMIN_VISIBILITY: 'https://letmetry.cn/api/nanrenbao/admin/visibility',
    NANRENBAO_ADMIN_PURGE: 'https://letmetry.cn/api/nanrenbao/admin/purge'
  };

  const makeHelpers = ({ sessionThrows, localThrows, modalResults, remember = true, responder } = {}) => {
    const session = {};
    const local = {};
    const modalCalls = [];
    let modalIdx = 0;
    const mkStore = (obj, throws) => ({
      getItem: (k) => {
        if (throws) throw new Error('storage disabled');
        return Object.prototype.hasOwnProperty.call(obj, k) ? obj[k] : null;
      },
      setItem: (k, v) => {
        if (throws) throw new Error('storage disabled');
        obj[k] = String(v);
      },
      removeItem: (k) => {
        if (throws) throw new Error('storage disabled');
        delete obj[k];
      }
    });
    const sessionStorage = mkStore(session, sessionThrows);
    const localStorage = mkStore(local, localThrows);
    // 模态框桩：按队列返回密钥；模拟浏览器端 submit 行为（session 必写、
    // 勾选记住才写 localStorage）；记录每次 message（401 重弹需带错误文案）
    const showAdminKeyModal = (message) => {
      modalCalls.push(message || null);
      const key = modalResults && modalIdx < modalResults.length ? modalResults[modalIdx] : null;
      modalIdx++;
      if (key) {
        try {
          sessionStorage.setItem('nrb_admin_key', key);
          if (remember) {
            localStorage.setItem('nrb_admin_key_remembered', key);
            localStorage.setItem('nrb_admin_key_until', String(Date.now() + 30 * 24 * 60 * 60 * 1000));
          }
        } catch (e) { /* 隐私模式：浏览器同样静默失败 */ }
      }
      return Promise.resolve(key);
    };
    const calls = [];
    const fetch = (url, opts) => {
      calls.push({ url, opts });
      return Promise.resolve(responder(url, opts));
    };
    const factory = new Function('API_ENDPOINTS', 'sessionStorage', 'localStorage', 'showAdminKeyModal', 'fetch',
      fnSrc + '\nreturn { readStoredAdminKey, storeAdminKey, clearAdminKey, hasRememberedAdminKey, ensureAdminKey, adminWrite, mysqlUpdate, mysqlDelete };');
    return {
      h: factory(ENDPOINTS, sessionStorage, localStorage, showAdminKeyModal, fetch),
      calls,
      session,
      local,
      getModalCount: () => modalCalls.length,
      getModalMessages: () => modalCalls
    };
  };

  const jsonResp = (ok, status, body) => ({
    ok,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body))
  });

  if (fnSrc) {
    // B1: 审批通过 → review 端点 + x-admin-key 头
    {
      const { h, calls } = makeHelpers({ modalResults: ['secret-key'], responder: () => jsonResp(true, 200, { success: true, affectedRows: 1 }) });
      const r = await h.mysqlUpdate('beauty_images', 565, { review_status: 'approved', review_reason: null, reviewed_at: 'x', reviewed_by: 'admin-panel' });
      check('B1: approve 打向 review 端点', calls.length === 1 && calls[0].url === ENDPOINTS.NANRENBAO_ADMIN_REVIEW);
      check('B1: approve 请求体 {table,id,action}（无 reason）',
        JSON.stringify(JSON.parse(calls[0].opts.body)) === JSON.stringify({ table: 'beauty_images', id: 565, action: 'approve' }));
      check('B1: 带 x-admin-key 头（prompt 所得密钥）',
        calls[0].opts.headers['x-admin-key'] === 'secret-key' && calls[0].opts.headers['Content-Type'] === 'application/json');
      check('B1: 回传 affectedRows', r.affectedRows === 1);
    }

    // B2: 驳回 → action=reject + reason
    {
      const { h, calls } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      await h.mysqlUpdate('beauty_images', 566, { review_status: 'rejected', review_reason: '图片不清晰' });
      const body = JSON.parse(calls[0].opts.body);
      check('B2: reject 带 action=reject 与 reason',
        body.action === 'reject' && body.reason === '图片不清晰' && body.table === 'beauty_images' && body.id === 566);
    }

    // B3: 标记删除/取消删除 → visibility 端点
    {
      const { h, calls } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      await h.mysqlUpdate('back_view_images', 7, { deleted: 1 });
      await h.mysqlUpdate('back_view_images', 7, { deleted: 0 });
      check('B3: deleted=1 → visibility {deleted:1}',
        calls[0].url === ENDPOINTS.NANRENBAO_ADMIN_VISIBILITY && JSON.parse(calls[0].opts.body).deleted === 1);
      check('B3: deleted=0 → visibility {deleted:0}',
        calls[1].url === ENDPOINTS.NANRENBAO_ADMIN_VISIBILITY && JSON.parse(calls[1].opts.body).deleted === 0);
    }

    // B4: 永久删除 → purge 端点
    {
      const { h, calls } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      await h.mysqlDelete('beauty_images', 999);
      check('B4: permadelete 打向 purge 端点 {table,id}',
        calls[0].url === ENDPOINTS.NANRENBAO_ADMIN_PURGE &&
        JSON.stringify(JSON.parse(calls[0].opts.body)) === JSON.stringify({ table: 'beauty_images', id: 999 }));
    }

    // B5: 401 → 清除存储 + 带错误文案重弹 + 用新密钥自动重试一次
    {
      let round = 0;
      const { h, calls, getModalCount, getModalMessages } = makeHelpers({
        modalResults: ['bad-key', 'good-key'],
        responder: () => (++round === 1 ? jsonResp(false, 401, { error: 'admin key required' }) : jsonResp(true, 200, {}))
      });
      const r = await h.mysqlUpdate('beauty_images', 1, { deleted: 1 });
      check('B5: 401 后自动重试成功（第 2 次 200）', calls.length === 2 && r && typeof r === 'object');
      check('B5: 401 触发了第二次弹框（共 2 次）', getModalCount() === 2);
      check('B5: 重弹文案为「无效或已更换，请重新输入」', /管理密钥无效或已更换/.test(getModalMessages()[1] || ''));
      check('B5: 重试用的是新密钥', calls[1].opts.headers['x-admin-key'] === 'good-key');
    }

    // B5b: 连续 401 → 抛错、只重试一次、存储已清空
    {
      const { h, calls, session, local } = makeHelpers({
        modalResults: ['bad1', 'bad2'],
        responder: () => jsonResp(false, 401, { error: 'nope' })
      });
      let err = null;
      try { await h.mysqlUpdate('beauty_images', 1, { deleted: 1 }); } catch (e) { err = e; }
      check('B5b: 连续 401 抛「密钥无效」', err && /管理密钥无效/.test(err.message));
      check('B5b: 连续 401 只重试一次（共 2 次请求）', calls.length === 2);
      check('B5b: 抛错后 session/localStorage 均已清空',
        Object.keys(session).length === 0 && Object.keys(local).length === 0);
    }

    // B6: 取消输入 → 不发请求
    {
      const { h, calls } = makeHelpers({ modalResults: [null], responder: () => jsonResp(true, 200, {}) });
      let err = null;
      try { await h.mysqlDelete('beauty_images', 1); } catch (e) { err = e; }
      check('B6: 取消输入抛错且不发请求', err && /未提供管理密钥/.test(err.message) && calls.length === 0);
    }

    // B7: 服务端 500 → 抛错带状态码
    {
      const { h } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(false, 500, { error: 'boom' }) });
      let err = null;
      try { await h.mysqlUpdate('beauty_images', 1, { deleted: 1 }); } catch (e) { err = e; }
      check('B7: 500 抛错且带状态码', err && /操作失败: 500/.test(err.message));
    }

    // B8: 不支持的字段/状态 → 本地抛错，不发请求
    {
      const { h, calls } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      let e1 = null, e2 = null;
      try { await h.mysqlUpdate('beauty_images', 1, { view_count: 999 }); } catch (e) { e1 = e; }
      try { await h.mysqlUpdate('beauty_images', 1, { review_status: 'pending' }); } catch (e) { e2 = e; }
      check('B8: 非 review_status/deleted 字段抛错', e1 && /不支持的更新字段/.test(e1.message));
      check('B8: 非 approved/rejected 状态抛错', e2 && /不支持的审核状态/.test(e2.message));
      check('B8: 两种情况都不发请求', calls.length === 0);
    }

    // B9: 模态框缓存（一次会话只问一次）
    {
      const { h, getModalCount } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      await h.mysqlUpdate('beauty_images', 1, { deleted: 1 });
      await h.mysqlUpdate('beauty_images', 2, { deleted: 1 });
      await h.mysqlDelete('beauty_images', 3);
      check('B9: 三次操作只弹一次框（sessionStorage 缓存）', getModalCount() === 1);
    }

    // B10: storeAdminKey remember 语义 + TTL
    {
      const { h, session, local } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      const k64 = 'a'.repeat(64);
      h.storeAdminKey(k64, true);
      check('B10: remember=true 写 session', session['nrb_admin_key'] === k64);
      check('B10: remember=true 写 localStorage 值', local['nrb_admin_key_remembered'] === k64);
      const until = Number(local['nrb_admin_key_until']);
      check('B10: TTL ≈ 30 天（29.9~30.1 天）', until > Date.now() + 29.9 * 86400000 && until <= Date.now() + 30.1 * 86400000);
      check('B10: hasRememberedAdminKey 为 true', h.hasRememberedAdminKey() === true);
      h.storeAdminKey('k2', false);
      check('B10: remember=false 只更新 session，不动 localStorage',
        session['nrb_admin_key'] === 'k2' && local['nrb_admin_key_remembered'] === k64);
    }

    // B11: readStoredAdminKey 四条路径
    {
      const { h, session, local } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      session['nrb_admin_key'] = 'sess';
      local['nrb_admin_key_remembered'] = 'mem';
      local['nrb_admin_key_until'] = String(Date.now() + 86400000);
      check('B11: session 优先于本机记忆', h.readStoredAdminKey() === 'sess');
      delete session['nrb_admin_key'];
      check('B11: 无 session 时取未过期本机记忆', h.readStoredAdminKey() === 'mem');
      check('B11: 读取后回填 session（本会话免弹框）', session['nrb_admin_key'] === 'mem');
      delete session['nrb_admin_key'];
      local['nrb_admin_key_until'] = String(Date.now() - 1000);
      check('B11: 记忆过期返回 null', h.readStoredAdminKey() === null);
      check('B11: 过期记忆被清除', !('nrb_admin_key_remembered' in local) && !('nrb_admin_key_until' in local));
      check('B11: 两者皆无返回 null', h.readStoredAdminKey() === null);
    }

    // B12: 隐私模式（两个存储都抛错）→ 降级每次弹框，功能不中断
    {
      const { h, calls, getModalCount } = makeHelpers({
        sessionThrows: true, localThrows: true, modalResults: ['k', 'k'],
        responder: () => jsonResp(true, 200, {})
      });
      await h.mysqlUpdate('beauty_images', 1, { deleted: 1 });
      await h.mysqlUpdate('beauty_images', 2, { deleted: 1 });
      check('B12: 隐私模式下降级可用（每次弹框）', getModalCount() === 2 && calls.length === 2);
    }

    // B13: ensureAdminKey 有已存密钥时直接返回，不弹框
    {
      const { h, getModalCount } = makeHelpers({ modalResults: ['k'], responder: () => jsonResp(true, 200, {}) });
      h.storeAdminKey('cached', false);
      const k = await h.ensureAdminKey();
      check('B13: 有 session 密钥时 ensureAdminKey 直接返回', k === 'cached' && getModalCount() === 0);
    }
  }

  console.log('\n--- 断言 ---');
  let fail = 0;
  for (const [name, pass] of ok) { console.log(`${pass ? '✓' : '✗'} ${name}`); if (!pass) fail++; }
  console.log(`\n${ok.length - fail}/${ok.length} passed`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('测试执行异常:', err);
  process.exit(1);
});
