#!/usr/bin/env node
/**
 * 邮件发送调试脚本
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
    apiKey: process.env.AGENTMAIL_API_KEY || 'am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4',
    emailTo: process.env.KUAISHOU_EMAIL_TO || 'jackandking@163.com',
    outputDir: path.join(__dirname, 'metrics', 'kuaishou', 'daily')
};

// 测试方法1: 使用 AgentMail
async function testAgentMail() {
    console.log('\n[方法1] 测试 AgentMail...');
    try {
        const { AgentMailClient } = await import('agentmail');
        const client = new AgentMailClient({ apiKey: CONFIG.apiKey });
        
        // 获取 inbox 列表
        console.log('  - 获取 inbox 列表...');
        const inboxesResp = await client.inboxes.list();
        console.log('  - Inbox 响应:', JSON.stringify(inboxesResp, null, 2).substring(0, 500));
        
        const inboxes = inboxesResp.inboxes || inboxesResp.data || inboxesResp;
        if (!inboxes || inboxes.length === 0) {
            console.log('  ❌ 没有找到 inbox');
            return false;
        }
        
        const inbox = inboxes.find(i => (i.inbox_id || i.id).includes('letmetry')) || inboxes[0];
        const inboxId = inbox.inbox_id || inbox.id;
        console.log('  - 使用 inbox:', inboxId);
        
        // 发送测试邮件
        console.log('  - 发送邮件...');
        await client.inboxes.messages.send({
            inbox_id: inboxId,
            to: [CONFIG.emailTo],
            subject: '📧 邮件发送测试 ' + new Date().toISOString().split('T')[0],
            text: `这是一封测试邮件。\n\n发送时间: ${new Date().toISOString()}\n\n如果收到这封邮件，说明 AgentMail 配置正常。`,
        });
        
        console.log('  ✅ AgentMail 发送成功');
        return true;
    } catch (e) {
        console.log('  ❌ AgentMail 失败:', e.message);
        if (e.message.includes('403')) {
            console.log('     - 可能是 API Key 失效或被限制');
        }
        return false;
    }
}

// 测试方法2: 使用系统 mail 命令
async function testSystemMail() {
    console.log('\n[方法2] 测试系统 mail 命令...');
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);
    
    try {
        // 检查 mail 命令是否存在
        await execAsync('which mail');
        console.log('  - mail 命令存在');
        
        // 构建邮件内容
        const subject = '📧 邮件发送测试 ' + new Date().toISOString().split('T')[0];
        const body = `这是一封测试邮件。

发送时间: ${new Date().toISOString()}

如果收到这封邮件，说明系统 mail 命令工作正常。`;
        
        // 发送邮件
        const cmd = `echo "${body.replace(/"/g, '\\"')}" | mail -s "${subject}" ${CONFIG.emailTo}`;
        console.log('  - 执行命令:', cmd.substring(0, 80) + '...');
        
        const { stdout, stderr } = await execAsync(cmd);
        if (stderr) {
            console.log('  ⚠️  stderr:', stderr);
        }
        console.log('  ✅ 系统 mail 命令发送成功');
        return true;
    } catch (e) {
        console.log('  ❌ 系统 mail 命令失败:', e.message);
        return false;
    }
}

// 测试方法3: 使用 sendmail 命令
async function testSendmail() {
    console.log('\n[方法3] 测试 sendmail 命令...');
    const { exec } = await import('child_process');
    const util = await import('util');
    const execAsync = util.promisify(exec);
    
    try {
        await execAsync('which sendmail');
        console.log('  - sendmail 命令存在');
        
        const date = new Date().toISOString();
        const email = `To: ${CONFIG.emailTo}
Subject: =?UTF-8?B?${Buffer.from('📧 邮件发送测试 ' + date.split('T')[0]).toString('base64')}?=
Content-Type: text/plain; charset=UTF-8
Content-Transfer-Encoding: 8bit

这是一封测试邮件。

发送时间: ${date}

如果收到这封邮件，说明 sendmail 工作正常。
`;
        
        const cmd = `echo "${email.replace(/"/g, '\\"')}" | /usr/sbin/sendmail ${CONFIG.emailTo}`;
        await execAsync(cmd);
        console.log('  ✅ sendmail 发送成功');
        return true;
    } catch (e) {
        console.log('  ❌ sendmail 失败:', e.message);
        return false;
    }
}

// 主函数
async function main() {
    console.log('========================================');
    console.log('邮件发送调试');
    console.log('收件人:', CONFIG.emailTo);
    console.log('========================================');
    
    // 测试所有方法
    const results = {
        agentMail: await testAgentMail(),
        systemMail: await testSystemMail(),
        sendmail: await testSendmail()
    };
    
    console.log('\n========================================');
    console.log('测试结果:');
    console.log('  AgentMail :', results.agentMail ? '✅ 可用' : '❌ 不可用');
    console.log('  系统 mail :', results.systemMail ? '✅ 可用' : '❌ 不可用');
    console.log('  sendmail  :', results.sendmail ? '✅ 可用' : '❌ 不可用');
    console.log('========================================');
    
    // 建议
    console.log('\n建议:');
    if (results.agentMail) {
        console.log('  - AgentMail 可用，建议继续使用');
    } else if (results.systemMail || results.sendmail) {
        console.log('  - AgentMail 不可用，建议切换到系统邮件命令');
    } else {
        console.log('  - 所有邮件发送方式都不可用，需要配置邮件服务器');
    }
}

main().catch(console.error);
