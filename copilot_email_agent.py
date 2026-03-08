import time
import subprocess
import os
import sys
import agentmail
import re

# Configuration
API_KEY = os.environ.get("AGENTMAIL_API_KEY") or "am_us_8ad8e7f3b27ce401a22901ee8ab1108e290efe027f80b66b0ab434f6f9b2b5b4"
ALLOWED_SENDER = "jackandking@163.com"
PROCESSED_FILE = "processed_ids.txt"
POLL_INTERVAL = 30  # seconds

def load_processed_ids():
    if not os.path.exists(PROCESSED_FILE):
        return set()
    with open(PROCESSED_FILE, 'r') as f:
        return set(line.strip() for line in f)

def save_processed_id(msg_id):
    with open(PROCESSED_FILE, 'a') as f:
        f.write(f"{msg_id}\n")

def is_safe_command(command):
    # Basic safety check
    forbidden = ["rm -rf", ":(){ :|:& };:", "dd if=/dev/zero", "mkfs"]
    for bad in forbidden:
        if bad in command:
            return False
    return True

def interpret_command(nl_command):
    """
    Simple heuristic to interpret natural language commands.
    In a real 'Copilot' scenario, this would call an LLM.
    Here we map common phrases to shell commands.
    """
    nl_command = nl_command.lower()
    
    if "list files" in nl_command or "show files" in nl_command:
        return "ls -la"
    if "who am i" in nl_command or "current user" in nl_command:
        return "whoami"
    if "disk usage" in nl_command or "free space" in nl_command:
        return "df -h"
    if "memory" in nl_command or "ram" in nl_command:
        if sys.platform == "darwin":
            return "vm_stat" # Mac
        return "free -h" # Linux
    if "network" in nl_command or "ip address" in nl_command:
        return "ifconfig"
    if "processes" in nl_command or "top" in nl_command:
        return "ps aux | head -n 10"
    if "uptime" in nl_command:
        return "uptime"
        
    # Default: assume it IS a shell command if not matched
    return nl_command

def execute_command(command):
    """Executes a shell command and returns the output."""
    # First, interpret potential NL
    cmd_to_run = interpret_command(command)
    
    if not is_safe_command(cmd_to_run):
        return f"Command rejected for safety reasons: {cmd_to_run}"

    print(f"Executing: {cmd_to_run}")
    try:
        result = subprocess.run(
            cmd_to_run, 
            shell=True, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        output = result.stdout
        if result.stderr:
            output += "\n[STDERR]\n" + result.stderr
        return output
    except Exception as e:
        return f"Error executing command: {str(e)}"

def run_agent():
    print(f"Copilot Email Agent started.")
    print(f"Monitoring inbox for: {ALLOWED_SENDER}")
    print(f"Poll Interval: {POLL_INTERVAL}s")
    
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

        # Find 'letmetry' inbox
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

    processed_ids = load_processed_ids()

    try:
        while True:
            try:
                # print(f"Checking for emails...")
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
                        
                    # Check Sender
                    sender = "unknown"
                    if hasattr(msg, 'from_'):
                        sender = msg.from_
                    elif hasattr(msg, 'from_email'):
                        sender = msg.from_email
                    elif hasattr(msg, 'sender'):
                         sender = msg.sender
                    
                    # Clean sender
                    if "<" in sender:
                         sender_email = sender.split("<")[1].split(">")[0]
                    else:
                         sender_email = sender
                         
                    if ALLOWED_SENDER not in sender_email:
                         processed_ids.add(msg_id)
                         save_processed_id(msg_id)
                         continue
                         
                    print(f"\n[NEW] Message from {sender} (ID: {msg_id})")
                    
                    # Get Content
                    full_msg = client.inboxes.messages.get(inbox_id=inbox_id, message_id=msg_id)
                    body = getattr(full_msg, 'text', '')
                    subject = getattr(full_msg, 'subject', '(No Subject)')
                    
                    # Extract Command
                    command = body.strip()
                    if "Original Message" in command:
                         command = command.split("Original Message")[0].strip()
                    if "--------" in command:
                         command = command.split("--------")[0].strip()
                    
                    # Heuristic for reply block
                    lines = command.split('\n')
                    clean_lines = []
                    for line in lines:
                        if line.strip().startswith('>') or line.strip().startswith('On ') and line.strip().endswith('wrote:'):
                            break
                        clean_lines.append(line)
                    command = '\n'.join(clean_lines).strip()

                    print(f"Command/Request: {command}")
                    
                    # Execute
                    if "How can I" in command or "如何" in command:
                         reply_text = "Copilot is ready. Send me a task like 'List files' or 'Check uptime'."
                    else:
                         print("Processing task...")
                         output = execute_command(command)
                         reply_text = f"Task Execution Result:\n\n{output}"
                         
                    # Reply
                    print(f"Replying to {ALLOWED_SENDER}...")
                    client.inboxes.messages.send(
                        inbox_id=inbox_id,
                        to=[ALLOWED_SENDER],
                        subject=f"Re: {subject}",
                        text=reply_text
                    )
                    print("Reply sent.")
                    
                    processed_ids.add(msg_id)
                    save_processed_id(msg_id)
                    new_commands_found = True
                    
                if not new_commands_found:
                    # print(".", end="", flush=True)
                    pass
                    
            except Exception as e:
                print(f"Loop error: {e}")
                import traceback
                traceback.print_exc()
                
            time.sleep(POLL_INTERVAL)
            
    except KeyboardInterrupt:
        print("\nStopping Copilot Email Agent.")

if __name__ == "__main__":
    run_agent()
