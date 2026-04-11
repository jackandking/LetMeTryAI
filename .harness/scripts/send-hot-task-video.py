#!/usr/bin/env python3
import mimetypes
import os
import shutil
import subprocess
import sys
from email.message import EmailMessage


DEFAULT_FROM_EMAIL = os.environ.get("SEND_EMAIL_FROM", "harness@letmetryai.cn")
DEFAULT_SENDMAIL_PATH = os.environ.get("SENDMAIL_PATH", "/usr/sbin/sendmail")


def send_email(subject, to_email, body_file, attachment_path):
    print(f"Preparing email to {to_email}...", flush=True)
    try:
        with open(body_file, "r", encoding="utf-8") as file_handle:
            body = file_handle.read()
    except OSError as error:
        print(f"Failed to read email body: {error}", file=sys.stderr)
        return 1

    try:
        with open(attachment_path, "rb") as attachment_file:
            attachment_bytes = attachment_file.read()
    except OSError as error:
        print(f"Failed to read attachment: {error}", file=sys.stderr)
        return 1

    sendmail_path = shutil.which(DEFAULT_SENDMAIL_PATH) or DEFAULT_SENDMAIL_PATH
    if not os.path.isfile(sendmail_path) or not os.access(sendmail_path, os.X_OK):
        print(f"sendmail is not executable at {sendmail_path}", file=sys.stderr)
        return 1

    mime_type, _ = mimetypes.guess_type(attachment_path)
    if mime_type:
        maintype, subtype = mime_type.split("/", 1)
    else:
        maintype, subtype = "application", "octet-stream"

    message = EmailMessage()
    message["To"] = to_email
    message["From"] = DEFAULT_FROM_EMAIL
    message["Subject"] = subject
    message.set_content(body, subtype="plain", charset="utf-8")
    message.add_attachment(
        attachment_bytes,
        maintype=maintype,
        subtype=subtype,
        filename=os.path.basename(attachment_path)
    )

    print(f"Sending attachment {os.path.basename(attachment_path)} via sendmail...", flush=True)
    try:
        subprocess.run(
            [sendmail_path, "-t", "-oi"],
            input=message.as_bytes(),
            check=True,
            timeout=30,
            capture_output=True
        )
    except subprocess.TimeoutExpired:
        print("sendmail timed out after 30 seconds", file=sys.stderr)
        return 1

    print("Email sent with attachment.")
    return 0


def main(argv):
    if len(argv) != 4:
        print(
            "Usage: python3 send-hot-task-video.py <subject> <to_email> <body_file> <attachment>",
            file=sys.stderr
        )
        return 1

    return send_email(argv[0], argv[1], argv[2], argv[3])


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
