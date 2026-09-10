#!/usr/bin/env bash
#
# Turn a raw image-to-video clip into a category panel clip.
#
#   ./scripts/encode-category-clip.sh raw.mp4 ielts-01-placement-assessment
#
# Writes public/videos/categories/<name>.mp4.
#
# What it does, and why:
#
#   trim      The generators pad the front of a clip with blank frames — Veo
#             gave every `be-` raw exactly 5.0s of white before anything moved,
#             38% of a 13s file. The panels play on hover, so an untrimmed clip
#             shows a white rectangle for five seconds and then starts. Detected
#             rather than assumed; override with START= if the guess is wrong.
#   crop      The panels are a fixed 3:5. The artwork almost never arrives that
#             way: it comes matted into whatever canvas the generator returns —
#             3:5 inside 16:9 on black, 9:16 inside 16:9 on white, 3:5 inside
#             9:16 on black have all turned up in one batch. So the window is
#             measured from the picture, not assumed from the canvas. See
#             ( FINDING THE PICTURE ) below.
#   scale     720x1200 — about 1.4x the widest the panel is ever drawn, which
#             is enough for a retina screen and nothing more.
#   ping-pong Plays the clip forwards then backwards. The generators do not
#             return to their first frame, so a plain loop visibly jumps; going
#             back the way it came has no seam at all. Costs double the length.
#   -an       No audio track. These are silent decorative loops by design, not
#             clips that lost their sound: the Veo raws do carry real audio
#             (AAC stereo, around -18dB mean), and it is discarded on purpose.
#             Nothing could use it — the panel plays the clip forwards then
#             backwards, which no soundtrack survives, and HoverExpand has to
#             set `muted` regardless or the browser refuses to autoplay at all.
#             A muted track is still bytes on the wire.
#   faststart Moves the index to the front of the file so playback can begin
#             before the whole clip has arrived.
#
# It does NOT write a poster, and that is deliberate. Every category already has
# a 1200x2000 drawing in public/images/categories/, `lib/projects.ts` hands that
# drawing to the panel as `image:`, and HoverExpand leaves it sitting under the
# video for exactly this purpose. The clip is generated from that drawing, so
# its first frame and the drawing differ by ~4% — invisible across a handover
# that is already covered by the still. A generated poster is a second copy of
# a picture the repo is committed to anyway.
#
# ( FINDING THE PICTURE )
#
# cropdetect only finds *black* borders, so a picture matted on white reads as
# full-frame and the old centred window then cut 20px of white into both edges
# of every blog/ielts clip in this batch — plus black bars top and bottom, since
# the full canvas height was kept. That is the bug this replaces.
#
# So it runs cropdetect twice, once normally and once on a negated copy, and
# intersects the two. Black bars fall out of the first pass, white bars out of
# the second, and a picture with no matte survives both untouched.
#
# The intersection is then sanity-checked, because cropdetect lies on dark
# artwork: be-02 is a dim boardroom whose own edges sit within `limit` of pure
# black, and it reports 810x916 against a true 1049x1080. The tell is that a
# real matte shrinks exactly one axis — pillarbox takes width, letterbox takes
# height, neither takes both. A box that has lost both axes is not a matte, so
# it is discarded and the full canvas used instead. For be-02 that lands on the
# same centred window the old script would have chosen, which is correct there.
set -euo pipefail

SRC=${1:?usage: encode-category-clip.sh <source-video> <output-name>}
NAME=${2:?usage: encode-category-clip.sh <source-video> <output-name>}
OUT_DIR=public/videos/categories

# Escape hatches for the two measurements, when the picture defeats them:
#   CROP=w:h:x:y   window in source pixels, skips detection
#   START=seconds  where the content begins, skips lead detection
CROP=${CROP:-}
START=${START:-}

mkdir -p "$OUT_DIR"

IFS=, read -r W H < <(ffprobe -v error -select_streams v:0 \
  -show_entries stream=width,height -of csv=p=0 "$SRC")
