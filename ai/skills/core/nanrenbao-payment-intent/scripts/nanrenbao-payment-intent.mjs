#!/usr/bin/env node
/**
 * nanrenbao-payment-intent — 男人宝支付意向/充值尝试一键查询
 *
 * 回答一个问题：「最近有没有人想尝试在男人宝里花钱？」
 * 四个数据源交叉验证（全部只读）：
 *   1. MySQL alipay_payment_orders  —— 真实充值订单（状态/金额/时间）
 *   2. MySQL alipay_points_ledger   —— 积分入账流水（成功支付才会写）
 *   3. data/miniapp-events/*.jsonl  —— 前端「假支付页」sendBeacon 上报的 payment_intent
 *   4. 进程环境/.env                —— 支付宝密钥是否配置（决定充值通道开/关）
 * 辅证：api_stats 里 /api/track 的近 7 日调用量（确认埋点管道活着）。
 *
 * 只读：不建单、不改库、不写生产。仅 SSH 到 lws 执行 SELECT + grep。
 */

import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
let days = 30;
for (let i = 0; i < args.length; i += 1) {
    if (args[i] === '--days') {
        days = Number.parseInt(args[i + 1], 10) || 30;
        i += 1;
    } else if (args[i] === '--help' || args[i] === '-h') {
        console.log('用法: nanrenbao-payment-intent.mjs [--days 30]');
        process.exit(0);
    }
}

const outDir = process.env.NANRENBAO_PAYMENT_OUT
    || path.join(homedir(), 'LetMeTryAI', '.automation', 'reports');

const REMOTE_SCRIPT = `
set -u
REPO=/root/letmetry_web_service
cd "$REPO" || { echo "==ERROR== repo not found: $REPO"; exit 1; }
DBUSER=$(grep -m1 -oE "user: *'[^']+'" mysqlUtil.js | sed "s/user: *'//; s/'$//")
DBPASS=$(grep -m1 -oE "password: *'[^']+'" mysqlUtil.js | sed "s/password: *'//; s/'$//")
[ -n "$DBUSER" ] && [ -n "$DBPASS" ] || { echo "==ERROR== cannot read db credentials from mysqlUtil.js"; exit 1; }
Q() { mysql -h127.0.0.1 -u"$DBUSER" -p"$DBPASS" -N letmetryai -e "$1" 2>/dev/null; }
echo "==ORDERS_BY_STATUS=="
Q "SELECT status, COUNT(*) FROM alipay_payment_orders GROUP BY status;"
echo "==ORDERS_RECENT30=="
Q "SELECT COUNT(*) FROM alipay_payment_orders WHERE created_at >= NOW() - INTERVAL 30 DAY;"
echo "==ORDERS_LAST10=="
Q "SELECT id, order_no, user_uuid, package_id, points, amount, status, created_at FROM alipay_payment_orders ORDER BY id DESC LIMIT 10;"
echo "==LEDGER_TOTAL=="
Q "SELECT COUNT(*) FROM alipay_points_ledger;"
echo "==TRACK_VOLUME_7D=="
Q "SELECT stat_date, call_count FROM api_stats WHERE path_norm='/api/track' AND stat_date >= CURDATE() - INTERVAL 7 DAY ORDER BY stat_date;"
echo "==ALIPAY_CONFIG=="
if grep -q '^ALIPAY_APP_ID=' /root/letmetry_web_service/.env 2>/dev/null; then ENVF=1; else ENVF=0; fi
PID=$(pgrep -f 'letmetry_web_service/app.js' | head -1)
if [ -n "$PID" ] && tr '\\0' '\\n' < /proc/$PID/environ 2>/dev/null | grep -q '^ALIPAY_APP_ID='; then RUNTIME=1; else RUNTIME=0; fi
echo "env_file=$ENVF runtime=$RUNTIME"
echo "==INTENTS=="
cd /root/letmetry_web_service/data/miniapp-events 2>/dev/null && grep -h '"event":"payment_intent"' *.jsonl 2>/dev/null
echo "==DONE=="
`;

function runRemote() {
    try {
        return execFileSync('ssh', ['lws', 'bash -s'], {
            input: REMOTE_SCRIPT,
            encoding: 'utf8',
            timeout: 90000,
            stdio: ['pipe', 'pipe', 'ignore'],
        });
    } catch (err) {
        console.error('查询失败（SSH lws 或远端命令出错）:', err.message);
        if (err.stderr) console.error(String(err.stderr).slice(0, 500));
        process.exit(1);
    }
}

