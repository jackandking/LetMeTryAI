import os
import re
import glob
import pandas as pd

OUTPUT_DIR = 'metrics/kuaishou'

def parse_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Extract fields
    plan_id_match = re.search(r'分销计划ID：(\d+)', content)
    plan_id = plan_id_match.group(1) if plan_id_match else 'Unknown'
    
    name_match = re.search(r'资源名称\s+([^\s]+)', content) # Try to match in table
    # Alternatively, use the resource name from the table row
    # The format is: 参与方式 ... 资源名称 ...
    # video ... 794670 ... AI水印公投 ... 63 ...
    
    # Let's try to extract from the lines
    lines = [l.strip() for l in content.split('\n') if l.strip()]
    
    # Basic stats
    exposure = '0'
    clicks = '0'
    works = '0'
    
    try:
        # Find "组件曝光数" and get next line
        if '组件曝光数' in lines:
            idx = lines.index('组件曝光数')
            if idx + 1 < len(lines):
                exposure = lines[idx+1]
        
        if '组件点击数' in lines:
            idx = lines.index('组件点击数')
            if idx + 1 < len(lines):
                clicks = lines[idx+1]
                
        if '已发布作品数' in lines:
            idx = lines.index('已发布作品数')
            if idx + 1 < len(lines):
                works = lines[idx+1]

        # Find resource name in table (usually near end)
        # It appears after the resource ID
        # Heuristic: Find the line with the plan ID or resource ID, then next lines?
        # In the example: 
        # 4981482 (Task ID?)
        # 794670 (Resource ID?)
        # AI水印公投 (Name)
        # 63 (Exposure)
        
        # We can just look for the exposure value in the table part and go back 1 or 2 lines?
        # Or just use the file mapping if we knew it.
        # But let's try to extract from the table row.
        
        # Find the line that equals exposure
        exposure_indices = [i for i, x in enumerate(lines) if x == exposure]
        # The first one is the summary stats. The second one (if present) is the table row.
        if len(exposure_indices) > 1:
            table_row_idx = exposure_indices[1]
            # Name is usually 1 or 2 lines before exposure in the table layout depending on newlines
            # In the dump:
            # Resource ID
            # Name
            # Exposure
            name = lines[table_row_idx - 1]
            if name.isdigit(): # If it's an ID, go back one more
                name = lines[table_row_idx - 2]
        else:
            name = "Unknown"

    except Exception as e:
        print(f"Error parsing {filepath}: {e}")
        name = "Error"

    return {
        'Plan ID': plan_id,
        'Name': name,
        'Exposure': exposure,
        'Clicks': clicks,
        'Works': works,
        'File': os.path.basename(filepath)
    }

files = glob.glob(os.path.join(OUTPUT_DIR, 'plan_data_text_RESCUED_*.txt'))
data = []

for f in files:
    data.append(parse_file(f))

df = pd.DataFrame(data)
# Sort by Plan ID or Name
df = df.sort_values('Plan ID')

print(df.to_markdown(index=False))
df.to_csv(os.path.join(OUTPUT_DIR, 'kuaishou_stats_summary.csv'), index=False)
