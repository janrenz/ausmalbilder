#!/usr/bin/env bash
# Schritt 3 des täglichen Laufs (nach vorbereiten.sh und ggf. Claude): Ergebnis prüfen, bauen, committen
# und Titel/Text für den Pull Request schreiben. Pushen und den PR öffnen macht der Aufrufer.
# Aufruf: automatik/abschliessen.sh <branch>
# Exit 0 = Commit liegt bereit (.pruef/titel.txt, .pruef/pr.md), 10 = nichts zu committen, sonst Fehler.
set -euo pipefail
cd "$(dirname "$0")/.."
BRANCH="${1:?Branch fehlt}"
export LC_ALL=C   # comm braucht Byte-Sortierung
HEUTE=$(date +%F)
fehler() { echo "Lauf abgebrochen: $1"; exit 1; }

NACHFRAGE=$(cat .pruef/nachfrage)
SAISON_WECHSEL=$(cat .pruef/saison-wechsel)
ANLASS=$(node -e 'const t=require("fs").readFileSync(".pruef/anlass.json","utf8").trim();if(t)console.log(JSON.parse(t).slug)')
MAX_BILDER=5; [ -n "$ANLASS" ] && MAX_BILDER=11

node -e 'import("./katalog.mjs").then(({themen})=>console.log(themen.flatMap(t=>t.bilder.map(b=>b.slug)).join("\n")))' | sort > .pruef/nachher.txt
mapfile -t NEU < <(comm -13 .pruef/vorher.txt .pruef/nachher.txt)
WEG=$(comm -23 .pruef/vorher.txt .pruef/nachher.txt | wc -l)
echo "Neue Bilder: ${#NEU[@]} (${NEU[*]:-})"
[ "$WEG" -eq 0 ] || fehler "Claude hat bestehende Bilder entfernt."
[ ${#NEU[@]} -le $MAX_BILDER ] || fehler "${#NEU[@]} neue Bilder statt höchstens $MAX_BILDER."
for s in "${NEU[@]}"; do [ -f "src/bilder/$s.png" ] || fehler "Bild $s fehlt."; done
for l in en fr es it nl pl pt; do node i18n/pruefe.mjs "$l" || fehler "Übersetzung $l unvollständig."; done
if [ ${#NEU[@]} -gt 0 ]; then
  automatik/pruefbogen.sh "${NEU[@]}" | tee .pruef/farbe-neu.txt
  ! grep -q 'FARBE IM ORIGINAL' .pruef/farbe-neu.txt || fehler "Farbe in einem neuen Bild."
fi

# Nachfrage-Zeitraum fortschreiben (liegt im Repo, damit auch die Cloud ihn kennt). Nur wenn die Nachfrage
# ausgewertet wurde – sonst zählen die Downloads beim nächsten Lauf weiter.
if [ "$NACHFRAGE" = "1" ]; then
  node -e 'const fs=require("fs");fs.writeFileSync("automatik/stand.json",JSON.stringify({nachfrageBis:Number(fs.readFileSync(".pruef/bis","utf8"))},null,1)+"\n")'
fi

if [ ${#NEU[@]} -eq 0 ] && [ "$SAISON_WECHSEL" = "0" ] && [ "$NACHFRAGE" = "0" ]; then echo "Nichts zu tun."; exit 10; fi

# Bauen (setzt auch „Passend zur Jahreszeit“ nach dem heutigen Datum)
node build.mjs
SAISON_NEU=$(cat docs/saison.txt)
if [ ${#NEU[@]} -eq 0 ] && [ "$SAISON_WECHSEL" = "1" ]; then
  ART="Jahreszeit aktualisiert"; TITEL="Jahreszeit aktualisiert ($HEUTE): $SAISON_NEU"
elif [ ${#NEU[@]} -eq 0 ]; then
  ART="Automatik-Stand"; TITEL="Automatik: Nachfrage ausgewertet, keine neuen Bilder ($HEUTE)"
elif [ -n "$ANLASS" ] && node -e "import('./katalog.mjs').then(({themen})=>process.exit(themen.some(t=>t.slug==='$ANLASS')?0:1))"; then
  ART="Neues Thema zum Anlass"; TITEL="Neues Thema $ANLASS und neue Ausmalbilder ($HEUTE, ${#NEU[@]} Bilder)"
else
  ART="Neue Ausmalbilder nach Nachfrage"; TITEL="Neue Ausmalbilder nach Nachfrage ($HEUTE, ${#NEU[@]} Bilder)"
fi

git add -A
git diff --cached --quiet && { echo "Nichts zu committen."; exit 10; }
git commit -q -m "$ART ($HEUTE): ${NEU[*]:-$SAISON_NEU}

Automatischer Lauf, siehe Pull Request.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"

echo "$TITEL" > .pruef/titel.txt
{
  [ -f .pruef/zusammenfassung.md ] && cat .pruef/zusammenfassung.md || echo "_Keine Zusammenfassung geschrieben._"
  echo
  echo "**Passend zur Jahreszeit** auf der Startseite: $SAISON_NEU"
  echo
  if [ ${#NEU[@]} -gt 0 ]; then echo "## Neue Bilder"; echo; fi
  for s in "${NEU[@]}"; do
    titel=$(node -e "import('./katalog.mjs').then(({themen})=>{for(const t of themen)for(const b of t.bilder)if(b.slug==='$s')console.log(t.slug+' · '+b.titel)})")
    echo "**$titel** (\`$s\`)"
    echo
    echo "<img src=\"https://github.com/janrenz/ausmalbilder/blob/$BRANCH/src/bilder/$s.png?raw=true\" width=\"300\">"
    echo
  done
  echo "---"
  echo "Automatisch erzeugt. Sind die Prüfungen grün, wird der PR automatisch gemergt und ist kurz danach auf malkiste.eu."
  echo "<!-- malkiste-automatik -->"
  echo
  echo "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
} > .pruef/pr.md
echo "Bereit: $TITEL"
