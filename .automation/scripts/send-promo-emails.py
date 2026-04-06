#!/usr/bin/env python3
"""Send promo videos with Kuaishou publishing metadata via email."""

import smtplib
import os
import sys
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders

TO_EMAIL = "jackandking@163.com"
# Use 163 SMTP - sender must match
FROM_EMAIL = os.environ.get("SMTP_FROM", "jackandking@163.com")
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.163.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_PASS = os.environ.get("SMTP_PASS", "")

APPS = [
    {
        "id": "guochan-yueyeche-yingke-duijue",
        "profile": "nanrenbao (人人爱男人宝)",
        "ks_title": "国产越野车硬核对决",
        "ks_desc": "坦克300、坦克500、哈弗H9、北京BJ40，谁才是国产越野之王？快来投票！",
        "ks_tags": "#国产越野车 #坦克300 #坦克500 #哈弗H9 #BJ40 #越野对决 #硬核测评 #男人的玩具",
        "url": "https://letmetryai.cn/guochan-yueyeche-yingke-duijue/",
        "options": "坦克300·短轴硬派改装版 / 坦克500·旗舰越野SUV / 哈弗H9·传统硬派底盘派 / 北京BJ40·越野改装潜力王",
    },
    {
        "id": "90hou-tongnian-lingshi-paihang",
        "profile": "nanrenbao (人人爱男人宝)",
        "ks_title": "90后童年零食排行",
        "ks_desc": "白兔奶糖、旺仔小馒头、跳跳糖、辣条...哪款让你瞬间回到童年？投出你的回忆！",
        "ks_tags": "#90后 #童年零食 #白兔奶糖 #旺仔小馒头 #跳跳糖 #辣条 #回忆杀 #童年记忆",
        "url": "https://letmetryai.cn/90hou-tongnian-lingshi-paihang/",
        "options": "白兔奶糖 / 旺仔小馒头 / 跳跳糖 / 辣条",
    },
    {
        "id": "summer-sunscreen-ranking",
        "profile": "womanai (人人爱女人宝)",
        "ks_title": "夏季防晒霜排行",
        "ks_desc": "轻薄凝露、高保湿乳霜、物理矿物、防水运动型，哪款最适合你的夏日场景？",
        "ks_tags": "#防晒霜 #夏季护肤 #防晒推荐 #油皮防晒 #敏感肌 #防水防晒 #护肤排行 #女生必看",
        "url": "https://letmetryai.cn/summer-sunscreen-ranking/",
        "options": "轻薄凝露型 / 高保湿乳霜型 / 物理矿物温和型 / 防水运动型",
    },
    {
        "id": "grandchild-activities-pick",
        "profile": "elder-love (老人爱)",
        "ks_title": "和孙辈在一起你最喜欢做什么",
        "ks_desc": "讲故事、做手工、散步郊游、教做菜...和孙辈在一起，你最享受哪种时光？",
        "ks_tags": "#隔代亲 #爷爷奶奶 #亲子活动 #陪伴孙辈 #温馨时光 #家庭生活 #老年生活 #天伦之乐",
        "url": "https://letmetryai.cn/grandchild-activities-pick/",
        "options": "讲故事读书 / 一起做手工 / 公园散步郊游 / 教做家常菜",
    },
]

VIDEO_BASE = os.path.join(os.path.dirname(__file__), "..", ".local", "tmp", "video")


def build_html_body(app):
    return f"""
<div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
<h2 style="color: #333;">快手发布信息 — {app['ks_title']}</h2>

<table style="width:100%; border-collapse:collapse; margin: 16px 0;">
<tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold; width:100px;">品牌</td><td style="padding:8px;">{app['profile']}</td></tr>
<tr><td style="padding:8px; font-weight:bold;">视频标题</td><td style="padding:8px; color:#e74c3c; font-size:16px;"><b>{app['ks_title']}</b></td></tr>
<tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold;">视频描述</td><td style="padding:8px;">{app['ks_desc']}</td></tr>
<tr><td style="padding:8px; font-weight:bold;">标签</td><td style="padding:8px; color:#3498db;">{app['ks_tags']}</td></tr>
<tr style="background:#f5f5f5;"><td style="padding:8px; font-weight:bold;">投票选项</td><td style="padding:8px;">{app['options']}</td></tr>
<tr><td style="padding:8px; font-weight:bold;">投票链接</td><td style="padding:8px;"><a href="{app['url']}">{app['url']}</a></td></tr>
</table>

<p style="color:#888; font-size:12px;">视频已作为附件，可直接上传到快手。</p>
</div>
"""


def send_one(app):
    video_path = os.path.join(VIDEO_BASE, app["id"], "promo.mp4")
    if not os.path.exists(video_path):
        print(f"  SKIP {app['id']}: video not found at {video_path}")
        return False

    msg = MIMEMultipart()
    msg["From"] = FROM_EMAIL
    msg["To"] = TO_EMAIL
    msg["Subject"] = f"[快手视频素材] {app['ks_title']} — 标题标签已备好"

    msg.attach(MIMEText(build_html_body(app), "html", "utf-8"))

    # Attach video
    with open(video_path, "rb") as f:
        part = MIMEBase("video", "mp4")
        part.set_payload(f.read())
        encoders.encode_base64(part)
        part.add_header("Content-Disposition", "attachment", filename=f"{app['ks_title']}.mp4")
        msg.attach(part)

    use_sendmail = os.environ.get("USE_SENDMAIL", "").lower() in ("1", "true", "yes")

    if use_sendmail or not SMTP_PASS:
        # Use local sendmail (macOS Postfix)
        import subprocess
        proc = subprocess.run(
            ["/usr/sbin/sendmail", "-t", "-oi"],
            input=msg.as_bytes(),
            capture_output=True,
        )
        if proc.returncode == 0:
            print(f"  Sent via sendmail: {app['ks_title']} -> {TO_EMAIL}")
        else:
            print(f"  sendmail failed (rc={proc.returncode}): {proc.stderr.decode()}")
            # Fallback: save .eml
            eml_path = os.path.join(VIDEO_BASE, app["id"], "email.eml")
            with open(eml_path, "wb") as f:
                f.write(msg.as_bytes())
            print(f"  Saved .eml fallback to {eml_path}")
        return True

    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(FROM_EMAIL, SMTP_PASS)
        server.sendmail(FROM_EMAIL, TO_EMAIL, msg.as_string())

    print(f"  Sent via SMTP: {app['ks_title']} -> {TO_EMAIL}")
    return True


def main():
    print(f"Sending {len(APPS)} promo videos to {TO_EMAIL}")
    print(f"SMTP: {SMTP_HOST}:{SMTP_PORT} from {FROM_EMAIL}")
    print()

    ok = 0
    for app in APPS:
        print(f"[{app['id']}]")
        if send_one(app):
            ok += 1
    print(f"\nDone: {ok}/{len(APPS)} sent.")


if __name__ == "__main__":
    main()
