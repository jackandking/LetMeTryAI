#!/usr/bin/env node
/**
 * LetMeTryAI ai/ build tool (CJS because repo package.json is ESM)
 *
 * 单源多端架构：ai/skills/core/<skill>/ 是唯一事实源，
 * 本脚本按 --platform 派生出各发布平台的包（字段映射 + 打包差异）。
 *
 * 用法：
 *   node build.cjs list
 *   node build.cjs check  --skill <name> [--platform <p>]
 *   node build.cjs build  --skill <name> --platform <skillhub|xiaping>
 *   node build.cjs platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '.');        // .../ai
const CORE_DIR = path.join(ROOT, 'skills', 'core');
const DIST_DIR = path.join(ROOT, 'build', 'dist');

// 共享 schema（被 portrait 引用），build 时内联进每个包，使包自包含
const SHARED_SCHEMA = 'prompt-dna.schema.json';
const SCHEMA_REF_CORE = '../prompt-dna.schema.json'; // core 内引用
const SCHEMA_REF_PKG = './prompt-dna.schema.json';   // 包内引用

// 平台派生配置：core 是单一事实源，build 时按平台注入/转换字段与打包
const PLATFORMS = {
  skillhub: {
    keepFields: ['name', 'slug', 'displayName', 'version', 'description', 'namespace', 'type'],
    defaults: { namespace: 'letmetry', type: 'free' },
    meta: true,
    ownerId: '635771',
  },
  xiaping: {
    keepFields: ['name', 'slug', 'displayName', 'version', 'description', 'license', 'icon', 'dependency'],
    defaults: { license: 'MIT', icon: 'icon.jpg' },
    meta: false,
  },
};

function listSkills() {
  if (!fs.existsSync(CORE_DIR)) return [];
  return fs.readdirSync(CORE_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function descLen(desc) { return Array.from(desc).length; }

/**
 * 极简 frontmatter 解析：支持两级（顶层 key + 一层嵌套，如 dependency: / system: / - node）。
 * 返回 { obj, order, full }，full 为含 --- 包裹的完整 frontmatter 文本。
 */
function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return null;
  const block = m[1];
  const lines = block.split('\n');
  const order = [];
  const obj = {};
  let cur = null;
  for (const line of lines) {
    if (!line.trim()) continue;
    const mm = line.match(/^(\s*)([A-Za-z0-9_-]+):\s?(.*)$/);
    if (!mm) { if (cur) obj[cur].children.push(line); continue; }
    const indent = mm[1].length, key = mm[2], val = mm[3];
    if (indent === 0) {
      cur = key;
      obj[key] = { value: val, raw: line, children: [] };
      order.push(key);
    } else if (cur && obj[cur]) {
      obj[cur].children.push(line);
    }
  }
  return { obj, order, full: m[0] };
}

/** 按平台 keepFields 重新生成 frontmatter；缺失字段用平台 defaults 补齐 */
function emitFrontmatter(order, obj, cfg) {
  const out = [];
  for (const k of cfg.keepFields) {
    if (k in obj) {
      out.push(obj[k].raw);
      for (const c of obj[k].children) out.push(c);
    } else if (k in cfg.defaults) {
      out.push(`${k}: ${cfg.defaults[k]}`);
    }
    // 既不在 core 也不在平台 defaults 中的字段：跳过（不输出空占位）
  }
  return '---\n' + out.join('\n') + '\n---\n';
}

function check(name, platform) {
  const dir = path.join(CORE_DIR, name);
  if (!fs.existsSync(dir)) throw new Error(`skill 不存在: ${name}`);
  const skillMd = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) throw new Error(`缺少 SKILL.md: ${name}`);
  const content = fs.readFileSync(skillMd, 'utf8');
  const nameMatch = content.match(/^name:\s*(\S+)/m);
  const descMatch = content.match(/^description:\s*(.+)$/m);
  if (!nameMatch) throw new Error(`${name}: 前言区缺 name`);
  if (nameMatch[1] !== name) throw new Error(`${name}: 前言区 name(${nameMatch[1]}) 与目录(${name})不一致`);
  if (!descMatch) throw new Error(`${name}: 前言区缺 description`);
  const dl = descLen(descMatch[1]);
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2705}\u{274C}]/u;
  let warn = [];
  if (dl < 20 || dl > 400) warn.push(`description 长度 ${dl} 偏长/偏短(建议 30-300)`);
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) return fs.readdirSync(p).forEach(f => walk(path.join(p, f)));
    if (!/\.(md|js|cjs|json|html|css|tpl|txt)$/i.test(p)) return;
    const c = fs.readFileSync(p, 'utf8');
    if (emojiRe.test(c)) warn.push(`检测到 emoji: ${path.relative(dir, p)}`);
  };
  walk(dir);
  if (platform && !(platform in PLATFORMS)) throw new Error(`未知平台 ${platform}`);
  const status = warn.length ? 'WARN ' + warn.join('; ') : 'OK';
  return { name, description: descMatch[1], len: dl, status, warns: warn };
}

