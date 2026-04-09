#!/usr/bin/env python3
"""Create a title image for video background"""

import sys
from PIL import Image, ImageDraw, ImageFont

def create_title_image(title, subtitle, output_path, size=(1080, 1920)):
    """Create a vertical title card image"""
    
    # Create gradient background
    img = Image.new('RGB', size, color='#1a1a2e')
    draw = ImageDraw.Draw(img)
    
    # Try to use a nice font, fallback to default
    try:
        title_font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 80)
        subtitle_font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 48)
        small_font = ImageFont.truetype("/System/Library/Fonts/PingFang.ttc", 36)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        small_font = ImageFont.load_default()
    
    # Draw gradient effect (simple)
    for y in range(size[1]):
        r = int(26 + (y / size[1]) * 20)
        g = int(26 + (y / size[1]) * 30)
        b = int(46 + (y / size[1]) * 40)
        draw.line([(0, y), (size[0], y)], fill=(r, g, b))
    
    # Draw decorative elements
    # Top circle
    draw.ellipse([(-100, -100), (300, 300)], fill='#e94560', outline='')
    # Bottom circle
    draw.ellipse([(size[0]-200, size[1]-200), (size[0]+100, size[1]+100)], fill='#0f3460', outline='')
    
    # Draw title
    # Wrap text if too long
    words = title
    bbox = draw.textbbox((0, 0), words, font=title_font)
    text_width = bbox[2] - bbox[0]
    
    x = (size[0] - text_width) // 2
    y = 600
    
    # Draw text shadow
    draw.text((x+3, y+3), words, font=title_font, fill='#000000')
    # Draw main text
    draw.text((x, y), words, font=title_font, fill='#ffffff')
    
    # Draw subtitle
    bbox2 = draw.textbbox((0, 0), subtitle, font=subtitle_font)
    subtitle_width = bbox2[2] - bbox2[0]
    x2 = (size[0] - subtitle_width) // 2
    y2 = y + 120
    
    draw.text((x2, y2), subtitle, font=subtitle_font, fill='#e94560')
    
    # Draw bottom text
    bottom_text = "参与投票 · 说出你的选择"
    bbox3 = draw.textbbox((0, 0), bottom_text, font=small_font)
    bottom_width = bbox3[2] - bbox3[0]
    x3 = (size[0] - bottom_width) // 2
    y3 = size[1] - 300
    
    draw.text((x3, y3), bottom_text, font=small_font, fill='#aaaaaa')
    
    # Draw vote icon (simple)
    icon_y = 400
    # Draw a simple checkmark in a circle
    circle_x = size[0] // 2
    draw.ellipse([(circle_x-60, icon_y-60), (circle_x+60, icon_y+60)], 
                 outline='#e94560', width=8)
    # Checkmark
    draw.line([(circle_x-25, icon_y), (circle_x-5, icon_y+20), (circle_x+25, icon_y-20)], 
              fill='#e94560', width=8)
    
    # Save
    img.save(output_path, quality=95)
    print(f"Created: {output_path}")
    return output_path

if __name__ == '__main__':
    if len(sys.argv) < 4:
        print("Usage: python create-title-image.py 'Title' 'Subtitle' output.jpg")
        sys.exit(1)
    
    create_title_image(sys.argv[1], sys.argv[2], sys.argv[3])
