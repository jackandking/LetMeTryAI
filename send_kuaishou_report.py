#!/usr/bin/env python3
"""
Send Kuaishou task statistics report via AgentMail
"""

import os
import json
import agentmail

# Configuration
API_KEY = os.environ.get("AGENTMAIL_API_KEY") or "am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4"
TO_EMAIL = "jackandking@163.com"

def send_report():
    client = agentmail.AgentMail(api_key=API_KEY)
    
    # Get Inbox ID
    try:
        inboxes_resp = client.inboxes.list()
        if hasattr(inboxes_resp, 'inboxes'):
            inboxes = inboxes_resp.inboxes
        elif hasattr(inboxes_resp, 'data'):
            inboxes = inboxes_resp.data
        else:
            inboxes = inboxes_resp
            
        if not inboxes:
            print("No inbox found.")
            return

        target_inbox = inboxes[0]
        for inbox in inboxes:
            i_id = getattr(inbox, 'inbox_id', getattr(inbox, 'id', ''))
            if 'letmetry' in i_id:
                target_inbox = inbox
                break
                
        inbox_id = getattr(target_inbox, 'inbox_id', getattr(target_inbox, 'id', None))
        print(f"Using Inbox: {inbox_id}")
    except Exception as e:
        print(f"Initialization error: {e}")
        return

    # Read data files
    try:
        with open('metrics/kuaishou/task_stats.json', 'r') as f:
            data = json.load(f)
        with open('metrics/kuaishou/task_stats.csv', 'r') as f:
            csv_content = f.read()
    except Exception as e:
        print(f"Error reading data files: {e}")
        return

    # Build email body
    tasks = data.get('tasks', [])
    total_tasks = len(tasks)
    
    # Calculate summary
    tasks_with_data = [t for t in tasks if t['stats'].get('组件曝光数')]
    total_exposure = sum(int(t['stats']['组件曝光数']) for t in tasks_with_data if t['stats']['组件曝光数'])
    total_daren = sum(int(t['stats']['已履单达人数量']) for t in tasks if t['stats'].get('已履单达人数量'))
    total_works = sum(int(t['stats']['已发布作品数']) for t in tasks if t['stats'].get('已发布作品数'))
    
    body = f"""Hi,

快手星火计划任务统计数据报告

📊 统计摘要
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 总任务数: {total_tasks} 个
• 有数据的任务: {len(tasks_with_data)} 个
• 总曝光数: {total_exposure}
• 总达人数量: {total_daren}
• 总作品数量: {total_works}

📈 任务详情
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for task in tasks:
        stats = task['stats']
        exposure = stats.get('组件曝光数') or 'N/A'
        clicks = stats.get('组件点击数') or 'N/A'
        daren = stats.get('已履单达人数量') or 'N/A'
        works = stats.get('已发布作品数') or 'N/A'
        
        body += f"""
【{task['taskName']}】
  状态: {task['status']} | {task['timeRange']}
  曝光: {exposure} | 点击: {clicks} | 达人: {daren} | 作品: {works}
"""
    
    body += f"""

📁 附件说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• task_stats.csv - Excel 可直接打开的表格数据
• task_stats.json - 完整的 JSON 格式数据

抓取时间: {data.get('fetchTime', 'N/A')}

Best regards,
Kuaishou Data Scraper
"""

    # Prepare attachments
    attachments = []
    
    # Read CSV file as attachment
    try:
        with open('metrics/kuaishou/task_stats.csv', 'rb') as f:
            csv_data = f.read()
        attachments.append({
            'filename': 'task_stats.csv',
            'content': csv_data,
            'content_type': 'text/csv'
        })
    except Exception as e:
        print(f"Warning: Could not attach CSV: {e}")
    
    # Read JSON file as attachment
    try:
        with open('metrics/kuaishou/task_stats.json', 'rb') as f:
            json_data = f.read()
        attachments.append({
            'filename': 'task_stats.json',
            'content': json_data,
            'content_type': 'application/json'
        })
    except Exception as e:
        print(f"Warning: Could not attach JSON: {e}")

    print(f"Sending email to {TO_EMAIL}...")
    
    try:
        # Send email with attachments
        message = client.inboxes.messages.send(
            inbox_id=inbox_id,
            to=[TO_EMAIL],
            subject=f"[快手数据报告] 星火计划任务统计 - {len(tasks)}个任务",
            text=body,
            attachments=attachments if attachments else None
        )
        print("✅ Email sent successfully!")
        print(f"Message ID: {getattr(message, 'message_id', 'N/A')}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        # Fallback: try without attachments
        try:
            print("Trying to send without attachments...")
            client.inboxes.messages.send(
                inbox_id=inbox_id,
                to=[TO_EMAIL],
                subject=f"[快手数据报告] 星火计划任务统计 - {len(tasks)}个任务",
                text=body + "\n\n[Note: Attachments could not be sent, please check the data files manually]"
            )
            print("✅ Email sent (without attachments)")
        except Exception as e2:
            print(f"❌ Failed completely: {e2}")

if __name__ == "__main__":
    send_report()
