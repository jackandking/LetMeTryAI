#!/usr/bin/env node
/*
 * flywheel.cjs — 男人宝投稿飞轮串联脚本（第②+③+④段合并，修复进化闭环断链）
 *
 * 旧流程：contribute.cjs 投稿 → 人工再跑 recorder.py，且常漏传 db_id/image_url，
 *         导致 prompt-log.jsonl 里 db_id=null，改良无法 join 到画廊行。
 * 本脚本：spawn contribute.cjs 拿到 insertId + imageUrl → 自动 spawn recorder.py
 *         并回填 --db-id / --image-url，db_id 闭环一次跑完。
 * 自动审批（2026-10-16 新增）：投稿后若持有男人宝管理密钥，自动调
 *         /api/nanrenbao/admin/review 把该行置 review_status='approved'，
 *         从而解锁「快手星火」下游发布（只收 approved 图）。
 *         - 密钥来源：环境变量 NANRENBAO_ADMIN_KEY → 文件 NANRENBAO_ADMIN_KEY_FILE
 *           → 默认 ~/.automation/.local/auth/nanrenbao_admin_key
 *         - 无密钥时安全降级为 pending 并告警，不阻断投稿/记录主流程。
 *         - --no-approve 可显式关闭（仍走 pending 人工审核）。
 *
 * 入参（在 contribute.cjs 基础上增加两条，供 recorder 记录演化）：
 *   --image <本地路径|https>      beauty 单图
 *   --back <...> --front <...>    backview 背影杀（背+正两张）
 *   --table beauty|backview
 *   --source-id <id>              来源标识（如 portrait-prompt-studio-rachel）
 *   --dna <json> | --dna-file <path>
 *   --source-prompt <text>        基线/种子提示词
 *   --user-prompt <text>          最终用于生图的改良提示词
 *
 * 路径可用环境变量覆盖（便于测试，不触达真实画廊）：
 *   FLYWHEEL_CONTRIBUTE  /  FLYWHEEL_RECORDER
 */
const { spawnSync } = require('child_process');
const path = require('path');

const NODE = '/Users/jak/.workbuddy/binaries/node/versions/22.12.0/bin/node';
const PY = '/Users/jak/.workbuddy/binaries/python/versions/3.13.12/bin/python3';
const CONTRIBUTE = process.env.FLYWHEEL_CONTRIBUTE
  || '/Users/jak/.workbuddy/skills/@letmetry/nanrenbao-contribute/contribute.cjs';
const RECORDER = process.env.FLYWHEEL_RECORDER
  || path.join(__dirname, 'recorder.py');

function parseArgs(argv) {
  const a = {};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === '--image') a.image = argv[++i];
    else if (k === '--back') a.back = argv[++i];
    else if (k === '--front') a.front = argv[++i];
    else if (k === '--table') a.table = argv[++i];
    else if (k === '--source-id') a.sourceId = argv[++i];
    else if (k === '--dna') a.dna = argv[++i];
    else if (k === '--dna-file') a.dnaFile = argv[++i];
    else if (k === '--source-prompt') a.sourcePrompt = argv[++i];
    else if (k === '--user-prompt') a.userPrompt = argv[++i];
    else if (k === '--no-approve') a.noApprove = true;
    else if (k === '--approve-only') a.approveOnly = argv[++i];
  }
  return a;
}

// 管理密钥来源（按序，绝不落仓库 / 不打印明文）：
//   ① 环境变量 NANRENBAO_ADMIN_KEY
//   ② 文件 NANRENBAO_ADMIN_KEY_FILE → 默认 ~/.automation/.local/auth/nanrenbao_admin_key
//   ③ 统一密钥库 Vault：slug=nrb_admin_key（需 VAULT_AGENT_TOKEN 且已获批 scope）
async function resolveAdminKey() {
  const envKey = (process.env.NANRENBAO_ADMIN_KEY || '').trim();
  if (envKey) return envKey;
  const file = process.env.NANRENBAO_ADMIN_KEY_FILE
    || path.join(process.env.HOME || require('os').homedir(), '.automation/.local/auth/nanrenbao_admin_key');
  try {
    const s = require('fs').readFileSync(file, 'utf8').trim();
    if (s) return s;
  } catch (_) { /* 密钥文件不存在则视为未配置 */ }
  const vaultKey = await getAdminKeyFromVault();
  if (vaultKey) return vaultKey;
  return null;
}

