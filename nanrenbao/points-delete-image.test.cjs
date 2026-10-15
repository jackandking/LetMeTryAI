/**
 * 男人宝「花积分删图」功能测试（points-system.js deleteImage / deleteBackViewImage）。
 *
 * 背景：2026-09-06 后端 /mysql/query 只读化后，前端经其发送的
 *   UPDATE beauty_images SET deleted = 1 WHERE image_url = ?
 * 被 403 静默挡掉 —— 用户扣了积分却删不掉图（生产已复现）。
 * 修复：删图改走专用端点 POST /api/beauty/delete、POST /api/backview/delete
 * （见 letmetry_web_service/nanrenbaoGalleryApi.js）。
 *
 * 本文件用 .cjs 结尾并自带断言：仓库 package.json 为 ES Module，
 * Jest（jsdom）在当前环境缺依赖跑不起来，`node 本文件` 可直接执行。
 * 覆盖：
 *   1) 美图删图成功：扣积分 + 请求打向 /api/beauty/delete（带 imageUrl/uuid）；
 *   2) 积分不足：不发起任何请求；
 *   3) 接口失败：积分退还；
 *   4) 前缀兜底：exact 命中 0 行时按 id 再删；
 *   5) 背影杀删图：打向 /api/backview/delete；0 行时退款；
 *   6) 回归锁：源码不得再经 /mysql/query 发送 deleted=1 的 UPDATE。
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const CODE = fs.readFileSync(path.join(__dirname, 'points-system.js'), 'utf8');

const ENDPOINTS = {
  MYSQL_QUERY: 'https://letmetry.cn/mysql/query',
  BEAUTY_DELETE: 'https://letmetry.cn/api/beauty/delete',
  BACKVIEW_DELETE: 'https://letmetry.cn/api/backview/delete'
};

/**
 * 以隔离的 localStorage / window / fetch 加载一份全新的 PointsSystem。
 * @param {object} opts
 * @param {number} opts.points 初始积分
 * @param {(url:string, body:object) => {ok?:boolean, status?:number, json?:any}} opts.responder
 * @returns {{ps: object, calls: Array}}
 */
