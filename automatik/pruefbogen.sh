#!/usr/bin/env bash
# Prüfbogen für neue Bilder: Kontaktbogen + Farbtest aus dem Protokoll von gen.sh, dazu je Bild zwei
# Detailansichten in Originalgröße (obere und untere Hälfte). Im Kontaktbogen sind Fehler wie ein Tier
# mit zwei Köpfen zu klein; die Detailansichten sind für die Prüfung da.
# Aufruf: automatik/pruefbogen.sh <slug> [<slug> …]   → .pruef/bogen.jpg, .pruef/detail/<slug>-oben.jpg, -unten.jpg
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
mkdir -p .pruef/detail
for f in "${dateien[@]}"; do
  s=$(basename "$f" .png)
  magick "$f" -gravity north -crop 100%x55%+0+0 +repage -quality 85 ".pruef/detail/$s-oben.jpg"
  magick "$f" -gravity south -crop 100%x55%+0+0 +repage -quality 85 ".pruef/detail/$s-unten.jpg"
done
[ ${#dateien[@]} -gt 0 ] && echo "Detailansichten: .pruef/detail/<slug>-oben.jpg und -unten.jpg"
[ ${#dateien[@]} -gt 0 ] && magick montage "${dateien[@]}" -label '%t' -geometry 360x480+4+4 -tile 3x -pointsize 16 .pruef/bogen.jpg && echo "Kontaktbogen: .pruef/bogen.jpg"
