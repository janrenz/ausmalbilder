#!/usr/bin/env bash
# Erzeugt fehlende Bilder aus katalog.mjs (8 gleichzeitig).
cd "$(dirname "$0")"
mkdir -p .pruef
GEMEINSAM="Clean black outlines on pure white background, no shading, no gray tones, no color fill, no text, no letters, no numbers, no logos, no watermark, completely original design not based on any existing character, brand or real product, printable line art, full page composition, flat digital artwork filling the whole image (not a photo of a book or paper, no table, no background texture)."
declare -A STIL=(
  [kind]="Children's coloring book page for kids aged 3-8. Bold thick outlines, large closed areas easy for small kids to color. $GEMEINSAM"
  [detail]="Coloring page for older kids and teens aged 8-14. Detailed, more realistic illustration with medium-fine outlines, many areas to color, cool and modern look, not babyish. $GEMEINSAM"
  [erwachsen]="Coloring page for adults. Very intricate and finely detailed line art with thin precise outlines and many small sections. $GEMEINSAM"
)
node -e 'import("./katalog.mjs").then(({themen})=>{for(const t of themen)for(const b of t.bilder)console.log(b.slug+"\t"+(t.stil||"kind")+"\t"+b.prompt)})' > .liste
while IFS=$'\t' read -r slug stil prompt; do
  [ -f "src/bilder/$slug.png" ] && continue
  while [ "$(jobs -rp | wc -l)" -ge 8 ]; do wait -n; done
  ( gen-image -a 3:4 -o "src/bilder/$slug.png" -p "${STIL[$stil]} Motif: $prompt" >/dev/null 2>&1 &&
    # Farbanteil vor der Graustufen-Umwandlung festhalten (automatik/pruefbogen.sh wertet ihn aus)
    printf '%s\t%s\n' "$slug" "$(magick "src/bilder/$slug.png" -resize 150x -fx '(max(r,max(g,b))-min(r,min(g,b)))>0.15' -format '%[fx:mean]' info:)" >> .pruef/farbe.tsv &&
    magick "src/bilder/$slug.png" -colorspace Gray -define png:color-type=0 "src/bilder/$slug.png" &&
    echo "ok $slug" || echo "FAIL $slug" ) &
done < .liste
wait; rm -f .liste
