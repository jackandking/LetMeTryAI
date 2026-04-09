#!/usr/bin/env python3
"""Send video file via email with attachment"""

import os
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import subprocess

# Configuration
TO_EMAIL = "weiping@letmetryai.cn"
FROM_EMAIL = "harness@letmetryai.cn"
VIDEO_PATH = ".local/video-email/page@5ea651feb260f21bd2ceb3c1de70ebbe.webm"

# App info
APP_NAME = "坦克系统对比"
APP_URL = "https://letmetryai.cn/tank-systems-compare/"

def send_email_with_attachment():
    # Get file size
    file_size = os.path.getsize(VIDEO_PATH)
    file_size_mb = file_size / 1024 / 1024
    filename = os.path.basename(VIDEO_PATH)
    
    # Create message
    msg = MIMEMultipart()
    msg['From'] = FROM_EMAIL
    msg['To'] = TO_EMAIL
    msg['Subject'] = f"🎬 视频生成完成 - {APP_NAME}"
    
    # HTML body
    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
    .header {{ background: #4CAF50; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }}
    .content {{ background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }}
    .info-box {{ background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #4CAF50; border-radius: 4px; }}
    .label {{ font-weight: bold; color: #666; display: inline-block; width: 100px; }}
    .value {{ color: #333; }}
    .file-info {{ background: #e3f2fd; padding: 10px; border-radius: 4px; margin-top: 10px; }}
    .footer {{ margin-top: 20px; font-size: 12px; color: #999; text-align: center; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>🎬 视频生成完成</h2>
    </div>
    <div class="content">
      <p>您好！短视频已成功生成。</p>
      
      <div class="info-box">
        <p><span class="label">📱 应用名称:</span> <span class="value">{APP_NAME}</span></p>
        <p><span class="label">🔗 应用链接:</span> <a href="{APP_URL}">{APP_URL}</a></p>
      </div>
      
      <div class="info-box">
        <p><span class="label">📹 视频文件:</span> <span class="value">{filename}</span></p>
        <p><span class="label">📊 文件大小:</span> <span class="value">{file_size_mb:.2f} MB</span></p>
        <div class="file-info">
          <p style="margin: 0; font-size: 12px; color: #666;">
            视频文件已作为附件发送，请查收。<br>
            格式: WebM (可用 Chrome/VLC 播放)
          </p>
        </div>
      </div>
      
      <p style="margin-top: 20px; padding: 10px; background: #fff3cd; border-radius: 4px; font-size: 13px;">
        💡 <strong>提示:</strong> 如果附件无法播放，可以尝试用 Chrome 浏览器打开，或使用 VLC 播放器。
      </p>
      
      <div class="footer">
        <p>---<br>
        LetMeTryAI Harness 自动生成<br>
        时间: {os.popen('date "+%Y-%m-%d %H:%M:%S"').read().strip()}</p>
      </div>
    </div>
  </div>
</body>
</html>"""
    
    # Attach HTML body
    msg.attach(MIMEText(html_body, 'html', 'utf-8'))
    
    # Attach video file
    print(f"正在添加附件: {filename} ({file_size_mb:.2f} MB)...")
    
    with open(VIDEO_PATH, 'rb') as f:
        attachment = MIMEBase('application', 'octet-stream')
        attachment.set_payload(f.read())
    
    encoders.encode_base64(attachment)
    attachment.add_header(
        'Content-Disposition',
        f'attachment; filename="{filename}"'
    )
    msg.attach(attachment)
    
    # Send email using sendmail
    print(f"正在发送邮件到: {TO_EMAIL}...")
    
    try:
        result = subprocess.run(
            ['/usr/sbin/sendmail', '-t'],
            input=msg.as_bytes(),
            capture_output=True,
            timeout=30
        )
        
        if result.returncode == 0:
            print("✅ 邮件发送成功!")
            print(f"   收件人: {TO_EMAIL}")
            print(f"   主题: 🎬 视频生成完成 - {APP_NAME}")
            print(f"   附件: {filename} ({file_size_mb:.2f} MB)")
            return True
        else:
            print(f"❌ 邮件发送失败: {result.stderr.decode()}")
            return False
            
    except Exception as e:
        print(f"❌ 发送错误: {e}")
        return False

if __name__ == '__main__':
    if not os.path.exists(VIDEO_PATH):
        print(f"❌ 视频文件不存在: {VIDEO_PATH}")
        sys.exit(1)
    
    success = send_email_with_attachment()
    sys.exit(0 if success else 1)
