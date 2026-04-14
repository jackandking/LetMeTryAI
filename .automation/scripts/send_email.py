import os
import shutil
import subprocess
import sys
from email.message import EmailMessage
from email.mime.application import MIMEApplication


API_KEY = os.environ.get("AGENTMAIL_API_KEY") or "am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4"
DEFAULT_FROM_EMAIL = os.environ.get("SEND_EMAIL_FROM", "daily-report@letmetryai.cn")
DEFAULT_SENDMAIL_PATH = os.environ.get("SENDMAIL_PATH", "/usr/sbin/sendmail")


def should_force_success(flag_name):
    return os.environ.get(flag_name, "").lower() in {"1", "true", "yes"}


def get_forced_error(flag_name):
    message = os.environ.get(flag_name, "").strip()
    return message or None


def send_via_agentmail(subject, to_email, body):
    forced_error = get_forced_error("SEND_EMAIL_FORCE_AGENTMAIL_ERROR")
    if forced_error:
        raise RuntimeError(forced_error)

    if should_force_success("SEND_EMAIL_FORCE_AGENTMAIL_SUCCESS"):
        print("Using Inbox: forced-test-inbox")
        print(f"Sending email to {to_email} with subject '{subject}'...")
        print("Email sent successfully.")
        return

    import agentmail

    client = agentmail.AgentMail(api_key=API_KEY)

    inboxes_resp = client.inboxes.list()
    if hasattr(inboxes_resp, "inboxes"):
        inboxes = inboxes_resp.inboxes
    elif hasattr(inboxes_resp, "data"):
        inboxes = inboxes_resp.data
    else:
        inboxes = inboxes_resp

    if not inboxes:
        raise RuntimeError("No inbox found.")

    target_inbox = inboxes[0]
    for inbox in inboxes:
        inbox_id = getattr(inbox, "inbox_id", getattr(inbox, "id", ""))
        if "letmetry" in inbox_id:
            target_inbox = inbox
            break

    resolved_inbox_id = getattr(target_inbox, "inbox_id", getattr(target_inbox, "id", None))
    print(f"Using Inbox: {resolved_inbox_id}")
    print(f"Sending email to {to_email} with subject '{subject}'...")
    client.inboxes.messages.send(
        inbox_id=resolved_inbox_id,
        to=[to_email],
        subject=subject,
        text=body
    )
    print("Email sent successfully.")


def send_via_system_mail(subject, to_email, body, attachments=None):
    forced_error = get_forced_error("SEND_EMAIL_FORCE_SENDMAIL_ERROR")
    if forced_error:
        raise RuntimeError(forced_error)

    if should_force_success("SEND_EMAIL_FORCE_SENDMAIL_SUCCESS"):
        print("Email sent via system mail.")
        return

    sendmail_path = shutil.which(DEFAULT_SENDMAIL_PATH) or DEFAULT_SENDMAIL_PATH
    if not os.path.isfile(sendmail_path) or not os.access(sendmail_path, os.X_OK):
        raise RuntimeError(f"sendmail is not executable at {sendmail_path}")

    message = EmailMessage()
    message["To"] = to_email
    message["From"] = DEFAULT_FROM_EMAIL
    message["Subject"] = subject
    message.set_content(body, subtype="plain", charset="utf-8")

    attachments = attachments or []
    for file_path in attachments:
        if os.path.isfile(file_path):
            with open(file_path, "rb") as f:
                file_data = f.read()
            file_name = os.path.basename(file_path)
            message.add_attachment(file_data, maintype="application", subtype="octet-stream", filename=file_name)

    subprocess.run([sendmail_path, to_email], input=message.as_bytes(), check=True)
    print("Email sent via system mail.")


def send_email(subject, to_email, body_file, attachments=None):
    try:
        with open(body_file, "r", encoding="utf-8") as file_handle:
            body = file_handle.read()
    except OSError as error:
        print(f"Failed to read email body: {error}", file=sys.stderr)
        return 1

    print("Trying AgentMail...")
    try:
        send_via_agentmail(subject, to_email, body)
        return 0
    except Exception as agentmail_error:
        print(f"AgentMail failed: {agentmail_error}", file=sys.stderr)

    print("Trying system mail command...")
    try:
        send_via_system_mail(subject, to_email, body, attachments)
        return 0
    except Exception as sendmail_error:
        print(f"System mail also failed: {sendmail_error}", file=sys.stderr)
        return 1


def main(argv):
    attachments = []
    parsed_args = []
    skip = False
    for i, arg in enumerate(argv):
        if skip:
            skip = False
            continue
        if arg in ("-a", "--attach"):
            if i + 1 < len(argv):
                attachments.append(argv[i + 1])
                skip = True
            else:
                print("Usage: python3 send_email.py [-a ATTACHMENT]... <subject> <to_email> <body_file>", file=sys.stderr)
                return 1
        else:
            parsed_args.append(arg)

    if len(parsed_args) < 3:
        print("Usage: python3 send_email.py [-a ATTACHMENT]... <subject> <to_email> <body_file>", file=sys.stderr)
        return 1

    return send_email(parsed_args[0], parsed_args[1], parsed_args[2], attachments)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
