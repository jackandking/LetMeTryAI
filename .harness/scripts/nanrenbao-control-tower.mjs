#!/usr/bin/env node
/**
 * 男人宝飞轮 · 控制塔 (control tower)
 *
 * 只读巡检既有产物 + 合并日报 + 失败/异常告警。各节拍的实际动作由既有
 * launchd/cron 脚本负责。本脚本只回答两件事：
 *   1) 今天飞轮各节拍是否按时跑成功了？（找不到产物 = 如实报"未产出/未采集"）
 *   2) 跨渠道合起来，飞轮是在加速还是空转？
 *
 * 用法: node nanrenbao-control-tower.mjs [--date YYYY-MM-DD] [--no-email]
 * 产物: ~/LetMeTryAI/.automation/reports/nanrenbao-control-tower-<date>.{md,json}
 */

import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || '/Users/jak';
const PROJECT = path.join(HOME, 'LetMeTryAI');
const HARNESS = path.join(PROJECT, '.harness');
const HARNESS_LOCAL = path.join(HARNESS, '.local');
const REPORTS = path.join(PROJECT, '.automation', 'reports');
const FOLLOW_REPORTS = path.join(HARNESS_LOCAL, 'state', 'kuaishou-follow', 'reports');
const FLYWHEEL = path.join(PROJECT, 'nanrenbao', 'flywheel');
const SEEDS = path.join(PROJECT, 'nanrenbao', 'seeds.json');
const EVOLVE_LOG = path.join(FLYWHEEL, 'evolve.cron.log');
// daily-kuaishou-report.js 的输出可能落在以下几个候选目录之一（RUNTIME_DIR 解析随运行环境不同）
const KR_DIRS = [
  path.join(HARNESS_LOCAL, 'exports', 'metrics', 'kuaishou', 'daily'),
  path.join(HARNESS, 'exports', 'metrics', 'kuaishou', 'daily'),
  REPORTS,
];
const EMAIL_TO = 'jackandking@163.com';
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY ||
  'am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4';

