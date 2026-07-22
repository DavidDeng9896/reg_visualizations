#!/bin/bash
# usage: gif_frames.sh <gifname> <scene_threshold> [maxframes]
set -e
FF="/Users/liweideng/Library/Application Support/kimi-desktop/daimon-share/daimon/runtime/python/.venv/lib/python3.12/site-packages/imageio_ffmpeg/binaries/ffmpeg-macos-aarch64-v7.1"
D="/Users/liweideng/GitHub/reg_visualizations/docs/reference/raw/images"
GIF="$1"; TH="${2:-0.12}"; MAXF="${3:-14}"
STEM="${GIF%.gif}"
OUT="$D/frames/$STEM"
mkdir -p "$OUT"
rm -f "$OUT"/f*.png
# scene-change frames at full res
"$FF" -hide_banner -loglevel error -i "$D/$GIF" -vf "select='gt(scene,$TH)'" -fps_mode vfr "$OUT/sc_%03d.png"
CNT=$(ls "$OUT"/sc_*.png 2>/dev/null | wc -l | tr -d ' ')
echo "$GIF scene-frames: $CNT"
