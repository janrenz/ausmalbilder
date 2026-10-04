#!/usr/bin/env bash
# Täglicher Lauf: Statistik prüfen → Claude erweitert Katalog und Bilder → prüfen, bauen → Pull Request.
# Gestartet vom systemd-User-Timer malkiste-automatik.timer, läuft aber auch von Hand: automatik/lauf.sh [--min N]
set -euo pipefail

export PATH="$HOME/.local/bin:$HOME/.local/share/mise/shims:$HOME/.local/share/mise/installs/claude/latest:/usr/local/bin:/usr/bin"
REPO="$HOME/code/ausmalbilder"
WT="$HOME/.local/share/malkiste/automatik-worktree"   # eigener Arbeitsbaum, berührt deine Arbeitskopie nicht
STAND="$HOME/.local/state/malkiste"
MIN="${MIN:-50}"; WEITER=0
while [ $# -gt 0 ]; do case "$1" in
  --min) MIN="$2"; shift 2;;
  --weiter) WEITER=1; shift;;   # abgebrochenen Lauf ab der Prüfung fortsetzen, ohne neuen Claude-Lauf
  *) echo "unbekannte Option $1"; exit 2;;
esac; done
export LC_ALL=C   # comm braucht Byte-Sortierung
MAX_BILDER=5
HEUTE=$(date +%F)
BRANCH="auto/neue-bilder-$HEUTE"
mkdir -p "$STAND/logs"
LOG="$STAND/logs/$HEUTE.log"
exec > >(tee -a "$LOG") 2>&1
echo "== $(date -Is) Lauf startet (Schwelle $MIN)"

melde() { notify-send -a Malkiste "Malkiste" "$1" 2>/dev/null || true; echo "$1"; }

slugs() { node -e 'import("./katalog.mjs").then(({themen})=>console.log(themen.flatMap(t=>t.bilder.map(b=>b.slug)).join("\n")))' | sort; }

if [ $WEITER -eq 1 ]; then
  cd "$WT"
  BIS=$(node -e 'console.log(Date.parse(JSON.parse(require("fs").readFileSync(".pruef/statistik.json","utf8")).zeitraum.bis))')
  sort -o .pruef/vorher.txt .pruef/vorher.txt
  echo "Setze Lauf im bestehenden Arbeitsbaum fort ($(git branch --show-current))"
else

# Nicht stapeln: solange ein automatischer PR offen ist, nichts Neues anfangen
offen=$(gh pr list -R janrenz/ausmalbilder --state open --json headRefName --jq '[.[] | select(.headRefName | startswith("auto/"))] | length')
if [ "$offen" != "0" ]; then echo "Es ist noch ein automatischer PR offen – Lauf übersprungen."; exit 0; fi

# Arbeitsbaum auf den Stand von origin/main bringen
git -C "$REPO" fetch -q origin
if [ ! -d "$WT" ]; then mkdir -p "$(dirname "$WT")"; git -C "$REPO" worktree add -q --detach "$WT" origin/main; fi
cd "$WT"
git checkout -q -B "$BRANCH" origin/main
git reset -q --hard origin/main
git clean -qfd -e .cache -e .pruef
mkdir -p .pruef && rm -f .pruef/zusammenfassung.md .pruef/bogen.jpg

# 0. Jahreszeit und Anlässe (saison.mjs): Stimmt „Passend zur Jahreszeit“ auf main noch? Steht ein Anlass
#    bevor, für den es noch kein Thema gibt?
SAISON_ALT=$(cat docs/saison.txt 2>/dev/null || true)
SAISON_NEU=$(node saison.mjs saison)
SAISON_WECHSEL=0; [ "$SAISON_ALT" != "$SAISON_NEU" ] && SAISON_WECHSEL=1
node saison.mjs anlaesse | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s)[0];if(a)console.log(JSON.stringify(a))})' > .pruef/anlass.json
ANLASS=$(node -e 'const fs=require("fs");const t=fs.readFileSync(".pruef/anlass.json","utf8").trim();if(t)console.log(JSON.parse(t).slug)')
echo "Jahreszeit: ${SAISON_ALT:-?} → $SAISON_NEU$([ $SAISON_WECHSEL -eq 1 ] && echo ' (Wechsel)')${ANLASS:+ · fehlendes Anlass-Thema: $ANLASS}"
[ -n "$ANLASS" ] && MAX_BILDER=$((MAX_BILDER + 6))

# 1. Statistik – zu wenig Daten und nichts Jahreszeitliches heißt: kein Claude-Lauf, keine Kosten
set +e
node automatik/statistik.mjs --min "$MIN" > .pruef/statistik.json
status=$?
set -e
NACHFRAGE=1
if [ $status -eq 3 ]; then
  NACHFRAGE=0
  if [ -z "$ANLASS" ] && [ $SAISON_WECHSEL -eq 0 ]; then echo "Zu wenig neue Downloads – nichts zu tun."; exit 0; fi
elif [ $status -ne 0 ]; then melde "Statistik-Abfrage fehlgeschlagen (siehe $LOG)"; exit 1; fi
BIS=$(date +%s000)
echo "$NACHFRAGE" > .pruef/nachfrage

slugs > .pruef/vorher.txt