function log(level, msg) { console.log(`[${new Date().toISOString()}] [${level}] ${msg}`); }
function localYmd(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function statSafe(p) {
  try { const s = fs.statSync(p); return { exists: true, mtime: s.mtime, size: s.size }; }
  catch { return { exists: false }; }
}
function daysSince(st) { return st.exists ? (Date.now() - st.mtime.getTime()) / 86400000 : Infinity; }
function readJsonSafe(p) { try { return JSON.parse(fs.readFileSync(p, 'utf-8')); } catch { return null; } }
function readTextSafe(p) { try { return fs.readFileSync(p, 'utf-8'); } catch { return null; } }
function latestFile(dirs, predicate) {
  let best = null;
  for (const dir of dirs) {
    try {
      const files = fs.readdirSync(dir).map(f => ({ f, st: statSafe(path.join(dir, f)) }))
        .filter(x => x.st.exists && predicate(x.f));
      if (!files.length) continue;
      files.sort((a, b) => b.st.mtime - a.st.mtime);
      if (!best || files[0].st.mtime > best.st.mtime) best = { path: path.join(dir, files[0].f), st: files[0].st };
    } catch {}
  }
  return best;
}
function lastLines(text, n) { return text ? text.split('\n').filter(l => l.trim()).slice(-n) : []; }

// ── 节拍巡检 ──

function inspectEvolve() {
  const logSt = statSafe(EVOLVE_LOG);
  const seedsSt = statSafe(SEEDS);
  const txt = readTextSafe(EVOLVE_LOG) || '';
  const doneOk = /done \(pushed=\d\)/.test(txt);
  const fresh = daysSince(logSt) < 2 && daysSince(seedsSt) < 3 && doneOk;
  let note = '';
  if (!logSt.exists) note = 'evolve.cron.log 缺失';
  else if (daysSince(logSt) >= 2) note = `日志已 ${daysSince(logSt).toFixed(1)} 天未更新`;
  else if (!doneOk) note = '日志中无成功标记(done pushed)';
  else if (daysSince(seedsSt) >= 3) note = 'seeds.json 长时间未更新';
  return {
    beat: '① 生产&学习闭环 (evolve→seeds)',
    status: fresh ? 'green' : 'red',
    lastRun: logSt.exists ? localYmd(logSt.mtime) + ' ' + logSt.mtime.toTimeString().slice(0, 8) : '无日志',
    note: note || `seeds 更新于 ${localYmd(seedsSt.mtime)}`,
  };
}

function inspectDistribution() {
  const snap = readJsonSafe(path.join(REPORTS, 'nanrenbao-monitor-snapshot.json'));
  const puPath = latestFile([REPORTS], f => f.startsWith('ks-page-usage-') && f.endsWith('.json'));
  const snapFresh = snap ? (Date.now() - new Date(snap.generatedAt).getTime()) / 86400000 : Infinity;
  const fresh = snapFresh < 2 && !!puPath;
  let note = '', metric = '';
  if (snap) {
    const byDay = snap.taskByDay || {};
    const dates = Object.keys(byDay).sort();
    const last = dates.length ? byDay[dates[dates.length - 1]] : null;
    const mb = snap.mounting && snap.mounting.byDay ? snap.mounting.byDay[snap.mounting.byDay.length - 1] : null;
    metric = `最新发布日 ${last ? dates[dates.length - 1] + ' 发' + last.publishes : '?'} · 最新挂载日 ${mb ? mb.date + ' 挂载' + mb.mounts + '/播放' + mb.plays : '?'}`;
  }
  if (snapFresh >= 2) note = `monitor-snapshot 已 ${snapFresh.toFixed(1)} 天未刷新`;
  else if (!puPath) note = 'ks-page-usage 缺失';
  return {
    beat: '② 达人挂载分发 (星火任务)',
    status: fresh ? 'green' : 'red',
    lastRun: snap ? localYmd(new Date(snap.generatedAt)) : '无快照',
    note: note || metric,
    metric,
  };
}

function inspectFollowAndFans() {
  const frPath = latestFile([FOLLOW_REPORTS], f => f.startsWith('follow-report-') && f.endsWith('.txt'));
  const frFresh = frPath ? daysSince(frPath.st) : Infinity;
  // 粉丝趋势：daily-kuaishou-report 产出 account_history.jsonl；找不到=未采集
  const ahPath = latestFile(KR_DIRS, f => f === 'account_history.jsonl');
  const ahText = ahPath ? readTextSafe(ahPath.path) : null;
  const ahLines = lastLines(ahText, 2);
  let fan = null, fanDelta = null, fanDate = null;
  if (ahLines.length) {
    try {
      const last = JSON.parse(ahLines[ahLines.length - 1]);
      fan = last.fan; fanDate = last.date;
      if (ahLines.length >= 2) fanDelta = last.fan - JSON.parse(ahLines[ahLines.length - 2]).fan;
    } catch {}
  }
  const workerOk = frFresh < 2;
  const status = workerOk ? 'green' : 'red';
  let note = '';
  if (frFresh >= 2) note = `关注Worker报告已 ${frFresh.toFixed(1)} 天未更新(可能挂了/登录失效)`;
  else note = `Worker 正常` + (fan != null ? ` · 粉丝 ${fan.toLocaleString()}${fanDelta != null ? ' (' + (fanDelta >= 0 ? '+' : '') + fanDelta + ')' : ''} @ ${fanDate}` : ' · 粉丝趋势未采集');
  return {
    beat: '③ 自有粉丝增长 (关注Worker)',
    status,
    lastRun: frPath ? localYmd(frPath.st.mtime) : '无报告',
    note,
    fan, fanDelta, fanTracked: fan != null,
  };
}

function inspectMeasurementTower() {
  // 综合度量日报 (daily-kuaishou-report.js)：产出 kuaishou_report_*.json + account_history.jsonl
  const kr = latestFile(KR_DIRS, f => f.startsWith('kuaishou_report_') && f.endsWith('.json'));
  const fresh = kr && daysSince(kr.st) < 2;
  let note = '';
  if (!kr) note = 'kuaishou_report_*.json 全树未找到 — daily-kuaishou-report 未产出(可能未调度/cookie过期静默退出)';
  else if (daysSince(kr.st) >= 2) note = `综合度量日报已 ${daysSince(kr.st).toFixed(1)} 天未刷新`;
  return {
    beat: '⑤ 综合度量日报 (daily-kuaishou-report)',
    status: fresh ? 'green' : 'red',
    lastRun: kr ? localYmd(kr.st.mtime) : '无产出',
    note: note || `最新报告 ${localYmd(kr.st.mtime)}`,
  };
}

function inspectOwnedVideo() {
  // ④ 优先读 promo-video 流水线的发布记录（可靠），再退化为目录探测
  const recordPath = path.join(HARNESS_LOCAL, 'state', 'promo-video', 'promo-video-publish.json');
  const arr = readJsonSafe(recordPath);
  if (Array.isArray(arr) && arr.length) {
    const last = arr[arr.length - 1];
    const lastDate = last.date ? new Date(last.date + 'T00:00:00') : null;
    const ageDays = lastDate ? (Date.now() - lastDate.getTime()) / 86400000 : Infinity;
    if (ageDays < 2) return { beat: '④ 自有账号宣传视频', status: 'green', lastRun: last.date || '?', note: `最近发布于 ${last.date}（隔天策略生效）` };
    if (ageDays < 7) return { beat: '④ 自有账号宣传视频', status: 'unknown', lastRun: last.date || '?', note: `最近发布于 ${last.date}（${ageDays.toFixed(1)}天前，隔天策略下偏久）` };
    return { beat: '④ 自有账号宣传视频', status: 'unknown', lastRun: last.date || '?', note: `最近发布于 ${last.date}（${ageDays.toFixed(1)}天前）— 疑似停发，检查 promo-video 流水线` };
  }
  // 退化：探测发布产物（排除挂载快照/源码误报）
  const probeDirs = [HARNESS_LOCAL, HARNESS, REPORTS];
  const reject = /(mounted-videos|video-recorder|node_modules|\.ts$|\.map$)/i;
  const accept = /(owned|app-to-kuaishou|promo-video|hot-task-video|video-publish|published-video)/i;
  let newest = null;
  for (const dir of probeDirs) {
    try {
      const walk = (d, depth) => {
        if (depth > 4) return;
        const ents = fs.readdirSync(d, { withFileTypes: true });
        for (const e of ents) {
          if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
          const fp = path.join(d, e.name);
          if (e.isDirectory()) { walk(fp, depth + 1); continue; }
          if (reject.test(e.name)) continue;
          if (accept.test(e.name) && /\.(mp4|mov|webm|mkv)$/i.test(e.name)) {
            const st = statSafe(fp);
            if (st.exists && (!newest || st.mtime > newest.st.mtime)) newest = { f: fp, st };
          }
        }
      };
      walk(dir, 0);
    } catch {}
  }
  if (newest && daysSince(newest.st) < 7) {
    return { beat: '④ 自有账号宣传视频', status: 'green', lastRun: localYmd(newest.st.mtime),
      note: `检测到近期发布产物: ${path.basename(newest.f)} (${daysSince(newest.st).toFixed(1)}天前)` };
  }
  return { beat: '④ 自有账号宣传视频', status: 'unknown', lastRun: newest ? localYmd(newest.st.mtime) : '无',
    note: newest ? `仅发现较旧产物(${path.basename(newest.f)}, ${daysSince(newest.st).toFixed(1)}天前) — 疑似未定时发`
                 : '未检测到任何自有账号视频发布记录 — 待确认是否接排程' };
}

function inspectPaymentIntent() {
  const pPath = latestFile([REPORTS], f => f.startsWith('nanrenbao-payment-intent-') && f.endsWith('.md'));
  const txt = pPath ? readTextSafe(pPath.path) : null;
  const fresh = pPath ? daysSince(pPath.st) : Infinity;
  let conclusion = '';
  if (txt) { const m = txt.match(/(有人想花钱|有人尝试|无人尝试|从未有人尝试)/); conclusion = m ? m[1] : '(结论未识别)'; }
  return {
    beat: '变现 · 支付意向',
    status: fresh < 5 ? 'green' : 'red',
    lastRun: pPath ? localYmd(pPath.st.mtime) : '无报告',
    note: txt ? `支付意向: ${conclusion} @ ${pPath ? localYmd(pPath.st.mtime) : '?'}` : '未找到支付意向报告',
    conclusion,
  };
}

// ── 合并 ──
function buildReport(dateStr, beats) {
  const anyRed = beats.some(b => b.status === 'red');
  const anyUnknown = beats.some(b => b.status === 'unknown');
  const overall = anyRed ? 'RED' : (anyUnknown ? 'AMBER' : 'GREEN');
  const fanBeat = beats.find(b => b.beat.includes('粉丝'));
  const distBeat = beats.find(b => b.beat.includes('分发'));
  const payBeat = beats.find(b => b.beat.includes('支付'));

  const L = [];
  L.push(`# 男人宝飞轮 · 控制塔日报 (${dateStr})`);
  L.push('');
  L.push(`整体状态: **${overall}**  ${anyRed ? '⚠️ 有节拍异常' : anyUnknown ? '⚠️ 有待确认项' : '✅ 各节拍正常'}`);
  L.push('');
  L.push('## 节拍巡检');
  L.push('');
  L.push('| 节拍 | 状态 | 最近成功 | 关键信号 |');
  L.push('|---|---|---|---|');
  for (const b of beats) {
    const icon = b.status === 'green' ? '🟢' : b.status === 'red' ? '🔴' : '🟡';
    L.push(`| ${b.beat} | ${icon} ${b.status} | ${b.lastRun} | ${b.note} |`);
  }
  L.push('');
  L.push('## 关键指标');
  L.push('');
  if (fanBeat && fanBeat.fan != null) L.push(`- 自有粉丝: ${fanBeat.fan.toLocaleString()} (${fanBeat.fanDelta != null ? (fanBeat.fanDelta >= 0 ? '+' : '') + fanBeat.fanDelta : '?'} 较昨日)`);
  else if (fanBeat) L.push(`- 自有粉丝: 未采集（综合度量日报未产出）`);
  if (distBeat && distBeat.metric) L.push(`- 分发: ${distBeat.metric}`);
  if (payBeat) L.push(`- 支付意向: ${payBeat.conclusion || '未知'}`);
  L.push('');
  L.push('## 需决策 / 告警');
  L.push('');
  const alerts = beats.filter(b => b.status !== 'green');
  if (!alerts.length) L.push('- 暂无异常。');
  else for (const b of alerts) L.push(`- [${b.status === 'red' ? '异常' : '待确认'}] ${b.beat}: ${b.note}`);
  if (fanBeat && fanBeat.fanDelta != null && fanBeat.fanDelta < 0) L.push(`- 🔴 粉丝数较昨日下降 ${fanBeat.fanDelta} — 检查限流/内容违规`);
  L.push('');
  L.push('---');
  L.push(`生成于 ${new Date().toISOString()} · 控制塔只读巡检，不触发任何生产动作`);
  return { overall, markdown: L.join('\n') };
}

async function sendEmailWithSystemMail(to, subject, body) {
  const { exec } = await import('child_process');
  const util = await import('util');
  const execAsync = util.promisify(exec);
  await execAsync('test -x /usr/sbin/sendmail');
  const date = new Date().toUTCString();
  const emailContent = `To: ${to}
From: control-tower@letmetryai.cn
Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=
Date: ${date}
MIME-Version: 1.0
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: base64

${Buffer.from(body).toString('base64')}`;
  const tempEmail = `/tmp/control_tower_email_${Date.now()}.eml`;
  fs.writeFileSync(tempEmail, emailContent);
  try {
    await execAsync(`/usr/sbin/sendmail ${to} < "${tempEmail}"`);
    fs.unlinkSync(tempEmail);
    return true;
  } catch (e) {
    try { fs.unlinkSync(tempEmail); } catch {}
    throw e;
  }
}

// 主用系统 sendmail（与 daily-kuaishou-report.js 一致），AgentMail 作为兜底
async function sendEmail(subject, body) {
  try {
    await sendEmailWithSystemMail(EMAIL_TO, subject, body);
    log('INFO', '控制塔日报已通过系统 sendmail 推送');
    return true;
  } catch (e) {
    log('WARN', `系统 sendmail 失败(${e.message})，尝试 AgentMail`);
  }
  try {
    const { AgentMailClient } = await import('agentmail');
    const client = new AgentMailClient({ apiKey: AGENTMAIL_API_KEY });
    const inboxes = await client.inboxes.list();
    const arr = inboxes.inboxes || inboxes.data || [];
    if (!arr.length) throw new Error('no inbox');
    const inbox = arr.find(i => String(i.inboxId || i.id || '').includes('letmetry')) || arr[0];
    const inboxId = inbox.inboxId || inbox.id;
    await client.inboxes.messages.send(inboxId, { to: [EMAIL_TO], subject, text: body });
    log('INFO', '控制塔日报已通过 Agent Mail 推送');
    return true;
  } catch (e) { log('WARN', `Agent Mail 推送失败(不影响报告产出): ${e.message}`); return false; }
}

function parseDate() {
  const i = process.argv.indexOf('--date');
  if (i !== -1 && /^\d{4}-\d{2}-\d{2}$/.test(process.argv[i + 1] || '')) return process.argv[i + 1];
  return localYmd();
}

async function main() {
  const dateStr = parseDate();
  const noEmail = process.argv.includes('--no-email');
  log('INFO', `控制塔启动 ${dateStr}`);
  const beats = [
    inspectEvolve(),
    inspectDistribution(),
    inspectFollowAndFans(),
    inspectMeasurementTower(),
    inspectOwnedVideo(),
    inspectPaymentIntent(),
  ];
  const { overall, markdown } = buildReport(dateStr, beats);
  console.log('\n' + markdown + '\n');
  fs.mkdirSync(REPORTS, { recursive: true });
  fs.writeFileSync(path.join(REPORTS, `nanrenbao-control-tower-${dateStr}.md`), markdown);
  fs.writeFileSync(path.join(REPORTS, `nanrenbao-control-tower-${dateStr}.json`), JSON.stringify({ date: dateStr, overall, beats }, null, 2));
  log('INFO', `报告已写: ${REPORTS}/nanrenbao-control-tower-${dateStr}.md`);
  if (!noEmail) await sendEmail(`[飞轮控制塔 ${overall}] ${dateStr}`, markdown);
}

main().catch(e => { log('ERROR', `致命错误: ${e.message}`); process.exit(1); });
