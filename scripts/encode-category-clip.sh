#!/usr/bin/env bash
#
# Turn a raw image-to-video clip into a category panel clip.
#
#   ./scripts/encode-category-clip.sh raw.mp4 ielts-01-placement-assessment
#
# Writes public/videos/categories/<name>.mp4 and <name>-poster.jpg.
#
# What it does, and why:
#
#   crop      The panels are a fixed 3:5. A clip generated from one of the
#             category drawings is already 3:5 and passes through untouched;
#             anything else gets a centred 3:5 window cut out of it.
#   scale     720x1200 — about 1.4x the widest the panel is ever drawn, which
#             is enough for a retina screen and nothing more.
#   ping-pong Plays the clip forwards then backwards. The generators do not
#             return to their first frame, so a plain loop visibly jumps; going
#             back the way it came has no seam at all. Costs double the length.
#   -an       No audio track. The panels are silent, and a muted track is still
#             bytes on the wire.
#   faststart Moves the index to the front of the file so playback can begin
#             before the whole clip has arrived.
set -euo pipefail

SRC=${1:?usage: encode-category-clip.sh <source-video> <output-name>}
NAME=${2:?usage: encode-category-clip.sh <source-video> <output-name>}
OUT_DIR=public/videos/categories

mkdir -p "$OUT_DIR"

# The largest centred 3:5 window this source can give, rounded to even numbers
# because H.264's chroma planes are half resolution and cannot take an odd one.
IFS=, read -r W H < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "$SRC")
[[ -n ${W:-} && -n ${H:-} ]] || { echo "could not read dimensions from $SRC" >&2; exit 1; }
CW=$(( W * 5 > H * 3 ? H * 3 / 5 : W ))
CH=$(( W * 5 > H * 3 ? H : W * 5 / 3 ))
CW=$(( CW / 2 * 2 )); CH=$(( CH / 2 * 2 ))
CX=$(( (W - CW) / 2 )); CY=$(( (H - CH) / 2 ))

echo "$SRC  ${W}x${H}  ->  crop ${CW}x${CH}+${CX}+${CY}  ->  720x1200"

ffmpeg -y -v error -i "$SRC" \
  -filter_complex "[0:v]crop=${CW}:${CH}:${CX}:${CY},scale=720:1200,setsar=1,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -an \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow \
  -movflags +faststart \
  "$OUT_DIR/$NAME.mp4"

# The poster is the clip's own first frame, not the original drawing — so the
# still the panel shows before playback starts is exactly what the clip opens
# on, and the handover is invisible.
ffmpeg -y -v error -i "$OUT_DIR/$NAME.mp4" \
  -vf "select=eq(n\,0)" -vframes 1 -q:v 3 "$OUT_DIR/$NAME-poster.jpg"

ls -lh "$OUT_DIR/$NAME.mp4" "$OUT_DIR/$NAME-poster.jpg"