// 从 Vault 取 nrb_admin_key：GET /api/vault/secrets/nrb_admin_key（Bearer token）
// token 来源：环境变量 VAULT_AGENT_TOKEN → 默认 ~/.automation/.local/auth/vault_agent_token
async function getAdminKeyFromVault() {
  let token = (process.env.VAULT_AGENT_TOKEN || '').trim();
  if (!token) {
    try {
      const f = path.join(process.env.HOME || require('os').homedir(), '.automation/.local/auth/vault_agent_token');
      token = require('fs').readFileSync(f, 'utf8').trim();
    } catch (_) { /* 无 token 文件则视为未配置 Vault */ }
  }
  if (!token) return null;
  try {
    const r = await fetch('https://letmetry.cn/api/vault/secrets/nrb_admin_key', {
      headers: { 'Authorization': 'Bearer ' + token },
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    const v = (j && (j.value || j.secret || (j.data && j.data.value) || '')).toString().trim();
    return v || null;
  } catch (_) { return null; }
}

// 自动审批：调合规的管理端点把行置 approved（解锁快手下游）
async function approveRow(dbTable, id, key) {
  const r = await fetch('https://letmetry.cn/api/nanrenbao/admin/review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body: JSON.stringify({ table: dbTable, id, action: 'approve' }),
  });
  if (r.status === 401) {
    const t = await r.text().catch(() => '');
    throw new Error('审批失败: 管理密钥无效 (401) ' + t);
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error(`审批失败: ${r.status} ${r.statusText} ${t}`);
  }
  return r.json().catch(() => ({}));
}

function runContribute(a) {
  const args = [CONTRIBUTE];
  if (a.image) args.push('--image', a.image);
  if (a.back) args.push('--back', a.back);
  if (a.front) args.push('--front', a.front);
  if (a.table) args.push('--table', a.table);
  if (a.sourceId) args.push('--source-id', a.sourceId);
  if (a.dna) args.push('--dna', a.dna);
  if (a.dnaFile) args.push('--dna-file', a.dnaFile);

  const r = spawnSync(NODE, args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error('contribute.cjs 失败 (exit ' + r.status + ')');
  }
  const m = r.stdout.match(/__FLYWHEEL_JSON__(\{.*\})/);
  if (!m) throw new Error('无法从 contribute 输出解析 __FLYWHEEL_JSON__（id/imageUrl）');
  return JSON.parse(m[1]);
}

function runRecorder(a, meta) {
  const recTable = a.table === 'backview' ? 'back_view' : 'beauty';
  const args = [
    RECORDER,
    '--source-id', a.sourceId || '',
    '--source-prompt', a.sourcePrompt || '',
    '--user-prompt', a.userPrompt || '',
    '--image-url', meta.imageUrl,
    '--db-id', String(meta.id),
    '--table', recTable,
  ];
  // recorder.py 只认 --dna（不支持 --dna-file），文件形式先读成字符串再传
  if (a.dna) args.push('--dna', a.dna);
  else if (a.dnaFile) args.push('--dna', require('fs').readFileSync(a.dnaFile, 'utf8'));

  const r = spawnSync(PY, args, { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    throw new Error('recorder.py 失败 (exit ' + r.status + ')');
  }
  return r.stdout;
}

(async function main() {
  const a = parseArgs(process.argv);

  // 补审批模式：仅对已有 pending 行审批，不重新投稿/记录（用于补跑或修复既有行）
  if (a.approveOnly) {
    const id = parseInt(a.approveOnly, 10);
    if (!Number.isInteger(id) || id <= 0) { console.error('❌ --approve-only 需为正整数 id'); process.exit(1); }
    const dbTable = a.table === 'backview' ? 'back_view_images' : 'beauty_images';
    const key = await resolveAdminKey();
    if (!key) { console.error('❌ 未配置管理密钥（Vault / env / 文件），无法审批。'); process.exit(1); }
    try {
      const j = await approveRow(dbTable, id, key);
      console.log('✅ 自动审批通过: id=' + id + ' review_status=approved'
        + (j && j.preview ? ' | ' + j.preview : ''));
    } catch (ae) {
      console.error('⚠️ 审批失败: ' + ae.message);
      process.exit(1);
    }
    return;
  }

  const autoApprove = !a.noApprove;
  const dbTable = a.table === 'backview' ? 'back_view_images' : 'beauty_images';
  try {
    const meta = runContribute(a);
    console.log('✅ 投稿完成: id=' + meta.id + ' | ' + meta.preview);

    if (a.sourcePrompt || a.userPrompt) {
      const out = runRecorder(a, meta);
      console.log('✅ 记录完成 (db_id=' + meta.id + ' 已回填 image_url=' + meta.imageUrl + ')');
      // 打印 recorder 摘要最后两行，便于确认落盘行数
      const lines = out.trim().split('\n');
      console.log(lines.slice(-2).join('\n'));
    } else {
      console.log('ℹ️ 未传 --source-prompt/--user-prompt，跳过 recorder 记录（db_id 未回填）。');
    }

    // 第④段：自动审批（持有管理密钥时），解锁快手星火下游发布
    if (autoApprove) {
      const key = await resolveAdminKey();
      if (key) {
        try {
          const j = await approveRow(dbTable, meta.id, key);
          console.log('✅ 自动审批通过: id=' + meta.id + ' review_status=approved'
            + (j && j.preview ? ' | ' + j.preview : ''));
        } catch (ae) {
          console.error('⚠️ 自动审批失败，行保持 pending（可后台手动审批）: ' + ae.message);
        }
      } else {
        console.log('ℹ️ 未配置管理密钥（NANRENBAO_ADMIN_KEY / ~/.automation/.local/auth/nanrenbao_admin_key），'
          + '跳过自动审批，行保持 pending 待人工审核。');
      }
    } else {
      console.log('ℹ️ --no-approve：跳过自动审批，行保持 pending 待人工审核。');
    }
  } catch (e) {
    console.error('❌', e.message);
    process.exit(1);
  }
})();