[[ -n ${W:-} && -n ${H:-} ]] || { echo "could not read dimensions from $SRC" >&2; exit 1; }

# ---- where does the picture start? -----------------------------------------
# A leading run of uniform frames, white or black, anchored at t=0. blackdetect
# finds the black case; negating first finds the white one.
detect_lead() {
  local filter=$1 out
  out=$(ffmpeg -v info -i "$SRC" -vf "$filter" -f null - 2>&1 \
        | grep -o 'black_start:0 black_end:[0-9.]*' | head -1 || true)
  [[ -n $out ]] && echo "${out##*black_end:}" || echo ""
}

if [[ -z $START ]]; then
  START=$(detect_lead "blackdetect=d=0.2:pic_th=0.99:pix_th=0.10")
  [[ -z $START ]] && START=$(detect_lead "negate,blackdetect=d=0.2:pic_th=0.99:pix_th=0.10")
  [[ -z $START ]] && START=0
fi

# Detection must sample real content, so look past the lead.
PROBE=$(awk -v s="$START" 'BEGIN{printf "%.2f", s + 0.5}')

# ---- where is the picture in the frame? ------------------------------------
detect_box() {
  local pre=$1 out
  out=$(ffmpeg -v info -ss "$PROBE" -t 3 -i "$SRC" \
        -vf "${pre}cropdetect=limit=24:round=2:reset=0" -f null - 2>&1 \
        | grep -o 'crop=[0-9]*:[0-9]*:[0-9]*:[0-9]*' | tail -1 || true)
  echo "${out#crop=}"
}

if [[ -z $CROP ]]; then
  BLACK=$(detect_box "")
  WHITE=$(detect_box "negate,")

  # Intersect the two boxes; anything undetected counts as the whole frame.
  X0=0; Y0=0; X1=$W; Y1=$H
  for box in "$BLACK" "$WHITE"; do
    [[ -z $box ]] && continue
    IFS=: read -r bw bh bx by <<<"$box"
    (( bx > X0 )) && X0=$bx
    (( by > Y0 )) && Y0=$by
    (( bx + bw < X1 )) && X1=$(( bx + bw ))
    (( by + bh < Y1 )) && Y1=$(( by + bh ))
  done
  CW_D=$(( X1 - X0 )); CH_D=$(( Y1 - Y0 ))

  # A matte shrinks one axis. Losing both means cropdetect ate the artwork.
  if (( CW_D < W - 8 && CH_D < H - 8 )); then
    echo "  detection unreliable (${CW_D}x${CH_D} of ${W}x${H}, both axes lost) — using full frame"
    X0=0; Y0=0; CW_D=$W; CH_D=$H
  fi
else
  IFS=: read -r CW_D CH_D X0 Y0 <<<"$CROP"
fi

# ---- largest centred 3:5 window inside the picture -------------------------
# Even numbers only: H.264's chroma planes are half resolution.
if (( CW_D * 5 > CH_D * 3 )); then
  CW=$(( CH_D * 3 / 5 )); CH=$CH_D
else
  CW=$CW_D; CH=$(( CW_D * 5 / 3 ))
fi
CW=$(( CW / 2 * 2 )); CH=$(( CH / 2 * 2 ))
CX=$(( X0 + (CW_D - CW) / 2 )); CY=$(( Y0 + (CH_D - CH) / 2 ))

echo "$SRC  ${W}x${H}  picture ${CW_D}x${CH_D}+${X0}+${Y0}  start ${START}s"
echo "  ->  crop ${CW}x${CH}+${CX}+${CY}  ->  720x1200"

ffmpeg -y -v error -ss "$START" -i "$SRC" \
  -filter_complex "[0:v]crop=${CW}:${CH}:${CX}:${CY},scale=720:1200,setsar=1,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]" \
  -map "[v]" -an \
  -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 28 -preset slow \
  -movflags +faststart \
  "$OUT_DIR/$NAME.mp4"

ls -lh "$OUT_DIR/$NAME.mp4"
