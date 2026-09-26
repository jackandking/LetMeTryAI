#!/usr/bin/env node
/** LetMeTryAI ai/ build tool (CJS because repo package.json is ESM) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '.'); // .../ai
const SKILLS_DIR = path.join(ROOT, 'skills', 'core');
const DIST_DIR = path.join(ROOT, 'build', 'dist');

function listSkills() {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
}

function descLen(desc) { return Array.from(desc).length; }

function check(name) {
  const dir = path.join(SKILLS_DIR, name);
  if (!fs.existsSync(dir)) throw new Error(`skill 不存在: ${name}`);
  const skillMd = path.join(dir, 'SKILL.md');
  if (!fs.existsSync(skillMd)) throw new Error(`缺少 SKILL.md: ${name}`);
  const content = fs.readFileSync(skillMd, 'utf8');
  const lines = content.split('\n');
  const nameMatch = content.match(/^name:\s*(\S+)/m);
  const descMatch = content.match(/^description:\s*(.+)$/m);
  if (!nameMatch) throw new Error(`${name}: 前言区缺 name`);
  if (nameMatch[1] !== name) throw new Error(`${name}: 前言区 name(${nameMatch[1]}) 与目录(${name})不一致`);
  if (!descMatch) throw new Error(`${name}: 前言区缺 description`);
  const dl = descLen(descMatch[1]);
  if (dl < 100 || dl > 150) throw new Error(`${name}: description 长度 ${dl} 不在 100-150`);
  if (lines.length > 500) throw new Error(`${name}: SKILL.md ${lines.length} 行超过 500`);
  const emojiRe = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2705}\u{274C}]/u;
  const walk = (p) => {
    const st = fs.statSync(p);
    if (st.isDirectory()) return fs.readdirSync(p).forEach(f => walk(path.join(p, f)));
    if (!/\.(md|js|cjs|json|html|css|tpl|txt)$/i.test(p)) return;
    const c = fs.readFileSync(p, 'utf8');
    if (emojiRe.test(c)) throw new Error(`检测到 emoji: ${path.relative(dir, p)}`);
  };
  walk(dir);
  return { name, description: descMatch[1], lines: lines.length };
}

function build(name) {
  const dir = path.join(SKILLS_DIR, name);
  const distDir = path.join(DIST_DIR, name);
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
  fs.readdirSync(dir).forEach(f => {
    execSync(`cp -r "${path.join(dir, f)}" "${path.join(distDir, f)}"`, { stdio: 'ignore' });
  });
  execSync(`find "${distDir}" -name "_meta.json" -delete`, { stdio: 'ignore' });
  const outZip = path.join(DIST_DIR, `${name}.skill`);
  if (fs.existsSync(outZip)) fs.rmSync(outZip);
  // 官方 package_skill 格式: zip 根下含 {name}/ 目录层级
  execSync(`cd "${DIST_DIR}" && zip -rq "${outZip}" "${name}"`, { stdio: 'ignore' });
  return outZip;
}

const args = process.argv.slice(2);
const cmd = args[0];
try {
  if (cmd === 'list') console.log(listSkills().join('\n'));
  else if (cmd === 'check') {
    const i = args.indexOf('--skill');
    if (i < 0) throw new Error('缺少 --skill <name>');
    const r = check(args[i + 1]);
    console.log(`OK ${r.name} (desc=${r.description.length} 行数=${r.lines})`);
  } else if (cmd === 'build') {
    const i = args.indexOf('--skill');
    if (i < 0) throw new Error('缺少 --skill <name>');
    const name = args[i + 1];
    check(name);
    const out = build(name);
    console.log(`BUILT ${fs.statSync(out).size} bytes -> ${path.relative(ROOT, out)}`);
  } else throw new Error('未知命令，支持: list | check | build');
} catch (e) { console.error('ERROR: ' + e.message); process.exit(1); }
