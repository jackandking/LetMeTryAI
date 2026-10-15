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
 *    审批/驳回/逻辑删除/永久删除的路由、请求头、401 清密钥、
 *    取消输入、服务端错误、不支持的字段、prompt 缓存、隐私模式降级。
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

  // ================= B. 功能仿真：admin.js 写辅助 =================
  const fnNames = ['getAdminKey', 'clearAdminKey', 'adminWrite', 'mysqlUpdate', 'mysqlDelete'];
  const keyConst = (adminSrc.match(/const ADMIN_KEY_STORAGE = '[^']*';/) || [''])[0];
  const fnSrc = keyConst + '\n' + fnNames.map((n) => extractFunction(adminSrc, n)).filter(Boolean).join('\n');
  check('B: admin.js 五个写辅助函数可提取', fnNames.every((n) => extractFunction(adminSrc, n)));
  check('B: ADMIN_KEY_STORAGE 常量可提取（缺失会导致 prompt 缓存失效）', !!keyConst);

  const ENDPOINTS = {
    NANRENBAO_ADMIN_REVIEW: 'https://letmetry.cn/api/nanrenbao/admin/review',
    NANRENBAO_ADMIN_VISIBILITY: 'https://letmetry.cn/api/nanrenbao/admin/visibility',
    NANRENBAO_ADMIN_PURGE: 'https://letmetry.cn/api/nanrenbao/admin/purge'
  };

  const makeHelpers = ({ storeThrows, promptResult, responder } = {}) => {
    const store = {};
    let promptCount = 0;
    const calls = [];
    const sessionStorage = {
      getItem: (k) => {
        if (storeThrows) throw new Error('storage disabled');
        return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
      },
      setItem: (k, v) => {
        if (storeThrows) throw new Error('storage disabled');
        store[k] = String(v);
      },
      removeItem: (k) => {
        if (storeThrows) throw new Error('storage disabled');
        delete store[k];
      }
    };
    const prompt = () => { promptCount++; return promptResult; };
    const fetch = (url, opts) => {
      calls.push({ url, opts });
      return Promise.resolve(responder(url, opts));
    };
    const factory = new Function('API_ENDPOINTS', 'sessionStorage', 'prompt', 'fetch',
      fnSrc + '\nreturn { getAdminKey, clearAdminKey, adminWrite, mysqlUpdate, mysqlDelete };');
    return { h: factory(ENDPOINTS, sessionStorage, prompt, fetch), calls, getPromptCount: () => promptCount };
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
      const { h, calls } = makeHelpers({ promptResult: 'secret-key', responder: () => jsonResp(true, 200, { success: true, affectedRows: 1 }) });
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
      const { h, calls } = makeHelpers({ promptResult: 'k', responder: () => jsonResp(true, 200, {}) });
      await h.mysqlUpdate('beauty_images', 566, { review_status: 'rejected', review_reason: '图片不清晰' });
      const body = JSON.parse(calls[0].opts.body);
      check('B2: reject 带 action=reject 与 reason',
        body.action === 'reject' && body.reason === '图片不清晰' && body.table === 'beauty_images' && body.id === 566);
    }

    // B3: 标记删除/取消删除 → visibility 端点
    {
      const { h, calls } = makeHelpers({ promptResult: 'k', responder: () => jsonResp(true, 200, {}) });
      await h.mysqlUpdate('back_view_images', 7, { deleted: 1 });
      await h.mysqlUpdate('back_view_images', 7, { deleted: 0 });
      check('B3: deleted=1 → visibility {deleted:1}',
        calls[0].url === ENDPOINTS.NANRENBAO_ADMIN_VISIBILITY && JSON.parse(calls[0].opts.body).deleted === 1);
      check('B3: deleted=0 → visibility {deleted:0}',
        calls[1].url === ENDPOINTS.NANRENBAO_ADMIN_VISIBILITY && JSON.parse(calls[1].opts.body).deleted === 0);
    }

    // B4: 永久删除 → purge 端点
    {
      const { h, calls } = makeHelpers({ promptResult: 'k', responder: () => jsonResp(true, 200, {}) });
      await h.mysqlDelete('beauty_images', 999);
      check('B4: permadelete 打向 purge 端点 {table,id}',
        calls[0].url === ENDPOINTS.NANRENBAO_ADMIN_PURGE &&
        JSON.stringify(JSON.parse(calls[0].opts.body)) === JSON.stringify({ table: 'beauty_images', id: 999 }));
    }

    // B5: 401 → 清除密钥 + 下次重新 prompt
    {
      let round = 0;
      const { h, calls, getPromptCount } = makeHelpers({
        promptResult: 'bad-key',
        responder: () => (++round === 1 ? jsonResp(false, 401, { error: 'admin key required' }) : jsonResp(true, 200, {}))
      });
      let err = null;
      try { await h.mysqlUpdate('beauty_images', 1, { deleted: 1 }); } catch (e) { err = e; }
      check('B5: 401 抛出「密钥无效」', err && /管理密钥无效/.test(err.message));
      check('B5: 401 后已 prompt 过 1 次', getPromptCount() === 1);
      await h.mysqlUpdate('beauty_images', 1, { deleted: 1 });
      check('B5: 401 后重试重新 prompt（密钥已清）', getPromptCount() === 2);
      check('B5: 重试成功（第 2 次 200）', calls.length === 2);
    }

    // B6: 取消输入 → 不发请求
    {
      const { h, calls } = makeHelpers({ promptResult: null, responder: () => jsonResp(true, 200, {}) });
      let err = null;
      try { await h.mysqlDelete('beauty_images', 1); } catch (e) { err = e; }
      check('B6: 取消输入抛错且不发请求', err && /未提供管理密钥/.test(err.message) && calls.length === 0);
    }

    // B7: 服务端 500 → 抛错带状态码
    {
      const { h } = makeHelpers({ promptResult: 'k', responder: () => jsonResp(false, 500, { error: 'boom' }) });
      let err = null;
      try { await h.mysqlUpdate('beauty_images', 1, { deleted: 1 }); } catch (e) { err = e; }
      check('B7: 500 抛错且带状态码', err && /操作失败: 500/.test(err.message));
    }

    // B8: 不支持的字段/状态 → 本地抛错，不发请求
    {
      const { h, calls } = makeHelpers({ promptResult: 'k', responder: () => jsonResp(true, 200, {}) });
      let e1 = null, e2 = null;
      try { await h.mysqlUpdate('beauty_images', 1, { view_count: 999 }); } catch (e) { e1 = e; }
      try { await h.mysqlUpdate('beauty_images', 1, { review_status: 'pending' }); } catch (e) { e2 = e; }
      check('B8: 非 review_status/deleted 字段抛错', e1 && /不支持的更新字段/.test(e1.message));
      check('B8: 非 approved/rejected 状态抛错', e2 && /不支持的审核状态/.test(e2.message));
      check('B8: 两种情况都不发请求', calls.length === 0);
    }

    // B9: prompt 缓存（一次会话只问一次）
    {
      const { h, getPromptCount } = makeHelpers({ promptResult: 'k', responder: () => jsonResp(true, 200, {}) });
      await h.mysqlUpdate('beauty_images', 1, { deleted: 1 });
      await h.mysqlUpdate('beauty_images', 2, { deleted: 1 });
      await h.mysqlDelete('beauty_images', 3);
      check('B9: 三次操作只 prompt 一次（sessionStorage 缓存）', getPromptCount() === 1);
    }

    // B10: 隐私模式（sessionStorage 抛错）→ 降级为每次 prompt，功能不中断
    {
      const { h, calls, getPromptCount } = makeHelpers({ storeThrows: true, promptResult: 'k', responder: () => jsonResp(true, 200, {}) });
      await h.mysqlUpdate('beauty_images', 1, { deleted: 1 });
      await h.mysqlUpdate('beauty_images', 2, { deleted: 1 });
      check('B10: 隐私模式下降级可用（每次 prompt）', getPromptCount() === 2 && calls.length === 2);
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
