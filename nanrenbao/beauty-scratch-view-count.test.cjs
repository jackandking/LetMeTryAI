/**
 * 男人宝刮擦乐单图页 view_count 计数测试（beauty-scratch.html bumpViewCount）。
 *
 * 背景：beauty-scratch?id=<id> 是快手星火计划任务的深链落地页，
 * 此前完全不碰数据库计数器，引流效果只能看百度统计后台。
 * 本次改动：单图模式（命中写死数组 / 按 id 动态取图）加载时计一次 view_count，
 * 走后端 /mysql/query 的计数器白名单例外（与画廊页 incrementViewCount 同一通道）：
 *   UPDATE beauty_images SET view_count = view_count + 1 WHERE image_url = ?
 * 该形态由后端 BRIDGED_COUNTER_SQLS 白名单放行（letmetry_web_service/app.js），
 * 30/min/IP 限流；sessionStorage 按图去重，防广告返回刷新重复计数。
 *
 * 本文件用 .cjs 结尾并自带断言：仓库 package.json 为 ES Module，
 * Jest（jsdom）在当前环境缺依赖跑不起来，`node 本文件` 可直接执行。
 * 覆盖：
 *   1) SQL 精确匹配后端白名单形态（差一个空格都会被 403）；
 *   2) 首次访问发一次计数请求（sql/params 正确）；
 *   3) 同一会话同一图片重复加载（广告返回刷新）不重复计数；
 *   4) 不同图片各计一次；
 *   5) fetch 抛错被吞掉，不打断刮擦流程；
 *   6) sessionStorage 不可用（隐私模式）时 Fail-Open 仍然计数；
 *   7) 两条启动路径（动态取图 / 命中写死数组）都调用；轮播模式不计数；
 *   8) 回归锁：页面不得出现其他写操作（deleted / INSERT / 其他 UPDATE）。
 */
const fs = require('fs');
const path = require('path');

const CODE = fs.readFileSync(path.join(__dirname, 'beauty-scratch.html'), 'utf8');

// 与后端 BRIDGED_COUNTER_SQLS[0] 保持一致（letmetry_web_service/app.js）
const BRIDGED_VIEW_COUNT_RE =
  /^update\s+beauty_images\s+set\s+view_count\s*=\s*view_count\s*\+\s*1\s+where\s+image_url\s*=\s*\?$/i;

