#!/bin/bash
set -euo pipefail

# make-promo-video.sh — Generate a vertical promo video for a voting app
# Usage: .automation/scripts/make-promo-video.sh <app-url>
# Example: .automation/scripts/make-promo-video.sh https://letmetryai.cn/guochan-yueyeche-yingke-duijue/

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
VIDEO_BASE="$PROJECT_DIR/.automation/.local/tmp/video"

export LC_ALL=en_US.UTF-8

URL="${1:-}"
if [[ -z "$URL" ]]; then
    echo "Usage: $0 <app-url>" >&2
    exit 1
fi

# Extract app ID from URL (strip trailing slash first)
APP_ID="$(echo "$URL" | sed 's|/$||' | awk -F/ '{print $NF}')"
WORK_DIR="$VIDEO_BASE/$APP_ID"
mkdir -p "$WORK_DIR"

echo "=== Promo video: $APP_ID ==="
echo "    URL: $URL"
echo "    Output: $WORK_DIR/"

# ─── Step 1: Mobile screenshot ───
echo "[1/4] Taking mobile screenshot..."
shot-scraper "$URL" \
    --width 375 --height 812 \
    --retina \
    --wait 2000 \
    -o "$WORK_DIR/page.png"
echo "    Screenshot: $WORK_DIR/page.png"

# ─── Step 2: Extract text for voiceover ───
echo "[2/4] Extracting text..."
HTML=$(curl -s "$URL")

TITLE=$(echo "$HTML" | grep -o '<title>[^<]*</title>' | sed 's/<[^>]*>//g' | sed 's/ — .*//')
QUESTION=$(echo "$HTML" | grep -o 'class="question-text">[^<]*<' | sed 's/class="question-text">//;s/<$//' | head -1)
OPTIONS=$(echo "$HTML" | grep -o '<h3 class="option-title">[^<]*</h3>' | sed 's/<[^>]*>//g')

# Build voiceover texts
TITLE_VO="${TITLE}。${QUESTION}"
OPTIONS_VO=$(echo "$OPTIONS" | awk 'NR>1{printf "，"}{printf "%s",$0}END{print ""}')
CTA_VO="快来投票吧！点击链接参与"

echo "    Title: $TITLE"
echo "    Options: $OPTIONS_VO"

# ─── Step 3: Generate voiceover ───
echo "[3/4] Generating voiceover..."
say -v Tingting -r 180 -o "$WORK_DIR/title.aiff" "$TITLE_VO"
say -v Tingting -r 200 -o "$WORK_DIR/options.aiff" "$OPTIONS_VO"
say -v Tingting -r 180 -o "$WORK_DIR/cta.aiff" "$CTA_VO"

# ─── Step 4: Assemble video ───
echo "[4/4] Assembling video..."

# Scale screenshot to 1080x1920 vertical with padding
ffmpeg -y -i "$WORK_DIR/page.png" \
    -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=white" \
    "$WORK_DIR/padded.png" 2>/dev/null

# Create video segments (image + audio)
for seg in title options cta; do
    ffmpeg -y \
        -loop 1 -i "$WORK_DIR/padded.png" \
        -i "$WORK_DIR/${seg}.aiff" \
        -c:v libx264 -tune stillimage -c:a aac -b:a 128k \
        -shortest -pix_fmt yuv420p \
        -movflags +faststart \
        "$WORK_DIR/seg_${seg}.mp4" 2>/dev/null
done

# Concat list
cat > "$WORK_DIR/segments.txt" <<SEGS
file 'seg_title.mp4'
file 'seg_options.mp4'
file 'seg_cta.mp4'
SEGS

# Final concat
ffmpeg -y \
    -f concat -safe 0 -i "$WORK_DIR/segments.txt" \
    -c copy \
    -movflags +faststart \
    "$WORK_DIR/promo.mp4" 2>/dev/null

# Get duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$WORK_DIR/promo.mp4" 2>/dev/null | cut -d. -f1)
SIZE=$(ls -lh "$WORK_DIR/promo.mp4" | awk '{print $5}')

echo ""
echo "=== Done: $APP_ID ==="
echo "    File: $WORK_DIR/promo.mp4"
echo "    Duration: ${DURATION}s"
echo "    Size: $SIZE"
echo ""