function loadPointsSystem({ points, responder }) {
  const store = {};
  global.localStorage = {
    getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  global.window = { API_ENDPOINTS: Object.assign({}, ENDPOINTS) };
  const calls = [];
  global.fetch = async (url, opts) => {
    const body = opts && opts.body ? JSON.parse(opts.body) : null;
    calls.push({ url: String(url), method: (opts && opts.method) || 'GET', body });
    const r = responder(String(url), body);
    return {
      ok: r.ok !== false,
      status: r.status || 200,
      json: async () => r.json
    };
  };
  global.module = { exports: {} };
  eval(CODE); // eslint-disable-line no-eval
  const ps = module.exports;
  ps.addPoints(points - ps.getPoints()); // 精确落到目标积分
  return { ps, calls };
}

const ok = [];
function check(name, pass) { ok.push([name, pass]); }

(async () => {
  // ---------- 场景 1：美图删图成功 ----------
  {
    const { ps, calls } = loadPointsSystem({
      points: 50,
      responder: () => ({ json: { success: true, affectedRows: 1 } })
    });
    const res = await ps.deleteImage('https://letmetry.cn/images/beauty-1.jpg');
    check('美图删图: 返回成功', res.success === true);
    check('美图删图: 扣除 10 积分', ps.getPoints() === 40);
    check('美图删图: 只发起一次请求', calls.length === 1);
    check('美图删图: 打向 /api/beauty/delete', calls[0].url === ENDPOINTS.BEAUTY_DELETE);
    check('美图删图: 方法为 POST', calls[0].method === 'POST');
    check('美图删图: 携带 imageUrl', calls[0].body.imageUrl === 'https://letmetry.cn/images/beauty-1.jpg');
    check('美图删图: 携带 uuid（审计用）', typeof calls[0].body.uuid === 'string' && calls[0].body.uuid.length > 0);
    check('美图删图: 提示语含消耗积分', /已消耗 10 积分/.test(res.message));
  }

  // ---------- 场景 2：积分不足，不发请求 ----------
  {
    const { ps, calls } = loadPointsSystem({
      points: 5,
      responder: () => ({ json: { success: true, affectedRows: 1 } })
    });
    const res = await ps.deleteImage('https://letmetry.cn/images/beauty-2.jpg');
    check('积分不足: 失败', res.success === false);
    check('积分不足: 提示积分不足', /积分不足/.test(res.message));
    check('积分不足: 不发起任何请求', calls.length === 0);
    check('积分不足: 积分不变', ps.getPoints() === 5);
  }

  // ---------- 场景 3：接口 500 → 退款 ----------
  {
    const { ps, calls } = loadPointsSystem({
      points: 50,
      responder: () => ({ ok: false, status: 500, json: { error: 'Internal Server Error' } })
    });
    const res = await ps.deleteImage('https://letmetry.cn/images/beauty-3.jpg');
    check('接口 500: 失败', res.success === false);
    check('接口 500: 积分退还', ps.getPoints() === 50);
    check('接口 500: 提示删除失败', /删除失败/.test(res.message));
    check('接口 500: 确实打过接口', calls.length === 1);
  }

  // ---------- 场景 4：exact 命中 0 行 → 前缀兜底按 id 再删 ----------
  {
    const { ps, calls } = loadPointsSystem({
      points: 50,
      responder: (url, body) => {
        if (url === ENDPOINTS.BEAUTY_DELETE && body.imageUrl) {
          return { json: { success: true, affectedRows: 0 } }; // exact 没匹配上
        }
        if (url === ENDPOINTS.MYSQL_QUERY) {
          return { json: [{ id: 99, image_url: 'https://letmetry.cn/images/beauty-4.jpg' }] };
        }
        if (url === ENDPOINTS.BEAUTY_DELETE && body.id != null) {
          return { json: { success: true, affectedRows: 1 } };
        }
        return { json: {} };
      }
    });
    const res = await ps.deleteImage('https://letmetry.cn/images/beauty-4-long-url-variant.jpg');
    check('前缀兜底: 最终成功', res.success === true);
    check('前缀兜底: 扣 10 积分', ps.getPoints() === 40);
    check('前缀兜底: 三次请求（delete → select → delete-by-id）', calls.length === 3);
    check('前缀兜底: 第二次是 /mysql/query 的 SELECT LIKE',
      calls[1].url === ENDPOINTS.MYSQL_QUERY && /SELECT id, image_url FROM beauty_images WHERE image_url LIKE \?/.test(calls[1].body.sql));
    check('前缀兜底: 第三次按 id 删除',
      calls[2].url === ENDPOINTS.BEAUTY_DELETE && calls[2].body.id === 99);
  }

  // ---------- 场景 5：背影杀删图 ----------
  {
    const { ps, calls } = loadPointsSystem({
      points: 50,
      responder: () => ({ json: { success: true, affectedRows: 1 } })
    });
    const res = await ps.deleteBackViewImage(7);
    check('背影杀删图: 返回成功', res.success === true);
    check('背影杀删图: 扣除 10 积分', ps.getPoints() === 40);
    check('背影杀删图: 打向 /api/backview/delete', calls.length === 1 && calls[0].url === ENDPOINTS.BACKVIEW_DELETE);
    check('背影杀删图: 携带 id', calls[0].body.id === 7);
    check('背影杀删图: 携带 uuid', typeof calls[0].body.uuid === 'string' && calls[0].body.uuid.length > 0);
  }

  // ---------- 场景 6：背影杀 0 行 → 退款 ----------
  {
    const { ps } = loadPointsSystem({
      points: 50,
      responder: () => ({ json: { success: true, affectedRows: 0 } })
    });
    const res = await ps.deleteBackViewImage(8);
    check('背影杀 0 行: 失败并提示未找到目标', res.success === false && /未找到目标/.test(res.message));
    check('背影杀 0 行: 积分退还', ps.getPoints() === 50);
  }

  // ---------- 场景 7：回归锁 —— 不再经 /mysql/query 发 deleted=1 的 UPDATE ----------
  // 先剥离注释，避免匹配到文档说明里引用的 SQL 文本
  const codeNoComments = CODE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  check('回归锁: 无 "UPDATE beauty_images SET deleted" 直连',
    !/UPDATE\s+beauty_images\s+SET\s+deleted/i.test(codeNoComments));
  check('回归锁: 无 "UPDATE back_view_images SET deleted" 直连',
    !/UPDATE\s+back_view_images\s+SET\s+deleted/i.test(codeNoComments));
  check('回归锁: 保留前缀兜底 SELECT（防呆）',
    /SELECT id, image_url FROM beauty_images WHERE image_url LIKE \?/.test(CODE));

  console.log('\n--- 断言 ---');
  let fail = 0;
  for (const [name, pass] of ok) { console.log(`${pass ? '✓' : '✗'} ${name}`); if (!pass) fail++; }
  console.log(`\n${ok.length - fail}/${ok.length} passed`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('测试执行异常:', err);
  process.exit(1);
});
