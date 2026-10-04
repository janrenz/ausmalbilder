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
# Bilderzeugung: lokal das installierte gen-image, in der Cloud die Kopie im Repo
GEN=(gen-image); command -v gen-image >/dev/null || GEN=(python3 automatik/gen-image.py)
node -e 'import("./katalog.mjs").then(({themen})=>{for(const t of themen)for(const b of t.bilder)console.log(b.slug+"\t"+(t.stil||"kind")+"\t"+b.prompt+"\t"+(b.vorlage||""))})' > .liste
# Echte Bauwerke: gemeinfreies Foto von Wikimedia Commons als Vorlage (Feld `vorlage` in katalog.mjs,
# Suche mit automatik/commons.py). Ohne Netz oder bei falscher Lizenz entsteht das Bild ohne Vorlage.
VORLAGE="The attached reference image is a public domain photo or drawing of the real landmark: copy the exact architecture, shape, proportions and number of towers, arches and windows of the landmark from it, but redraw everything as a new clean line drawing; leave out any signs, writing, vehicles with lettering and clutter from the reference."
mkdir -p .cache/vorlagen
while IFS=$'\t' read -r slug stil prompt vorlage; do
  [ -f "src/bilder/$slug.png" ] && continue
  ref=(); hinweis=""
  if [ -n "$vorlage" ]; then
    datei=".cache/vorlagen/$slug.png"
    [ -f "$datei" ] || python3 automatik/commons.py hole "$vorlage" "$datei" >/dev/null || rm -f "$datei"
    if [ -f "$datei" ]; then ref=(--ref "$datei"); hinweis="$VORLAGE "; else echo "Vorlage nicht geladen, ohne Vorlage: $slug"; fi
  fi
  while [ "$(jobs -rp | wc -l)" -ge 8 ]; do wait -n; done
  ( "${GEN[@]}" -a 3:4 "${ref[@]}" -o "src/bilder/$slug.png" -p "${STIL[$stil]} ${hinweis}Motif: $prompt" >/dev/null 2>&1 &&
    # Farbanteil vor der Graustufen-Umwandlung festhalten (automatik/pruefbogen.sh wertet ihn aus)
    printf '%s\t%s\n' "$slug" "$(magick "src/bilder/$slug.png" -resize 150x -fx '(max(r,max(g,b))-min(r,min(g,b)))>0.15' -format '%[fx:mean]' info:)" >> .pruef/farbe.tsv &&
    magick "src/bilder/$slug.png" -colorspace Gray -define png:color-type=0 "src/bilder/$slug.png" &&
    echo "ok $slug" || echo "FAIL $slug" ) &
done < .liste
wait; rm -f .liste