/** 按花括号配对从源码中提取具名函数（函数体内无含花括号的字符串/注释，可安全计数） */
function extractFunction(src, name) {
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) return null;
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

  // 先剥离注释，避免匹配到说明文字里引用的 SQL 文本
  const codeNoComments = CODE
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

  // ---------- 场景 1：SQL 精确匹配后端白名单形态 ----------
  const sqlMatch = codeNoComments.match(/sql:\s*'([^']*view_count[^']*)'/);
  check('场景1: 页面存在 view_count 计数 SQL', !!sqlMatch);
  check('场景1: SQL 精确匹配后端 BRIDGED_COUNTER_SQLS 白名单形态',
    !!sqlMatch && BRIDGED_VIEW_COUNT_RE.test(sqlMatch[1]));

  // ---------- 场景 2-6：功能仿真（提取 bumpViewCount 注入桩依赖实跑） ----------
  const fnSrc = extractFunction(CODE, 'bumpViewCount');
  check('场景2: bumpViewCount 函数已定义', !!fnSrc);

  if (fnSrc) {
    const makeBump = ({ storageThrows, fetchThrows } = {}) => {
      const store = {};
      const calls = [];
      const sessionStorage = {
        getItem: (k) => {
          if (storageThrows) throw new Error('storage disabled');
          return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null;
        },
        setItem: (k, v) => {
          if (storageThrows) throw new Error('storage disabled');
          store[k] = String(v);
        }
      };
      const fetch = (url, opts) => {
        if (fetchThrows) throw new Error('network down');
        calls.push({ url, body: JSON.parse(opts.body) });
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ affectedRows: 1 }) });
      };
      const factory = new Function('sessionStorage', 'fetch', fnSrc + '\nreturn bumpViewCount;');
      return { bump: factory(sessionStorage, fetch), calls };
    };

    // 场景 2：首次访问发一次计数请求
    {
      const { bump, calls } = makeBump();
      bump(565, 'https://letmetry.cn/images/probe.jpg');
      check('场景2: 首次访问发起 1 次计数请求', calls.length === 1);
      check('场景2: 请求打向 /mysql/query',
        calls.length === 1 && calls[0].url === 'https://letmetry.cn/mysql/query');
      check('场景2: params 带 image_url',
        calls.length === 1 &&
        Array.isArray(calls[0].body.params) &&
        calls[0].body.params[0] === 'https://letmetry.cn/images/probe.jpg');
      check('场景2: 请求体 SQL 过白名单',
        calls.length === 1 && BRIDGED_VIEW_COUNT_RE.test(calls[0].body.sql));
    }

    // 场景 3：同一会话同一图片重复加载不重复计数（广告返回刷新）
    {
      const { bump, calls } = makeBump();
      bump(565, 'https://letmetry.cn/images/probe.jpg');
      bump(565, 'https://letmetry.cn/images/probe.jpg');
      bump(565, 'https://letmetry.cn/images/probe.jpg');
      check('场景3: 同会话同图刷新 3 次只计 1 次', calls.length === 1);
    }

    // 场景 4：不同图片各计一次
    {
      const { bump, calls } = makeBump();
      bump(565, 'https://letmetry.cn/images/a.jpg');
      bump(566, 'https://letmetry.cn/images/b.jpg');
      check('场景4: 不同图片各计一次', calls.length === 2);
    }

    // 场景 5：fetch 抛错被吞掉
    {
      const { bump } = makeBump({ fetchThrows: true });
      let threw = false;
      try { bump(565, 'https://letmetry.cn/images/a.jpg'); } catch (e) { threw = true; }
      check('场景5: fetch 抛错不外溢（不打断刮擦）', !threw);
    }

    // 场景 6：sessionStorage 不可用时 Fail-Open 仍计数
    {
      const { bump, calls } = makeBump({ storageThrows: true });
      bump(565, 'https://letmetry.cn/images/a.jpg');
      bump(565, 'https://letmetry.cn/images/a.jpg');
      check('场景6: 隐私模式 Fail-Open 仍计数（放弃去重保数据）', calls.length === 2);
    }

    // 场景 7b：无 url 不发请求
    {
      const { bump, calls } = makeBump();
      bump(565, null);
      check('场景7b: 无 image_url 不发请求', calls.length === 0);
    }
  }

  // ---------- 场景 7：两条启动路径都调用；轮播模式不计数 ----------
  const bumpCalls = (CODE.match(/bumpViewCount\(singleItem\.id,\s*singleItem\.url\)/g) || []).length;
  check('场景7: 动态取图与命中写死数组两条路径都调用 bumpViewCount', bumpCalls === 2);
  check('场景7: 轮播模式（无 id）不计数 —— else 分支有 singleMode 守卫',
    /if \(singleMode && singleItem\) bumpViewCount/.test(CODE));
  check('场景7: 两条分支仍正常进入 handleAdReturn',
    (CODE.match(/handleAdReturn\(\);/g) || []).length === 2);

  // ---------- 场景 8：回归锁 —— 页面无其他写操作 ----------
  const updateCount = (codeNoComments.match(/UPDATE\s+/gi) || []).length;
  check('场景8: 页面仅 1 条 UPDATE（view_count 计数）', updateCount === 1);
  check('场景8: 无 deleted 写操作', !/UPDATE[^;]*deleted/i.test(codeNoComments));
  check('场景8: 无 INSERT 写操作', !/\bINSERT\s+INTO\b/i.test(codeNoComments));
  check('场景8: sessionStorage 去重键存在（防广告返回重复计数）',
    /bs_view_bumped_/.test(CODE));

  console.log('\n--- 断言 ---');
  let fail = 0;
  for (const [name, pass] of ok) { console.log(`${pass ? '✓' : '✗'} ${name}`); if (!pass) fail++; }
  console.log(`\n${ok.length - fail}/${ok.length} passed`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('测试执行异常:', err);
  process.exit(1);
});
