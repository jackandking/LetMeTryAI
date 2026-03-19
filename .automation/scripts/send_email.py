import sys
import os
import agentmail

# Configuration
API_KEY = os.environ.get("AGENTMAIL_API_KEY") or "am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4"

def send_email(subject, to_email, body_file):
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

    with open(body_file, 'r') as f:
        body = f.read()

    print(f"Sending email to {to_email} with subject '{subject}'...")
    try:
        client.inboxes.messages.send(
            inbox_id=inbox_id,
            to=[to_email],
            subject=subject,
            text=body
        )
        print("Email sent successfully.")
    except Exception as e:
        print(f"Failed to send email: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Usage: python3 send_email.py <subject> <to_email> <body_file>")
        sys.exit(1)
    
    send_email(sys.argv[1], sys.argv[2], sys.argv[3])
