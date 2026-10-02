#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/public/audio/prosody"
TMP="$(mktemp -d)"
ANALYSIS="$ROOT/docs/prosody-audio-analysis.txt"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$OUT"

fetch() {
  local url="$1"
  local target="$2"
  curl -L --fail --retry 3 --retry-delay 2 \
    -A "ParlePlus/1.0 (educational French prosody corpus)" \
    "$url" -o "$target"
}

COMMONS="https://commons.wikimedia.org/wiki/Special:Redirect/file"
FORMAL="$COMMONS/French_Dialogue_-_A_Formal_Conversation.ogg"
PRINCIPAL="$COMMONS/French_Dialogue_-_The_Principal.ogg"
SOPHIE="$COMMONS/Sophie_Adenot_addresses_for_the_Opening_Ceremony_of_Wikimania_2026_from_the_International_Space_Station.webm"
HUBERT="$COMMONS/Dr-Jean-Pierre-Hubert-Interview-de-8mn-r%C3%A9alis%C3%A9-en-2006-.ogg"

fetch "$FORMAL" "$TMP/formal.ogg"
fetch "$PRINCIPAL" "$TMP/principal.ogg"
fetch "$SOPHIE" "$TMP/sophie.webm"
fetch "$HUBERT" "$TMP/hubert.ogg"

encode_clip() {
  local input="$1"
  local start="$2"
  local duration="$3"
  local output="$4"
  ffmpeg -hide_banner -loglevel error -y \
    -ss "$start" -i "$input" -t "$duration" -vn \
    -ac 1 -ar 44100 -c:a libvorbis -q:a 4 "$output"
}

# Human recordings, intentionally short enough for the 10–30 s protocol.
encode_clip "$TMP/formal.ogg" 0 15.418 "$OUT/prosody_real_001.ogg"
encode_clip "$TMP/sophie.webm" 0 14.9 "$OUT/prosody_real_002.ogg"
encode_clip "$TMP/sophie.webm" 15 14.9 "$OUT/prosody_real_003.ogg"
encode_clip "$TMP/sophie.webm" 30 14.9 "$OUT/prosody_real_004.ogg"
encode_clip "$TMP/principal.ogg" 0 29.8 "$OUT/prosody_real_005.ogg"
encode_clip "$TMP/hubert.ogg" 0 29.8 "$OUT/prosody_real_006.ogg"

{
  echo "Generated at: $(date -u +%FT%TZ)"
  echo
  for audio in "$OUT"/prosody_real_*.ogg; do
    echo "=== $(basename "$audio") ==="
    ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$audio"
    ffmpeg -hide_banner -i "$audio" \
      -af silencedetect=noise=-35dB:d=0.12 -f null - 2>&1 \
      | grep -E 'silence_(start|end)' || true
    echo
  done
} > "$ANALYSIS"
