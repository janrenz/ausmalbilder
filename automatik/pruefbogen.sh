#!/usr/bin/env bash
# Prüfbogen für neue Bilder: Kontaktbogen + Farbtest aus dem Protokoll von gen.sh.
# Aufruf: automatik/pruefbogen.sh <slug> [<slug> …]   → schreibt .pruef/bogen.jpg
cd "$(dirname "$0")/.."
mkdir -p .pruef
dateien=()
for s in "$@"; do
  f="src/bilder/$s.png"
  [ -f "$f" ] || { echo "FEHLT $s"; continue; }
  dateien+=("$f")
  farbe=$(awk -F'\t' -v s="$s" '$1 == s { w = $2 } END { print w }' .pruef/farbe.tsv 2>/dev/null)
  if [ -z "$farbe" ]; then echo "$s farbe=unbekannt (nicht mit gen.sh erzeugt)"
  else awk -v f="$farbe" -v s="$s" 'BEGIN { printf "%s farbe=%.4f%s\n", s, f, (f > 0.001 ? "  ← FARBE IM ORIGINAL: verwerfen und neu erzeugen" : "") }'; fi
done
[ ${#dateien[@]} -gt 0 ] && magick montage "${dateien[@]}" -label '%t' -geometry 360x480+4+4 -tile 3x -pointsize 16 .pruef/bogen.jpg && echo "Kontaktbogen: .pruef/bogen.jpg"
