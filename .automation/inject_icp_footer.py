#!/usr/bin/env python3
"""向所有 HTML 页面注入 ICP 备案号页脚（幂等：已含 备案号 的文件跳过）。"""
import os, re, sys

ROOT = os.path.expanduser("~/LetMeTryAI")
SKIP_DIRS = {".git", ".automation", "node_modules"}
MARKER = "京ICP备2024092319号-1"
FOOTER = (
    '<div style="text-align:center;font-size:12px;color:#999;'
    'padding:8px 0 16px;">'
    f'<a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener" '
    f'style="color:#999;text-decoration:none;">{MARKER}</a>'
    "</div>\n"
)

modified, skipped, already = 0, 0, 0
for dirpath, dirnames, filenames in os.walk(ROOT):
    dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
    for fn in filenames:
        if not fn.lower().endswith(".html"):
            continue
        path = os.path.join(dirpath, fn)
        try:
            with open(path, encoding="utf-8", errors="replace") as f:
                html = f.read()
        except OSError as e:
            print(f"SKIP(read err) {path}: {e}")
            skipped += 1
            continue
        if MARKER in html:
            already += 1
            continue
        # 插入点：优先 </body>，其次 </html>，都没有则追加到末尾
        low = html.lower()
        if "</body>" in low:
            idx = low.rindex("</body>")
            new = html[:idx] + FOOTER + html[idx:]
        elif "</html>" in low:
            idx = low.rindex("</html>")
            new = html[:idx] + FOOTER + html[idx:]
        else:
            new = html + FOOTER
        try:
            with open(path, "w", encoding="utf-8") as f:
                f.write(new)
            modified += 1
        except OSError as e:
            print(f"SKIP(write err) {path}: {e}")
            skipped += 1

print(f"modified={modified} already_has={already} skipped={skipped}")
