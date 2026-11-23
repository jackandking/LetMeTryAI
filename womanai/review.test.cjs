/**
 * 女人宝审核机制回归测试（Node 直接跑，无需 jsdom）：
 *   1) 前台只取 approved 且未删除的图片
 *   2) 用户投稿 / 后台批量上传均写 review_status='pending'
 *   3) 自动生成图入库直接 approved + source_type=automation
 *   4) 生成参考图源也只读 approved
 *   5) 审核模块仅打 /api/womanai/admin/* 专用端点，带 x-admin-key
 *   6) 审核后台 UI 容器与筛选器齐全
 *   7) config 端点已注册
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const appreciate = read('womanai/appreciate.html');
const upload = read('womanai/upload.html');
const adminJs = read('womanai/admin.js');
const adminHtml = read('womanai/admin.html');
const reviewJs = read('womanai/review.js');
const approveScript = read('womanai/.automation/scripts/approve-generated-image.js');
const generateScript = read('womanai/.automation/scripts/generate-womanai-images.js');
const config = read('config.js');
const utilConfig = read('util/config.js');

const ok = [];
const check = (name, pass) => ok.push([name, pass]);

(async () => {
  // 1. 前台门禁
  check('前台只查 approved 且未删除',
    /handsome_images WHERE deleted = 0 AND review_status = 'approved'/.test(appreciate));

  // 2. 两个投稿入口都走服务端专用端点（pending 由服务端强制，客户端无权指定）
  check('用户投稿走 WOMANAI_SUBMIT 且无客户端 INSERT',
    /API_ENDPOINTS\.WOMANAI_SUBMIT/.test(upload) && !/INSERT INTO handsome_images/.test(upload));
  check('后台批量上传走 WOMANAI_SUBMIT 且无客户端 INSERT',
    /API_ENDPOINTS\.WOMANAI_SUBMIT/.test(adminJs) && !/INSERT INTO handsome_images/.test(adminJs));
  check('两套 config 都声明投稿端点',
    /WOMANAI_SUBMIT:.*api\/womanai\/submit/.test(config) && /WOMANAI_SUBMIT:.*api\/womanai\/submit/.test(utilConfig));

  // 3. 自动生成图链路
  check('自动生成图入库 approved + automation',
    /INSERT INTO \$\{config\.database\.imagesTable\}[\s\S]{0,150}'approved', 'automation'/.test(approveScript));
  check('生成参考图源只读 approved',
    /imagesTable\} WHERE deleted = 0 AND review_status = 'approved'/.test(generateScript));

  // 4. 审核模块写端点
  check('审核模块只打专用端点',
    /\/api\/womanai\/admin\/review/.test(reviewJs) && /\/api\/womanai\/admin\/visibility/.test(reviewJs));
  check('审核模块携带 x-admin-key', /'x-admin-key': key/.test(reviewJs));
  check('审核模块不直接经 /mysql/query 写',
    !/adminWrite\(\s*API_ENDPOINTS\.MYSQL_QUERY/.test(reviewJs));
  check('密钥支持记住本机 30 天 + 失效自动重输',
    /REMEMBER_DAYS = 30/.test(reviewJs) && /resp\.status === 401/.test(reviewJs));

  // 5. 后台 UI
  check('审核工作台 UI 齐全',
    ['reviewTableBody', 'filterSelect', 'reviewBatchApprove', 'reviewBatchReject', 'reviewKeyModal', 'rvkInput']
      .every(id => adminHtml.includes('id="' + id + '"')));
  check('审核模块已引入', /src="review\.js"/.test(adminHtml));

  // 6. config
  check('window config 注册审核端点',
    /WOMANAI_ADMIN_REVIEW/.test(config) && /WOMANAI_ADMIN_VISIBILITY/.test(config));
  check('ESM config 注册审核端点',
    /WOMANAI_ADMIN_REVIEW/.test(utilConfig) && /WOMANAI_ADMIN_VISIBILITY/.test(utilConfig));

  // 7. 迁移脚本存在且回填存量
  const migration = read('womanai/migrate-add-review-status.sql');
  check('迁移脚本回填存量 approved',
    /review_status = 'approved'/.test(migration) && /WHERE source_type = 'legacy'/.test(migration));

  console.log('\n--- 断言 ---');
  let fail = 0;
  for (const [name, pass] of ok) { console.log(`${pass ? '✓' : '✗'} ${name}`); if (!pass) fail++; }
  console.log(`\n${ok.length - fail}/${ok.length} passed`);
  process.exit(fail ? 1 : 0);
})().catch((err) => {
  console.error('测试执行异常:', err);
  process.exit(1);
});