function build(name, platform) {
  const cfg = PLATFORMS[platform];
  if (!cfg) throw new Error(`未知平台 ${platform}，支持: ${Object.keys(PLATFORMS).join(', ')}`);
  const src = path.join(CORE_DIR, name);
  if (!fs.existsSync(src)) throw new Error(`skill 不存在: ${name}`);
  const skillMd = path.join(src, 'SKILL.md');
  if (!fs.existsSync(skillMd)) throw new Error(`缺少 SKILL.md: ${name}`);

  const content = fs.readFileSync(skillMd, 'utf8');
  const fm = parseFrontmatter(content);
  if (!fm) throw new Error(`${name}: 无法解析 frontmatter`);

  const newFm = emitFrontmatter(fm.order, fm.obj, cfg);
  let body = content.slice(fm.full.length);

  // schema 内联：引用 ../prompt-dna.schema.json 时改为包内 ./ 并拷贝文件
  const schemaSrc = path.join(CORE_DIR, SHARED_SCHEMA);
  const needSchema = body.includes(SCHEMA_REF_CORE) || body.includes(SCHEMA_REF_PKG);
  if (needSchema) body = body.split(SCHEMA_REF_CORE).join(SCHEMA_REF_PKG);

  const outDir = path.join(DIST_DIR, platform, name);
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'SKILL.md'), newFm + body);

  // 拷贝其余文件（除 SKILL.md）
  for (const f of fs.readdirSync(src)) {
    if (f === 'SKILL.md') continue;
    execSync(`cp -r "${path.join(src, f)}" "${path.join(outDir, f)}"`, { stdio: 'ignore' });
  }
  if (needSchema && fs.existsSync(schemaSrc)) {
    fs.copyFileSync(schemaSrc, path.join(outDir, SHARED_SCHEMA));
  }

  // SkillHub 需要 _meta.json
  if (cfg.meta) {
    const verMatch = (newFm.match(/version:\s*(\S+)/) || [])[1] || '1.0.0';
    const slugMatch = (newFm.match(/slug:\s*(\S+)/) || [])[1] || name;
    const meta = { ownerId: cfg.ownerId, slug: slugMatch, version: verMatch, publishedAt: Date.now() };
    fs.writeFileSync(path.join(outDir, '_meta.json'), JSON.stringify(meta, null, 2));
  }

  // 打包 zip（供上传/分发）
  const zip = path.join(DIST_DIR, `${name}.${platform}.zip`);
  if (fs.existsSync(zip)) fs.rmSync(zip);
  execSync(`cd "${path.join(DIST_DIR, platform)}" && zip -rq "${zip}" "${name}"`, { stdio: 'ignore' });

  return { outDir, zip, version: (newFm.match(/version:\s*(\S+)/) || [])[1] };
}

const args = process.argv.slice(2);
const cmd = args[0];
function arg(name) { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; }
try {
  if (cmd === 'list') {
    console.log(listSkills().join('\n'));
  } else if (cmd === 'platforms') {
    console.log(Object.keys(PLATFORMS).join('\n'));
  } else if (cmd === 'check') {
    const name = arg('--skill');
    if (!name) throw new Error('缺少 --skill <name>');
    const r = check(name, arg('--platform'));
    console.log(`[${r.status}] ${r.name} (desc长度=${r.len})`);
    if (r.warns.length) console.log('  注意: ' + r.warns.join('; '));
  } else if (cmd === 'build') {
    const name = arg('--skill');
    const platform = arg('--platform');
    if (!name) throw new Error('缺少 --skill <name>');
    if (!platform) throw new Error('缺少 --platform <skillhub|xiaping>');
    const r = check(name, platform);
    if (r.warns.length) console.warn('⚠️  ' + r.warns.join('; '));
    const out = build(name, platform);
    console.log(`BUILT ${platform}/${name} v${out.version} -> ${path.relative(ROOT, out.outDir)}`);
    console.log(`ZIP ${path.relative(ROOT, out.zip)} (${fs.statSync(out.zip).size} bytes)`);
  } else {
    throw new Error('未知命令，支持: list | platforms | check | build');
  }
} catch (e) {
  console.error('ERROR: ' + e.message);
  process.exit(1);
}
