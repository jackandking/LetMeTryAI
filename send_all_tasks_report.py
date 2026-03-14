#!/usr/bin/env python3
"""Send complete list of 36 Kuaishou tasks"""

import os
import json
import agentmail

API_KEY = "am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4"
TO_EMAIL = "jackandking@163.com"

def send_report():
    client = agentmail.AgentMail(api_key=API_KEY)
    
    # Get inbox
    inboxes_resp = client.inboxes.list()
    inboxes = getattr(inboxes_resp, 'inboxes', getattr(inboxes_resp, 'data', inboxes_resp))
    target_inbox = next((i for i in inboxes if 'letmetry' in getattr(i, 'inbox_id', getattr(i, 'id', ''))), inboxes[0])
    inbox_id = getattr(target_inbox, 'inbox_id', getattr(target_inbox, 'id', None))
    
    # Read data
    with open('kuaishou_all_tasks_dedup.json', 'r') as f:
        data = json.load(f)
    
    tasks = data['tasks']
    
    # Count by source
    source_count = {}
    for t in tasks:
        src = t['source']
        source_count[src] = source_count.get(src, 0) + 1
    
    # Build email
    body = f"""Hi,

快手星火计划完整任务清单（全部 36 个任务）

📊 统计概览
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 总任务数: {len(tasks)} 个
• 总页数: {data['totalPages']} 页

📦 按小程序分布
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for src, count in sorted(source_count.items(), key=lambda x: -x[1]):
        body += f"• {src}: {count} 个\n"
    
    body += """

📋 完整任务列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for i, t in enumerate(tasks, 1):
        body += f"{i:2}. [ID:{t['planId']}] {t['name']}\n    来源: {t['source']} | 状态: {t['status']}\n\n"
    
    body += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
抓取时间: {data['fetchTime']}

📁 附件
• kuaishou_all_tasks_dedup.csv - Excel 可打开的完整列表

下一步建议:
1. 可以针对这些任务获取详细统计数据（曝光、点击、收益等）
2. 可以按小程序分类分析表现
3. 可以设置定时任务定期更新数据

Best regards,
Kuaishou Data Scraper
"""

    # Attachments
    attachments = []
    for filename in ['kuaishou_all_tasks_dedup.csv']:
        if os.path.exists(filename):
            with open(filename, 'rb') as f:
                attachments.append({
                    'filename': filename,
                    'content': f.read(),
                    'content_type': 'text/csv'
                })

    # Send
    message = client.inboxes.messages.send(
        inbox_id=inbox_id,
        to=[TO_EMAIL],
        subject=f"[快手完整任务清单] 全部 {len(tasks)} 个分销计划",
        text=body,
        attachments=attachments
    )
    
    print(f"✅ 邮件已发送!")
    print(f"Message ID: {getattr(message, 'message_id', 'N/A')}")

if __name__ == "__main__":
    send_report()
