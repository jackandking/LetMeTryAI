/**
 * smtp-mail.cjs — 零依赖 SMTP 直发（隐式 TLS / 465），凭据运行时从 Vault 取。
 *
 * 为什么不用 sendmail / postfix：本机 postdrop 在 WorkBuddy 沙箱被禁；且本机 postfix
 * 直投 From: @163.com 会被 163 的 SPF 拦。后端 quguona_order.js 早已用 nodemailer
 * 直连 smtp.163.com:465 发信（mail_config.json），这里用 node 内置 tls 复刻同一路径，
 * 不引入依赖、凭据只在内存、用完即丢、不落仓库/日志。
 *
 * 依赖的 Vault slug（owner 自建，需显式授权）：
 *   smtp-outbound-address  邮箱地址，如 letmetryx@163.com
 *   smtp-outbound-host     "host|port"，如 smtp.163.com|465
 *   smtp-outbound-authcode SMTP 授权码
 *
 * token 文件优先级：env VAULT_SMTP_TOKEN_FILE → ~/.automation/.local/auth/vault_agent_token_smtp
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const tls = require('tls');

const VAULT_BASE = 'https://letmetry.cn/api/vault';
const SLUGS = {
  address: 'smtp-outbound-address',
  host: 'smtp-outbound-host',
  authcode: 'smtp-outbound-authcode',
};

function tokenCandidates() {
  const out = [];
  if (process.env.VAULT_SMTP_TOKEN_FILE) out.push(process.env.VAULT_SMTP_TOKEN_FILE);
  out.push(path.join(os.homedir(), '.automation/.local/auth/vault_agent_token_smtp'));
  return out;
}

function vaultGet(slug, token) {
  return new Promise((resolve, reject) => {
    const url = `${VAULT_BASE}/secrets/${encodeURIComponent(slug)}`;
    const req = https.get(url, { headers: { Authorization: `Bearer ${token}` }, timeout: 12000 }, res => {
      let raw = '';
      res.setEncoding('utf8');
      res.on('data', d => { raw += d; });
      res.on('end', () => {
        if (res.statusCode === 403) return reject(new Error(`Vault 未授权 ${slug}（需 Owner 批准该 agent）`));
        if (res.statusCode !== 200) return reject(new Error(`Vault ${slug} HTTP ${res.statusCode}`));
        let j;
        try { j = JSON.parse(raw); } catch { return reject(new Error(`Vault ${slug} 返回非 JSON`)); }
        const value = j.value != null ? j.value : (j.data && j.data.value);
        if (!value) return reject(new Error(`Vault ${slug} 无 value`));
        resolve(String(value));
      });
    });
    req.on('timeout', () => req.destroy(new Error(`Vault ${slug} 超时`)));
    req.on('error', e => reject(new Error(`Vault ${slug} 请求失败: ${e.message}`)));
  });
}

async function loadSmtpConfig() {
  const tokenFile = tokenCandidates().find(f => { try { return fs.statSync(f).isFile(); } catch { return false; } });
  if (!tokenFile) throw new Error('未找到 Vault agent token（vault_agent_token_smtp）');
  const token = fs.readFileSync(tokenFile, 'utf8').trim();
  if (!token) throw new Error('Vault agent token 为空');
  const [address, hostSpec, authcode] = await Promise.all([
    vaultGet(SLUGS.address, token),
    vaultGet(SLUGS.host, token),
    vaultGet(SLUGS.authcode, token),
  ]);
  const [host, portRaw] = String(hostSpec).split('|');
  const port = Number(portRaw) || 465;
  if (!host || !address || !authcode) throw new Error('Vault SMTP 配置不完整');
  return { host: host.trim(), port, user: address.trim(), pass: authcode.trim() };
}

function b64(s) { return Buffer.from(String(s), 'utf8').toString('base64'); }
function wrap76(s) { return String(s).replace(/.{1,76}/g, m => m + '\r\n').replace(/\r\n$/, ''); }
function encHeader(s) { return `=?UTF-8?B?${b64(s)}?=`; }

/** 隐式 TLS SMTP 会话：220 → EHLO → AUTH LOGIN → MAIL/RCPT/DATA → QUIT */
async function sendSmtpMail(cfg, { to, subject, text, from, fromName }) {
  const sock = tls.connect({ host: cfg.host, port: cfg.port, servername: cfg.host, timeout: 15000 });
  sock.setEncoding('utf8');
  let buf = '', current = [], replies = [], waiter = null, fatal = null;

  sock.on('data', chunk => {
    buf += chunk;
    let i;
    while ((i = buf.indexOf('\r\n')) >= 0) {
      const line = buf.slice(0, i);
      buf = buf.slice(i + 2);
      current.push(line);
      // 第 4 个字符为空格 = 本次多行响应的最终行
      if (line.length >= 4 && line[3] === ' ') {
        const reply = current; current = [];
        if (waiter) { const w = waiter; waiter = null; w.resolve(reply); }
        else replies.push(reply);
      }
    }
  });
  sock.on('error', e => {
    fatal = e;
    if (waiter) { const w = waiter; waiter = null; w.reject(e); }
  });
  sock.on('timeout', () => sock.destroy(new Error('SMTP 连接超时')));

  const readReply = () => new Promise((resolve, reject) => {
    if (fatal) return reject(fatal);
    if (replies.length) return resolve(replies.shift());
    const timer = setTimeout(() => { waiter = null; reject(new Error('SMTP 响应超时')); }, 15000);
    waiter = {
      resolve: r => { clearTimeout(timer); resolve(r); },
      reject: e => { clearTimeout(timer); reject(e); },
    };
  });

  async function cmd(line, expected) {
    if (fatal) throw fatal;
    if (line !== null) sock.write(line + '\r\n');
    const reply = await readReply();
    const last = reply[reply.length - 1];
    const code = parseInt(last.slice(0, 3), 10);
    if (expected && code !== expected) throw new Error(`SMTP 期望 ${expected}，收到 ${last}`);
    return reply;
  }

  try {
    await cmd(null, 220);
    await cmd('EHLO localhost', 250);
    await cmd('AUTH LOGIN', 334);
    await cmd(b64(cfg.user), 334);
    await cmd(b64(cfg.pass), 235);
    const envelopeFrom = from || cfg.user;
    await cmd(`MAIL FROM:<${envelopeFrom}>`, 250);
    await cmd(`RCPT TO:<${to}>`, 250);
    await cmd('DATA', 354);

    const headers = [
      `From: ${fromName ? `${encHeader(fromName)} <${envelopeFrom}>` : envelopeFrom}`,
      `To: ${to}`,
      `Subject: ${encHeader(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${Date.now()}.${Math.random().toString(36).slice(2)}@${os.hostname()}>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
    ].join('\r\n');
    const payload = `${headers}\r\n\r\n${wrap76(b64(text))}\r\n.`;
    await cmd(payload, 250);
    try { await cmd('QUIT', 221); } catch { /* 部分服务器 QUIT 不回 221，忽略 */ }
    return true;
  } finally {
    sock.destroy();
  }
}

/** 一步到位：Vault 取凭据 → 163 SMTP 直发。错误已脱敏（不含 token/授权码）。 */
async function sendViaVault({ to, subject, text, from, fromName }) {
  const cfg = await loadSmtpConfig();
  await sendSmtpMail(cfg, { to, subject, text, from, fromName });
  return { host: cfg.host, user: cfg.user };
}

module.exports = { loadSmtpConfig, sendSmtpMail, sendViaVault };
