import time
import subprocess
import os
import sys
import agentmail

# Configuration
API_KEY = os.environ.get("AGENTMAIL_API_KEY") or "am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4"
ALLOWED_SENDER = "jackandking@163.com"
PROCESSED_FILE = "processed_ids.txt"
POLL_INTERVAL = 30 

def load_processed_ids():
    if not os.path.exists(PROCESSED_FILE):
        return set()
    with open(PROCESSED_FILE, 'r') as f:
        return set(line.strip() for line in f)

def save_processed_id(msg_id):
    with open(PROCESSED_FILE, 'a') as f:
        f.write(f"{msg_id}\n")

def execute_shell(command):
    print(f"Executing Shell: {command}")
    try:
        # Basic safety check to prevent accidental destruction
        if "rm -rf /" in command:
            return "Command rejected for safety."
            
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        stdout = result.stdout
        stderr = result.stderr
        output = ""
        if stdout:
            output += f"STDOUT:\n{stdout}\n"
        if stderr:
            output += f"STDERR:\n{stderr}\n"
        if not output:
            output = "(No output)"
        return output
    except Exception as e:
        return f"Execution Error: {e}"

def run_agent():
    print(f"Copilot Email Agent V2 (Power Mode) started.")
    print(f"Monitoring inbox for: {ALLOWED_SENDER}")
    
    try:
        client = agentmail.AgentMail(api_key=API_KEY)
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
        print(f"Using Inbox ID: {inbox_id}")
        
    except Exception as e:
        print(f"Initialization error: {e}")
        return

    processed_ids = load_processed_ids()
    print(f"Loaded {len(processed_ids)} processed messages.")

    try:
        while True:
            try:
                # print("Checking...")
                msgs_resp = client.inboxes.messages.list(inbox_id=inbox_id)
                if hasattr(msgs_resp, 'messages'):
                    messages = msgs_resp.messages
                elif hasattr(msgs_resp, 'data'):
                    messages = msgs_resp.data
                else:
                    messages = msgs_resp
                
                new_commands_found = False
                
                for msg in messages:
                    msg_id = getattr(msg, 'message_id', getattr(msg, 'id', 'unknown'))
                    if msg_id in processed_ids:
                        continue
                        
                    sender = "unknown"
                    if hasattr(msg, 'from_'):
                        sender = msg.from_
                    elif hasattr(msg, 'from_email'):
                        sender = msg.from_email
                    elif hasattr(msg, 'sender'):
                         sender = msg.sender
                    
                    if "<" in sender:
                         sender_email = sender.split("<")[1].split(">")[0]
                    else:
                         sender_email = sender
                         
                    if ALLOWED_SENDER not in sender_email:
                         processed_ids.add(msg_id)
                         save_processed_id(msg_id)
                         continue
                         
                    print(f"\n[NEW] Message from {sender} (ID: {msg_id})")
                    
                    full_msg = client.inboxes.messages.get(inbox_id=inbox_id, message_id=msg_id)
                    body = getattr(full_msg, 'text', '')
                    subject = getattr(full_msg, 'subject', '(No Subject)')
                    
                    command = body.strip()
                    if "Original Message" in command:
                         command = command.split("Original Message")[0].strip()
                    if "--------" in command:
                         command = command.split("--------")[0].strip()
                    
                    lines = command.split('\n')
                    clean_lines = []
                    for line in lines:
                        if line.strip().startswith('>') or (line.strip().startswith('On ') and line.strip().endswith('wrote:')):
                            break
                        clean_lines.append(line)
                    command = '\n'.join(clean_lines).strip()

                    print(f"Request: {command}")
                    
                    if not command:
                        reply_text = "Received empty command."
                    else:
                        print("Executing command...")
                        output = execute_shell(command)
                        reply_text = f"Execution Result:\n\n{output}"
                         
                    print(f"Replying to {ALLOWED_SENDER}...")
                    try:
                        client.inboxes.messages.send(
                            inbox_id=inbox_id,
                            to=[ALLOWED_SENDER],
                            subject=f"Re: {subject}",
                            text=reply_text
                        )
                        print("Reply sent.")
                    except Exception as e:
                        print(f"Error sending reply: {e}")
                    
                    processed_ids.add(msg_id)
                    save_processed_id(msg_id)
                    new_commands_found = True
                    
            except Exception as e:
                print(f"Loop error: {e}")
                time.sleep(5)
                
            time.sleep(POLL_INTERVAL)
            
    except KeyboardInterrupt:
        print("\nStopping Copilot Email Agent V2.")

if __name__ == "__main__":
    run_agent()