# 2. Claude: nur Katalog, Übersetzungen, Bilder – kein Git, kein Build, kein Netz außer gen-image
#    Nur Jahreszeit-Wechsel ohne Nachfrage und ohne Anlass: kein Claude-Lauf, nur neu bauen.
if [ $NACHFRAGE -eq 1 ] || [ -n "$ANLASS" ]; then
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
claude -p "$(cat .pruef/auftrag.md)" \
  --max-turns 150 \
  --allowedTools "Read" "Edit" "Write" "Glob" "Grep" \
    "Bash(./gen.sh)" "Bash(automatik/pruefbogen.sh:*)" "Bash(node i18n/pruefe.mjs:*)" \
    "Bash(rm src/bilder/:*)" "Bash(ls:*)" \
  --disallowedTools "Bash(git:*)" "Bash(gh:*)" "Bash(curl:*)" "WebFetch" "WebSearch" \
  > .pruef/claude-ausgabe.txt || { melde "Claude-Lauf fehlgeschlagen (siehe $LOG)"; cat .pruef/claude-ausgabe.txt; exit 1; }
cat .pruef/claude-ausgabe.txt
fi
fi

# 3. Ergebnis prüfen
slugs > .pruef/nachher.txt
mapfile -t NEU < <(comm -13 .pruef/vorher.txt .pruef/nachher.txt)
WEG=$(comm -23 .pruef/vorher.txt .pruef/nachher.txt | wc -l)
echo "Neue Bilder: ${#NEU[@]} (${NEU[*]:-})"
if [ "$WEG" -ne 0 ]; then melde "Lauf abgebrochen: Claude hat bestehende Bilder entfernt."; exit 1; fi
# Der Nachfrage-Zeitraum wird nur fortgeschrieben, wenn die Nachfrage auch ausgewertet wurde
stand_fortschreiben() { [ "$(cat .pruef/nachfrage 2>/dev/null || echo 1)" = "1" ] && echo "$BIS" > "$STAND/letzter-lauf" || true; }
SAISON_WECHSEL=${SAISON_WECHSEL:-0}
if [ ${#NEU[@]} -eq 0 ] && [ $SAISON_WECHSEL -eq 0 ]; then
  echo "Keine neuen Bilder – Stand wird trotzdem fortgeschrieben."; stand_fortschreiben; exit 0
fi
if [ ${#NEU[@]} -gt $MAX_BILDER ]; then melde "Lauf abgebrochen: ${#NEU[@]} neue Bilder statt höchstens $MAX_BILDER."; exit 1; fi
for s in "${NEU[@]}"; do [ -f "src/bilder/$s.png" ] || { melde "Lauf abgebrochen: Bild $s fehlt."; exit 1; }; done
for l in en fr es it nl pl pt; do node i18n/pruefe.mjs "$l" || { melde "Lauf abgebrochen: Übersetzung $l unvollständig."; exit 1; }; done
if [ ${#NEU[@]} -gt 0 ]; then
  automatik/pruefbogen.sh "${NEU[@]}" | tee .pruef/farbe-neu.txt
  if grep -q 'FARBE IM ORIGINAL' .pruef/farbe-neu.txt; then melde "Lauf abgebrochen: Farbe in einem neuen Bild."; exit 1; fi
fi

# 4. Bauen (setzt auch „Passend zur Jahreszeit“ nach dem heutigen Datum)
node build.mjs
SAISON_NEU=$(cat docs/saison.txt)
if [ ${#NEU[@]} -eq 0 ]; then
  ART="Jahreszeit aktualisiert"; TITEL="Jahreszeit aktualisiert ($HEUTE): $SAISON_NEU"
elif [ -n "${ANLASS:-}" ] && node -e "import('./katalog.mjs').then(({themen})=>process.exit(themen.some(t=>t.slug==='$ANLASS')?0:1))"; then
  ART="Neues Thema zum Anlass"; TITEL="Neues Thema $ANLASS und neue Ausmalbilder ($HEUTE, ${#NEU[@]} Bilder)"
else
  ART="Neue Ausmalbilder nach Nachfrage"; TITEL="Neue Ausmalbilder nach Nachfrage ($HEUTE, ${#NEU[@]} Bilder)"
fi

# 5. Pull Request
git add -A
git commit -q -m "$ART ($HEUTE): ${NEU[*]:-$SAISON_NEU}

Automatischer Lauf, siehe Pull Request.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -q -f origin "$BRANCH"

{
  [ -f .pruef/zusammenfassung.md ] && cat .pruef/zusammenfassung.md || echo "_Keine Zusammenfassung geschrieben._"
  echo
  echo "**Passend zur Jahreszeit** auf der Startseite: $SAISON_NEU"
  echo
  [ ${#NEU[@]} -gt 0 ] && { echo "## Neue Bilder"; echo; }
  for s in "${NEU[@]}"; do
    titel=$(node -e "import('./katalog.mjs').then(({themen})=>{for(const t of themen)for(const b of t.bilder)if(b.slug==='$s')console.log(t.slug+' · '+b.titel)})")
    echo "**$titel** (\`$s\`)"
    echo
    echo "<img src=\"https://github.com/janrenz/ausmalbilder/blob/$BRANCH/src/bilder/$s.png?raw=true\" width=\"300\">"
    echo
  done
  echo "---"
  echo "Prüfen: keine Schrift, keine Farbe, keine echten Marken/Figuren, passt zum Thema. Mergen veröffentlicht die Bilder auf malkiste.eu."
  echo
  echo "🤖 Generated with [Claude Code](https://claude.com/claude-code)"
} > .pruef/pr.md

url=$(gh pr create -R janrenz/ausmalbilder --head "$BRANCH" --base main \
  --title "$TITEL" --body-file .pruef/pr.md)
stand_fortschreiben
melde "Neuer PR – $ART: $url"
