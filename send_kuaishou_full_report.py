#!/usr/bin/env python3
"""
Send complete Kuaishou task statistics report (merged from batch1 and batch2)
"""

import os
import json
import agentmail

# Configuration
API_KEY = os.environ.get("AGENTMAIL_API_KEY") or "am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4"
TO_EMAIL = "jackandking@163.com"
OUTPUT_DIR = "metrics/kuaishou"

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

    # Read and merge data files
    all_tasks = []
    batch_info = []
    
    for batch_file in ['task_stats.json', 'task_stats_batch2.json']:
        filepath = os.path.join(OUTPUT_DIR, batch_file)
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    tasks = data.get('tasks', [])
                    all_tasks.extend(tasks)
                    batch_info.append(f"{batch_file}: {len(tasks)} tasks")
                    print(f"Loaded {len(tasks)} tasks from {batch_file}")
            except Exception as e:
                print(f"Warning: Could not read {batch_file}: {e}")
    
    if not all_tasks:
        print("No data found!")
        return
    
    print(f"\nTotal tasks: {len(all_tasks)}")
    
    # Build email body
    total_tasks = len(all_tasks)
    
    # Calculate summary
    tasks_with_data = [t for t in all_tasks if t['stats'].get('组件曝光数')]
    total_exposure = sum(int(t['stats']['组件曝光数'].replace(',', '')) for t in tasks_with_data if t['stats']['组件曝光数'] and t['stats']['组件曝光数'] != '--')
    total_clicks = sum(int(t['stats']['组件点击数']) for t in all_tasks if t['stats'].get('组件点击数') and t['stats']['组件点击数'] != '--')
    total_daren = sum(int(t['stats']['已履单达人数量']) for t in all_tasks if t['stats'].get('已履单达人数量') and t['stats']['已履单达人数量'] != '--')
    total_works = sum(int(t['stats']['已发布作品数']) for t in all_tasks if t['stats'].get('已发布作品数') and t['stats']['已发布作品数'] != '--')
    
    body = f"""Hi,

快手星火计划任务统计数据完整报告（合并两批数据）

📊 统计摘要
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 总任务数: {total_tasks} 个
• 有数据的任务: {len(tasks_with_data)} 个
• 总曝光数: {total_exposure:,}
• 总点击数: {total_clicks:,}
• 总达人数量: {total_daren:,}
• 总作品数量: {total_works:,}

📦 数据来源
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for info in batch_info:
        body += f"• {info}\n"
    
    body += """

📈 任务详情
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for i, task in enumerate(all_tasks, 1):
        stats = task['stats']
        exposure = stats.get('组件曝光数') or 'N/A'
        clicks = stats.get('组件点击数') or 'N/A'
        daren = stats.get('已履单达人数量') or 'N/A'
        works = stats.get('已发布作品数') or 'N/A'
        
        body += f"""
【{i}. {task['taskName']}】
  状态: {task['status']} | {task['timeRange']}
  曝光: {exposure} | 点击: {clicks} | 达人: {daren} | 作品: {works}
"""
    
    body += """

📁 附件说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• task_stats_batch1.csv - 第 1-10 个任务数据
• task_stats_batch2.csv - 第 11-20 个任务数据
• 每个任务都有对应的截图保存在 metrics/kuaishou/ 目录

数据抓取时间:
"""
    
    # Add fetch times from files
    for batch_file in ['task_stats.json', 'task_stats_batch2.json']:
        filepath = os.path.join(OUTPUT_DIR, batch_file)
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r') as f:
                    data = json.load(f)
                    fetch_time = data.get('fetchTime', 'N/A')
                    body += f"• {batch_file}: {fetch_time}\n"
            except:
                pass
    
    body += """

Best regards,
Kuaishou Data Scraper
"""

    # Prepare attachments
    attachments = []
    
    for filename in ['task_stats.csv', 'task_stats_batch2.csv']:
        filepath = os.path.join(OUTPUT_DIR, filename)
        if os.path.exists(filepath):
            try:
                with open(filepath, 'rb') as f:
                    data = f.read()
                attachments.append({
                    'filename': filename,
                    'content': data,
                    'content_type': 'text/csv'
                })
                print(f"Attached: {filename}")
            except Exception as e:
                print(f"Warning: Could not attach {filename}: {e}")

    print(f"\nSending email to {TO_EMAIL}...")
    
    try:
        message = client.inboxes.messages.send(
            inbox_id=inbox_id,
            to=[TO_EMAIL],
            subject=f"[快手完整数据报告] 星火计划任务统计 - 全部 {total_tasks} 个任务",
            text=body,
            attachments=attachments if attachments else None
        )
        print("✅ Email sent successfully!")
        print(f"Message ID: {getattr(message, 'message_id', 'N/A')}")
    except Exception as e:
        print(f"❌ Failed to send email: {e}")
        # Fallback
        try:
            print("Trying to send without attachments...")
            client.inboxes.messages.send(
                inbox_id=inbox_id,
                to=[TO_EMAIL],
                subject=f"[快手完整数据报告] 星火计划任务统计 - 全部 {total_tasks} 个任务",
                text=body + "\n\n[Note: Attachments could not be sent]"
            )
            print("✅ Email sent (without attachments)")
        except Exception as e2:
            print(f"❌ Failed completely: {e2}")

if __name__ == "__main__":
    send_report()
