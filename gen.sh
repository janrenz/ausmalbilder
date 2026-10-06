#!/usr/bin/env bash
# Erzeugt fehlende Bilder aus katalog.mjs (8 gleichzeitig), in zwei Schritten:
#   1. ein buntes Bild des Motivs → src/farben/<slug>.jpg (Vorlage für die Farben im YouTube-Video)
#   2. daraus die Strichzeichnung (Gemini entfernt nur die Farben, die Linien bleiben deckungsgleich)
#      → src/bilder/<slug>.png in Graustufen
# So passen die Farben im Video Fläche für Fläche zum Motiv, auch bei Mandalas und Zentangles, deren
# Form man in der reinen Strichzeichnung kaum erkennt. Fehlt src/bilder/<slug>.png, entstehen beide neu.
cd "$(dirname "$0")"
mkdir -p .pruef src/farben
GEMEINSAM="No text, no letters, no numbers, no logos, no watermark, completely original design not based on any existing character, brand or real product, full page composition, flat digital artwork filling the whole image (not a photo of a book or paper, no table, no background texture)."
declare -A STIL=(
  [kind]="Children's coloring book page for kids aged 3-8. Bold thick outlines, large closed areas easy for small kids to color."
  [detail]="Coloring page for older kids and teens aged 8-14. Detailed, more realistic illustration with medium-fine outlines, many areas to color, cool and modern look, not babyish."
  [erwachsen]="Coloring page for adults. Very intricate and finely detailed line art with thin precise outlines and many small sections."
)
# Schritt 1: farbig, aber schon mit allen Linien der späteren Ausmalseite
FARBIG="Show it already colored in: flat colors only, every closed area filled with one solid color, no gradients, no shading, no texture. The colors make the motif instantly recognizable at a glance: the main subject stands out clearly from the background in its own natural colors, the background calm and contrasting. Clean black outlines around every area, white outside the picture."
# Schritt 2: nur die Farben entfernen
LINIEN="Turn this colored illustration into a black and white coloring page: remove all colors and fill every area with pure white. Keep every black outline exactly where it is, with the same shapes and the same position, do not add, remove, move or redraw any lines, do not change the composition or the framing. Clean black outlines on pure white background, no shading, no gray tones, no color fill, no text, printable line art."
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
  ( farbe="src/farben/$slug.jpg" roh=".pruef/$slug-farbe.png"
    rm -f "$roh"
    "${GEN[@]}" -a 3:4 "${ref[@]}" -o "$roh" -p "${STIL[$stil]} $FARBIG $GEMEINSAM ${hinweis}Motif: $prompt" >/dev/null 2>&1 &&
    "${GEN[@]}" -a 3:4 --ref "$roh" -o "src/bilder/$slug.png" -p "$LINIEN" >/dev/null 2>&1 &&
    # Farbanteil vor der Graustufen-Umwandlung festhalten (automatik/pruefbogen.sh wertet ihn aus)
    printf '%s\t%s\n' "$slug" "$(magick "src/bilder/$slug.png" -resize 150x -fx '(max(r,max(g,b))-min(r,min(g,b)))>0.15' -format '%[fx:mean]' info:)" >> .pruef/farbe.tsv &&
    magick "src/bilder/$slug.png" -colorspace Gray -define png:color-type=0 "src/bilder/$slug.png" &&
    magick "$roh" -resize "$(magick identify -format '%wx%h!' "src/bilder/$slug.png")" -quality 88 "$farbe" &&
    rm -f "$roh" && echo "ok $slug" || { rm -f "src/bilder/$slug.png"; echo "FAIL $slug"; } ) &
done < .liste
wait; rm -f .liste
