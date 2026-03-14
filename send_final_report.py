#!/usr/bin/env python3
"""Send final report with all 36 tasks statistics"""

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
    with open('metrics/kuaishou/all_36_stats.json', 'r') as f:
        data = json.load(f)
    
    tasks = data['tasks']
    
    # Calculate stats
    tasks_with_data = [t for t in tasks if any(v for v in t['stats'].values() if v and v != '--')]
    total_exposure = sum(int(t['stats']['组件曝光数'].replace(',', '')) for t in tasks if t['stats'].get('组件曝光数') and t['stats']['组件曝光数'] != '--')
    total_clicks = sum(int(t['stats']['组件点击数']) for t in tasks if t['stats'].get('组件点击数') and t['stats']['组件点击数'] != '--')
    total_daren = sum(int(t['stats']['已履单达人数量']) for t in tasks if t['stats'].get('已履单达人数量') and t['stats']['已履单达人数量'] != '--')
    total_works = sum(int(t['stats']['已发布作品数']) for t in tasks if t['stats'].get('已发布作品数') and t['stats']['已发布作品数'] != '--')
    
    # TOP performers
    sorted_by_exp = sorted([t for t in tasks if t['stats'].get('组件曝光数') and t['stats']['组件曝光数'] != '--'], 
                           key=lambda x: int(x['stats']['组件曝光数'].replace(',', '')), reverse=True)[:10]
    
    sorted_by_daren = sorted([t for t in tasks if t['stats'].get('已履单达人数量') and t['stats']['已履单达人数量'] != '--'],
                             key=lambda x: int(x['stats']['已履单达人数量']), reverse=True)[:10]
    
    # Build email
    body = f"""Hi,

🎉 快手星火计划完整数据报告（全部36个任务）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 总体统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 总任务数: {len(tasks)} 个
• 有数据任务: {len(tasks_with_data)} 个
• 总曝光数: {total_exposure:,}
• 总点击数: {total_clicks:,}
• 总达人数量: {total_daren:,}
• 总作品数量: {total_works:,}
• 整体点击率: {(total_clicks/total_exposure*100):.2f}%

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 TOP 10 曝光任务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for i, t in enumerate(sorted_by_exp, 1):
        stats = t['stats']
        exp = stats.get('组件曝光数', 'N/A')
        click = stats.get('组件点击数', 'N/A')
        daren = stats.get('已履单达人数量', 'N/A')
        works = stats.get('已发布作品数', 'N/A')
        body += f"{i:2}. [{t['planId']}] {t['taskName']}\n    曝光:{exp} 点击:{click} 达人:{daren} 作品:{works}\n\n"
    
    body += """━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 TOP 10 达人参与任务
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for i, t in enumerate(sorted_by_daren, 1):
        stats = t['stats']
        daren = stats.get('已履单达人数量', 'N/A')
        works = stats.get('已发布作品数', 'N/A')
        exp = stats.get('组件曝光数', 'N/A')
        body += f"{i:2}. [{t['planId']}] {t['taskName']}\n    达人:{daren} 作品:{works} 曝光:{exp}\n\n"
    
    body += f"""━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 完整任务列表
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    
    for t in tasks:
        stats = t['stats']
        exp = stats.get('组件曝光数') or 'N/A'
        click = stats.get('组件点击数') or 'N/A'
        daren = stats.get('已履单达人数量') or 'N/A'
        works = stats.get('已发布作品数') or 'N/A'
        body += f"{t['globalIndex']:2}. [{t['planId']}] {t['taskName']}\n    来源:{t['source']} | 曝光:{exp} 点击:{click} 达人:{daren} 作品:{works}\n\n"
    
    body += f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 附件说明
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• all_36_stats.csv - Excel可打开，含全部36个任务的详细数据
• all_36_stats.json - JSON格式完整数据

抓取时间: {data['fetchTime']}
成功率: {data['successRate']}

数据洞察:
1. "这是什么鱼白条"曝光最高(9888)，钓鱼内容很受欢迎
2. "教老人赚钱"次之(9805)，银发经济潜力巨大
3. "哪个皇帝最牛"达人参与最多(682人)，历史话题吸粉
4. 整体点击率{(total_clicks/total_exposure*100):.2f}%，表现良好

Best regards,
Kuaishou Data Scraper
"""

    # Attachments
    attachments = []
    for filename in ['all_36_stats.csv', 'all_36_stats.json']:
        filepath = f'metrics/kuaishou/{filename}'
        if os.path.exists(filepath):
            with open(filepath, 'rb') as f:
                content_type = 'text/csv' if filename.endswith('.csv') else 'application/json'
                attachments.append({'filename': filename, 'content': f.read(), 'content_type': content_type})

    # Send
    message = client.inboxes.messages.send(
        inbox_id=inbox_id,
        to=[TO_EMAIL],
        subject=f"🎉 [快手完整报告] 全部36个任务统计数据 | 总曝光{total_exposure:,}",
        text=body,
        attachments=attachments
    )
    
    print(f"✅ 邮件已发送!")
    print(f"Message ID: {getattr(message, 'message_id', 'N/A')}")
    print(f"\n📊 报告摘要:")
    print(f"  - 任务数: {len(tasks)}")
    print(f"  - 总曝光: {total_exposure:,}")
    print(f"  - 总点击: {total_clicks:,}")
    print(f"  - 总达人: {total_daren:,}")

if __name__ == "__main__":
    send_report()
