#!/usr/bin/env python3
import mimetypes
import os
import shutil
import subprocess
import sys
from email.message import EmailMessage


DEFAULT_FROM_EMAIL = os.environ.get("SEND_EMAIL_FROM", "harness@letmetryai.cn")
DEFAULT_SENDMAIL_PATH = os.environ.get("SENDMAIL_PATH", "/usr/sbin/sendmail")


def send_email(subject, to_email, body_file, attachment_path=None):
    with open(body_file, "r", encoding="utf-8") as file_handle:
        body = file_handle.read()

    sendmail_path = shutil.which(DEFAULT_SENDMAIL_PATH) or DEFAULT_SENDMAIL_PATH
    if not os.path.isfile(sendmail_path) or not os.access(sendmail_path, os.X_OK):
        print(f"sendmail is not executable at {sendmail_path}", file=sys.stderr)
        return 1

    message = EmailMessage()
    message["To"] = to_email
    message["From"] = DEFAULT_FROM_EMAIL
    message["Subject"] = subject
    message.set_content(body, subtype="plain", charset="utf-8")

    if attachment_path:
        with open(attachment_path, "rb") as attachment_file:
            attachment_bytes = attachment_file.read()

        mime_type, _ = mimetypes.guess_type(attachment_path)
        if mime_type:
            maintype, subtype = mime_type.split("/", 1)
        else:
            maintype, subtype = "application", "octet-stream"

        message.add_attachment(
            attachment_bytes,
            maintype=maintype,
            subtype=subtype,
            filename=os.path.basename(attachment_path)
        )

    subprocess.run(
        [sendmail_path, "-t", "-oi"],
        input=message.as_bytes(),
        check=True,
        timeout=30,
        capture_output=True
    )
    print("Email sent.")
    return 0


def main(argv):
    if len(argv) not in (3, 4):
        print(
            "Usage: python3 send-daily-report.py <subject> <to_email> <body_file> [attachment]",
            file=sys.stderr
        )
        return 1

    attachment = argv[3] if len(argv) == 4 else None
    return send_email(argv[0], argv[1], argv[2], attachment)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