function section(raw, name, endName) {
    const start = raw.indexOf(`==${name}==`);
    if (start < 0) return '';
    const from = start + name.length + 4;
    const end = raw.indexOf(`==${endName}==`, from);
    return raw.slice(from, end < 0 ? undefined : end).trim();
}

function parseTsvLines(text) {
    return text.split('\n').map((l) => l.trim()).filter(Boolean)
        .map((l) => l.split('\t'));
}

function todayStr(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const raw = runRemote();

if (raw.includes('==ERROR==')) {
    console.error('远端查询报错:', raw.split('==ERROR==')[1]?.trim().split('\n')[0] || 'unknown');
    process.exit(1);
}

// ── 解析各段 ──
const ordersByStatus = parseTsvLines(section(raw, 'ORDERS_BY_STATUS', 'ORDERS_RECENT30'))
    .map(([status, count]) => ({ status, count: Number(count) }));
const ordersRecent30 = Number(section(raw, 'ORDERS_RECENT30', 'ORDERS_LAST10').split('\n')[0]) || 0;
const ordersLast10 = parseTsvLines(section(raw, 'ORDERS_LAST10', 'LEDGER_TOTAL'))
    .map(([id, orderNo, userUuid, packageId, points, amount, status, createdAt]) =>
        ({ id, orderNo, userUuid, packageId, points, amount, status, createdAt }));
const ledgerTotal = Number(section(raw, 'LEDGER_TOTAL', 'TRACK_VOLUME_7D').split('\n')[0]) || 0;
const trackVolume = parseTsvLines(section(raw, 'TRACK_VOLUME_7D', 'ALIPAY_CONFIG'))
    .map(([d, c]) => ({ date: d, count: Number(c) }));

const cfgLine = section(raw, 'ALIPAY_CONFIG', 'INTENTS');
const envFile = /env_file=1/.test(cfgLine);
const runtime = /runtime=1/.test(cfgLine);

const intents = section(raw, 'INTENTS', 'DONE').split('\n').map((l) => l.trim()).filter(Boolean)
    .map((line) => {
        try { return JSON.parse(line); } catch { return null; }
    }).filter(Boolean)
    .filter((e) => e.appId === 'nanrenbao-recharge' || !e.appId);

// ── 汇总 ──
const windowStart = todayStr(-days);
const recentIntents = intents.filter((e) => (e.date || '') >= windowStart);
const allTimeIntents = intents.length;
const uniqueUsers = [...new Set(intents.map((e) => e.userUuid).filter(Boolean))];
const recentUsers = [...new Set(recentIntents.map((e) => e.userUuid).filter(Boolean))];
const pkgBreakdown = {};
for (const e of recentIntents) {
    const key = `${e.packageId || '?'} / ¥${e.amount || '?'}`;
    pkgBreakdown[key] = (pkgBreakdown[key] || 0) + 1;
}
const totalOrders = ordersByStatus.reduce((s, r) => s + r.count, 0);
const paidOrders = ordersByStatus.filter((r) => r.status !== 'PENDING').reduce((s, r) => s + r.count, 0);
const trackAlive = trackVolume.length > 0 && trackVolume.some((r) => r.count > 0);

// ── 结论 ──
let verdict;
if (recentIntents.length > 0) {
    verdict = `最近 ${days} 天有 ${recentIntents.length} 次支付意向（${recentUsers.length} 个用户）——有人想花钱，值得推进支付。`;
} else if (allTimeIntents > 0) {
    verdict = `最近 ${days} 天无人尝试支付；历史累计 ${allTimeIntents} 次意向（最早见明细）。`;
} else {
    verdict = `从未有人尝试支付（假支付页上线以来 0 次意向）。`;
}

const channelText = runtime
    ? '已配置（生产进程带 ALIPAY_APP_ID，充值通道理论可用）'
    : (envFile ? '未生效（.env 有配置但进程环境没有，需 pm2 restart 重载）' : '未配置（服务端缺支付宝密钥，create-order 会直接报错）');

// ── 下一步建议 ──
const advice = [];
if (recentIntents.length > 0 && !runtime) {
    advice.push('有意向但通道未开 → 最高优先级：配置支付宝三件套密钥（ALIPAY_APP_ID/PRIVATE_KEY/PUBLIC_KEY，走 Vault 或密钥文件，勿明文进仓库）+ 把前端积分从 localStorage 迁到服务端账户（付费积分存本地 = 资损风险）。');
}
if (recentIntents.length > 0 && runtime) {
    advice.push('通道已开且有意向 → 盯 create-order 是否报错、支付宝回调是否验签通过；订单若新增 PENDING 需排查用户是否跳到支付宝后放弃。');
}
if (recentIntents.length === 0 && allTimeIntents > 0) {
    advice.push('有意向断层 → 检查 appreciate.html 充值入口曝光；套餐定价（¥1/¥5/¥10）或文案是否需调整。');
}
if (allTimeIntents === 0) {
    advice.push('零意向 → 先别做支付：查入口点击率（可对照页面使用数据），确认有没有人看到充值入口。');
}
if (totalOrders > 0 && paidOrders === 0) {
    advice.push(`订单表有 ${totalOrders} 笔历史订单且全部未支付 → 重开支付前先清理/标记这些僵尸订单（建议置 EXPIRED），否则对账永远分不清历史遗留与新失败。`);
}
if (!trackAlive) {
    advice.push('/api/track 近 7 天无调用 → 埋点管道可能断了，先修管道再谈数据。');
}
if (advice.length === 0) advice.push('暂无需动作，保持观察。');

// ── 渲染 ──
const lines = [];
lines.push('# 男人宝支付意向速查');
lines.push('');
lines.push(`**结论：${verdict}**`);
lines.push('');
lines.push('| 指标 | 值 |');
lines.push('|---|---|');
lines.push(`| 最近 ${days} 天支付意向 | ${recentIntents.length} 次（${recentUsers.length} 个用户） |`);
lines.push(`| 历史累计意向 | ${allTimeIntents} 次 |`);
lines.push(`| 充值订单 | 共 ${totalOrders} 笔，已支付 ${paidOrders} 笔 |`);
lines.push(`| 近 30 天新订单 | ${ordersRecent30} 笔 |`);
lines.push(`| 积分入账流水 | ${ledgerTotal} 条 |`);
lines.push(`| 支付宝通道 | ${channelText} |`);
lines.push(`| /api/track 近 7 日调用 | ${trackAlive ? '正常' : '无调用'} |`);
lines.push('');

if (recentIntents.length) {
    lines.push(`## 最近 ${days} 天意向明细`);
    lines.push('');
    lines.push('| 日期 | 用户 UUID | 套餐 | 积分 | 金额 |');
    lines.push('|---|---|---|---|---|');
    for (const e of [...recentIntents].reverse()) {
        lines.push(`| ${e.date || '-'} | ${(e.userUuid || '-').slice(0, 8)}… | ${e.packageId || '-'} | ${e.points ?? '-'} | ¥${e.amount ?? '-'} |`);
    }
    lines.push('');
    const top = Object.entries(pkgBreakdown).sort((a, b) => b[1] - a[1]);
    if (top.length) {
        lines.push('套餐分布：' + top.map(([k, v]) => `${k} × ${v}`).join('，'));
        lines.push('');
    }
}

if (ordersLast10.length) {
    lines.push('## 最近 10 笔充值订单');
    lines.push('');
    lines.push('| ID | 订单号 | 用户 | 套餐 | 金额 | 状态 | 创建时间 |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const o of ordersLast10) {
        lines.push(`| ${o.id} | ${o.orderNo} | ${(o.userUuid || '').slice(0, 8)}… | ${o.packageId} | ¥${o.amount} | ${o.status} | ${o.createdAt} |`);
    }
    lines.push('');
}

lines.push('## 下一步建议');
lines.push('');
for (const a of advice) lines.push(`- ${a}`);
lines.push('');
lines.push('---');
lines.push(`查询时间：${new Date().toLocaleString('zh-CN', { hour12: false })}｜窗口：最近 ${days} 天｜数据源：lws MySQL + miniapp-events + api_stats`);

const report = lines.join('\n');
console.log(report);

try {
    mkdirSync(outDir, { recursive: true });
    const file = path.join(outDir, `nanrenbao-payment-intent-${todayStr().replaceAll('-', '')}.md`);
    writeFileSync(file, report + '\n', 'utf8');
    console.log(`\n报告已写入: ${file}`);
} catch (err) {
    console.error('报告写入失败（不影响上方结论）:', err.message);
}
