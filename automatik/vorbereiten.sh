#!/usr/bin/env bash
# Schritt 1 des täglichen Laufs (Laptop: automatik/lauf.sh, Cloud: automatik/cloud.md).
# Läuft im Repo auf dem Stand von main und entscheidet, was heute zu tun ist:
#   .pruef/entscheidung = nichts | bauen | claude
#   nichts  – keine Nachfrage, keine neue Jahreszeit, kein fehlender Anlass
#   bauen   – nur „Passend zur Jahreszeit“ hat gewechselt: neu bauen, kein Claude
#   claude  – Claude arbeitet .pruef/auftrag.md ab (Bilder nach Nachfrage und/oder Anlass-Thema)
# Aufruf: automatik/vorbereiten.sh [--min N]
set -euo pipefail
cd "$(dirname "$0")/.."
MIN="${MIN:-50}"
while [ $# -gt 0 ]; do case "$1" in
  --min) MIN="$2"; shift 2;;
  *) echo "unbekannte Option $1"; exit 2;;
esac; done
export LC_ALL=C
# Die Sitemap nimmt lastmod aus der git-Historie; ein flacher Klon (Cloud) ergäbe andere Daten als die Prüfung
[ "$(git rev-parse --is-shallow-repository)" = "true" ] && git fetch -q --unshallow origin || true

mkdir -p .pruef
rm -rf .pruef/zusammenfassung.md .pruef/bogen.jpg .pruef/auftrag.md .pruef/entscheidung .pruef/farbe-neu.txt .pruef/qs.json .pruef/detail

# Jahreszeit und Anlässe (saison.mjs): Stimmt „Passend zur Jahreszeit“ auf main noch? Steht ein Anlass
# bevor, für den es noch kein Thema gibt?
SAISON_ALT=$(cat docs/saison.txt 2>/dev/null || true)
SAISON_NEU=$(node saison.mjs saison)
SAISON_WECHSEL=0; [ "$SAISON_ALT" != "$SAISON_NEU" ] && SAISON_WECHSEL=1
echo "$SAISON_WECHSEL" > .pruef/saison-wechsel
node saison.mjs anlaesse | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s)[0];if(a)console.log(JSON.stringify(a))})' > .pruef/anlass.json
ANLASS=$(node -e 'const t=require("fs").readFileSync(".pruef/anlass.json","utf8").trim();if(t)console.log(JSON.parse(t).slug)')
echo "Jahreszeit: ${SAISON_ALT:-?} → $SAISON_NEU$([ $SAISON_WECHSEL -eq 1 ] && echo ' (Wechsel)' || true)${ANLASS:+ · fehlendes Anlass-Thema: $ANLASS}"

# Statistik – zu wenig Downloads und nichts Jahreszeitliches heißt: kein Claude-Lauf, keine Kosten
set +e
node automatik/statistik.mjs --min "$MIN" > .pruef/statistik.json
status=$?
set -e
NACHFRAGE=1
if [ $status -eq 3 ]; then NACHFRAGE=0
elif [ $status -ne 0 ]; then echo "Statistik-Abfrage fehlgeschlagen"; exit 1; fi
echo "$NACHFRAGE" > .pruef/nachfrage
node -e 'console.log(Date.parse(JSON.parse(require("fs").readFileSync(".pruef/statistik.json","utf8")).zeitraum.bis))' > .pruef/bis

node -e 'import("./katalog.mjs").then(({themen})=>console.log(themen.flatMap(t=>t.bilder.map(b=>b.slug)).join("\n")))' | sort > .pruef/vorher.txt

if [ $NACHFRAGE -eq 0 ] && [ -z "$ANLASS" ]; then
  if [ $SAISON_WECHSEL -eq 1 ]; then echo bauen > .pruef/entscheidung; else echo nichts > .pruef/entscheidung; fi
else
  echo claude > .pruef/entscheidung
  {
    cat automatik/auftrag.md
    if [ -n "$ANLASS" ]; then
      echo; echo "## Anlass für diesen Lauf"; echo
      echo "Lege das Anlass-Thema aus \`.pruef/anlass.json\` an (siehe „Anlass-Thema“ oben):"; echo
      echo '```json'; cat .pruef/anlass.json; echo '```'
    fi
    if [ $NACHFRAGE -eq 0 ]; then
      echo; echo "Die Nachfrage-Schwelle ist diesmal nicht erreicht: Füge **nur** das Anlass-Thema hinzu, keine Bilder nach Statistik."
    fi
  } > .pruef/auftrag.md
fi
echo "Entscheidung: $(cat .pruef/entscheidung)"
