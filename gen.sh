#!/usr/bin/env bash
# Erzeugt fehlende Bilder aus katalog.mjs (6 gleichzeitig).
cd "$(dirname "$0")"
STYLE="Children's coloring book page. Clean bold black outlines on pure white background, no shading, no gray tones, no color fill, no text, no letters, no logos, no watermark, large closed areas easy for kids to color, completely original design not based on any existing character or brand, printable line art, full page composition, flat digital artwork filling the whole image (not a photo of a book or paper, no table, no background texture). Motif:"
node -e 'import("./katalog.mjs").then(({themen})=>{for(const t of themen)for(const b of t.bilder)console.log(b.slug+"\t"+b.prompt)})' > .liste
while IFS=$'\t' read -r slug prompt; do
  [ -f "src/bilder/$slug.png" ] && continue
  while [ "$(jobs -rp | wc -l)" -ge 6 ]; do wait -n; done
  ( gen-image -a 3:4 -o "src/bilder/$slug.png" -p "$STYLE $prompt" >/dev/null 2>&1 && echo "ok $slug" || echo "FAIL $slug" ) &
done < .liste
wait; rm -f .liste
